# 🚀 Pre-Launch Testing Checklist - CloudedBasement
**Last Updated:** January 27, 2026  
**Target Launch:** TBD

---

## ✅ COMPLETED TESTS

### Security Hardening (January 27, 2026)
- [x] XSS vulnerabilities fixed (35+ instances)
- [x] Session fixation resolved
- [x] CSRF protection verified on all forms
- [x] SQL injection prevention (parameterized queries)
- [x] Command injection fixed (Git + SSL)
- [x] Timing attack mitigation
- [x] Admin cache poisoning fixed
- [x] IDOR vulnerabilities hardened
- [x] Authorization bugs fixed (3 critical)
- [x] npm audit clean (97% - 2 LOW acceptable)

### Code Quality (January 27, 2026)
- [x] Removed dead code (145 lines)
- [x] Fixed critical isTokenValid() bug
- [x] Eliminated duplicate functions
- [x] Created db-helpers.js (8 reusable functions)
- [x] Created constants.js (magic numbers/strings)
- [x] Syntax validation passed

---

## 🔴 CRITICAL - MUST TEST BEFORE LAUNCH

### 1. Payment Flow (Stripe Integration)
**Priority:** CRITICAL  
**Status:** ⚠️ NOT TESTED END-TO-END

- [ ] **Test Stripe Checkout (Test Mode)**
  - Use card: 4242 4242 4242 4242
  - Test all 3 plans: Basic ($25), Priority ($60), Premium ($120)
  - Verify redirect to payment-success page
  - Check payment recorded in database
  - Verify user gets correct plan

- [ ] **Test Webhook Processing**
  - Start Stripe CLI: `stripe listen --forward-to localhost:3000/webhook/stripe`
  - Complete payment
  - Verify webhook fires (check terminal)
  - Confirm server provisioning triggered
  - Check database: `SELECT * FROM payments WHERE status = 'succeeded'`

- [ ] **Test Refund Flow**
  - Issue refund from Stripe dashboard
  - Verify webhook processes refund
  - Confirm server deleted from database
  - Verify DigitalOcean droplet destroyed
  - Check user can't access dashboard features

- [ ] **Test Failed Payment**
  - Use declined card: 4000 0000 0000 0002
  - Verify error handling
  - Confirm no database record created
  - User can retry

- [ ] **Test Payment Validation**
  - Attempt to bypass amount validation
  - Verify server-side plan matching
  - Check webhook validates plan vs amount

**Test Command:**
```bash
# Terminal 1: Start Stripe webhook listener
cd Downloads && stripe listen --forward-to localhost:3000/webhook/stripe

# Terminal 2: Start app
cd server-ui && node index.js

# Browser: Test payment at http://localhost:3000/pricing
```

---

### 2. Server Provisioning (DigitalOcean)
**Priority:** CRITICAL  
**Status:** ⚠️ NOT TESTED IN PRODUCTION

- [ ] **Test Automatic Provisioning**
  - Complete payment
  - Wait 2-5 minutes
  - Verify status changes: provisioning → running
  - Check IP address appears in dashboard
  - Verify SSH credentials displayed
  - Test SSH connection: `ssh root@{ip_address}`

- [ ] **Test Provisioning Failure Handling**
  - Simulate DigitalOcean API failure (invalid token temporarily)
  - Verify automatic refund issued
  - Check database: status = 'failed'
  - Verify error logged in admin panel

- [ ] **Test IP Polling**
  - Monitor polling in logs
  - Verify max 5-minute timeout
  - Check 10-second intervals
  - Confirm cleanup after success

- [ ] **Test Server Already Exists**
  - User with existing server tries to buy another
  - Verify database constraint prevents duplicate
  - Error message shown to user

- [ ] **Test DigitalOcean Sync Job**
  - Manually destroy droplet in DO dashboard
  - Wait for hourly sync (or restart server to trigger)
  - Verify server status updated to 'deleted'
  - Check logs: `[Sync] Droplet missing for server X`

