# Clouded Basement — Technical Documentation

**Platform:** cloudedbasement.ca  
**Version:** Production (Current State)  
**Last Updated:** February 7, 2026

---

## 1. Overview

Clouded Basement is a cloud hosting platform that provisions, manages, and monitors virtual private servers on behalf of customers. It handles the full lifecycle from account creation through payment, server provisioning, application deployment, domain management, SSL certification, and server decommissioning.

The product category is **managed VPS hosting with automated provisioning**. It is not a container orchestrator, a serverless platform, or a PaaS with language-specific runtimes. Customers receive a full Ubuntu server with root SSH access, preconfigured with Nginx, Certbot, Node.js, Python, Go, and Rust.

### What It Does

- Accepts payment via Stripe and automatically provisions a DigitalOcean droplet
- Provides a web dashboard for deploying Git repositories, managing domains, enabling SSL, and controlling server power state
- Monitors trial expirations and subscription status, automatically powering off and eventually destroying unpaid servers
- Allows administrators to push validated bash scripts to customer servers for maintenance and security patching
- Provides automatic SSL certificate provisioning when DNS records are correctly configured

### What It Does Not Do

- Does not provide a language-specific runtime or build pipeline (customers manage their own application stack)
- Does not offer container orchestration, auto-scaling, or load balancing
- Does not manage DNS records on behalf of customers (only verifies configuration)
- Does not provide a CI/CD pipeline (GitHub webhook auto-deploy is a convenience feature, not a full CI system)

### Intended Audience

This document is written for engineers, security reviewers, and technical evaluators who need to understand the system's internal architecture, security boundaries, and operational behavior.

---

## 2. System Architecture

### Component Overview

The system is a monolithic Node.js application (Express 5.x) that serves both the user-facing web interface and the background processing logic in a single process.

**Primary Components:**

| Component | Responsibility |
|-----------|---------------|
| Express HTTP Server | Routes, middleware, session management, CSRF, rate limiting |
| Controllers (MVC) | Request handling, HTML rendering via template strings |
| Services | External API integration (DigitalOcean, Stripe, email), background jobs |
| PostgreSQL | All persistent state: users, servers, payments, domains, deployments, tickets, audit logs, sessions |
| DigitalOcean API | Droplet creation, destruction, power management, status polling |
| Stripe API | Subscription creation, payment processing, webhook events |
| SSH (ssh2) | Remote command execution on customer servers for deployments, SSL, updates |
| Email (SendGrid/SMTP) | Transactional emails: confirmations, server ready, trial warnings, deploy errors |

### Data Flow

```
Customer Browser
    │
    ▼
Express Server (index.js)
    ├── Static Assets (public/)
    ├── Middleware Chain: Helmet → Rate Limiter → Logger → Session → CSRF
    ├── Controllers → Services
    │       │
    │       ├── DigitalOcean API (droplet CRUD)
    │       ├── Stripe API (payments, subscriptions)
    │       ├── SSH2 (remote execution on customer servers)
    │       └── Email (SendGrid or SMTP)
    │
    └── PostgreSQL (all state)

Background Jobs (setInterval in same process):
    ├── syncDigitalOceanDroplets()    — every 1 hour
    ├── monitorSubscriptions()        — every 6 hours
    ├── checkAndProvisionSSL()        — every 5 minutes
    └── reconcileAllSSLStates()       — every 30 minutes
```

### Trust Boundaries

Three distinct trust levels exist:

1. **Public (unauthenticated):** Landing page, pricing, about, FAQ, docs, contact form, registration, login. Rate limited. No session required.

2. **Customer (authenticated):** Dashboard, deployments, domain management, server actions, ticket submission, password changes. Requires active session with confirmed email. All forms protected by CSRF tokens. Server actions are scoped to the user's own server via `user_id` checks in every query.

3. **Admin (authenticated + database-verified role):** User management, server destruction, update orchestration, domain management. The `requireAdmin` middleware queries the database on every request (no session cache) to prevent privilege escalation via stale session data.

### Why This Architecture

A monolith was chosen deliberately for operational simplicity at this scale. A single process handles HTTP requests and background jobs, eliminating the need for a job queue, message broker, or separate worker processes. PostgreSQL handles session storage, which means sessions survive server restarts without external infrastructure.

