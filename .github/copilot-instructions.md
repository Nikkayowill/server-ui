# Clouded Basement - AI Agent Instructions

## Project Overview
Production cloud hosting platform (cloudedbasement.ca) where customers pay $10/month for managed VPS servers. Full-stack Express.js application with PostgreSQL, Stripe payments, and DigitalOcean API integration.

## Architecture
- **Backend**: Express.js 5.2.1 with MVC structure (controllers, middleware, services, routes)
- **Database**: PostgreSQL with connection pooling, session storage
- **Frontend**: Server-rendered HTML with Tailwind CSS 3.x + Flowbite 2.5.2 (CDN)
- **Payments**: Stripe (test & live modes)
- **Infrastructure**: DigitalOcean droplets via API
- **Process Manager**: PM2 on Ubuntu server
- **Security**: Helmet, CSRF, rate limiting, bcrypt, parameterized queries

## Key Routes
- `/` → Landing page (hero, pricing, features)
- `/register`, `/login`, `/logout` → Authentication (email confirmation required)
- `/dashboard` → User dashboard (server status, deployments, domains, support)
- `/admin` → Admin dashboard (users, servers, payments, pending requests)
- `/pay?plan=X` → Stripe checkout
- `/getting-started` → Post-signup onboarding wizard
- `/about`, `/contact`, `/docs`, `/faq`, `/pricing`, `/terms`, `/privacy` → Public pages

## Development Workflow
**Local development:**
```bash
node index.js  # runs on http://localhost:3000
npm run dev   # if using nodemon
```

**Git workflow (STRICT):**
- **Never commit directly to `main`**
- Create feature branches: `feat/short-description` or `fix/issue-name`
- Commit messages: present tense, prefixed (`feat:`, `fix:`, `chore:`, `docs:`)
- PR workflow: branch → push → PR → merge on GitHub → local pull + cleanup
- Delete branches after merge: `git branch -d feat/name`

**Production deployment:**
- Server: 68.183.203.226 (Ubuntu, PM2, systemd)
- SSH: `ssh deploy@68.183.203.226`
- Deploy: `git pull origin main && sudo systemctl restart cloudedbasement.service`
- Logs: `pm2 logs cloudedbasement` or `journalctl -u cloudedbasement.service -f`
- See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for full process

## Project Conventions
1. **MVC Structure**: Controllers handle logic, services handle external APIs, middleware handles cross-cutting concerns
2. **HTML Rendering**: Template strings with helpers (`getHTMLHead()`, `getResponsiveNav()`, `getFooter()`, `getScripts()`)
3. **Styling**: Tailwind CSS utilities only, no inline styles. Custom classes in `global.css` (brand colors, navigation)
4. **Forms**: Always include CSRF token: `<input type="hidden" name="_csrf" value="${req.csrfToken()}">`
5. **Authentication**: Use `requireAuth` middleware, session stored in PostgreSQL
6. **NEVER EXPOSE SECRETS**: Do NOT put API keys, passwords, or tokens in markdown files, code comments, or documentation. Use placeholders like `sk_test_...` or `your_key_here`. Only `.env` file contains real credentials.
6. **Database**: Always use parameterized queries: `pool.query('SELECT * FROM users WHERE id = $1', [userId])`
7. **Error Handling**: Try/catch in async controllers, redirect with error messages via query params or flash messages

## Critical Files
- [index.js](../index.js) - Main Express app, middleware, route mounting
- [helpers.js](../helpers.js) - HTML generators (head, nav, footer, scripts)
- [db.js](../db.js) - PostgreSQL connection pool
- [controllers/](../controllers/) - Route handlers (auth, pages, dashboard, admin, payment, gettingStarted)
- [middleware/](../middleware/) - auth, rateLimiter, errorHandler, logger
- [services/](../services/) - digitalocean, email, auditLog
- [routes/](../routes/) - Express routers
- [public/css/global.css](../public/css/global.css) - Brand utilities + navigation styles (155 lines)
- [docs/](../docs/) - Comprehensive documentation (15+ markdown files)

## Design System
**Brand Colors:**
- Primary (Cyan): `#2DA7DF` - `.text-brand`, `.bg-brand`, `.border-brand`
- Dark Background: `#0a0812`
- Font: JetBrains Mono (monospace, tech-forward)