**DigitalOcean Test Commands:**
```bash
# Check droplets
curl -X GET "https://api.digitalocean.com/v2/droplets" \
  -H "Authorization: Bearer $DO_API_TOKEN"

# Check server in database
psql -U basement_user -d basement_db -c "SELECT id, status, ip_address, droplet_id FROM servers;"
```

---

### 3. Email Delivery
**Priority:** CRITICAL  
**Status:** ⚠️ NOT TESTED (MULTIPLE PROVIDERS CONFIGURED)

- [ ] **Test Email Confirmation**
  - Register new account
  - Check email received (6-digit code)
  - Test code verification
  - Verify email_confirmed = true in database
  - Test resend code functionality

- [ ] **Test Welcome Email (Server Ready)**
  - Complete payment
  - Wait for server provisioning
  - Verify welcome email sent
  - Check email contains: IP, username, password

- [ ] **Test Password Reset Email**
  - Click "Forgot Password"
  - Enter email
  - Verify reset link received
  - Test reset link works
  - Token expires after 1 hour

- [ ] **Test Support Ticket Email (if implemented)**
  - Submit support ticket
  - Verify admin receives email notification

**Providers to Test:**
- [ ] Gmail OAuth2 (preferred) - `GMAIL_*` env vars
- [ ] SendGrid API - `SENDGRID_API_KEY`
- [ ] Generic SMTP - `SMTP_*` env vars
- [ ] Mailtrap (dev only)

**Test Command:**
```bash
# Test email connection
node -e "require('./services/email').verifyConnection().then(r => console.log('Result:', r))"
```

---

### 4. Git Deployment System
**Priority:** HIGH  
**Status:** ⚠️ NOT TESTED WITH REAL REPOS

- [ ] **Test Static HTML Deployment**
  - Use repo: `https://github.com/test/static-site.git`
  - Click "Deploy from Git"
  - Monitor deployment logs
  - Verify files copied to `/var/www/html`
  - Visit `http://{server_ip}` - site loads

- [ ] **Test Node.js Backend Deployment**
  - Use repo with package.json
  - Verify `npm install` runs
  - Check node version setup
  - Verify app starts
  - Test health endpoint

- [ ] **Test React/Vue Frontend Deployment**
  - Use repo with `npm run build`
  - Verify build step executes
  - Check production assets in `/var/www/html`
  - Visit site - loads correctly

- [ ] **Test Python App Deployment**
  - Use repo with requirements.txt
  - Verify `pip install` runs
  - Check Python app starts
  - Test application endpoint

- [ ] **Test Deployment Failure Handling**
  - Use repo with missing package.json
  - Verify error logged
  - Status = 'failed'
  - User sees error message in deployment history

- [ ] **Test Delete Deployment**
  - Click delete button on deployment
  - Confirm browser prompt
  - Verify deleted from database
  - Check user can't delete others' deployments

**Test Repos:**
```
Static: https://github.com/html5up/phantom.git
Node: https://github.com/vercel/next.js/tree/canary/examples/hello-world
React: https://github.com/facebook/create-react-app
Python: https://github.com/pallets/flask/tree/main/examples/tutorial
```

---

### 5. Custom Domains + SSL
**Priority:** HIGH  
**Status:** ⚠️ NOT TESTED WITH REAL DOMAINS

- [ ] **Test Add Custom Domain**
  - Enter domain: `example.com`
  - Verify domain validation (RFC 1123)
  - Check DNS instructions displayed
  - Domain saved in database

- [ ] **Test Invalid Domain**
  - Try `invalid..domain`
  - Try `toolongdomainnameover63characterslongdomainnameover63characters.com`
  - Verify rejection with error message

- [ ] **Test DNS Configuration Display**
  - Add domain
  - Verify A record instructions shown
  - IP matches server IP
  - Instructions clear for user

- [ ] **Test SSL Certificate Installation**
  - Point real domain to server
  - Wait 5-10 minutes for DNS propagation
  - Click "Enable SSL"
  - Wait 30-60 seconds
  - Verify SSL status: pending → active
  - Visit `https://yourdomain.com` - loads with padlock

- [ ] **Test SSL Failure Handling**
  - Try SSL before DNS points to server
  - Verify error message
  - Status remains "No SSL"

