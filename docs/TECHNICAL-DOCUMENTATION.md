# Clouded Basement — Technical Documentation

**Platform:** cloudedbasement.ca
**Runtime:** Node.js / Express 5.2.1
**Last Updated:** February 7, 2026
**Source:** Direct codebase review of all controllers, services, middleware, utilities, and route definitions.

---

## 1. Product Overview

Clouded Basement is a managed VPS hosting platform. It accepts payment, provisions a DigitalOcean droplet preconfigured with a development environment, and provides a web dashboard for deploying code, managing domains, enabling SSL, and controlling server state.

It belongs to the class of **managed VPS hosting with automated provisioning**. The closest comparisons are services that automate server setup and provide deployment tooling on top of standard virtual machines.

**Problems it solves:**
- Eliminates manual server setup (OS configuration, package installation, firewall rules, web server configuration)
- Provides one-click Git deployment for multiple languages and frameworks
- Automates SSL certificate provisioning and renewal
- Handles subscription billing and server lifecycle enforcement (trial expiry, payment failures, cleanup)

**What it does not attempt to solve:**
- Container orchestration or Docker management
- Auto-scaling or load balancing
- CI/CD pipelines (GitHub webhook auto-deploy is a deployment trigger, not a build/test pipeline)
- Multi-region deployment (all droplets are provisioned in nyc3)
- Private Git repository deployment (only public repositories are supported)
- DNS management (customers must configure their own DNS records)

**Intended audience for this document:** Engineers, security reviewers, operators, and developers who need to understand the system without access to the original author.

---

## 2. High-Level Architecture

### Major Components

The system is a single-process Node.js application (Express 5.x) that handles HTTP requests and runs background jobs in the same event loop.

| Component | Role |
|-----------|------|
| Express HTTP server | Routes, middleware chain, session management, CSRF, rate limiting |
| Controllers (MVC) | Request handling, HTML rendering via template strings |
| Services | External API integration, background job logic |
| PostgreSQL | All persistent state: users, servers, payments, domains, deployments, tickets, updates, sessions |
| DigitalOcean API | Droplet creation, destruction, power management, status polling, DNS record management |
| Stripe API | Subscription creation, payment processing, webhook events, refunds |
| SSH (ssh2 library) | Remote command execution on customer servers |
| Email (SendGrid / SMTP) | Transactional emails |
| Sentry | Error monitoring and performance profiling |

### How They Interact

```
Browser → Express (middleware chain) → Controller → Service → External API
                                          ↓
                                      PostgreSQL

Background Jobs (setInterval, same process):
  ├── syncDigitalOceanDroplets    — hourly
  ├── monitorSubscriptions        — every 6 hours
  ├── checkAndProvisionSSL        — every 5 minutes
  └── reconcileAllSSLStates       — every 30 minutes
```

The Express server handles all HTTP traffic. Controllers contain business logic and render HTML using template string functions from `helpers.js`. Services encapsulate interactions with external APIs (DigitalOcean, Stripe, email providers) and background processing logic.

Background jobs run as `setInterval` calls registered at the bottom of `index.js`. They share the main event loop with HTTP request handling.

### Trust Boundaries

**Public (unauthenticated):** Landing page, pricing, about, FAQ, docs, contact form, registration, login, health check. Rate limited by IP.

**Customer (authenticated):** Dashboard, deployments, domain management, server actions, ticket submission, auto-deploy configuration, credential access, update application. Requires active session with confirmed email. All database queries filter by `user_id` to prevent horizontal privilege escalation. All state-changing forms protected by CSRF tokens.

**Admin (authenticated + database-verified role):** User management, server destruction, update orchestration, domain CRUD. The `requireAdmin` middleware queries the database for the user's role on every request. It never trusts session-cached role data. If the user record no longer exists, the session is destroyed.

**Customer servers:** The platform connects to customer servers via SSH using stored root credentials. SSH access is used for deployments, SSL provisioning, database setup, and platform updates. Customers retain full root access and can change credentials at any time.

**Third-party services:** Stripe webhook payloads are verified using raw body signature verification. GitHub webhook payloads are verified using HMAC SHA-256 signature comparison. Both webhook endpoints are registered before the global `express.json()` middleware to preserve the raw request body.

### Why This Structure

A monolith was chosen for operational simplicity. A single process handles HTTP and background work, eliminating the need for a job queue, message broker, or separate worker process. PostgreSQL stores sessions, which means sessions survive restarts without Redis or other external session infrastructure.

The tradeoff is that background jobs (especially mass SSH operations during update pushes) run in the same event loop as request handling.

---

## 3. Authentication & Account Lifecycle

### Registration

Two registration paths exist:

**Email + password:**
1. User submits email, password, and a bot verification code (displayed on-screen, stored in session)
2. Email is validated: checked against 22 known disposable email providers, 11 fake/test domains, and DNS MX record resolution
3. IP address and browser fingerprint are recorded for trial abuse prevention
4. Password is hashed with bcrypt (10 rounds)
5. A 6-digit confirmation code is generated using `crypto.randomBytes` and stored with a 4-minute expiry
6. Confirmation email is sent asynchronously (does not block registration)
7. Session is created and user is redirected to dashboard

**Google OAuth:**
1. Passport.js with `passport-google-oauth20` strategy
2. On callback: checks for existing user by `google_id`, then by email (links accounts if found), then creates new user
3. New Google users are created with `email_confirmed = true` (no verification step)
4. Session is created with user ID, email, role, and confirmation status

### Login

Email + password login performs a constant-time bcrypt comparison. If the user does not exist, a dummy hash is compared to prevent timing-based user enumeration. On success, the session is regenerated. Admins are redirected to `/admin`, regular users to `/dashboard`.

Google OAuth login follows the same callback flow as registration.

### Email Verification