The tradeoff is that background jobs (sync, monitoring, SSL checks) run in the same event loop as request handling. At the current scale (single-digit to low double-digit customers), this is acceptable. If background job execution time becomes a concern, these can be extracted to a separate process using the existing service modules with no code changes to the business logic.

---

## 3. Core Features (Technical)

### 3.1 Server Provisioning

**What it does:** Creates a DigitalOcean droplet preconfigured with a development stack when a customer completes payment or starts a free trial.

**How it works internally:**

1. Payment confirmation arrives via Stripe webhook (`invoice.paid` or `payment_intent.succeeded`)
2. The webhook handler validates the payment amount against the pricing table and creates a payment record
3. `createRealServer()` is called with the user ID, plan, and Stripe references
4. A pre-existing server check prevents duplicates (`status NOT IN ('deleted', 'failed')`)
5. A DigitalOcean API call creates the droplet with a user-data bash script that installs: Node.js 20.x, NVM, Git, Nginx, Certbot, Python3, Rust, Go, UFW firewall, and sets the root password
6. The droplet ID and initial state are inserted into the `servers` table
7. A polling interval (`pollDropletStatus`) checks the DigitalOcean API every 10 seconds until the droplet reports `active` status with an assigned IP address (timeout: 5 minutes, max 30 attempts)
8. On success, the server record is updated to `running` and a welcome email with SSH credentials is sent

**Key constraints:**
- One active server per customer, enforced by a database unique constraint on `(user_id)` for non-deleted/failed servers
- Race conditions during concurrent provisioning are handled: a `23505` (unique violation) error triggers automatic destruction of the orphaned droplet
- If provisioning fails after payment, an automatic Stripe refund is issued and the payment status is updated to `refunded`

**Failure modes:**
- DigitalOcean API failure → server record saved as `failed`, refund issued
- Polling timeout → server marked `failed`
- Concurrent duplicate creation → orphaned droplet destroyed, existing server returned
- Maximum concurrent polls (50) exceeded → request rejected to prevent resource exhaustion

### 3.2 Git Deployment

**What it does:** Deploys a Git repository to a customer's server by cloning, building, and configuring Nginx.

**How it works internally:**

1. Customer submits a Git URL from the dashboard
2. The controller validates the URL format and checks the user owns the target server
3. A deployment record is created in the `deployments` table with status `deploying`
4. An SSH connection is established to the server using stored credentials
5. A bash script is executed that:
   - Clones the repository to `/var/www/<project-name>`
   - Auto-detects the project type (React, Vue, Node.js backend, Python, static HTML)
   - Installs dependencies (`npm install` / `pip install`)
   - Runs build commands if applicable (`npm run build`)
   - Generates and writes an Nginx configuration file
   - Reloads Nginx
6. Deployment output (stdout/stderr) is captured and stored
7. The deployment record is updated to `success` or `failed`

**Key constraints:**
- Deployments are rate limited: 5 per hour per user
- Site count is enforced per plan (Basic: 2, Pro: 5, Premium: 10)
- Only public Git URLs are supported (no private repository authentication)

**Failure modes:**
- SSH connection failure → deployment marked `failed` with error output
- Build failure → captured in deployment output, Nginx config not written
- Nginx reload failure → previous configuration preserved

### 3.3 Domain Management and SSL

**What it does:** Allows customers to associate custom domains with their server and automatically provisions SSL certificates.

**How it works internally:**

**Domain addition:**
1. Customer adds a domain from the dashboard
2. The domain is inserted into the `domains` table with `ssl_enabled = false`
3. The dashboard displays the server's IP address for DNS A record configuration

**Automatic SSL provisioning (background job):**
1. `checkAndProvisionSSL()` runs every 5 minutes
2. Queries all domains where `ssl_enabled = false` and the associated server is `running`
3. For each domain, performs a DNS A record lookup
4. If the domain resolves to the server's IP address:
   - SSHs into the server
   - Executes `certbot --nginx` with non-interactive flags
   - If certbot succeeds, configures a reverse proxy in the Nginx SSL server block
   - Updates the domain record: `ssl_enabled = true`

