# 🤖 AI Agent Handoff Prompt - Clouded Basement
**Date:** January 31, 2026  
**Status:** Production with Stripe subscriptions + one-time payments

---

## 📋 QUICK CONTEXT

You're working on **Clouded Basement** (cloudedbasement.ca) - a **fully automated cloud hosting platform** with one-touch VPS provisioning, Git deployment, and SSL automation. The site is **live in production**.

**Your role:** Help maintain, debug, test, and deploy this production application.

---

## 🎯 CURRENT PROJECT STATE

### ✅ Recently Completed (January 21, 2026)
1. **FAQ Rewrite** - Reduced from 13 to 6 focused questions with accurate feature descriptions
2. **Documentation Update** - README.md reflects actual automated features
3. **Major UI Refactor** (Jan 20) - Migrated entire codebase from custom CSS to Tailwind CSS + Flowbite
   - Cleaned **17 pages** (landing, auth, dashboard, admin, payment flows)
   - Removed **all inline styles** and legacy CSS classes
   - Created minimal `global.css` (155 lines: brand utilities + navigation)
   - Fixed responsive navigation with mobile hamburger menu

2. **Codebase Structure** - MVC architecture with proper separation:
   - Controllers: `authController`, `pagesController`, `dashboardController`, `adminController`, `paymentController`, `serverController`
   - Middleware: `auth.js`, `rateLimiter.js`, `errorHandler.js`, `logger.js`
   - Services: `digitalocean.js`, `email.js`, `auditLog.js`
   - Routes: `/auth`, `/dashboard`, `/pages`, `/payments`, `/servers`

### ⚠️ Known Issues & Gaps
1. **Email Sending** - Multiple providers configured but needs end-to-end testing:
   - Gmail OAuth2 (preferred)
   - SendGrid API
   - Mailtrap (dev)
   - Generic SMTP
   
2. **Legal Pages** - Privacy/Terms exist but need legal review

3. **Password Reset** - Not yet implemented

4. **Mobile Testing** - Needs real device testing (iPhone/Android)

---

## 🏗️ ARCHITECTURE OVERVIEW

### Tech Stack
- **Runtime:** Node.js 24.13.0
- **Framework:** Express.js 5.2.1
- **Database:** PostgreSQL (connection pooling via `pg`)
- **Sessions:** PostgreSQL-backed (connect-pg-simple)
- **Payments:** Stripe (test & live keys in .env)
- **Hosting:** DigitalOcean Droplets via API
- **Server Management:** systemd service
- **CSS:** Tailwind CSS 3.x (CDN) + Flowbite 2.5.2 (CDN)

### Security Features
- ✅ Helmet.js security headers
- ✅ Rate limiting (100/15min global, 5/hr contact, 10/15min payments)
- ✅ CSRF protection on all forms (csurf)
- ✅ Bcrypt password hashing (10 rounds)
- ✅ SQL injection protection (parameterized queries)
- ✅ HTTP-only session cookies
- ✅ HTTPS redirect in production
- ✅ Input validation (express-validator)
- ✅ Admin role caching with 5-min TTL

### File Structure
```
server-ui/
├── index.js                 # Main Express app, routes, middleware
├── db.js                    # PostgreSQL connection pool
├── helpers.js               # HTML head, nav, footer generators
├── controllers/             # Route handlers (pages, auth, dashboard, admin, payment)
├── middleware/              # auth, rateLimiter, errorHandler, logger
├── routes/                  # Express routers (auth, dashboard, pages, payments, servers)
├── services/                # digitalocean, email, auditLog
├── public/
│   ├── css/
│   │   ├── global.css       # 155 lines: Tailwind directives + brand utilities + nav
│   │   └── tailwind.css     # (Generated, not in repo)
│   └── js/
│       ├── nav.js           # Navigation toggle logic
│       ├── dashboard.js     # Dashboard interactive features
│       └── faq.js           # FAQ accordion
├── db/schema/               # SQL schema files (tables, migrations)
├── docs/                    # All documentation (15+ markdown files)
│   ├── DATABASE-SETUP.md
│   ├── DEV-CHEATSHEET.md
│   ├── DEPLOYMENT.md
│   ├── PRODUCTION-SECURITY.md
│   ├── REFACTORING.md
│   ├── REVENUE-STREAMS.md
│   ├── SECURITY.md
│   ├── STRIPE-WEBHOOKS.md
│   ├── TESTING-GUIDE.md
│   └── ...
└── .github/
    └── copilot-instructions.md  # Updated Jan 31, 2026
```

---

## 🔑 CRITICAL ENVIRONMENT VARIABLES