After registration, users must confirm their email by entering the 6-digit code sent to them. The code is generated with `crypto.randomBytes` and expires after 4 minutes. Users can request a new code, which generates a fresh code and resets the expiry. A rate limiter allows 5 verification attempts per hour.

Note: `constants.js` defines `TOKEN_EXPIRY_MINUTES` as 10, but `emailToken.js` implements a 4-minute expiry. The code-level behavior (4 minutes) is the actual behavior.

### Password Reset

1. User submits email to `/forgot-password`
2. A 32-byte random token is generated with `crypto.randomBytes`, hashed with SHA-256, and stored in the database with a 1-hour expiry
3. The unhashed token is sent via email as a URL parameter
4. On submission, the provided token is hashed and compared against the stored hash
5. The same success message is shown regardless of whether the email exists (prevents enumeration)

### Session Handling

- Sessions are stored server-side in PostgreSQL via `connect-pg-simple`
- Cookie: HTTP-only, secure in production, SameSite=Lax, 7-day rolling expiry
- Cookie name: `sessionId` (not the default `connect.sid`)
- Domain scoped to `cloudedbasement.ca` in production
- Sessions survive server restarts

### Abuse Prevention

- Bot verification code required during registration (server-generated, displayed on-screen)
- Disposable email blocking: 22 known providers checked
- Fake domain blocking: 11 test/example domains checked
- MX record validation: DNS lookup confirms the email domain accepts mail
- IP address and browser fingerprint recorded at registration for trial abuse tracking
- Rate limiting on email verification: 5 attempts per hour
- Rate limiting on contact form: 5 per hour
- General rate limiter: 300 non-GET requests per 15 minutes

---

## 4. Server Provisioning & Lifecycle

### Provisioning Triggers

A server is provisioned when:
- A Stripe `invoice.paid` webhook fires with `billing_reason: 'subscription_create'`
- A `payment_intent.succeeded` webhook fires and no server exists for the user
- A `checkout.session.completed` webhook fires and no server exists for the user
- A user starts a free trial via `/start-trial`

### Plan Constraints

| Plan | Monthly | Yearly | CPU | RAM | Disk | Site Limit | DO Size |
|------|---------|--------|-----|-----|------|------------|---------|
| Basic | $15 | $162 | 1 | 1 GB | 25 GB | 2 | s-1vcpu-1gb |
| Pro | $35 | $378 | 2 | 2 GB | 60 GB | 5 | s-2vcpu-2gb |
| Premium | $75 | $810 | 2 | 4 GB | 80 GB | 10 | s-2vcpu-4gb |

Yearly pricing reflects a 10% discount. Prices are defined in `constants.js` as `PRICING_PLANS`.

### Provisioning Process

1. `createRealServer()` checks for an existing active server (`status NOT IN ('deleted', 'failed')`)
2. A root password is generated with `crypto.randomBytes`
3. A DigitalOcean API call creates the droplet in `nyc3` with a user-data script that installs: Node.js 20.x, NVM, Python3, Go 1.21.6, Rust (via rustup), Nginx, Certbot, Git, wget, curl, and configures UFW (ports 22, 80, 443)
4. The droplet ID and initial state are inserted into the `servers` table with status `provisioning`
5. `pollDropletStatus` checks the DigitalOcean API every 10 seconds until the droplet reports `active` status with an assigned IP address
6. Polling timeout: 5 minutes (max 30 attempts)
7. Maximum concurrent polls: 50 (prevents resource exhaustion)
8. On success: server status updated to `running`, welcome email sent with IP and dashboard link (SSH credentials shown only in dashboard, not emailed)

### Race Condition Handling

One server per customer is enforced by a database unique constraint on the `servers` table (for non-deleted/failed servers) and an application-level check before provisioning.

If a concurrent request creates a duplicate (PostgreSQL error code `23505` — unique violation), the orphaned droplet is destroyed via the DigitalOcean API and the existing server record is returned.

### Failure Handling and Refunds

If provisioning fails (API error, polling timeout):
- Server record is saved with status `failed`
- An automatic Stripe refund is issued
- Payment status is updated to `refunded`

### Server Lifecycle

```
provisioning → running → stopped → [record deleted]
                  ↑         ↓
                  └── running (if payment resumes)

provisioning → failed → [remains in DB for audit]
```

**State transitions:**
- `provisioning → running`: Polling detects active droplet with assigned IP
- `provisioning → failed`: Polling timeout or DigitalOcean API error
- `running → stopped`: Trial expiry (3 days), payment failure (35-day grace), or admin action
- `stopped → record deleted`: 7 days without payment (automatic via subscription monitor) or admin destruction
- Any state → record removed: Admin destroy (calls DigitalOcean API, then deletes DB record) or hourly sync detects missing droplet

### Deletion and Cleanup

- Customer-initiated deletion: cancels Stripe subscription, destroys DigitalOcean droplet, marks server as `deleted`, sends admin notification email
- Admin destruction: calls `destroyDropletByServerId` which looks up the droplet ID, destroys via DO API (handles 404 gracefully), then deletes the DB record
- Hourly sync (`syncDigitalOceanDroplets`): fetches all DigitalOcean droplets tagged `basement-server`, compares against DB records, deletes stale server records whose droplets no longer exist (matches by `droplet_id` first, then by name pattern)
- Subscription monitor: destroys servers stopped for 7+ days

---

## 5. Deployment System

### Supported Repository Providers

- GitHub (uses tarball API for faster cloning)
- GitLab (git clone over HTTPS)
- Bitbucket (git clone over HTTPS)
- Codeberg (git clone over HTTPS)
- SourceHut (git clone over HTTPS)

Only public repositories are supported. Private repository authentication (SSH keys, tokens) is not implemented.

### SSRF and Abuse Protections

Git URLs are validated against a whitelist of trusted hosts. Private IP addresses are blocked to prevent server-side request forgery. Git URL format is validated before any SSH connection is made.

### Project Type Detection