**SSL state reconciliation (background job):**
1. `reconcileAllSSLStates()` runs every 30 minutes
2. For each domain with SSL previously enabled, performs three checks:
   - **DNS resolution:** Does the domain still resolve to the server IP?
   - **Certificate existence:** Does the cert file exist on the server (via SSH)?
   - **TLS reachability:** Can a TLS handshake be completed?
3. Sets the computed SSL status: `active`, `orphaned`, `unreachable`, `pending`, or `none`
4. If all three checks pass, `ssl_enabled` remains `true`. Otherwise, it is set to `false`.

**Failure modes:**
- DNS not yet propagated → domain skipped, retried on next cycle
- Certbot rate limit exceeded → logged, retried on next cycle
- SSH connection failure → logged, domain status unchanged

### 3.4 Subscription Monitoring

**What it does:** Automatically manages server lifecycle based on payment status and trial expiration.

**How it works internally:**

The `monitorSubscriptions()` function runs every 6 hours and executes four checks in sequence:

1. **Trial warnings:** Finds servers between 1-2 days old with no payment. Sends the customer an email warning that their trial is ending. Marks the server as warned to prevent duplicate emails.

2. **Expired trials:** Finds servers older than 3 days with no payment that are still `running`. Powers off each server via the DigitalOcean API and updates status to `stopped`. Sends an admin notification.

3. **Failed payments:** Finds running servers older than 3 days with no successful payment in the last 35 days. Powers off the server and notifies admin.

4. **Destroy stopped servers:** Finds servers with `stopped` status and `updated_at` older than 7 days. Calls the DigitalOcean destroy API and deletes the server record from the database. Sends admin notification.

**Key constraints:**
- Each check is independent; failure in one does not prevent the others from running
- Email sending failures are caught and logged but do not block server management actions
- The 35-day payment window accounts for monthly billing cycles with grace period

### 3.5 Free Trial System

**What it does:** Provides a 3-day trial of the Basic plan without payment, with abuse prevention.

**How it works internally:**

Before provisioning a trial server, the system checks:
1. Email is confirmed
2. User has not already used their trial (`trial_used` flag)
3. No active server exists for this user
4. No other user from the same IP has used a trial in the past 90 days
5. No other user with the same browser fingerprint has used a trial in 90 days
6. Browser fingerprint is present (JavaScript required — prevents automated abuse)
7. Global daily trial cap (50/day) is not exceeded

If all checks pass, `createRealServer()` is called with no Stripe charge ID, which triggers trial mode internally. The `trial_used` flag is set atomically after successful server creation.

### 3.6 Payment Processing

**What it does:** Handles subscription-based payments via Stripe for three hosting plans.

**How it works internally:**

**Checkout flow:**
1. Customer selects a plan and payment interval (monthly/yearly) on `/pay`
2. The frontend submits to `createPaymentIntent`, which creates a Stripe Customer, a Price, and a Subscription with `payment_behavior: 'default_incomplete'`
3. The subscription's `client_secret` is returned to the frontend, which completes confirmation via Stripe Elements
4. Stripe processes the payment asynchronously and sends webhook events

**Webhook processing:**
- `invoice.paid` (primary path): Records payment, creates server on `billing_reason: subscription_create`
- `payment_intent.succeeded`: Backup path for non-subscription payments
- `checkout.session.completed`: Handles Stripe Checkout redirect flow
- `charge.refunded`: Marks payment refunded, destroys associated server
- `customer.subscription.deleted`: Destroys server, marks as deleted
- `invoice.payment_failed`: Logged for monitoring (Stripe handles retries)

**Key constraints:**
- Payment amounts are validated against the known pricing table before server creation
- Duplicate payment checks prevent double provisioning from redundant webhook deliveries
- The raw request body is preserved for Stripe signature verification (registered before `express.json()`)

---

## 4. Update Execution Model

The update system allows administrators to create, validate, test, and push bash scripts to customer servers.

### How Updates Are Created

1. An admin writes a bash script and submits it via the admin updates UI
2. The `scriptValidator` service validates the script against a catalog of dangerous patterns (fork bombs, `rm -rf /`, reverse shells, remote code execution, etc.)
3. If validation passes, `set -euo pipefail` is automatically prepended if absent
4. A SHA-256 hash of the final script is computed and stored alongside it
5. The update is saved with status `draft`