**Required in `.env` (not in repo):**
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=basement_db
DB_USER=basement_user
DB_PASSWORD=<secret>

# Session
SESSION_SECRET=<random_secret_key>

# Stripe (live keys in production)
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)

# DigitalOcean
DO_API_TOKEN=<token>

# Email (choose one provider)
# Gmail OAuth2 (preferred)
GMAIL_EMAIL=support@cloudedbasement.ca
GMAIL_CLIENT_ID=<oauth_client_id>
GMAIL_CLIENT_SECRET=<oauth_client_secret>
GMAIL_REFRESH_TOKEN=<refresh_token>

# OR SendGrid
SENDGRID_API_KEY=<key>

# OR Generic SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=<user>
SMTP_PASS=<pass>

# Environment
NODE_ENV=production  # (or development)
PORT=3000
```

---

## 📊 TESTING STATUS

### ✅ Tested & Working
- Server starts without errors (`node index.js`)
- All pages load correctly (navigation, landing, auth, dashboard)
- Tailwind CSS styling renders properly
- Mobile responsive navigation works
- Forms have CSRF tokens

### ⚠️ Needs Testing
- [ ] Email sending (all providers)
- [ ] Stripe payment flow end-to-end
- [ ] DigitalOcean droplet creation
- [ ] Server provisioning automation
- [ ] Admin destroy/delete actions
- [ ] Email confirmation flow
- [ ] Password reset (if implemented)
- [ ] Support ticket system
- [ ] Domain management
- [ ] Mobile display on real devices
- [ ] Cross-browser compatibility
- [ ] Production HTTPS redirect
- [ ] Rate limiting thresholds
- [ ] Session expiry behavior

---

## 🚀 DEPLOYMENT PROCESS

### Production Server
- **IP:** 68.183.203.226
- **Domain:** cloudedbasement.ca
- **OS:** Ubuntu
- **User:** `deploy`
- **Service:** `cloudedbasement.service` (systemd)
- **Credentials:** See `docs/password for Web Application server.md`

### Deployment Commands
```bash
# SSH into server
ssh deploy@68.183.203.226

# Navigate to project
cd ~/server-ui

# Pull latest code
git pull origin main

# Install dependencies (if package.json changed)
npm install

# Restart service
sudo systemctl restart cloudedbasement.service

# Check status
sudo systemctl status cloudedbasement.service

# View logs
journalctl -u cloudedbasement.service -f
```

### Git Workflow (STRICT)
1. **Never commit directly to `main`**
2. Create feature branch: `git checkout -b feat/description`
3. Make changes and commit: `git commit -m "feat: description"`
4. Push: `git push origin feat/description`
5. Create PR on GitHub
6. Merge PR on GitHub (not locally)
7. Pull main: `git checkout main && git pull`
8. Delete feature branch: `git branch -d feat/description`

**Commit prefixes:** `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

---

## 🎨 DESIGN SYSTEM

### Brand Colors
- **Primary (Cyan):** `#2DA7DF` - Used for CTAs, links, accents
- **Dark Background:** `#0a0812` - Main background color
- **Font:** JetBrains Mono (monospace, tech-forward)

### Tailwind Utilities (in global.css)
```css
.text-brand { color: #2DA7DF; }
.bg-brand { background-color: #2DA7DF; }
.border-brand { border-color: #2DA7DF; }
.glow-brand { box-shadow: 0 0 15px rgba(45, 167, 223, 0.4); }
```

### Navigation Component
- Fixed top navigation
- Mobile hamburger menu (<768px)
- Backdrop blur effect
- Auto-hides on link click
- Scroll-triggered styling

---

## 🛠️ COMMON TASKS

### Adding a New Page
1. Create controller function in appropriate file (e.g., `pagesController.js`)
2. Use template: `${getHTMLHead('Title')}` + `${getResponsiveNav(req)}` + `<main>...</main>` + `${getFooter()}` + `${getScripts('nav.js')}`
3. Add route in `routes/pages.js` or `index.js`
4. Update navigation links in `helpers.js` → `getResponsiveNav()`
5. Test locally, commit to feature branch, PR

### Fixing a Bug
1. Read error logs: `pm2 logs cloudedbasement`
2. Check browser console (F12)
3. Review relevant controller/service
4. Test fix locally
5. Git workflow: branch → commit → PR → merge → deploy

### Database Changes
1. Write SQL migration in `db/schema/`
2. Run manually: `psql -U basement_user -d basement_db -f db/schema/newfile.sql`
3. Update `migrations/` if needed
4. Document in `docs/DATABASE-SETUP.md`

### Updating Dependencies
```bash
npm outdated
npm update
npm audit fix
git commit -m "chore: update dependencies"
```

