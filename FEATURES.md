# Features - What Basement Can Do

## User Auth (The Foundation)

### Registration
- Email/password signup
- Password hashing with bcrypt (10 rounds, takes ~100ms intentionally)
- Duplicate email checking
- **Email confirmation required** (24-hour window)
- Validation on both client and server

### Email Verification
- Generates secure random token on signup
- Sends HTML email with confirmation link
- Token expires after 24 hours
- Can't login without confirmed email
- Shows nice success page when confirmed

### Login
- Email/password authentication
- Checks bcrypt hash
- Blocks unconfirmed users with clear message
- Creates session with userId, userEmail, userRole
- Flashes "Successfully logged out" message

### Session Management
- Sessions stored in PostgreSQL (survives server restarts)
- 30-day expiration
- Secure cookies (httpOnly, sameSite)
- HTTPS enforced in production mode

---

## Server Management (The Core Feature)

### Dashboard
Shows everything a user needs to manage their server:

**Server Status**
- Current status (running/stopped/provisioning)
- IP address
- SSH credentials (copyable buttons for easy access)
- Hardware specs (RAM, CPU, storage)
- Creation date and uptime

**Server Controls**
- Start/Stop/Restart buttons
- Immediately update UI
- Real-time status checking

**Deployment**
- Git repository URL input (GitHub/GitLab/Bitbucket)
- Deployment history with timestamps
- Status tracking (pending/in-progress/complete)

**Custom Domains**
- Add domain form
- DNS configuration guide
- List of active domains
- Per-domain SSL status

**SSL/HTTPS**
- Let's Encrypt integration via SSH
- Enable SSL per domain
- Shows DNS requirements
- Auto-renewal setup

---

## Payment & Billing (The Revenue)

### Pricing Tiers
**Basic Plan - $25/month**
- 1GB RAM, 1 CPU, 25GB SSD
- Good for testing/learning

**Priority Plan - $60/month**
- 2GB RAM, 2 CPUs, 50GB SSD
- Production apps

**Premium Plan - $120/month**
- 4GB RAM, 2 CPUs, 80GB SSD
- High-traffic apps

### Checkout Flow
- Clean pricing page with plan comparison
- Click plan → Stripe checkout modal
- Stripe handles payment processing
- Real-time charge validation

### Payment Processing
- Stripe Checkout Sessions integration
- Webhooks validate payment completion
- Stores charge ID in database (refund proof)
- Auto-provisions DigitalOcean droplet on success
- Confirmation email after purchase

### Refund Handling
- Webhook listener for `charge.refunded` events
- Automatically destroys DigitalOcean droplet
- Cleans up database records
- Prevents orphaned infrastructure

---

## Content Pages (The Marketing)

### Home
- Hero section with CTA
- Feature overview
- Trust indicators (?) 
- Link to pricing

### About
- Company/project story
- Why you built it
- What makes you different

### Pricing
- All three tiers
- Feature comparison
- CTA buttons to checkout

### Terms of Service
- Legal stuff (you should actually fill this in properly)
- User responsibilities
- Liability disclaimers

### Privacy Policy
- Data collection disclosure
- Cookie usage
- Third-party services (Stripe, DO, email)
- How data is stored/deleted

### Docs/FAQ
- Getting started guide
- Common questions
- Troubleshooting
- Link to email support

### Contact
- Email form
- Simple submission
- Rate-limited (5 requests/hour max)
- Logs to console (you should add email here)

---

## Security Features (Why It's Not Getting Hacked)

### Rate Limiting
- **General**: 100 requests/15 minutes per IP
- **Contact form**: 5 requests/hour (prevent spam)
- **Payments**: 10 requests/15 minutes (prevent card testing)
- Returns 429 Too Many Requests when exceeded

### CSRF Protection
- All forms protected with csrf tokens
- Tokens regenerated per session
- Invalid tokens return 403 Forbidden
- Prevents cross-site form submissions

### Password Security
- Bcrypt hashing (never stored plaintext)
- 10 salt rounds (about 100ms per hash, intentionally slow)
- Passwords compared securely (timing-safe comparison)
- No password shown in error messages ("Invalid email or password" covers both)