### How Updates Are Validated

Scripts are checked against 30+ dangerous pattern categories organized by severity:

- **Critical (blocked):** `rm -rf /`, fork bombs, reverse shells, `dd` to devices, `source <(curl ...)`
- **High (blocked unless whitelisted):** `chmod 777 /`, `shutdown`, `shadow` file access, `wget | sh`
- **Medium (warning):** `reboot`, `passwd` file access

Additional checks:
- Hardcoded secrets detection (passwords, API keys, tokens in plaintext)
- Infinite loop detection without break/exit
- Maximum script size: 50KB

Scripts cannot be edited after creation. To modify a script, a new update must be created. This is enforced by the immutable hash — before any execution, the script's SHA-256 hash is recomputed and compared against the stored hash using `crypto.timingSafeEqual()`.

### How Execution Is Triggered

Updates follow a strict workflow: **draft → tested → released → (pushed/archived)**

1. **Test (mandatory):** An admin selects a single running server and executes the script. Results (exit code, stdout, stderr, execution time) are recorded in the `server_update_tests` table. The update advances to `tested` only if the test exits with code 0.

2. **Release:** After at least one successful test, an admin can release the update. This makes it available for customer-initiated application and admin-initiated mass push.

3. **Customer application:** From the dashboard, customers can see pending updates and apply them to their own server.

4. **Admin push:** An admin can push a released update to all servers that have not yet received it. Execution is rate-limited (default: 5 concurrent SSH connections) with 1-second pauses between batches.

### How Failures Are Handled

- SSH connection timeout: 30 seconds
- Script execution timeout: 5 minutes
- Output truncation: 50KB maximum (stdout and stderr independently)
- Failed executions are logged with full error details and can be retried
- The admin UI shows success/failure/pending counts per update

### How Safety Is Enforced

- **Kill switch:** A global toggle that halts all update executions immediately. Checked before every SSH connection and before each batch during mass push. If activated mid-push, remaining servers are skipped.
- **Immutability:** Scripts cannot be modified after creation. Hash verification prevents tampering.
- **Mandatory testing:** The status workflow prevents releasing an untested script.
- **Audit trail:** Every execution is logged with the triggering user, trigger type (customer/admin_push/admin_retry), timestamps, exit codes, and output.
- **Atomic database operations:** Test result logging and status transitions use PostgreSQL transactions. Failed transactions roll back cleanly.

---

## 5. Security Model

### Authentication

**Password-based:** Passwords are hashed with bcrypt (10 rounds). Registration requires a server-generated verification code (6 alphanumeric characters displayed on-screen) to prevent automated bot signups. Email confirmation is required before accessing protected features.

**Google OAuth:** Passport.js with `passport-google-oauth20`. If a Google user's email matches an existing password account, the accounts are linked. New Google users are created with `email_confirmed = true`.

**Sessions:** Server-side sessions stored in PostgreSQL via `connect-pg-simple`. Cookies are HTTP-only, secure in production, SameSite=Lax, with 7-day rolling expiry. The cookie is named `sessionId` (not the default `connect.sid`).

**Password reset:** Generates a `crypto.randomBytes(32)` token, stores its SHA-256 hash in the database with a 1-hour expiry. The token is sent via email. On submission, the provided token is hashed and compared against the stored hash.

### Authorization Boundaries

- **Customer routes** are protected by `requireAuth`, which checks `req.session.userId`. All database queries additionally filter by `user_id` to prevent horizontal privilege escalation.
- **Admin routes** are protected by `requireAdmin`, which queries the database for the user's role on every request. Session role cache is never trusted. This prevents privilege escalation if an admin role is revoked while a session is active.

### CSRF Protection

All state-changing forms include a CSRF token generated by the `csurf` middleware. Token verification occurs server-side before any POST handler executes. The Stripe webhook and GitHub webhook endpoints are exempt (they use their own signature verification).

### SSH Execution Model

All remote operations (deployments, SSL provisioning, server updates, database setup) execute via SSH using the `ssh2` library. Credentials (root password) are generated during provisioning with `crypto.randomBytes(16)` and stored in the `servers` table.