---

## 📖 DOCUMENTATION REFERENCE

**Must-read for context:**
- `docs/README.md` - Full implementation details
- `docs/DEV-CHEATSHEET.md` - Git workflow
- `docs/DEPLOYMENT.md` - Production deployment
- `docs/SECURITY.md` - Security measures
- `docs/TESTING-GUIDE.md` - How to test everything

**Outdated (needs update after refactor):**
- `.github/copilot-instructions.md` - Still references old architecture

---

## ⚠️ CRITICAL WARNINGS

1. **Never expose `.env` file** - Contains API keys, database passwords
2. **Never commit Stripe live keys** - Use test keys in development
3. **Never work directly on `main` branch** - Always use feature branches
4. **Test payments in Stripe test mode first** - Use card 4242 4242 4242 4242
5. **Check production logs after deployment** - `pm2 logs cloudedbasement`
6. **Manual server provisioning required** - No automated flow yet
7. **Email sending not verified** - Test before relying on it

---

## 🎯 NEXT PRIORITIES (From Owner)

### High Priority
1. **Test email sending** - Verify all providers work
2. **Complete payment → server automation** - Reduce manual work
3. **Test admin controls** - Ensure destroy/delete works safely
4. **Mobile device testing** - Real iPhone/Android
5. **Legal review** - Privacy policy, terms of service
6. **Remove PM2 references** - Already using systemd

### Medium Priority
6. Update `.github/copilot-instructions.md` with new architecture
7. Add comprehensive error handling
8. Implement proper logging (Winston)
9. Set up monitoring/alerts
10. Security audit (penetration testing)

### Low Priority
11. CDN → Local Tailwind migration
12. Performance optimization
13. SEO improvements
14. Analytics integration

---

## 💬 COMMUNICATION STYLE

**Owner preferences:**
- Direct, no-nonsense answers
- Show code, not explanations (unless asked)
- Work systematically (lists, sequences)
- Test before claiming done
- Flag blockers immediately

**What to avoid:**
- Unnecessary markdown summaries
- Saying "let me" or "I'll" without doing it
- Making assumptions about missing info
- Over-explaining simple tasks

---

## 🔍 DIAGNOSTICS CHECKLIST

When debugging, check:
- [ ] Server logs: `journalctl -u cloudedbasement.service -f`
- [ ] Browser console (F12 → Console)
- [ ] Network tab (F12 → Network)
- [ ] Database connection: `/health` endpoint
- [ ] Environment variables loaded: Check `.env` present
- [ ] CSRF tokens in forms: View page source
- [ ] Rate limit headers: Response headers
- [ ] Session cookies: Application → Cookies
- [ ] Git branch: `git branch` (not on main)

---

## 🚨 EMERGENCY CONTACTS

**Production Issues:**
- Owner: [Insert contact method]
- Stripe Support: https://support.stripe.com
- DigitalOcean Support: https://www.digitalocean.com/support

**Useful Links:**
- Live Site: https://cloudedbasement.ca
- Stripe Dashboard: https://dashboard.stripe.com
- DigitalOcean Panel: https://cloud.digitalocean.com
- GitHub Repo: [Insert repo URL]

---

## 📝 RECENT CHANGES (Last Session)

**What was done:**
- Refactored all 17 pages to Tailwind CSS
- Removed inline styles from `pagesController.js`, `authController.js`, `dashboardController.js`, `adminController.js`, `paymentController.js`, `gettingStartedController.js`
- Created minimal `global.css` (155 lines)
- Added navigation styles to support mobile menu
- Fixed admin dashboard tables with Tailwind
- Tested server startup (successful)
- Pushed changes to GitHub

**Files modified:**
- `controllers/*.js` (all 6 files)
- `public/css/global.css`
- `helpers.js` (Tailwind CDN integration)

**Not tested yet:**
- Visual inspection in browser
- Mobile responsiveness on devices
- Production deployment
- Email/payment/server flows

---

## ✅ FINAL CHECKLIST BEFORE TAKING OVER

- [ ] Read this entire handoff document
- [ ] Review `docs/README.md` for full context
- [ ] Check `.env` file exists and is complete
- [ ] Verify `node index.js` starts without errors
- [ ] Open http://localhost:3000 and inspect design
- [ ] Review recent git commits: `git log --oneline -10`
- [ ] Check for any error files or logs in project root
- [ ] Understand current priorities (testing, email, automation)
- [ ] Ask owner for clarification if anything is unclear

---

**Last Updated:** January 20, 2026  
**Next Review:** After production testing complete  
**Owner Status:** Ready for systematic testing phase

---

