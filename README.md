# Clouded Basement - Cloud Hosting Platform
**Last Updated:** January 21, 2026

---

## 🎯 WHAT THIS IS

**Fully automated cloud hosting platform** with one-touch VPS provisioning, Git deployment, and SSL automation.

**Live:** cloudedbasement.ca  
**Status:** Production-ready with full automation

---

## 💰 PRICING

### Three Plans:
- **Basic:** $25/month - 1GB RAM, 1 CPU, 25GB storage
- **Priority:** $60/month - 2GB RAM, 2 CPUs, 50GB storage  
- **Premium:** $120/month - 4GB RAM, 2 CPUs, 80GB storage

### Founder Launch Promo:
- **$10/month lifetime** for first customers (limited availability)
- Locked-in price forever
- Full platform access

---

## ✅ WHAT'S WORKING (FULLY AUTOMATED)

### 🚀 Server Provisioning
- ✅ Stripe payment webhook triggers automatic droplet creation
- ✅ Ubuntu 22.04 + Nginx + Certbot pre-installed
- ✅ Secure SSH password auto-generated
- ✅ IP polling with 5-minute timeout
- ✅ Welcome email sent when ready
- ✅ Auto-refund if provisioning fails
- ✅ One server per customer (database constraint)

### 📦 Git Deployment
- ✅ Auto-detects project type (React/Vue/Node/Python/Static)
- ✅ Clones repo via SSH
- ✅ Installs dependencies (npm/pip)
- ✅ Builds production assets
- ✅ Deploys to Nginx
- ✅ Real-time deployment logs
- ✅ Deployment history tracking

### 🌐 Custom Domains + SSL
- ✅ Add unlimited domains from dashboard
- ✅ DNS configuration instructions displayed
- ✅ One-click SSL via Let's Encrypt
- ✅ Automated certbot execution via SSH
- ✅ SSL status tracking (pending/active/failed)
- ✅ Auto-renewal configured

### 🎛️ Server Management
- ✅ Start/Stop/Restart via DigitalOcean API
- ✅ Delete server + destroy droplet
- ✅ Real-time status (provisioning/running/stopped/failed)
- ✅ SSH credentials displayed
- ✅ Server specs tracking

### 🎫 Support System
- ✅ Submit tickets from dashboard
- ✅ Priority levels (low/medium/high/critical)
- ✅ Ticket history
- ✅ Status tracking

### 🔐 Account Features
- ✅ Email confirmation required
- ✅ Change password (with verification)
- ✅ Role-based access (user/admin)
- ✅ Session management
- ✅ CSRF protection on all forms

### 💳 Payment + Billing
- ✅ Stripe Checkout integration
- ✅ Webhook handling (payments + refunds)
- ✅ Payment history tracking
- ✅ Automatic refunds on failures

### 🔧 Admin Controls
- ✅ View all users, servers, payments
- ✅ Manually destroy droplets
- ✅ Delete user records
- ✅ Audit logging

### ⚙️ Background Jobs
- ✅ DigitalOcean sync (hourly) - marks deleted droplets
- ✅ IP polling system with cleanup
- ✅ Email notifications
- ✅ Graceful shutdown handling

---

## 🧪 TESTING CHECKLIST

### Before Production Deploy:
- [ ] Test full payment flow (Stripe test mode)
- [ ] Verify server auto-provisioning (2-5 min)
- [ ] Test Git deployment (React/Node/Python)
- [ ] Test custom domain + SSL
- [ ] Verify email sending works
- [ ] Test server controls (start/stop/restart)
- [ ] Test delete server flow
- [ ] Mobile responsive check
- [ ] Cross-browser testing
- [ ] Load testing (concurrent users)

---

## 📊 CUSTOMER JOURNEY (AUTOMATED)

### Payment → Server Flow:
```
1. Customer completes Stripe checkout ✅
2. Webhook fires instantly ✅
3. Payment recorded in database ✅
4. DigitalOcean droplet creation triggered ✅
5. Ubuntu + Nginx + Certbot installed ✅
6. IP polling starts (10-sec intervals, 5-min max) ✅
7. Server status: "provisioning" → "running" ✅
8. Welcome email sent with SSH credentials ✅
9. Customer can deploy immediately ✅
```

### If Provisioning Fails:
```
1. Status set to "failed" ✅
2. Automatic Stripe refund issued ✅
3. Payment status updated to "refunded" ✅
4. Customer notified (manual for now) ⚠️
```

---

## 🛠️ TECH STACK