**Tailwind Classes:**
- Use standard Tailwind utilities: `px-4`, `py-2`, `bg-gray-800`, `text-white`, etc.
- Brand utilities: `.text-brand`, `.bg-brand`, `.border-brand`, `.glow-brand`
- Responsive: `md:`, `lg:` breakpoints
- Forms: `focus:border-brand focus:ring-2 focus:ring-brand`

**Navigation:**
- Fixed top nav with mobile hamburger menu
- Backdrop blur effect
- Auto-hides on link click (<768px)

## Adding New Features
**New Page:**
1. Create controller function in appropriate file (e.g., `pagesController.js`)
2. Use template: `${getHTMLHead('Title')} ${getResponsiveNav(req)} <main>...</main> ${getFooter()} ${getScripts('nav.js')}`
3. Add route in relevant router file
4. Update navigation in `helpers.js` if needed
5. Test locally, commit to feature branch, PR

**New Database Table:**
1. Create SQL file in `db/schema/`
2. Run manually: `psql -U basement_user -d basement_db -f db/schema/file.sql`
3. Add migration script in `migrations/` if needed
4. Document in `docs/DATABASE-SETUP.md`

**New API Integration:**
1. Create service file in `services/` (e.g., `newapi.js`)
2. Handle errors gracefully with try/catch
3. Add environment variables to `.env`
4. Document in relevant doc file

## Security Checklist
- ✅ All forms have CSRF protection
- ✅ All passwords hashed with bcrypt (10 rounds)
- ✅ All database queries use parameterized statements
- ✅ Rate limiting on sensitive routes
- ✅ HTTP-only session cookies
- ✅ Helmet security headers
- ✅ HTTPS redirect in production
- ✅ Input validation with express-validator

## Testing Before Deploy
1. Start server: `node index.js`
2. Open http://localhost:3000
3. Test critical flows:
   - Register account (check email confirmation)
   - Login (check session persistence)
   - Dashboard (check all sections load)
   - Admin (if admin role)
   - Forms (check CSRF tokens)
4. Check browser console for errors (F12)
5. Check server logs for warnings
6. Test mobile responsive (toggle device toolbar)
7. Run through payment flow with Stripe test card (4242 4242 4242 4242)

## Known Issues & Gaps
1. **Payment → Server Automation**: Manual DigitalOcean droplet creation required after payment (automation in progress)
2. **Email Sending**: Multiple providers configured (Gmail OAuth2, SendGrid, SMTP) but needs end-to-end testing
3. **Admin Features**: Destroy droplet and delete functions exist but need safety testing
4. **Legal Pages**: Privacy/Terms exist but may need legal review

## Environment Variables Required
```bash
# Database
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

# Session
SESSION_SECRET

# Stripe
STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY

# DigitalOcean
DO_API_TOKEN

# Email (choose one)
GMAIL_EMAIL, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
# OR
SENDGRID_API_KEY
# OR
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

# Environment
NODE_ENV (production|development)
PORT (default: 3000)
```

## Documentation Reference
- [README.md](../README.md) - Project status, customer onboarding flow
- [docs/README.md](../docs/README.md) - Complete implementation details
- [docs/DEV-CHEATSHEET.md](../docs/DEV-CHEATSHEET.md) - Git workflow
- [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) - Production deployment
- [docs/SECURITY.md](../docs/SECURITY.md) - Security measures
- [docs/TESTING-GUIDE.md](../docs/TESTING-GUIDE.md) - How to test
- [docs/REFACTORING.md](../docs/REFACTORING.md) - MVC refactor details
- [HANDOFF-PROMPT.md](../HANDOFF-PROMPT.md) - Complete handoff for new AI agents

## Recent Changes (January 20, 2026)
- ✅ Migrated entire UI to Tailwind CSS + Flowbite (17 pages)
- ✅ Removed all inline styles and legacy CSS classes
- ✅ Created minimal global.css (155 lines)
- ✅ Fixed responsive navigation
- ✅ Cleaned admin dashboard
- ✅ Tested server startup (successful)
- ⏳ Production testing pending
- ⏳ Email/payment/server automation needs verification

## Critical Warnings
- **Never expose `.env`** - Contains secrets
- **Never commit to `main` directly** - Always use feature branches
- **Test Stripe in test mode first** - Card 4242 4242 4242 4242
- **Manual server provisioning required** - No automated flow yet
- **Check logs after deployment** - `pm2 logs cloudedbasement`