After cloning, the deployment system inspects the repository root and detects project type in this priority order:

1. **React/Vue frontend** — `package.json` detected with build output. Runs `npm install` (with `--legacy-peer-deps` fallback), attempts `npm run build` / `npm run prod` / `npm run production`. Looks for built assets in `dist/`, `build/`, or `out/`. Configures Nginx for SPA routing.

2. **Node.js backend** — `package.json` present with server entry point (`server.js`, `app.js`, `index.js`). Runs `npm ci --production`, creates systemd service, configures Nginx reverse proxy on port 3000.

3. **Python** — `requirements.txt` or `setup.py` present. Creates virtual environment, installs dependencies via pip3. Configures Gunicorn as WSGI server with 4 workers, Nginx reverse proxy on port 8000.

4. **Rust** — `Cargo.toml` present. Builds with `cargo build --release`. Creates systemd service, Nginx reverse proxy on port 8080.

5. **Go** — `go.mod` present. Builds with `go build`. Creates systemd service, Nginx reverse proxy on port 8080.

6. **Static HTML** — `index.html` present. Copies files to `/var/www/html`. No build step.

### Deployment Pipeline

1. Customer submits Git URL from dashboard
2. URL validated against trusted host whitelist + private IP block
3. Site limit checked against plan (Basic: 2, Pro: 5, Premium: 10)
4. Subdomain generated: `{repo-name}-{userId}.cloudedbasement.ca`
5. DNS A record created via DigitalOcean DNS API
6. Deployment record created with status `deploying`
7. SSH connection established to customer server
8. Repository cloned, project type detected, dependencies installed, build executed
9. Nginx configuration generated from validated templates (`utils/nginxTemplates.js`)
10. Nginx reloaded
11. Health check performed (HTTP request to verify response)
12. Deployment record updated to `success` or `failed`
13. Full stdout/stderr output captured and stored

Deployments run asynchronously. The HTTP response returns immediately after step 6. The dashboard polls `/api/deployment-status/:id` for progress.

Rate limit: 5 deployments per hour per user (keyed by `userId`, not IP).

### Environment Variable Handling

Environment variables can be configured through the dashboard. The platform creates a `.env` file in the project directory before starting the application. Values are shell-escaped to prevent injection. Common secret patterns (Stripe keys, AWS credentials, database URLs, GitHub tokens) are sanitized from deployment output logs.

### GitHub Auto-Deploy (Webhooks)

**Server-wide auto-deploy:**
- Enabling generates a 32-byte cryptographic webhook secret stored in the database
- Dashboard displays the webhook URL (`https://cloudedbasement.ca/webhook/github/{serverId}`) and secret
- Customer adds this as a webhook in their GitHub repository settings

**Per-domain auto-deploy:**
- Each domain can have its own auto-deploy toggle with a separate webhook secret
- Webhook URL: `https://cloudedbasement.ca/webhook/github/{serverId}/{domainId}`
- Requires the domain to have a linked subdomain (from a previous deployment)

**Webhook processing:**
1. Verifies HMAC SHA-256 signature from the `X-Hub-Signature-256` header against the stored secret
2. Only processes `push` events
3. Only triggers on pushes to `main` or `master` branch
4. Calls `triggerAutoDeploy` (server-wide) or `triggerDomainAutoDeploy` (per-domain) which creates a deployment record and runs `performDeployment` asynchronously
5. Returns deployment ID on success

### Deployment Deletion

Deleting a deployment removes the associated DNS A record (subdomain) via the DigitalOcean DNS API and deletes the deployment record from the database.

---

## 6. Domain & SSL Management

### Domain Association

Customers add custom domains from the dashboard. The domain is inserted into the `domains` table with `ssl_enabled = false`. The dashboard displays the server's IP address so the customer can configure their DNS A record.

Domain names are validated against RFC 1123 patterns (max 253 characters) before being used in any SSH commands or Nginx configurations.

### SSL Provisioning

Two paths exist for SSL provisioning:

**Manual trigger (customer-initiated):**
1. Customer clicks "Enable SSL" on the dashboard for a specific domain
2. The system validates the domain format, verifies ownership, and checks the server is running
3. Responds immediately to the HTTP request
4. In the background: determines deployment type (static vs node), generates Nginx configuration from `nginxTemplates.js`, SSHes into the server, writes the configuration, enables the site, reloads Nginx, then runs `certbot --nginx` for the Let's Encrypt certificate
5. On success: updates `domains.ssl_enabled = true`

**Automatic background job (`checkAndProvisionSSL`, every 5 minutes):**
1. Queries all domains where `ssl_enabled = false` and the associated server is `running`
2. For each domain: resolves DNS A records via Node.js `dns.promises`
3. If the domain resolves to the server's IP address: SSHes into the server, runs `certbot --nginx` with non-interactive flags, injects a reverse proxy configuration into the Nginx config, updates the domain record
4. If DNS does not match: domain is skipped, retried on next cycle

### SSL State Reconciliation (`reconcileAllSSLStates`, every 30 minutes)

For each domain where `ssl_status != 'none'` or `ssl_enabled = true`, performs three checks:

1. **DNS resolution:** Does the domain's A record resolve to the server IP?
2. **Certificate file existence:** Does `/etc/letsencrypt/live/{domain}/fullchain.pem` exist on the server? (checked via SSH)
3. **TLS reachability:** Can a TLS handshake on port 443 complete? (checked via Node.js `https` with `rejectUnauthorized: false`, 10-second timeout)

Based on results, sets `ssl_status` to one of:
- `active` — all three checks pass
- `orphaned` — cert exists but DNS does not point to the server
- `unreachable` — DNS points to server but TLS handshake fails
- `pending` — DNS points to server but no certificate file found
- `none` — no DNS match and no certificate

If all three checks pass, `ssl_enabled` remains `true`. Otherwise, `ssl_enabled` is set to `false`.