**Real Domain Test:**
```bash
# Check DNS propagation
nslookup yourdomain.com
dig yourdomain.com +short

# Verify SSL certificate
curl -I https://yourdomain.com
```

---

### 6. Server Controls
**Priority:** MEDIUM  
**Status:** ⚠️ LOGIC EXISTS, NOT TESTED

- [ ] **Test Start Server**
  - Server in 'stopped' state
  - Click "Start Server"
  - Verify DigitalOcean API call
  - Status updates to 'running'

- [ ] **Test Stop Server**
  - Server in 'running' state
  - Click "Stop Server"
  - Verify API call
  - Status updates to 'stopped'

- [ ] **Test Restart Server**
  - Server in 'running' state
  - Click "Restart Server"
  - Verify reboot API call
  - Status remains 'running'

- [ ] **Test Delete Server**
  - Click "Delete Server" (danger zone)
  - Confirm browser prompt
  - Verify droplet destroyed
  - Database record deleted
  - User redirected to pricing

---

### 7. Environment Variables
**Priority:** MEDIUM  
**Status:** ⚠️ NOT TESTED

- [ ] **Test Add Environment Variable**
  - Add: `API_KEY=test123`
  - Verify saved in database
  - Appears in dashboard table

- [ ] **Test Delete Environment Variable**
  - Click delete on existing var
  - Confirm deletion
  - Verify removed from database
  - Check authorization (can't delete others')

- [ ] **Test Environment Variable Validation**
  - Try invalid key: `INVALID KEY!@#`
  - Verify regex validation
  - Error message shown

---

### 8. Database Setup (PostgreSQL/MySQL/MongoDB)
**Priority:** LOW  
**Status:** ⚠️ NOT TESTED

- [ ] **Test PostgreSQL Setup**
  - Click "Setup PostgreSQL"
  - Monitor installation logs
  - Verify postgres installed on server
  - Database created
  - Flag: `postgres_installed = true`

- [ ] **Test MySQL Setup**
  - Click "Setup MySQL"
  - Verify installation
  - Check flag updated

- [ ] **Test MongoDB Setup**
  - Click "Setup MongoDB"
  - Verify installation
  - Check flag updated

---

### 9. Support Ticket System
**Priority:** MEDIUM  
**Status:** ⚠️ NOT TESTED

- [ ] **Test Submit Ticket**
  - Fill out support form
  - Select priority (low/medium/high/critical)
  - Submit
  - Verify saved in database
  - Appears in ticket history

- [ ] **Test Ticket Display**
  - Check ticket shows in dashboard
  - Status visible (open/in-progress/resolved/closed)
  - Created date correct

---

### 10. Admin Dashboard
**Priority:** HIGH  
**Status:** ⚠️ NOT TESTED

- [ ] **Test User Management**
  - View all users
  - Delete test user
  - Verify cascade delete (servers, payments, etc.)

- [ ] **Test Server Management**
  - View all servers
  - Destroy droplet manually
  - Cancel provisioning request
  - Verify actions logged

- [ ] **Test Domain Management**
  - Add domain for user
  - Update domain
  - Delete domain
  - Verify CRUD operations

- [ ] **Test Audit Logs**
  - Check critical actions logged
  - Timestamps correct
  - User attribution accurate

---

### 11. Authentication & Authorization
**Priority:** CRITICAL  
**Status:** ⚠️ PARTIAL (AUTH WORKS, EDGE CASES UNTESTED)

- [ ] **Test Registration Flow**
  - Register with new email
  - Verify email confirmation required
  - Can't login without confirmation
  - Test duplicate email rejection

- [ ] **Test Login Flow**
  - Login with correct credentials
  - Test wrong password
  - Test non-existent email
  - Verify session created

- [ ] **Test Session Persistence**
  - Login
  - Close browser
  - Reopen - still logged in (7 days)

- [ ] **Test Logout**
  - Click logout
  - Session destroyed
  - Redirect to login
  - Can't access protected routes

- [ ] **Test Protected Routes**
  - Access `/dashboard` without login → redirect
  - Access `/admin` as non-admin → 403
  - Access others' resources → 403

