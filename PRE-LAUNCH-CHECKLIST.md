# 🚀 PRE-LAUNCH CHECKLIST - Clouded Basement
**Generated:** January 28, 2026  
**Status:** MUST FIX before marketing

---

## 🔴 CRITICAL (Will cause crashes or 404s)

### Code Errors That Break The App

- [ ] **Missing `sendServerRequestEmail` import in index.js**
  - File: `index.js` line ~190
  - Issue: Function called but never imported
  - Fix: Add `const { sendServerRequestEmail } = require('./services/email');`

- [ ] **Missing `isTokenValid` function reference**
  - File: `controllers/authController.js`
  - Issue: Calls `isTokenValid()` but function is named `isCodeValid()` in emailToken.js
  - Fix: Change to `isCodeValid()` or add alias

- [ ] **Missing `/resend-confirmation` route**
  - File: `index.js`
  - Issue: Login page links to `/resend-confirmation` but route doesn't exist
  - Fix: Add route handler

- [ ] **Email parameter order wrong**
  - File: `services/digitalocean.js` line ~142
  - Issue: `sendEmail(subject, html, text, to)` but function expects `(to, subject, text, html)`
  - Fix: Reorder parameters in call

---

## 🟠 HIGH PRIORITY (Security + Legal)

### Security Issues

- [ ] **Missing CSRF on 3 POST routes**
  - `/request-server` - needs `csrfProtection` middleware
  - `/admin/domains` - needs CSRF
  - `PUT /admin/domains/:id` - needs CSRF

- [ ] **Missing input validation on route params**
  - `dashboardController.js` - `req.query.success/error` used directly
  - `serverController.js` - `req.body.serverId` should use `parseInt(x, 10)` with NaN check
  - `domainController.js` - `req.params.id` should validate as integer

- [ ] **Missing rate limiting**
  - `/request-server` needs `deploymentLimiter`
  - Add rate limiting to admin domain endpoints

- [ ] **Health endpoint exposes environment info**
  - File: `index.js` `/health` route
  - Consider: Remove `environment` field or restrict to internal IPs

### Legal Issues

- [ ] **Add DigitalOcean to Privacy Policy third parties**
  - File: `pagesController.js` showPrivacy
  - Missing: DigitalOcean not disclosed as infrastructure provider

- [ ] **Add physical address to email footers (CAN-SPAM)**
  - File: `services/email.js`
  - Required: Physical mailing address in all transactional emails

- [ ] **Fix refund policy contradiction**
  - Terms says "non-refundable" but marketing says "30-day guarantee"
  - Decision needed: Pick one and update both places

---

## 🟡 MEDIUM PRIORITY (Marketing consistency)

### Copy Inconsistencies

- [ ] **14-day vs 30-day guarantee**
  - `/docs` says 14-day money-back
  - All other pages say 30-day
  - Fix: Change docs to 30-day

- [ ] **"Lifetime pricing" in final CTA is misleading**
  - Home page says "lock in lifetime pricing"
  - Early Operator is only 6 months
  - Fix: Change to "early adopter pricing"

- [ ] **Placeholder GitHub link**
  - File: `pagesController.js` showAbout
  - Issue: `href="#"` for "View on GitHub →"
  - Fix: Add real URL or remove link

- [ ] **Inconsistent branding**
  - Footer uses "Basement"
  - Main pages use "Clouded Basement"
  - Decision: Pick one and be consistent

- [ ] **CTA button text inconsistent**
  - Pricing page: "Select Basic/Priority/Premium"
  - Home page: "Deploy Basic/Priority/Premium"
  - Fix: Use same verb everywhere

- [ ] **Support response times inconsistent**
  - Privacy page: 48hr for all
  - Safety page: 24hr
  - Pricing tiers: 24-48hr, 12hr, 4-8hr
  - Fix: Align or say "varies by plan"

### Feature Claims vs Reality

- [ ] **Plan upgrades/downgrades DOES NOT EXIST**
  - FAQ claims "Yes! You can upgrade or downgrade"
  - No code exists for this feature
  - Fix: Remove claim from FAQ or implement feature

---

## 🟢 LOW PRIORITY (Polish)

### UI/UX Fixes

- [ ] **Duplicate logout route**
  - Two handlers in index.js (lines ~180 and ~368)
  - Remove the second one

- [ ] **SSH copy button syntax error**
  - Dashboard has extra quote in onclick handler
  - Check and fix quote escaping

### Accessibility

- [ ] **Add skip-to-content link**
  - Missing for keyboard navigation

### Legal Polish

- [ ] **Add physical address to Privacy Policy**
  - Contact section only has email form

- [ ] **Add DPA availability statement**
  - For GDPR business customers

---

## ✅ VERIFIED WORKING

These features were audited and are functional:

- ✅ Automatic server provisioning (DigitalOcean API)
- ✅ IP polling (10s intervals, 5min max)
- ✅ Server controls (start/stop/restart)
- ✅ Server deletion (droplet + DB cleanup)
- ✅ Custom domain addition
- ✅ Email confirmation (6-digit codes)
- ✅ Password reset flow
- ✅ Support ticket system
- ✅ Database setup (PostgreSQL/MongoDB)
- ✅ Git deployment from GitHub
- ✅ Cookie consent banner
- ✅ Terms acceptance tracking
- ✅ All navigation links
- ✅ All footer links
- ✅ All form actions route to valid endpoints
- ✅ All assets (CSS, JS, images) exist

---

## ⚠️ KNOWN LIMITATIONS (Document, don't fix)

These are partially working but acceptable for launch:

1. **Email may fail silently** - Multi-provider setup but no retry on failure
2. **SSL requires DNS propagation** - No DNS verification before certbot
3. **Non-GitHub deploys** - GitLab/Bitbucket use git clone (may fail for private repos)
4. **15-minute SSH timeout** - Large deployments could hang

---

## 📋 QUICK WIN ORDER

If you have limited time, fix in this order:

1. **sendServerRequestEmail import** (1 min) - prevents crash
2. **isTokenValid → isCodeValid** (1 min) - prevents crash
3. **Add /resend-confirmation route** (5 min) - prevents 404
4. **Email parameter order** (1 min) - prevents silent email failures
5. **14-day → 30-day in docs** (1 min) - marketing consistency
6. **Remove plan upgrade claim from FAQ** (1 min) - honest marketing
7. **Add CSRF to /request-server** (1 min) - security
8. **Add DigitalOcean to Privacy Policy** (5 min) - legal

**Total minimum viable fixes: ~15-20 minutes**

---

## 📝 DECISION NEEDED FROM OWNER

1. **Branding:** "Basement" or "Clouded Basement" everywhere?
2. **Guarantee:** 30-day (update terms) or remove guarantee (update marketing)?
3. **GitHub link:** Real URL or remove from About page?
4. **Plan changes:** Implement upgrade/downgrade or remove claim?

---

*Generated by comprehensive codebase audit on January 28, 2026*