SSH connections have explicit timeouts:
- Connection timeout: 30 seconds
- Execution timeout: 5 minutes (updates), 2 minutes (SSL), 10 minutes (deployments)
- Output is truncated at 50KB to prevent memory exhaustion

Domain names used in SSH commands are validated against RFC 1123 patterns before interpolation to prevent command injection.

### Secrets Handling

- All secrets are stored in environment variables loaded via `dotenv`
- SSH passwords are stored in the database (encrypted at rest by PostgreSQL if configured)
- Stripe webhook signatures are verified using the raw request body
- GitHub webhook signatures are verified using HMAC SHA-256
- The `.env` file is gitignored

### Rate Limiting

| Endpoint Category | Window | Max Requests |
|------------------|--------|-------------|
| General (non-GET) | 15 min | 300 |
| Contact form | 1 hour | 5 |
| Payment | 15 min | 10 |
| Email verification | 1 hour | 5 |
| Deployments | 1 hour | 5 per user |

Rate limiting uses `express-rate-limit` with `trust proxy` enabled for correct client IP detection behind Nginx.

### HTTP Security Headers

Helmet.js is applied globally with `contentSecurityPolicy` disabled to permit Stripe's inline script requirements. All other Helmet defaults are active (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, etc.).

### Abuse Prevention (Trials)

Trial abuse is prevented through layered checks:
- One trial per user account
- One trial per IP address per 90 days
- One trial per browser fingerprint per 90 days
- Browser fingerprint required (JavaScript must be enabled)
- Disposable email addresses are blocked (checked against a known list)
- Global daily trial cap of 50

### Error Monitoring

Sentry is integrated for production error tracking and performance profiling. Initialization occurs before any other imports to ensure all unhandled exceptions are captured.

### Audit Logging

Admin actions (user deletion, role changes) are recorded in the `admin_audit_log` table. Update executions are logged in `server_update_log` with full output capture. Security-relevant events are stored in the `security_events` table with IP address, user agent, and JSONB details.

---

## 6. Data Model Overview

### Key Entities

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| `users` | Customer and admin accounts | email, password_hash, role, email_confirmed, trial_used, google_id, browser_fingerprint, signup_ip |
| `servers` | Provisioned VPS instances | user_id, plan, status, ip_address, ssh_password, droplet_id, is_trial, site_limit, stripe_subscription_id |
| `payments` | Payment records | user_id, stripe_payment_id, amount, plan, status, payment_interval |
| `deployments` | Git deployment history | server_id, user_id, git_url, status, output |
| `domains` | Custom domains | server_id, user_id, domain, ssl_enabled, ssl_status, ssl_dns_valid, ssl_cert_exists |
| `support_tickets` | Customer support requests | user_id, subject, description, priority, status |
| `server_updates` | Admin-created update scripts | title, script, script_hash, type, status, is_critical, created_by |
| `server_update_log` | Execution history per server per update | server_id, update_id, status, output, exit_code, triggered_by |
| `server_update_tests` | Test results before release | update_id, server_id, tested_by, success, stdout, stderr |
| `session` | HTTP sessions (connect-pg-simple) | sid, sess (JSON), expire |

### Important Invariants

- A user can have at most one server with `status NOT IN ('deleted', 'failed')`. This is enforced by a unique constraint and checked in application code before provisioning.
- A server's `droplet_id` is the authoritative link to the DigitalOcean resource. If the droplet no longer exists on DigitalOcean's side, the periodic sync deletes the server record.
- Payment amounts must match the pricing table. The webhook handler validates `amount` against `PRICING_PLANS` before accepting a payment.
- Update scripts are immutable after creation. The `script_hash` field stores a SHA-256 hash computed at creation time and verified before every execution.
- The `server_update_log` table has a unique constraint on `(server_id, update_id)`. Re-execution of the same update on the same server increments the `retry_count` via `ON CONFLICT DO UPDATE`.

### Lifecycle of Critical Records

**Server lifecycle:**
```
provisioning → running → stopped → [deleted]
                    ↑         ↓
                    └── running (if payment received)
                    
provisioning → failed → [remains in DB for audit]
```

State transitions:
- `provisioning → running`: Polling detects active droplet with IP
- `provisioning → failed`: Polling timeout or API error
- `running → stopped`: Trial expiry, payment failure, or admin action
- `stopped → deleted`: 7 days without payment (automatic) or admin destruction
- Any state → record removed: Admin destroy or DO sync detects missing droplet