- [ ] **Test Password Change**
  - Change password from dashboard
  - Old password required
  - New password validation
  - Can login with new password

---

### 12. Rate Limiting
**Priority:** MEDIUM  
**Status:** ✅ CONFIGURED, NOT STRESS TESTED

- [ ] **Test General Rate Limiter**
  - Make 200 POST requests in 15 minutes
  - Verify blocked after threshold

- [ ] **Test Contact Form Limiter**
  - Submit 6 contact forms in 1 hour
  - Verify 6th blocked

- [ ] **Test Payment Limiter**
  - Attempt 11 payments in 15 minutes
  - Verify blocked after 10

- [ ] **Test Deployment Limiter**
  - Trigger 6 deployments rapidly
  - Verify 6th blocked

---

### 13. Error Handling
**Priority:** HIGH  
**Status:** ⚠️ NOT TESTED

- [ ] **Test Database Connection Failure**
  - Stop PostgreSQL temporarily
  - Verify graceful error page
  - No stack traces exposed

- [ ] **Test DigitalOcean API Failure**
  - Use invalid API token
  - Verify error handling
  - User gets refund

- [ ] **Test Stripe API Failure**
  - Simulate webhook failure
  - Verify retry logic
  - Check error logged

- [ ] **Test SSH Connection Failure**
  - Deploy to non-existent IP
  - Verify timeout handling
  - Deployment marked failed

---

### 14. Mobile Responsiveness
**Priority:** HIGH  
**Status:** ⚠️ NOT TESTED ON REAL DEVICES

- [ ] **Test on iPhone (Safari)**
  - Homepage loads
  - Navigation menu works
  - Forms functional
  - Dashboard readable

- [ ] **Test on Android (Chrome)**
  - All pages load
  - Touch targets adequate
  - No horizontal scroll

- [ ] **Test on Tablet (iPad)**
  - Layout adapts correctly
  - Dashboard table scrollable

---

### 15. Cross-Browser Compatibility
**Priority:** MEDIUM  
**Status:** ⚠️ NOT TESTED

- [ ] **Chrome** (v120+)
  - Full functionality test
  - Console errors: none

- [ ] **Firefox** (v120+)
  - Full functionality test
  - Console errors: none

- [ ] **Safari** (macOS/iOS)
  - Full functionality test
  - Webkit-specific issues

- [ ] **Edge** (Chromium)
  - Full functionality test

---

### 16. Performance Testing
**Priority:** MEDIUM  
**Status:** ⚠️ NOT TESTED

- [ ] **Page Load Times**
  - Homepage: < 2 seconds
  - Dashboard: < 3 seconds
  - All pages optimized

- [ ] **Database Query Performance**
  - Dashboard query: < 500ms
  - Admin queries: < 1s
  - Add indexes if needed

- [ ] **Concurrent Users**
  - Simulate 10 simultaneous users
  - No timeouts or crashes

- [ ] **Memory Leaks**
  - Run server for 24 hours
  - Monitor memory usage
  - No unbounded growth

---

### 17. Production Environment
**Priority:** CRITICAL  
**Status:** ⚠️ NOT VERIFIED

- [ ] **Server Configuration**
  - SSH access works: `ssh deploy@68.183.203.226`
  - systemd service configured
  - Service auto-starts on reboot
  - Logs accessible: `journalctl -u cloudedbasement.service`

- [ ] **Environment Variables**
  - All required vars set in production `.env`
  - No test keys in production
  - Secrets not in git history

- [ ] **Database Backup**
  - Automated backups configured
  - Test restore procedure
  - Backup retention policy

- [ ] **SSL Certificate**
  - HTTPS redirect works
  - Certificate valid
  - Auto-renewal configured

- [ ] **Monitoring**
  - Error logging (Sentry configured ✅)
  - Uptime monitoring
  - Alert on service failure

- [ ] **Resource Limits**
  - Disk space: > 10GB free
  - Memory usage: < 80%
  - CPU usage: reasonable