### Session Security
- httpOnly cookies (can't be accessed by JavaScript)
- sameSite=lax (prevents CSRF from external sites)
- Secure flag in production (HTTPS only)
- Expires after 30 days
- Regenerated on login

### HTTPS/TLS
- Helmet.js security headers
- Enforces HTTPS in production mode
- Redirects HTTP to HTTPS
- Strict-Transport-Security header

### SQL Injection Prevention
- Parameterized queries everywhere
- Never concatenates user input into SQL
- Uses `$1, $2` placeholders

### XSS Prevention
- User input escaped in HTML
- No `innerHTML` from user data
- Content-Security-Policy headers

---

## Operations & Monitoring

### Health Check Endpoint
```
GET /health
```
Returns server status, DB connection, uptime. Used by load balancers to determine if server is alive.

### Request Logging
Every request logged with:
- HTTP method (GET/POST/etc)
- Status code (200/404/500)
- Path (which endpoint)
- Response time in milliseconds
- User ID (if logged in)

Color-coded:
- `[INFO]` for 200-399 (working)
- `[WARN]` for 400-499 (user error)
- `[ERROR]` for 500+ (your problem)

### Error Handling
- Global error handler catches all errors
- Returns proper HTTP status codes
- Logs full stack trace in development
- Hides details in production (security)
- Handles:
  - Stripe errors
  - CSRF validation failures
  - Database connection errors
  - Validation errors
  - Generic 500 errors

---

## Database Schema

### users
```sql
id (serial, primary key)
email (varchar 255, unique)
password_hash (varchar 255)
email_confirmed (boolean, default false)
email_token (varchar 255)  -- 64-char hex
token_expires_at (timestamp)
role (varchar 50, default 'user')
created_at (timestamp, default now)
```

### servers
```sql
id (serial)
user_id (foreign key)
status (varchar - running/stopped)
ip_address (varchar)
ssh_username (varchar)
ssh_password (varchar)
stripe_charge_id (varchar) -- links to payment
created_at (timestamp)
```

### deployments
```sql
id (serial)
server_id (foreign key)
user_id (foreign key)
git_url (text)
status (varchar - pending/in-progress/complete)
output (text - logs)
created_at (timestamp)
```

### domains
```sql
id (serial)
server_id (foreign key)
user_id (foreign key)
domain (varchar, unique)
ssl_enabled (boolean, default false)
created_at (timestamp)
```

### sessions
```sql
sid (varchar 255, primary key)
sess (json - session data)
expire (timestamp)
```

---

## Environment Variables

### Required for Development
```
STRIPE_SECRET_KEY       # Get from Stripe dashboard
DIGITALOCEAN_TOKEN      # Get from DO API tokens
NODE_ENV                # "development" for local
PORT                    # Usually 3000
DB_HOST                 # localhost
DB_PORT                 # 5432
DB_NAME                 # webserver_db
DB_USER                 # postgres
DB_PASSWORD             # your postgres password
SESSION_SECRET          # Random 128+ char string
```

### Required for Email
```
SMTP_HOST               # smtp.gmail.com (or your email provider)
SMTP_PORT               # 587 or 465
SMTP_USER               # your_email@gmail.com
SMTP_PASS               # App password (not your regular password!)
SMTP_FROM               # noreply@basement.local
APP_URL                 # http://localhost:3000 (or your domain)
```

---

## What Actually Gets Charged

**Stripe** (Each purchase)
- Payment processing fee (~2.9% + $0.30)
- You set the prices

**DigitalOcean** (Per server, per month)
- Basic: ~$6 (1GB droplet)
- Priority: ~$12 (2GB droplet)
- Premium: ~$24 (4GB droplet)
- Bandwidth and storage overages extra

**Gmail** (Free tier)
- 500 emails/day free
- Pay if you exceed

**Hosting** (Wherever you deploy)
- DigitalOcean App Platform: ~$5-12/month for your backend
- Or VPS: depends on provider

---

**TL;DR:** This is a real SaaS product. It handles auth, payments, email, infrastructure provisioning, and monitoring. You can actually launch this.