**Update lifecycle:**
```
draft → tested → released → archived
  ↓                           ↓
deleted                    deleted
```

Only `released` updates can be executed on customer servers. Only `draft` and `archived` updates can be deleted.

### Data Integrity

- All database queries use parameterized statements (`$1`, `$2` notation) to prevent SQL injection
- Concurrent server creation uses PostgreSQL unique constraints with application-level race condition handling
- Database transactions are used for multi-step operations (update testing, payment recording)
- Database migrations run automatically on server start via `runMigrations()`

---

## 7. Operational Behavior

### Normal Operation

The application starts by running pending database migrations, then binds to the configured port. Background jobs are scheduled with staggered initial delays:

| Job | Interval | Initial Delay | Purpose |
|-----|----------|---------------|---------|
| DigitalOcean sync | 1 hour | 30 seconds | Detects droplets deleted outside the platform |
| Subscription monitor | 6 hours | 60 seconds | Trial expiry, payment enforcement, server destruction |
| Auto-SSL check | 5 minutes | 2 minutes | Provisions certificates for domains with correct DNS |
| SSL reconciliation | 30 minutes | 3 minutes | Verifies existing certificates are still valid |

The health check endpoint (`GET /health`) verifies database connectivity and returns uptime, environment, and database status. It returns 200 for healthy state and 503 for degraded (database unreachable).

### Admin Workflows

**Server management:**
- View all users, servers, domains, deployments, and payments from `/admin`
- Destroy a customer's server (calls DigitalOcean API, then deletes DB record). Handles already-deleted droplets gracefully.
- Cancel provisioning for stuck servers (sets status to `failed`)
- Delete stale server records that are already marked as `deleted`

**Update orchestration:**
- Create an update script (validated and hashed) → test on one server → release → push to all or let customers apply → archive when no longer needed
- Kill switch halts all executions globally
- Failed servers can be retried individually

### Customer Workflows

**Typical journey:**
1. Register (email + password or Google OAuth) → confirm email
2. Start free trial or select plan and pay via Stripe
3. Wait for server provisioning (~2-5 minutes)
4. Deploy a Git repository from the dashboard
5. Add a custom domain → configure DNS → SSL auto-provisions
6. Manage server (restart, add more sites, install databases)
7. Apply platform updates from the dashboard when available

**Dashboard capabilities:**
- View server status, IP address, SSH credentials
- Deploy Git repositories (with auto-detection of project type)
- View deployment history and output logs
- Add and manage custom domains
- Enable SSL (automatic when DNS is configured)
- Install PostgreSQL or MongoDB on the server
- Submit support tickets
- Change password
- Apply pending platform updates

### Failure Scenarios

**Server provisioning failure:**
- Automatic Stripe refund is issued
- Server record is saved with status `failed` for audit
- Customer sees error message on dashboard

**Deployment failure:**
- Deployment record captures full error output
- Nginx configuration is not modified (previous config preserved)
- Customer can view error logs and retry

**Payment webhook delivery failure:**
- Stripe retries webhook delivery with exponential backoff
- Duplicate payment checks prevent double provisioning on retry

**DigitalOcean API outage:**
- Sync job logs errors and retries on next cycle
- Server status may be temporarily stale (up to 1 hour)
- Provisioning failures trigger automatic refunds

**Email service failure:**
- Email sending failures are caught and logged but do not block critical operations
- Server provisioning, trial management, and payment processing continue even if email fails

### Recovery and Retry

- The DigitalOcean sync job runs hourly and reconciles database state against actual droplet existence. Stale records are automatically removed.
- The subscription monitor runs every 6 hours and is idempotent; running it multiple times produces the same result for a given server state.
- Failed update executions are logged and can be retried from the admin UI.
- The polling system for new droplets has a hard 5-minute timeout. After timeout, the server is marked `failed` and can be manually investigated.

---

## 8. Deployment & Environment

### Runtime Requirements

- **Node.js:** 20.x or later
- **PostgreSQL:** 14 or later
- **OS:** Ubuntu 22.04 (production), any OS for development
- **Process Manager:** systemd (production)
- **Reverse Proxy:** Nginx (production)