**Production Check Commands:**
```bash
# SSH to production
ssh deploy@68.183.203.226

# Check service status
sudo systemctl status cloudedbasement.service

# Check disk space
df -h

# Check memory
free -h

# View logs
sudo journalctl -u cloudedbasement.service -f

# Check environment
cat ~/.env | grep -v PASSWORD
```

---

### 18. Security Hardening (Production)
**Priority:** CRITICAL  
**Status:** ⚠️ CODE SECURE, PRODUCTION CONFIG UNTESTED

- [ ] **Rotate Database Password**
  - **CRITICAL:** Password exposed in git history
  - Change on production server
  - Update `.env` file
  - Restart service

- [ ] **Rotate API Keys**
  - New DigitalOcean token
  - New Stripe keys (live mode)
  - New session secret
  - Update all configs

- [ ] **Firewall Rules**
  - Only ports 22, 80, 443 open
  - Verify with: `sudo ufw status`

- [ ] **HTTPS Enforcement**
  - All HTTP requests redirect to HTTPS
  - Test: `curl -I http://cloudedbasement.ca`

- [ ] **Security Headers**
  - Helmet.js configured ✅
  - Test at: https://securityheaders.com

- [ ] **SSL Configuration**
  - A+ rating at: https://www.ssllabs.com/ssltest/
  - TLS 1.2+ only

---

### 19. Legal & Compliance
**Priority:** HIGH  
**Status:** ⚠️ PAGES EXIST, NEED REVIEW

- [ ] **Privacy Policy**
  - Review with legal counsel
  - GDPR compliance (if applicable)
  - Data retention policy

- [ ] **Terms of Service**
  - Review with legal counsel
  - Refund policy clear
  - User responsibilities defined

- [ ] **Cookie Consent**
  - Cookie banner implemented
  - User can accept/reject
  - Preferences saved

- [ ] **DMCA Compliance**
  - Abuse contact listed
  - DMCA notice procedure

---

### 20. Documentation
**Priority:** MEDIUM  
**Status:** ⚠️ PARTIAL

- [ ] **User Documentation**
  - Getting started guide
  - Deployment tutorials
  - Domain setup instructions
  - Troubleshooting FAQ

- [ ] **API Documentation**
  - If exposing API endpoints
  - Rate limits documented
  - Example requests

---

## 🟡 NICE TO HAVE (Post-Launch)

- [ ] Automated testing suite (Jest/Mocha)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Load testing (100+ concurrent users)
- [ ] Penetration testing (professional)
- [ ] Bug bounty program setup
- [ ] CDN for static assets
- [ ] Redis caching layer
- [ ] Multiple region support
- [ ] Database read replicas

---

## 📋 PRE-LAUNCH SUMMARY

### Must Complete Before Launch
1. ✅ **Security:** All vulnerabilities fixed
2. ⚠️ **Payment Flow:** End-to-end Stripe test
3. ⚠️ **Server Provisioning:** Full DigitalOcean test
4. ⚠️ **Email Delivery:** Verify all providers work
5. ⚠️ **Production Config:** Rotate secrets, verify environment
6. ⚠️ **Mobile Testing:** Real device testing
7. ⚠️ **Legal Review:** Terms & Privacy approved

### Estimated Testing Time
- **Critical tests:** 8-12 hours
- **High priority:** 6-8 hours
- **Medium priority:** 4-6 hours
- **Total:** 18-26 hours (3-4 full days)

### Testing Order
1. **Day 1:** Payment + Provisioning + Email (CRITICAL)
2. **Day 2:** Deployment + Domains + SSL (HIGH)
3. **Day 3:** Production config + Security + Mobile (CRITICAL)
4. **Day 4:** Edge cases + Performance + Admin (MEDIUM)

---

## 🚀 Launch Readiness Checklist

- [ ] All CRITICAL tests passed
- [ ] Production environment configured
- [ ] Secrets rotated
- [ ] Backups configured
- [ ] Monitoring active
- [ ] Legal docs approved
- [ ] Support system ready
- [ ] Rollback plan documented

**Status:** 🟡 NOT READY FOR LAUNCH  
**Next Steps:** Complete Critical Tests (Payment, Provisioning, Email)

---

**Last Updated:** January 27, 2026  
**Next Review:** After completing critical tests