A 2-second pause is inserted between domain checks to rate-limit SSH connections.

### Failure and Recovery

- DNS not yet propagated: domain skipped, retried on next 5-minute cycle
- Certbot rate limit exceeded: logged, retried on next cycle
- SSH connection failure: logged, domain status unchanged
- Certificate expiry: detected by reconciliation job (TLS handshake fails or cert file missing), `ssl_enabled` reset to `false`, auto-SSL job will re-provision on next cycle if DNS is correct

---

## 7. Dashboard Capabilities

The dashboard (`/dashboard`) is rendered by `dashboardController.showDashboard`, which queries the database for the user's server, payments, deployments, domains, tickets, pending updates, update history, and trial eligibility.

### Server Visibility

- Server status, IP address (IPv4), plan name, site limit
- Server uptime is not tracked by the platform (DigitalOcean monitors that)

### Credential Access

- SSH credentials: root username and password (displayed on demand via `/api/credentials?type=ssh`)
- PostgreSQL credentials: if database was set up via the platform (via `?type=postgres`)
- MongoDB credentials: if database was set up via the platform (via `?type=mongodb`)
- Credential access is logged for audit purposes

### Deployment History

- List of all deployments with Git URL, status, timestamp
- Full deployment output (stdout/stderr) viewable per deployment
- Delete deployment (removes DNS record and DB entry)

### Domain Management

- List of custom domains with SSL status
- Add domain, delete domain
- SSL status indicators (based on reconciliation results)

### Auto-Deploy Configuration

- Enable/disable server-wide auto-deploy (generates webhook URL and secret)
- Enable/disable per-domain auto-deploy
- Displays webhook URL and secret with copy buttons
- Setup instructions for GitHub webhook configuration

### Power Controls

- Start, Stop, Restart server (via DigitalOcean API)
- Delete server (cancels Stripe subscription, destroys droplet)

### Database Setup

- Install PostgreSQL on customer server (one-click, via SSH)
- Install MongoDB on customer server (one-click, via SSH)
- Random credentials generated and stored

### Other Capabilities

- Submit support tickets (normal, high, or urgent priority)
- Change password (verifies current password first)
- Apply pending platform updates (triggers SSH execution of released update scripts)
- Dismissible "next steps" onboarding guide
- Trial eligibility check (shown to users without a server or payment)

### Permission Boundaries

All dashboard queries filter by `req.session.userId`. A customer cannot view or modify another customer's server, deployments, domains, or tickets. The deployment status polling endpoint (`/api/deployment-status/:id`) returns 403 (not 404) for unauthorized access to prevent enumeration.

---

## 8. Server Update Orchestration (Admin)

This is a control-plane feature that allows administrators to create, validate, test, and execute bash scripts on customer servers.

### Update Lifecycle

```
draft → tested → released → pushed/archived
  ↓                           ↓
deleted                    deleted
```

- **Draft:** Script created, validated, hashed. Cannot be executed on customer servers.
- **Tested:** At least one successful test on a real server. Can be released.
- **Released:** Available for customer-initiated application and admin-initiated mass push.
- **Archived:** Removed from active list. Can be deleted.
- **Deleted:** Only `draft` and `archived` updates can be deleted. Released updates cannot be deleted.

### Script Validation

When an update is created, the script is validated by `scriptValidator.js` against approximately 30 dangerous pattern categories:

**Critical (always blocked):**
- Fork bombs
- `rm -rf /`
- Reverse shells
- `dd` to block devices
- Piped remote code execution (`curl | sh`, `wget | bash`, `source <(curl ...)`)

**High (blocked unless whitelisted):**
- `chmod 777 /`
- `shutdown`
- `/etc/shadow` file access
- `wget | sh` patterns

**Medium (warning, not blocked):**
- `reboot`
- `/etc/passwd` file access

Additional checks:
- Hardcoded secrets detection (passwords, API keys, tokens)
- Infinite loops without break/exit
- Maximum script size: 50 KB
- Whitelist support: specific flagged commands can be allowed (e.g., `reboot`, `apt update`)

### Script Hashing and Immutability

After validation, `set -euo pipefail` is automatically prepended if not already present (respects shebang lines). A SHA-256 hash of the final script is computed and stored in the `script_hash` column.

Scripts cannot be modified after creation. Before every execution (test, push, apply), the script's SHA-256 hash is recomputed and compared against the stored hash using `crypto.timingSafeEqual()`. If the hashes do not match, execution is refused.

### Execution Safety

**Kill switch:** A global toggle stored in the `system_settings` table. When active, all update executions (test, push, customer apply) are halted. The kill switch is checked:
- Before every individual SSH connection
- Before each batch during mass push
- If activated mid-push, remaining servers are skipped

**SSH execution parameters:**
- Connection timeout: 30 seconds
- Execution timeout: defined in constants (15 minutes for SSH commands)
- Output truncation: stdout and stderr are independently captured
- All execution uses the `ssh2` library

### Testing (Mandatory)

An admin selects a single running server with valid SSH credentials and executes the script. The result (exit code, stdout, stderr, execution time) is recorded in the `server_update_tests` table within a database transaction.

The update advances to `tested` status only if the test exits with code 0. Multiple tests can be run. At least one successful test is required before release.

### Mass Push

An admin can push a released update to all servers that have not yet received it. Execution is rate-limited: servers are processed in batches of N concurrent SSH connections (default: 5, configurable via `system_settings`). A 1-second pause is inserted between batches.

The kill switch is checked before each batch. If activated mid-push, remaining servers are skipped and the push returns partial results.

### Customer Application

From the dashboard, customers can see pending released updates and apply them to their own server. This triggers `applyAllPendingUpdates`, which executes all pending updates sequentially via SSH.

### Retry

Failed servers can be retried individually from the admin UI. The retry executes the same script (after hash verification) on servers where the previous execution failed.

### Logging and Auditability

