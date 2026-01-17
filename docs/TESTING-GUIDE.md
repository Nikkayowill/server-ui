# Testing Guide - Basement Server Management

Complete guide for testing all features of the application.

---

## Prerequisites

### Required Accounts & Credentials
- [x] PostgreSQL database running (`webserver_db`)
- [x] Stripe account with live API key
- [x] DigitalOcean account with API token
- [x] Stripe CLI installed and authenticated

### Environment Setup
Ensure your `.env` file has all required values:
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
DIGITALOCEAN_TOKEN=dop_v1_...
DB_HOST=localhost
DB_PORT=5432
DB_NAME=webserver_db
DB_USER=postgres
DB_PASSWORD=admin
SESSION_SECRET=dev_secret_change_in_production
```

---

## Starting the Application

### 1. Start PostgreSQL
Ensure PostgreSQL service is running.

### 2. Start Stripe Webhook Listener (for local testing)
```powershell
# In Downloads folder where stripe.exe is located
.\stripe.exe listen --forward-to localhost:3000/webhook/stripe
```
Keep this terminal open.

### 3. Start the Server
```bash
# In project folder
node index.js
```
Server should start on `http://localhost:3000`

---

## Feature Testing

### 1. Authentication System

#### Test User Registration
1. Navigate to `http://localhost:3000/register`
2. Fill in the form:
   - Email: `test@example.com`
   - Password: `Test123!`
3. Click "Sign Up"
4. **Expected:** Redirect to login with success message

#### Test User Login
1. Navigate to `http://localhost:3000/login`
2. Enter credentials from registration
3. Click "Sign In"
4. **Expected:** Redirect to dashboard with session active

#### Test Protected Routes
1. Without logging in, try accessing:
   - `http://localhost:3000/dashboard`
   - `http://localhost:3000/pricing`
2. **Expected:** Redirect to login page

#### Test Logout
1. While logged in, click "Logout" in navigation
2. **Expected:** Redirect to home page, session destroyed
3. Try accessing `/dashboard` again
4. **Expected:** Redirect to login

---

### 2. Dashboard (No Server State)

#### Test Empty Dashboard
1. Login with a user that has no server
2. Navigate to `/dashboard`
3. **Expected:**
   - Welcome message displayed
   - "View Plans" button visible
   - Feature preview cards shown (Monitor, Deploy, Domains, SSH)
   - No server details displayed

---

### 3. Payment & Server Provisioning

#### Test Plan Selection
1. Login and navigate to `/pricing`
2. Review three plans:
   - Basic ($25/mo)
   - Priority ($60/mo)
   - Premium ($120/mo)
3. Click "Get Started" on any plan
4. **Expected:** Redirect to payment page

#### Test Payment Flow (REAL CHARGE)
⚠️ **Warning:** You're using LIVE mode Stripe keys - this creates a REAL charge on a REAL card

**Note:** If you want to test without real charges, switch to test mode:
- Get test key from Stripe Dashboard (starts with `sk_test_...`)
- Update `.env` with test key
- Test card `4242 4242 4242 4242` will work

**For Live Mode Testing:**
1. On payment page, click "Pay with Stripe"
2. **Expected:** Redirect to Stripe Checkout
3. Enter REAL card details (will be charged for real)
4. Complete payment
5. **Expected:**
   - Redirect to `/payment-success`
   - Success message displayed
6. Navigate to `/dashboard`
7. **Expected:**
   - Server status: "provisioning"
   - "⏳ Setting up your server..." message
   - Page auto-refreshes every 15 seconds
8. Wait 2-5 minutes
9. **Expected:**
   - Status changes to "running"
   - IP address displayed
   - SSH credentials visible
   - Server controls appear

#### Verify in DigitalOcean
1. Login to DigitalOcean dashboard
2. Go to Droplets
3. **Expected:** Droplet named `basement-{userId}-{timestamp}` exists
4. **Expected:** Status is "Active"
5. **Expected:** IP matches what's shown in your dashboard

#### Verify in Database
```sql
SELECT * FROM servers WHERE user_id = {your_user_id};
```
**Expected:**
- Record exists
- Status: "running"
- IP address matches DO droplet
- `stripe_charge_id` is populated (starts with `ch_`)

---

### 4. Server Management

