# PostgreSQL - Database Layer

## What It Is

PostgreSQL is a relational database that stores data in tables with strict structure. Think Excel spreadsheets that multiple computers can access simultaneously with ACID guarantees (Atomicity, Consistency, Isolation, Durability).

## Why We Use It (vs NoSQL)

**Our data is highly relational:**
- User **has one** Server
- Server **has many** Deployments
- Server **has many** Domains
- User **has many** Payments
- User **has many** Support Tickets

PostgreSQL enforces these relationships at the database level.

**Example - Prevent duplicate servers:**
```sql
-- Database constraint ensures one server per user
CREATE UNIQUE INDEX idx_one_server_per_user 
ON servers (user_id) 
WHERE status NOT IN ('deleted', 'failed');
```

Try to create a second server? Database blocks it automatically.

With MongoDB/NoSQL: Would need application logic to check (could fail, race conditions).

## Key Features We Use

**1. Connection Pooling**
```javascript
// db.js
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // 20 concurrent connections
  idleTimeoutMillis: 30000
});
```

**Why it matters:**
- Opening database connection = slow (100ms)
- Pool keeps 20 connections ready
- Request comes in → grabs existing connection (instant)
- Request done → connection returned to pool

**Without pooling:** Every dashboard load = 5 separate 100ms connections = 500ms  
**With pooling:** Every dashboard load = 5 instant queries = 50ms

**2. Session Storage**
```javascript
// index.js
app.use(session({
  store: new pgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
```

Sessions stored in database, not in-memory. Server restarts don't log everyone out.

**3. Transactions (ACID)**
```javascript
// Refund webhook
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  // Update payment
  await client.query('UPDATE payments SET status = $1 WHERE stripe_charge_id = $2', ['refunded', chargeId]);
  
  // Delete server
  await client.query('DELETE FROM servers WHERE stripe_charge_id = $1', [chargeId]);
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK'); // Undo everything if any step fails
  throw error;
}
```

**Why it matters:**
- Refund succeeds but server delete fails → money refunded, server still exists (bad!)
- Transaction ensures: both happen or neither happens

**4. SQL Injection Prevention**
```javascript
// VULNERABLE (never do this)
await pool.query(`SELECT * FROM users WHERE email = '${email}'`);
// Attacker sends: ' OR '1'='1

// SAFE (parameterized query)
await pool.query('SELECT * FROM users WHERE email = $1', [email]);
// PostgreSQL treats input as data, not code
```

Every query uses `$1`, `$2` placeholders. Zero SQL injection risk.

## Our Database Schema

```
users               # User accounts
├── id
├── email
├── password_hash   # bcrypt hashed
├── email_confirmed
├── role            # user/admin
└── created_at

servers             # VPS servers
├── id
├── user_id         # FK to users
├── plan            # basic/pro/premium
├── status          # provisioning/running/stopped/failed/deleted
├── ip_address
├── droplet_id      # DigitalOcean ID
├── ssh_username
├── ssh_password    # Encrypted
├── domain
├── ssl_status      # pending/active/failed
├── stripe_charge_id
└── created_at

deployments         # Git deployments
├── id
├── server_id       # FK to servers
├── user_id         # FK to users
├── git_url
├── status          # pending/in-progress/success/failed
├── output          # Deployment logs
└── deployed_at

domains             # Custom domains
├── id
├── server_id       # FK to servers
├── user_id         # FK to users
├── domain
├── ssl_enabled
└── created_at

payments            # Stripe payments
├── id
├── user_id         # FK to users
├── stripe_payment_id
├── stripe_charge_id
├── amount
├── plan
├── status          # succeeded/refunded
└── created_at

support_tickets     # Customer support
├── id
├── user_id         # FK to users
├── subject
├── description
├── priority        # low/medium/high/critical
├── status          # open/in-progress/resolved/closed
└── created_at

session             # User sessions (connect-pg-simple)
├── sid (PK)
├── sess (JSONB)
└── expire
```

## Customer Value

**Fast queries:**
- Dashboard loads in < 50ms (indexed queries)
- Real-time updates (no cache invalidation issues)
- Consistent data (ACID guarantees)

**Data integrity:**
- Can't create 2 servers (unique constraint)
- Can't orphan deployments (foreign keys)
- Can't lose data during crashes (transactions)

**Security:**
- SQL injection impossible (parameterized queries)
- Passwords encrypted at rest (bcrypt)
- Sessions expire automatically (TTL)

## Example Query - Dashboard Load

```javascript
// Get everything for dashboard in 3 queries (parallel)
const [serverResult, deploymentsResult, domainsResult] = await Promise.all([
  pool.query('SELECT * FROM servers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [userId]),
  pool.query('SELECT * FROM deployments WHERE user_id = $1 ORDER BY deployed_at DESC', [userId]),
  pool.query('SELECT * FROM domains WHERE user_id = $1 ORDER BY created_at DESC', [userId])
]);
```

Total time: ~20ms (executed in parallel with connection pooling).

---

PostgreSQL = reliable, fast, secure data storage with strong guarantees.  
Without it: Data inconsistencies, race conditions, security vulnerabilities.  
With it: Rock-solid foundation for production application.