Every execution is logged in the `server_update_log` table with:
- Server ID, update ID
- Status (success/failed)
- Full output (stdout/stderr)
- Exit code
- Triggered by (user ID)
- Trigger type: `customer`, `admin_push`, `admin_retry`
- Timestamps (created_at, executed_at)
- Retry count (incremented via `ON CONFLICT DO UPDATE` on the unique `(server_id, update_id)` constraint)

Test results are separately logged in `server_update_tests` with tester identity and server identity.

---

## 9. Payment & Subscription Handling

### Billing Models

**Subscription mode (primary):** Stripe Elements checkout with split card fields (number, expiry, CVC) and cardholder name. Creates a Stripe Customer, Price, and Subscription with `payment_behavior: 'default_incomplete'`. Returns a `client_secret` for frontend confirmation.

**Checkout redirect (alternative):** Creates a Stripe Checkout Session for a one-time payment. Redirects user to Stripe-hosted checkout page. Includes plan, interval, and user ID in metadata.

### Trial System

- 3-day trial of the Basic plan, no payment required
- Email confirmation must be completed before starting a trial
- One trial per user account (`trial_used` flag, set atomically after successful server creation)
- One trial per IP address per 90 days
- One trial per browser fingerprint per 90 days
- Browser fingerprint is required (JavaScript must be enabled)
- Global daily trial cap: 50 trials per day
- Trial flag (`trial_used`) and timestamp (`trial_used_at`) are recorded on the user record

### Abuse Prevention

- IP-based: queries `users` table for other users from the same IP with `trial_used = true` in the last 90 days
- Fingerprint-based: queries `users` table for other users with the same `browser_fingerprint` with `trial_used = true` in the last 90 days
- If no fingerprint is present, trial start is refused (prevents JavaScript-disabled bypass)
- Daily cap prevents mass abuse even if individual checks are bypassed

### Webhook Handling

The Stripe webhook endpoint is registered before `express.json()` to preserve the raw request body for signature verification. Six event types are handled:

| Event | Action |
|-------|--------|
| `invoice.paid` | Records payment. On `billing_reason: 'subscription_create'`, provisions server. On recurring invoices, updates subscription ID. |
| `payment_intent.succeeded` | Records payment. Validates amount against `PRICING_PLANS`. Provisions server if none exists. |
| `checkout.session.completed` | Finds user by email. Provisions server if none exists. |
| `charge.refunded` | Marks payment as refunded. Destroys droplet. Marks server as deleted. |
| `customer.subscription.deleted` | Destroys droplet. Marks server as deleted. |
| `invoice.payment_failed` | Logged. No automatic action (Stripe handles retry logic). |

Duplicate payment detection: the system checks for existing payments with the same Stripe payment ID before recording.

### Provisioning from Payment

Server creation happens inside webhook handlers. The webhook validates the payment amount against the pricing plans defined in `constants.js`. If the amount does not match any known plan, the payment is still recorded but provisioning is not triggered.

### Grace Periods and Enforcement

- Trial: 3 days from server creation. Warning email sent 1-2 days before expiry. Server powered off after 3 days. Destroyed after 7 days stopped.
- Payment failure: Server powered off if no successful payment in the last 35 days (accounts for monthly billing cycle + grace period)
- Stopped servers: destroyed after 7 days in stopped state regardless of cause

These are enforced by the subscription monitor background job (every 6 hours).

---

## 10. Background Jobs & Automation

All background jobs run as `setInterval` / `setTimeout` in the main Express process. Each has a staggered initial delay to avoid simultaneous startup.

### DigitalOcean Sync

- **Frequency:** Every 1 hour (initial delay: 30 seconds)
- **Purpose:** Reconciles database server records against actual DigitalOcean droplets. Fetches all droplets tagged `basement-server`. Deletes stale DB records for droplets that no longer exist.
- **Matching logic:** Matches by `droplet_id` first (authoritative), then falls back to name pattern matching
- **Failure impact:** If this job fails, server records may become stale (showing servers that no longer exist). Does not affect running servers.
- **Safety:** Read-only against DigitalOcean (only lists droplets). Write operations are delete operations on the local database only.

### Subscription Monitor

- **Frequency:** Every 6 hours (initial delay: 60 seconds)
- **Purpose:** Enforces trial expiry, payment failure policy, and stopped server cleanup
- **Four sequential checks:**
  1. Trial warnings (email 1-2 days before expiry)
  2. Expired trial power-off (3 days, no payment)
  3. Failed payment power-off (35-day grace period)
  4. Stopped server destruction (7 days in stopped state)
- **Failure impact:** If this job fails, expired trials and unpaid servers will continue running until the next successful execution. Each check is independent; failure in one does not prevent the others.
- **Safety:** Email failures are caught and logged but do not block server management actions. The monitor is idempotent — running it multiple times produces the same result for a given state.

### Auto-SSL Provisioning

- **Frequency:** Every 5 minutes (initial delay: 2 minutes)
- **Purpose:** Automatically provisions SSL certificates for domains whose DNS A records correctly point to their server
- **Failure impact:** If this job fails, SSL certificates will not be auto-provisioned. Customers can still trigger manual SSL provisioning from the dashboard.
- **Safety:** DNS resolution is checked before any SSH connection. Only connects to servers where a match is confirmed.

### SSL State Reconciliation

- **Frequency:** Every 30 minutes (initial delay: 3 minutes)
- **Purpose:** Verifies existing SSL certificates are still valid by checking DNS, cert file existence (via SSH), and TLS handshake
- **Failure impact:** If this job fails, SSL status displayed in the dashboard may become stale. Does not affect actual certificate validity on the server.
- **Safety:** 2-second pause between domain checks to rate-limit SSH connections. Read-only SSH operations (file existence check).

### Why Background Automation Is Required