#### Test Server Controls (Restart)
1. On dashboard with running server, click "Restart Server"
2. **Expected:**
   - Success message
   - Status remains "running"
   - (Note: This is currently mock - doesn't actually restart DO droplet)

#### Test Server Controls (Stop)
1. Click "Stop Server"
2. **Expected:**
   - Success message
   - Status changes to "stopped"
   - "Start Server" button now visible

#### Test Server Controls (Start)
1. With stopped server, click "Start Server"
2. **Expected:**
   - Success message
   - Status changes to "running"

---

### 5. Delete Server

#### Test Delete Button
1. On dashboard with a server, scroll to "Server Controls"
2. Click "Delete Server" (red button in Danger Zone)
3. **Expected:** Browser confirmation dialog:
   - "Are you sure? This will permanently destroy your server and all data on it."
4. Click "Cancel" first to test cancellation
5. **Expected:** Nothing happens, stays on dashboard

#### Test Actual Deletion
1. Click "Delete Server" again
2. Confirm the dialog by clicking "OK"
3. **Expected:**
   - Redirect to `/pricing?message=Server deleted successfully`
   - Success message displayed
4. Check DigitalOcean dashboard
5. **Expected:** Droplet is being destroyed or already destroyed
6. Check database:
```sql
SELECT * FROM servers WHERE user_id = {your_user_id};
```
7. **Expected:** No records found (deleted)

---

### 6. Stripe Webhook - Refund Auto-Deletion

#### Test Refund Webhook (REAL REFUND)
⚠️ **Prerequisites:** 
- Stripe CLI running with webhook listener
- Server running (`node index.js`)
- Active server with a real payment

**Steps:**
1. Navigate to Stripe Dashboard → Payments
2. Find the recent charge for your test payment
3. Click on the charge
4. Click "Refund" button
5. Confirm the refund amount
6. Click "Refund" to process

**Expected - In Stripe CLI Terminal:**
```
charge.refunded [evt_xxx] Received
POST http://localhost:3000/webhook/stripe [200]
```

**Expected - In Server Logs:**
```
Received webhook event: charge.refunded
Charge refunded: ch_xxxxx
Found server X for refunded charge ch_xxxxx
Destroyed droplet XXXXXXXX for refunded server X
Deleted server X from database due to refund
```

**Expected - In Your Dashboard:**
1. Navigate to `/dashboard`
2. **Expected:** Empty dashboard (no server)

**Expected - In DigitalOcean:**
- Droplet destroyed

**Expected - In Database:**
```sql
SELECT * FROM servers WHERE stripe_charge_id = 'ch_xxxxx';
```
- No results (deleted)

#### Test Webhook with Fake Event
```powershell
# In Downloads folder
.\stripe.exe trigger charge.refunded
```

**Expected - In Server Logs:**
```
Received webhook event: charge.refunded
Charge refunded: ch_xxxxx (test charge)
No server found for charge ID: ch_xxxxx
```
(No actual deletion because test charge doesn't match real server)

---

### 7. SSH Access

#### Test SSH Credentials Display
1. On dashboard with running server, locate "SSH Access" card
2. **Expected:** Displays:
   - Username (usually "root")
   - Password (auto-generated)
   - Connection command: `ssh root@{ip_address}`
3. Click "Copy" buttons to test clipboard functionality

#### Test Actual SSH Connection
```bash
ssh root@{ip_address_from_dashboard}
```
1. Enter password when prompted (from dashboard)
2. **Expected:** Successfully connected to server
3. Run test command:
```bash
uname -a
```
4. **Expected:** Shows Ubuntu 22.04 system info
5. Exit: `exit`

---

### 8. Deployment Form (Currently Non-Functional)

### 11. Deployment Form (Currently Non-Functional)

#### Test Deployment Form Display
1. On dashboard with server, scroll to "Deployment" section
2. **Expected:** Form with Git URL input and "Deploy from Git" button
3. Enter a Git URL: `https://github.com/username/repo.git`
4. Click "Deploy from Git"
5. **Expected:**
   - Form submits
   - Redirect to dashboard
   - (Note: Deployment doesn't actually execute - placeholder functionality)

---

### 9. Custom Domains & SSL

#### Test Domain Addition
1. On dashboard with server, scroll to "Custom Domains" section
2. Enter domain: `example.com`
3. Click "Add Domain"
4. **Expected:**
   - Redirect to dashboard with success message
   - Domain appears in "Your Domains" list
   - Shows "⚠️ No SSL" badge

#### Test DNS Instructions Display
1. Check the "DNS Configuration" section
2. **Expected:** Shows correct A record values:
   - `@` pointing to your server IP
   - `www` pointing to your server IP
3. These are real instructions - will work with any domain registrar

#### Test One-Click SSL (Requires Real Domain)
⚠️ **Prerequisites:** 
- Real domain with DNS pointed to your server IP
- Wait 5-10 minutes after DNS changes for propagation
- Server must be running

**Steps:**
1. After DNS is configured, scroll to "🔒 One-Click SSL" section
2. Enter your domain: `yourdomain.com`
3. Click "Enable SSL"
4. **Expected:**
   - Takes 30-60 seconds to process
   - Redirect with success message: "SSL enabled! Your site is now secure with HTTPS"
   - Domain badge updates to "🔒 SSL Active"
   - Visit `https://yourdomain.com` - shows secure padlock

**Behind the scenes:**
- Your server SSHs into the droplet
- Runs `certbot --nginx -d yourdomain.com`
- Installs Let's Encrypt certificate
- Certificate auto-renews every 90 days

**If SSL fails:**
- Check DNS is pointing to correct IP (`nslookup yourdomain.com`)
- Verify domain is accessible via HTTP first
- Check firewall allows ports 80 and 443
- View server SSH logs for certbot errors

---

### 10. DigitalOcean Sync (Automatic Background Job)

#### Test Automatic Sync
This runs automatically every hour and on server startup.

**Steps:**
1. Create a server with payment
2. Manually destroy the droplet in DigitalOcean dashboard
3. Wait up to 1 hour (or restart server to trigger immediate sync)
4. **Expected - In Server Logs:**
```
[Sync] Starting DigitalOcean droplet sync...
[Sync] Found 1 servers in DB, 0 droplets in DO
[Sync] Droplet missing for server X (user Y)
[Sync] Updated server X status to 'deleted'
[Sync] DigitalOcean sync completed
```

5. Check dashboard
6. **Expected:** Server status shows "deleted" (or no longer appears if filtered)

7. Check database:
```sql
SELECT id, status FROM servers WHERE id = X;
```
**Expected:** Status is "deleted"

**Sync Schedule:**
- Runs every hour: `setInterval(syncDigitalOceanDroplets, 3600000)`
- Runs on startup: After 30 seconds
- Only checks servers with status "running"

---

### 11. Deployment Form (Currently Non-Functional)
1. On dashboard with server, scroll to "Custom Domains" section
2. **Expected:** Form with domain input and "Add Domain" button
3. Enter domain: `example.com`
4. Click "Add Domain"
5. **Expected:**
   - Form submits
   - Redirect to dashboard
   - (Note: Domain addition doesn't actually configure DNS - placeholder)

---

### 10. Static Pages

#### Test Public Pages (No Auth Required)
- `http://localhost:3000/` - Home page
- `http://localhost:3000/about` - About page
- `http://localhost:3000/docs` - Documentation
- `http://localhost:3000/pricing` - Pricing plans
- `http://localhost:3000/contact` - Contact form
- `http://localhost:3000/terms` - Terms of Service
- `http://localhost:3000/privacy` - Privacy Policy
- `http://localhost:3000/faq` - FAQ

**Expected:** All pages load without errors

#### Test Contact Form
1. Navigate to `/contact`
2. Fill in:
   - Name: "Test User"
   - Email: "test@example.com"
   - Message: "Test message"
3. Click "Send Message"
4. **Expected:**
   - Redirect to home page
   - Success message displayed
   - (Note: Message only logged to console, not saved or emailed)

---

## Database Testing

### View All Users
```sql
SELECT id, email, created_at FROM users;
```

### View All Servers
```sql
SELECT id, user_id, plan, status, ip_address, stripe_charge_id, created_at FROM servers;
```

### View Deployments
```sql
SELECT * FROM deployments ORDER BY deployed_at DESC;
```

### View Domains
```sql
SELECT * FROM domains ORDER BY created_at DESC;
```

### Clean Up Test Data
```sql
-- Delete test servers
DELETE FROM servers WHERE user_id = {test_user_id};

-- Delete test user
DELETE FROM users WHERE email = 'test@example.com';
```

---

## End-to-End Test Scenarios

### Scenario 1: Complete User Journey
1. Register new account
2. Login
3. View dashboard (empty state)
4. Go to pricing
5. Select plan
6. Complete payment (real charge)
7. Wait for provisioning
8. Verify server running
9. Test SSH connection
10. Delete server
11. Verify cleanup in DO and database
12. Logout

**Time:** ~10 minutes  
**Cost:** $25 + refund processing fee (~$0.50)

### Scenario 2: Refund Auto-Cleanup
1. Create server with payment
2. Verify server running
3. Refund in Stripe dashboard
4. Verify webhook received
5. Verify droplet destroyed
6. Verify database cleaned
7. Verify dashboard shows empty state

**Time:** ~5 minutes  
**Prerequisites:** Stripe CLI running

### Scenario 3: Manual Deletion
1. Create server with payment
2. Manually delete droplet in DO dashboard
3. Check app dashboard
4. **Current Behavior:** Still shows "running" (no sync yet)
5. Use delete button to clean up database
6. Refund in Stripe manually

**Time:** ~3 minutes  
**Note:** Step 3 (DigitalOcean sync) not implemented yet

---

## Troubleshooting

### Server Won't Provision
**Symptoms:** Status stuck at "provisioning" for >5 minutes

**Check:**
1. Server logs for errors
2. DigitalOcean API rate limits
3. Network connectivity
4. Database polling logs

**Fix:**
```sql
-- Check server status
SELECT * FROM servers WHERE status = 'provisioning';

-- Manually update if droplet is active
UPDATE servers SET status = 'running', ip_address = '{actual_ip}' WHERE id = {server_id};
```

### Webhook Not Receiving Events
**Symptoms:** Refund doesn't trigger deletion

**Check:**
1. Stripe CLI is running: `.\stripe.exe listen --forward-to localhost:3000/webhook/stripe`
2. Server is running on port 3000
3. Webhook secret in `.env` matches CLI output

**Test:**
```powershell
.\stripe.exe trigger charge.refunded
```

### Payment Fails
**Symptoms:** Stripe checkout shows error

**Check:**
1. Stripe API key is correct (live mode)
2. Account is activated in Stripe
3. No rate limiting
4. Network connectivity

### SSH Connection Fails
**Symptoms:** "Connection refused" or timeout

**Check:**
1. Droplet is fully provisioned (wait 5 minutes)
2. IP address is correct
3. Firewall allows SSH (port 22)
4. Password copied correctly (no extra spaces)

---

## Test Checklist

Use this checklist for comprehensive testing:

- [ ] User registration works
- [ ] User login works
- [ ] Protected routes require auth
- [ ] Dashboard shows empty state without server
- [ ] Payment flow completes successfully
- [ ] Server provisions within 5 minutes
- [ ] IP address appears in dashboard
- [ ] SSH credentials work
- [ ] Can SSH into server
- [ ] Server controls (stop/start/restart) work
- [ ] Delete button destroys droplet
- [ ] Delete button cleans database
- [ ] Delete button redirects correctly
- [ ] Stripe webhook receives events
- [ ] Refund auto-deletes server
- [ ] Contact form submits
- [ ] All static pages load
- [ ] Logout destroys session

---

## Performance Benchmarks

### Provisioning Time
- **Target:** 2-3 minutes
- **Maximum:** 5 minutes (before timeout)

### Page Load Times
- **Home:** < 500ms
- **Dashboard:** < 1s (with server data)
- **Pricing:** < 500ms

### Webhook Response Time
- **Target:** < 2s for complete deletion
- **Includes:** DO API call + database deletion

---

## Security Testing

### SQL Injection
Try these payloads in forms:
```
' OR '1'='1
'; DROP TABLE users; --
```
**Expected:** Parameterized queries prevent injection

### XSS
Try in contact form:
```
<script>alert('XSS')</script>
```
**Expected:** Properly escaped, no script execution

### CSRF
1. Clear cookies
2. Try POST to `/create-checkout-session` without token
**Expected:** 403 Forbidden

### Session Hijacking
1. Login and note session cookie
2. Logout
3. Try reusing old cookie
**Expected:** Redirect to login

---

## Load Testing (Optional)

### Concurrent Users
```bash
# Using Apache Bench
ab -n 100 -c 10 http://localhost:3000/
```

### Concurrent Payments
Not recommended for testing (real charges)

---

## Notes

- Keep receipts of all test payments for accounting
- Refund test payments promptly to minimize costs
- Test webhooks only work when Stripe CLI is running locally
- Production webhooks need endpoint configured in Stripe dashboard
- DigitalOcean charges hourly - destroy test droplets quickly
- SSH password contains special characters - use copy/paste