### Environment Configuration

All configuration is managed through environment variables loaded from a `.env` file via `dotenv`. Required variables:

| Variable | Purpose |
|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `SESSION_SECRET` | Express session encryption |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | Stripe payment processing |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `DIGITALOCEAN_TOKEN` | DigitalOcean API authentication |
| `SENDGRID_API_KEY` or SMTP variables | Email delivery |
| `NODE_ENV` | `production` or `development` |
| `PORT` | Server port (default: 3000) |
| `SENTRY_DSN` | Error monitoring (optional) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) |
| `ADMIN_EMAIL` | Recipient for admin notifications |

### Email Provider Priority

The email service selects a provider based on which credentials are configured, in order:
1. **SendGrid** (API-based, highest priority)
2. **Gmail OAuth2**
3. **Mailtrap** (sandbox/testing)
4. **SMTP** (generic)
5. **None** (emails fail with log warning)

### Production Deployment

The application runs on a single Ubuntu server managed by systemd.

**Deploy process:**
```
ssh deploy@<server-ip>
cd /path/to/app
git pull origin main
sudo systemctl restart cloudedbasement.service
```

**Verification:**
```
journalctl -u cloudedbasement.service -f   # Check logs for errors
curl https://cloudedbasement.ca/health     # Verify health endpoint
```

**Nginx configuration:** Nginx serves as a reverse proxy, terminating TLS and forwarding requests to the Node.js process on port 3000. The `trust proxy` setting is enabled in Express to correctly resolve client IP addresses from `X-Forwarded-For` headers.

### Graceful Shutdown

On `SIGTERM` or `SIGINT`:
1. Active polling intervals are cleared (prevents orphaned setInterval references)
2. The HTTP server stops accepting new connections
3. The database connection pool is drained
4. The process exits with code 0

---

## 9. Limitations & Non-Goals

### Intentional Non-Goals

- **No container support.** Customers receive a traditional VM. Container orchestration, Docker management, and Kubernetes are out of scope.
- **No auto-scaling.** Each customer gets one server. Vertical scaling requires a plan upgrade (manual migration).
- **No multi-region.** All droplets are provisioned in `nyc3`. Region selection in the request form is recorded but not honored by the provisioning code.
- **No private Git repository support.** Deployments clone from public URLs only. SSH key-based or token-based Git authentication is not implemented.
- **No real-time log streaming.** Deployment output is captured after execution completes and displayed statically.
- **No in-app ticket replies.** Support tickets are submitted via the dashboard but admin responses are handled via email.
- **No automated database backups.** DigitalOcean backups are enabled for Pro and Premium plans at the droplet level. Application-level database backup scheduling is not implemented.

### Known Constraints

- **Single server per customer.** The data model and provisioning logic enforce one active server per user. Multi-server accounts would require schema and workflow changes.
- **Background jobs share the main process.** Long-running SSH operations during mass update pushes could reduce HTTP request throughput. At current scale, this is not observable.
- **SSH credentials stored in plaintext.** Server root passwords are stored unencrypted in the `servers` table. They are generated with high entropy (128 bits) but are not encrypted at the application layer. PostgreSQL disk encryption is relied upon for at-rest protection.
- **No horizontal scaling.** The application is a single-instance monolith. Session stickiness, shared state, and background job coordination would be required for multi-instance deployment.
- **SSL provisioning requires SSH access.** If a server's SSH connection is unavailable (network issue, changed credentials), SSL cannot be provisioned or verified.
- **Email delivery is best-effort.** Transactional email failures are logged but do not trigger retries. Critical operations (provisioning, billing) do not depend on email success.

### Tradeoffs Made

| Decision | Benefit | Cost |
|----------|---------|------|
| Monolithic architecture | Simple deployment, no infrastructure dependencies | Cannot scale horizontally |
| Server-rendered HTML | No frontend build step, fast page loads | More verbose controller code |
| PostgreSQL for sessions | Sessions survive restarts, no Redis needed | Slightly higher latency than in-memory stores |
| One server per customer | Simple billing and provisioning logic | Cannot serve customers needing multiple environments |
| Immutable update scripts | Prevents post-approval tampering | Requires creating a new update for any script change |