The platform manages server lifecycles tied to billing.  Without background automation:
- Expired trials would run indefinitely at DigitalOcean's cost
- Failed payments would result in unpaid servers running indefinitely
- SSL certificates would require manual provisioning and monitoring
- Database records would accumulate for servers that no longer exist

---

## 11. Security Model

### Authentication Boundaries

- Password authentication uses bcrypt with 10 rounds
- Constant-time comparison even for non-existent users (prevents timing-based enumeration)
- Sessions are server-side (PostgreSQL), not client-side tokens
- Cookie flags: `httpOnly`, `secure` (production), `sameSite: 'lax'`
- Session regenerated on login (prevents session fixation)
- Google OAuth users are created with confirmed email status

### Authorization Enforcement

- `requireAuth` middleware checks `req.session.userId` on every protected route
- `requireAdmin` middleware queries the database for the user's role on every request (no session cache). If the user no longer exists, the session is destroyed. Non-admins are redirected to `/dashboard`.
- All database queries that return user-specific data include a `WHERE user_id = $1` clause
- Deployment status endpoint returns 403 (not 404) for unauthorized access to prevent ID enumeration

### Script Execution Safety

- ~30 dangerous bash pattern categories checked before any script is stored
- Severity levels: critical (always blocked), high (blocked unless whitelisted), medium (warning)
- `set -euo pipefail` auto-prepended to all scripts
- SHA-256 hash computed at creation, verified with `crypto.timingSafeEqual` before every execution
- Scripts are immutable after creation
- Kill switch halts all executions globally
- Mandatory testing before release
- Rate-limited mass execution (default 5 concurrent SSH connections)

### Secrets Handling

- Application secrets stored in environment variables via `.env` file (gitignored)
- SSH root passwords generated with `crypto.randomBytes` and stored in the `servers` table
- SSH passwords are stored in plaintext in the database. PostgreSQL disk-level encryption is relied upon for at-rest protection.
- Stripe webhook signatures verified using raw request body
- GitHub webhook signatures verified using HMAC SHA-256
- Password reset tokens: only the SHA-256 hash is stored in the database; the unhashed token is sent to the user
- Deployment logs: common secret patterns are sanitized from output before storage

### Rate Limiting

| Limiter | Window | Max | Scope |
|---------|--------|-----|-------|
| General | 15 min | 300 | Non-GET requests, per IP |
| Contact | 1 hour | 5 | Per IP |
| Payment | 15 min | 10 | Per IP |
| Email verify | 1 hour | 5 | Per IP |
| Deployment | 1 hour | 5 | Per user ID |

All rate limiters use `express-rate-limit`. The general limiter skips GET requests. The deployment limiter uses a custom key generator based on `req.session.userId` rather than IP.

`trust proxy` is set to `1` so that `X-Forwarded-For` headers from Nginx are respected for correct client IP detection.

### CSRF Strategy

`csurf` middleware generates and validates CSRF tokens on all state-changing forms. Two endpoints are exempt:
- `/webhook/stripe` — uses Stripe signature verification instead
- `/webhook/github/:serverId` — uses HMAC SHA-256 signature verification instead

Both webhook endpoints are registered before the global `express.json()` middleware to preserve raw request bodies for signature verification.

Note: the `csurf` package has been deprecated since 2020. It remains functional but is no longer maintained.

### HTTP Security Headers