- **Backend:** Express.js 5.2.1, Node.js
- **Database:** PostgreSQL (connection pooling, session storage)
- **Payments:** Stripe (webhooks + Checkout)
- **Infrastructure:** DigitalOcean API
- **Frontend:** Server-rendered HTML + Tailwind CSS 3.x + Flowbite 2.5.2
- **Process Manager:** PM2 on Ubuntu
- **Security:** Helmet, CSRF, rate limiting, bcrypt, parameterized queries

---

## 📁 PROJECT STRUCTURE

```
/controllers - Route handlers (auth, pages, dashboard, admin, payment, server)
/middleware - auth, rateLimiter, errorHandler, logger
/services - digitalocean, email, auditLog
/routes - Express routers
/public/css - Tailwind + brand utilities (global.css: 155 lines)
/db/schema - PostgreSQL tables
/docs - Documentation (this folder)
helpers.js - HTML generators (head, nav, footer, scripts)
index.js - Main Express app
```

---

## ⚠️ KNOWN GAPS

### High Priority:
- [ ] Email sending needs end-to-end testing
- [ ] Privacy policy + TOS legal review
- [ ] Password reset flow (not implemented)
- [ ] Mobile device testing (real hardware)
- [ ] Production monitoring/alerts

### Medium Priority:
- [ ] Billing history page
- [ ] Usage metrics dashboard
- [ ] Plan upgrade/downgrade (currently one server per customer)
- [ ] Backup/restore functionality

### Low Priority:
- [ ] Custom server specs
- [ ] Multiple servers per user
- [ ] Team collaboration features

---

## 🚀 DEPLOYMENT

```bash
# Local changes → GitHub
git add .
git commit -m "description"
git push origin main

# Production server
ssh deploy@68.183.203.226
cd ~/server-ui
git pull origin main
sudo systemctl restart cloudedbasement.service
```

**Service:** cloudedbasement.service (systemd)  
**Logs:** `pm2 logs cloudedbasement` or `journalctl -u cloudedbasement.service -f`

---

## 📖 DOCUMENTATION

- **README.md** - Project status, customer onboarding flow
- **docs/README.md** - Complete implementation details
- **docs/DEV-CHEATSHEET.md** - Git workflow
- **docs/DEPLOYMENT.md** - Production deployment
- **docs/SECURITY.md** - Security measures
- **docs/TESTING-GUIDE.md** - How to test
- **docs/REFACTORING.md** - MVC refactor details
- **HANDOFF-PROMPT.md** - Complete handoff for new AI agents

---

## 🔗 IMPORTANT LINKS

- **Production:** https://cloudedbasement.ca
- **GitHub:** https://github.com/Nikkayowill/server-ui
- **Server:** deploy@68.183.203.226
- **Stripe Dashboard:** stripe.com/dashboard

---

**Questions? Check docs/ folder or just start testing. The best way to find issues is to use your own product.**
Hey [Name],

Your $10/month lifetime founder plan is active!

I'm setting up your server now (takes 1-2 hours).
You'll get another email with login credentials.

Questions? Just reply.

— Nik
```

### Server Ready Email
```
Subject: Your server is ready 🚀

Server Details:
IP: 142.93.45.123
Username: root  
Password: [generated]

Connect: ssh root@142.93.45.123

Docs: cloudedbasement.ca/docs

— Nik
```

---

## 🎯 LAUNCH READINESS

**Can show friends:** Yes (if you test payment flow first)  
**Can post on Reddit/X:** Not yet (fix manual onboarding first)  
**Can scale to 100 users:** No (manual process doesn't scale)

**Recommendation:** Launch to 10 founder customers manually, then automate.

---

## 📞 SUPPORT PLAN

- **Email:** support@cloudedbasement.ca
- **Response time:** 24 hours (faster for founders)
- **Coverage:** You, personally
- **Escalation:** If server down, fix immediately

---

## 💡 NEXT STEPS

1. Test payment flow end-to-end TODAY
2. Write welcome email template
3. Copy/paste privacy policy from template
4. Update dashboard for post-payment state
5. Do 3 full tests with friends
6. Soft launch to first 5 customers
7. Monitor closely, fix issues
8. Build automation after validating manually

---

## 🔗 IMPORTANT LINKS

- **Production:** https://cloudedbasement.ca
- **GitHub:** https://github.com/Nikkayowill/server-ui
- **Server:** deploy@68.183.203.226
- **Stripe Dashboard:** stripe.com/dashboard

---

**Questions? Check docs/ folder or just start testing. The best way to find issues is to use your own product.**