---

## 10. Maintenance & Extensibility

### Codebase Structure

```
index.js                    — Application entry point, middleware, route definitions, background jobs
controllers/
  authController.js         — Registration, login, email confirmation, password reset, Google OAuth
  dashboardController.js    — Customer dashboard rendering and actions
  serverController.js       — Server power management, deployments, domains, SSL, databases
  paymentController.js      — Stripe checkout, webhook handling, payment recording
  adminController.js        — Admin dashboard, user/server management
  adminUpdatesController.js — Update orchestration UI
  gettingStartedController.js — Post-signup onboarding wizard
  githubWebhookController.js  — GitHub webhook auto-deploy
  domainController.js       — Admin domain management
  pagesController.js        — Re-export facade for individual page controllers
  pages/                    — Individual static page controllers (about, pricing, terms, etc.)
services/
  digitalocean.js           — DigitalOcean API: create/destroy/sync droplets, poll status
  email.js                  — Email abstraction over SendGrid/SMTP/Mailtrap
  subscriptionMonitor.js    — Trial expiry, payment enforcement, server lifecycle
  serverUpdates.js          — Update CRUD, testing, execution, mass push
  scriptValidator.js        — Bash script safety validation
  autoSSL.js                — Automatic SSL certificate provisioning
  sslVerification.js        — SSL state reconciliation
  auditLog.js               — Admin audit trail
  googleAuth.js             — Passport.js Google OAuth strategy
  dns.js                    — DNS resolution utilities
middleware/
  auth.js                   — requireAuth, requireAdmin
  rateLimiter.js            — Rate limiting configurations
  errorHandler.js           — Global Express error handler
  logger.js                 — Request logging
utils/
  emailToken.js             — Confirmation code generation and validation
  emailValidation.js        — Disposable email detection
  nginxTemplates.js          — Nginx configuration generators
  db-helpers.js             — Reusable database query patterns
migrations/                  — Sequential database migrations (auto-run on startup)
db/schema/                   — SQL schema definitions
```

### Where Changes Are Safest

- **Adding a new static page:** Create a controller in `controllers/pages/`, add to `pagesController.js` re-exports, add a route in `index.js`. Low risk, no side effects.
- **Modifying email templates:** Edit the HTML string in `services/email.js`. No logic changes.
- **Adjusting rate limits:** Edit constants in `middleware/rateLimiter.js`. Immediate effect on restart.
- **Adding a new migration:** Create a sequential file in `migrations/`. Auto-runs on next startup.
- **Changing pricing:** Update `PRICING_PLANS` in `paymentController.js`. Stripe Products/Prices must also be updated.

### Where Changes Are Risky

- **`services/digitalocean.js` (createRealServer):** This function handles payment refunds, race condition detection, and droplet lifecycle. Changes here can result in double-billing, orphaned droplets, or lost refunds.
- **`paymentController.js` (stripeWebhook):** Payment webhook handling is the financial core. Incorrect validation or duplicate detection changes can cause billing errors.
- **`services/subscriptionMonitor.js`:** Controls automatic server destruction. An incorrect query condition could destroy paid servers or leave expired trials running.
- **`index.js` (middleware order):** The order of middleware registration matters. Stripe and GitHub webhooks must be registered before `express.json()`. CSRF must follow session initialization. Reordering can break signature verification or session handling.
- **Database schema changes:** Backward-incompatible schema changes require careful migration planning. The `servers` table's unique constraint on active servers is load-bearing.

### For Future Developers

The application follows an MVC pattern with template-string rendering (no view engine). Controllers handle both business logic and HTML generation. Services encapsulate external API interactions and background processing.

All database queries use parameterized statements. Queries are inline in controllers and services (not abstracted into a repository layer). To find where a table is queried, search for its name across the codebase.

Background jobs are registered as `setInterval`/`setTimeout` calls at the bottom of `index.js`. They share the main event loop. If a job needs to be extracted to a separate process, the underlying service function can be called from a standalone script with no code changes.

The migration system in `migrations/run-migrations.js` tracks applied migrations in a `migrations` table. Migrations run sequentially on startup. Each migration file exports a function that receives the database pool.

---

Documentation Status: COMPLETE  
Scope: Production System (Current State)