Helmet.js is applied globally with `contentSecurityPolicy` disabled (required for Stripe's inline script needs). All other Helmet defaults are active:
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security
- And others per Helmet defaults

HTTPS redirect is enforced in production via middleware that checks the `X-Forwarded-Proto` header.

### Audit Logging

- Admin actions (user deletion, domain changes) are recorded in the `admin_audit_log` table via `auditLog.js`
- Update executions logged in `server_update_log` with full output, exit codes, trigger type
- Update tests logged in `server_update_tests` with tester identity
- Credential access logged when users retrieve SSH/database credentials
- Request logging middleware records method, status code, path, response time, and user ID for every request

### Error Monitoring

Sentry is initialized before any other imports (as required by their SDK) when `SENTRY_DSN` is configured. Captures unhandled exceptions and performance profiles. Profiling is enabled at 100% sample rate.

The global error handler (`errorHandler.js`) catches Express errors and returns appropriate responses:
- Stripe errors: payment-safe error message
- CSRF errors: 403
- Validation errors: 422
- Default: 500 (error details only visible in development mode)

---

## 12. Data Model (Conceptual)

### Key Entities

| Entity | Purpose |
|--------|---------|
| `users` | Customer and admin accounts. Stores email, password hash, role, email confirmation status, trial usage, Google ID, browser fingerprint, signup IP. |
| `servers` | Provisioned VPS instances. Stores user ID, plan, status, IP address, SSH password, DigitalOcean droplet ID, trial flag, site limit, Stripe subscription ID, droplet name. |
| `payments` | Payment records. Stores user ID, Stripe payment ID, amount, plan, status, payment interval. |
| `deployments` | Git deployment history. Stores server ID, user ID, Git URL, status, output, subdomain, deployment type. |
| `domains` | Custom domains. Stores server ID, user ID, domain name, ssl_enabled, ssl_status, ssl_dns_valid, ssl_cert_exists, auto_deploy_enabled, domain webhook secret, linked subdomain. |
| `support_tickets` | Customer support requests. Stores user ID, subject, description, priority, status. |
| `server_updates` | Admin-created update scripts. Stores title, script, script_hash, type, status, is_critical, version, description, created_by. |
| `server_update_log` | Execution history. Stores server ID, update ID, status, output, exit_code, triggered_by, trigger_type, retry_count. |
| `server_update_tests` | Test results. Stores update ID, server ID, tested_by, success, stdout, stderr. |
| `session` | HTTP sessions via connect-pg-simple. Stores sid, sess (JSON), expire. |
| `system_settings` | Key-value store for global settings (kill switch, rate limit). |
| `admin_audit_log` | Admin action audit trail. |
| `security_events` | Security-relevant events with IP, user agent, JSONB details. |

### Relationships

- A user has zero or one active server (unique constraint on non-deleted/failed servers)
- A server has zero or more deployments
- A server has zero or more domains
- A user has zero or more payments
- A user has zero or more support tickets
- An update has zero or more test results
- An update has zero or more execution logs (one per server)

### Important Invariants

- One active server per user — enforced by database unique constraint and application-level check
- `droplet_id` is the authoritative link between a server record and the DigitalOcean resource
- Payment amounts must match `PRICING_PLANS` before server provisioning is triggered
- `script_hash` is immutable after creation; verified before every execution
- `server_update_log` has a unique constraint on `(server_id, update_id)` — re-executions use `ON CONFLICT DO UPDATE` to increment retry count
- Only `released` updates can be executed on customer servers

### Lifecycle of Critical Records

**Server:** `provisioning` → `running` → `stopped` → record deleted. The `failed` status is terminal and records are kept for audit.

**Update:** `draft` → `tested` → `released` → `archived`. Only `draft` and `archived` can be deleted. `released` cannot be deleted.

**Payment:** records are created by webhook handlers and updated on refund events. They are not deleted.

**Session:** managed by `connect-pg-simple` with automatic expiry cleanup.

---

## 13. Operational Characteristics

### Normal Operation

The application starts by running pending database migrations (tracked in a `migrations` table), then binds to the configured port. Background jobs start after staggered delays (30s, 60s, 2min, 3min).

The health check endpoint (`GET /health`) verifies database connectivity and returns:
- Status: `ok` or `degraded`
- Uptime, environment, database connectivity
- Returns 200 for healthy, 503 for degraded

### Degraded Modes

**Database unreachable:** Health endpoint returns 503. All authenticated routes fail. Sessions cannot be validated. Background jobs fail silently and retry on next cycle.

**DigitalOcean API unreachable:** Provisioning fails (refund issued). Sync job logs errors and retries in 1 hour. Power controls fail. Server status may be stale.

**Stripe API unreachable:** Payment creation fails. Webhook signature verification may fail. Refunds cannot be issued.

**Email provider unreachable:** Emails fail silently (caught and logged). Does not block provisioning, trial management, or any other operation. Confirmation codes are still generated and stored; users just don't receive the email.

**SSH unreachable to customer server:** Deployments fail (output captured). SSL provisioning skipped (retried on next cycle). Updates fail (logged, retryable). Database setup fails.

### Failure Scenarios

| Scenario | Impact | Recovery |
|----------|--------|----------|
| Provisioning timeout | Server marked `failed`, Stripe refund issued | Automatic |
| Duplicate provisioning race | Orphaned droplet destroyed, existing server returned | Automatic |
| Deployment build failure | Deployment marked `failed`, Nginx config unchanged | Customer retries |
| Webhook delivery failure | Stripe retries with exponential backoff | Automatic (Stripe-managed) |
| Background job crash | Job resumes on next interval | Automatic |
| Process restart | Sessions survive (PostgreSQL). Background jobs restart with initial delays. | Automatic |

### Recovery Behavior

- Hourly sync reconciles DB against DigitalOcean state
- 6-hour subscription monitor is idempotent
- SSL jobs retry on every cycle
- Failed update executions are logged and retryable from admin UI
- Polling has a 5-minute hard timeout to prevent hung connections

### Manual Intervention Points

- Provisioning stuck beyond 5 minutes: admin can cancel provisioning (sets status to `failed`)
- DigitalOcean droplet exists but server record is stale: hourly sync will clean up, or admin can manually destroy
- Certbot rate limit exceeded: must wait for Let's Encrypt rate limit window to reset (not configurable)
- Kill switch activated during push: admin must manually deactivate to resume update operations

### Graceful Shutdown

On `SIGTERM` or `SIGINT`:
1. Polling intervals are cleared via `cleanupPolls()`
2. HTTP server stops accepting new connections
3. Database connection pool is drained
4. Process exits with code 0

---

## 14. Limitations & Non-Goals

### Intentional Constraints

- **One server per customer.** Enforced at database and application level. Multi-server accounts would require schema and workflow changes.
- **Public repositories only.** No SSH key or token-based Git authentication for private repositories.
- **Single region.** All droplets provisioned in `nyc3`. The request form accepts a region preference but the provisioning code does not use it.
- **No container support.** Customers receive a traditional VM with direct package installation.
- **No auto-scaling or load balancing.** Each customer gets a fixed-size server based on their plan.
- **No real-time log streaming.** Deployment output is captured after execution completes and displayed statically.
- **No in-app ticket replies.** Support tickets are submitted via dashboard; responses are handled via email outside the platform.

### Known Limitations

- **Background jobs share the main event loop.** Long-running SSH operations during mass update pushes could reduce HTTP request throughput for other users. Not observable at current scale.
- **SSH credentials stored in plaintext.** Root passwords are in the `servers` table without application-level encryption. Generated with high entropy (`crypto.randomBytes`) but rely on PostgreSQL disk encryption for at-rest protection.
- **No horizontal scaling.** Single-instance monolith. Running multiple instances would require session affinity, shared state coordination, and background job deduplication.
- **Email confirmation expiry mismatch.** `constants.js` says 10 minutes; `emailToken.js` implements 4 minutes. The actual behavior is 4 minutes.
- **`csurf` is deprecated.** The package has not been maintained since 2020. It functions correctly but receives no security patches.
- **SSL provisioning requires SSH.** If SSH access to a customer server is unavailable (network issues, changed credentials), SSL cannot be provisioned or verified.
- **Email delivery is best-effort.** Failures are logged but not retried. Critical operations do not depend on email success.
- **DNS record management is limited to cloudedbasement.ca subdomains.** The platform creates A records for deployment subdomains under `cloudedbasement.ca` via DigitalOcean DNS API. It does not manage customer domain DNS.

### Tradeoffs Made

| Decision | Benefit | Cost |
|----------|---------|------|
| Monolithic architecture | Simple deployment, no infrastructure dependencies beyond PostgreSQL | Cannot scale horizontally |
| Server-rendered HTML via template strings | No frontend build step for pages, no view engine dependency | Verbose controller code, HTML mixed with logic |
| PostgreSQL for sessions | Sessions survive restarts, no Redis needed | Slightly higher latency than in-memory stores |
| One server per customer | Simple billing and provisioning logic | Cannot serve customers needing multiple environments |
| Immutable update scripts | Prevents post-approval tampering | Requires creating a new update for any script change |
| Background jobs in main process | No job queue infrastructure needed | Shares event loop with HTTP handling |
| Plaintext SSH credential storage | Simple implementation, no key management infrastructure | Relies entirely on database-level encryption |

---

## 15. Maintainability & Extensibility

### Codebase Organization

```
index.js                        — Entry point: middleware chain, all route definitions, background job scheduling
helpers.js                      — HTML generators: head, nav, footer, scripts, dashboard layout
constants.js                    — Pricing plans, timeouts, ports, status enums, session config

controllers/
  authController.js             — Registration, login, email verification, password reset, Google OAuth (1080 lines)
  dashboardController.js        — Customer dashboard rendering and actions (1495 lines)
  serverController.js           — Deployments, domains, SSL, power, database setup (2114 lines)
  paymentController.js          — Stripe checkout, webhooks, payment recording (865 lines)
  adminController.js            — Admin dashboard and server management (477 lines)
  adminUpdatesController.js     — Update orchestration UI (803 lines)
  githubWebhookController.js    — GitHub webhook auto-deploy (271 lines)
  gettingStartedController.js   — Post-signup onboarding wizard (149 lines)
  domainController.js           — Admin domain CRUD (393 lines)
  pagesController.js            — Re-export facade for page controllers (27 lines)
  pages/                        — Individual static page controllers (home, about, pricing, FAQ, docs, terms, privacy, contact, safety)

services/
  digitalocean.js               — Droplet CRUD, sync, polling (507 lines)
  email.js                      — Multi-provider email abstraction (475 lines)
  subscriptionMonitor.js        — Trial/payment enforcement (240 lines)
  serverUpdates.js              — Update CRUD, testing, execution, mass push (850 lines)
  scriptValidator.js            — Bash script safety validation (280 lines)
  autoSSL.js                    — Automatic SSL provisioning (190 lines)
  sslVerification.js            — SSL state reconciliation (280 lines)
  googleAuth.js                 — Passport.js Google OAuth strategy (96 lines)
  dns.js                        — DigitalOcean DNS record management (161 lines)

middleware/
  auth.js                       — requireAuth, requireAdmin (56 lines)
  rateLimiter.js                — 5 rate limiter configurations (52 lines)
  errorHandler.js               — Global error handler (46 lines)
  logger.js                     — Request logging (17 lines)

utils/
  emailToken.js                 — Confirmation code generation (35 lines)
  emailValidation.js            — Disposable email detection, MX checks (101 lines)
  nginxTemplates.js             — Nginx config generators (340 lines)
  db-helpers.js                 — Reusable database query patterns (119 lines)

migrations/                     — Sequential numbered migrations (auto-run on startup)
db/schema/                      — SQL schema definitions
```

### Where Changes Are Safest

- **Adding a new static page:** Create a controller in `controllers/pages/`, add to `pagesController.js` re-exports, add a route in `index.js`. No side effects.
- **Modifying email templates:** Edit HTML strings in `services/email.js`. No logic changes.
- **Adjusting rate limits:** Edit constants in `middleware/rateLimiter.js`. Takes effect on restart.
- **Adding a new migration:** Create a sequentially numbered file in `migrations/`. Auto-runs on next startup.
- **Adding a new dangerous pattern:** Add to the `DANGEROUS_PATTERNS` array in `scriptValidator.js`. Affects future script validation only.
- **Changing Nginx templates:** Edit `utils/nginxTemplates.js`. Affects future deployments only, not existing configurations on servers.

### Where Changes Are Risky

- **`services/digitalocean.js` (`createRealServer`):** Handles payment refunds, race condition detection, and droplet lifecycle. Incorrect changes can cause double-billing, orphaned droplets, or lost refunds.
- **`paymentController.js` (`stripeWebhook`):** Financial core. Incorrect validation or duplicate detection changes can cause billing errors or double provisioning.
- **`services/subscriptionMonitor.js`:** Controls automatic server destruction. An incorrect query condition could destroy paid servers or leave expired trials running.
- **`index.js` (middleware order):** Stripe and GitHub webhooks must be registered before `express.json()`. CSRF must follow session initialization. Reordering breaks signature verification or session handling.
- **Database schema changes:** The unique constraint on active servers per user is load-bearing. The `server_update_log` unique constraint on `(server_id, update_id)` is relied upon for retry counting.

### How Future Work Should Approach the System

Controllers contain both business logic and HTML rendering (template strings). There is no view engine or separate template layer. To add features that span multiple pages, the relevant controller file must be modified directly.

Database queries are inline in controllers and services. There is no repository or data access layer. To find where a table is queried, search for the table name across the codebase.

Background jobs are `setInterval` calls at the bottom of `index.js`. The underlying service functions are standalone and can be called from a separate process with no code changes if extraction becomes necessary.

The migration system (`migrations/run-migrations.js`) tracks applied migrations in a `migrations` table. Each migration file exports a function that receives the database pool. Migrations run sequentially on startup.

`constants.js` defines pricing plans, timeouts, ports, and status enums. Any change to pricing must also be reflected in Stripe (creating new Prices/Products). The constants file is the application's source of truth for plan specifications and droplet sizing.

---

Documentation Status: COMPLETE
Scope: Verified Production System (Current State)
Source of Truth: Codebase Review
