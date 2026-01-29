# Checklist - January 27, 2026

## 🚨 CRITICAL - DO FIRST (Before Any Commit)

### 1. Fix Password Security Issue ⚠️ 
**Problem**: SSH passwords currently sent in plaintext via email

**Email Fix** (`services/email.js`):
- [ ] Remove `${serverPassword}` from email HTML template
- [ ] Change to: "Password: (Available in your secure dashboard)"
- [ ] Update security message to emphasize dashboard-only access

**Dashboard Fix** (`controllers/dashboardController.js`):
- [ ] Find SSH password display in dashboard
- [ ] Add hidden span with password: `<span id="ssh-password" style="display:none;">${server.ssh_password}</span>`
- [ ] Add visible placeholder: `<span id="ssh-password-hidden">••••••••••••</span>`
- [ ] Add eye button: `<button onclick="togglePassword()">👁️</button>`
- [ ] Add JavaScript toggle function
- [ ] Test: Password hidden by default, reveals on click

**Testing**:
- [ ] Test locally: `node test-email.js` - should NOT show password in email
- [ ] Check dashboard shows toggle button
- [ ] Click eye button - password should reveal/hide
- [ ] Test in browser console for errors

**Time**: 30-45 minutes

---

## 🧹 CLEANUP

- [ ] Delete `test-email.js` file: `rm test-email.js`
- [ ] Check `git status` - should only see `services/email.js` and `controllers/dashboardController.js`
- [ ] Review changes: `git diff`

---

## 📦 COMMIT & DEPLOY

**Commit**:
```bash
git add services/email.js controllers/dashboardController.js
git commit -m "feat: secure SSH password display and improve server ready email

Email improvements:
- Enhanced onboarding content with 3-step guide
- Simplified HTML formatting with proper spacing
- Removed decorative emojis for professional appearance
- Password no longer sent in email (security fix)

Dashboard improvements:
- Added eye button toggle for SSH password
- Password hidden by default for security
- Click to reveal when needed

Security: SSH credentials now only visible in secure dashboard"
```

**Deploy to Production**:
```bash
git push origin main
ssh -t deploy@68.183.203.226 "cd ~/server-ui && git pull origin main && sudo systemctl restart cloudedbasement.service"
```

**Verify**:
- [ ] Service restarted: `sudo systemctl status cloudedbasement.service`
- [ ] No errors in logs: `sudo journalctl -u cloudedbasement.service -n 50`
- [ ] Site loads: Visit https://cloudedbasement.ca

**Time**: 10-15 minutes

---

## 🔒 ROTATE PRODUCTION SECRETS ⚠️

**Background**: Database password was exposed in git history, need to rotate all secrets

### Database Password
```bash
ssh deploy@68.183.203.226
sudo -u postgres psql
ALTER USER webserver_user WITH PASSWORD 'NEW_SECURE_PASSWORD_HERE';
\q
nano ~/server-ui/.env
# Update DB_PASSWORD=NEW_SECURE_PASSWORD_HERE
```

### DigitalOcean Token
- [ ] Generate new token: https://cloud.digitalocean.com/account/api/tokens
- [ ] Delete old token from DO dashboard
- [ ] Update `DIGITALOCEAN_TOKEN` in `.env`

### Session Secret
```bash
# Generate new secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output and update SESSION_SECRET in .env
```

### Restart & Verify
```bash
sudo systemctl restart cloudedbasement.service
sudo systemctl status cloudedbasement.service
# Visit https://cloudedbasement.ca - should still work
```

**Time**: 30-45 minutes

---

## ✅ END-TO-END TESTING

### Payment Flow Test
- [ ] Use Stripe test mode: Card `4242 4242 4242 4242`
- [ ] Complete checkout for any plan
- [ ] Monitor webhook: Check logs for "Checkout session completed"
- [ ] Watch DigitalOcean dashboard for new droplet
- [ ] Wait 2-5 minutes for provisioning
- [ ] Check email received:
  - [ ] Proper formatting
  - [ ] NO password visible
  - [ ] CTA button links to dashboard
- [ ] Login to dashboard:
  - [ ] Server shows "running" status
  - [ ] IP address visible
  - [ ] Password hidden with ••••••••
  - [ ] Eye button works (reveal/hide)
- [ ] Copy credentials and SSH: `ssh root@{ip}`
- [ ] Deploy test repo from dashboard

**Time**: 15-20 minutes

---

## 📧 EMAIL DELIVERABILITY

- [ ] Test email to Gmail (already done ✓)
- [ ] Test email to Outlook/Hotmail address
- [ ] Check spam folder on both
- [ ] Verify FROM shows: support@cloudedbasement.ca
- [ ] Try replying to email - does it work?

**Time**: 15 minutes

---

## 📱 MOBILE TESTING (If Time)

- [ ] Open https://cloudedbasement.ca on iPhone
- [ ] Test registration flow
- [ ] Test payment flow  
- [ ] Check email on mobile Gmail app
- [ ] Check dashboard responsive
- [ ] Test password toggle on touchscreen

**Time**: 30 minutes

---

## 🛡️ SECURITY VERIFICATION (Optional)

- [ ] Test at https://securityheaders.com
- [ ] Test at https://www.ssllabs.com/ssltest/
- [ ] Check for A or A+ rating
- [ ] Verify TLS 1.2+ only

**Time**: 15 minutes

---

## PRIORITY ORDER

**MUST DO TODAY:**
1. ✅ Fix password security (email + dashboard)
2. ✅ Cleanup and commit
3. ✅ Deploy to production
4. ✅ Rotate secrets (database, DO token, session)
5. ✅ End-to-end payment test

**SHOULD DO IF TIME:**
6. Email deliverability test
7. Mobile testing

**CAN DEFER:**
- Legal review
- Advanced security testing
- Custom domain testing

---

## 📝 NOTES

- Get some sleep first! 💤
- Current uncommitted changes: `services/email.js` (emoji removal)
- Test script still exists: `test-email.js` (delete before commit)
- SendGrid working perfectly (5+ successful tests)
- Server running at: 68.183.203.226
- Database password MUST be rotated (exposed in git history)

---

## 🎯 SUCCESS CRITERIA

**Done when:**
- ✅ Password NOT in email
- ✅ Dashboard has working eye button toggle
- ✅ All secrets rotated
- ✅ Committed and deployed
- ✅ Full payment test passes
- ✅ Email delivered and formatted correctly
- ✅ SSH login works from dashboard credentials

**Estimated Total Time**: 2-3 hours

---

**Last Updated**: January 27, 2026 - Pre-sleep checklist  
**Status**: Ready to start fresh tomorrow
