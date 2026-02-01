# Clouded Basement - Technical Documentation

## What This Platform Does

Automated cloud hosting that provisions VPS servers in minutes. When a customer pays, the platform automatically creates a DigitalOcean droplet, installs Ubuntu + Nginx + SSL tools, and emails login credentials. Customers can then deploy code via Git, add custom domains, and enable HTTPS with one click.

## Stack

- **Backend:** Express.js 5.2.1 on Node.js
- **Database:** PostgreSQL with session storage
- **Payments:** Stripe webhooks trigger server creation
- **Infrastructure:** DigitalOcean API for VPS management
- **Frontend:** Server-rendered HTML with Tailwind CSS + Flowbite
- **Process Manager:** PM2 on Ubuntu production server
- **Security:** Helmet headers, CSRF tokens, rate limiting, bcrypt passwords

## How It Works

### Customer Journey
1. Register account → email confirmation required
2. Choose plan ($15/$35/$75 monthly or yearly) → Stripe checkout
3. Payment succeeds → webhook fires
4. Platform creates DigitalOcean droplet automatically
5. Ubuntu 22.04 + Nginx installed via cloud-init script
6. IP polling (10-sec intervals, 5-min max)
7. Welcome email sent with SSH credentials
8. Customer logs into dashboard → can deploy immediately

### If Server Creation Fails
- Automatic Stripe refund issued
- User notified
- Failure logged in admin panel

### Git Deployment
- Customer pastes Git URL in dashboard
- Platform SSHs into their server
- Detects project type (React/Vue/Node/Python/static HTML)
- Runs `npm install` or `pip install`
- Builds production assets
- Copies to `/var/www/html`
- Nginx serves it

### Custom Domains
- Customer adds domain in dashboard
- Platform shows DNS instructions (A records)
- Customer clicks "Enable SSL"
- Platform SSHs into server, runs `certbot --nginx -d domain.com`
- SSL certificate installed, HTTPS live

## Architecture
- Applied to all routes

**Contact form limiter:**
- 5 submissions per hour per IP
- Prevents spam/abuse

**Payment limiter:**
- 10 payment attempts per 15 minutes per IP
- Prevents brute-force/DoS attacks

#### Security Headers (Helmet.js)
**Active headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (HSTS)
- CSP disabled for Stripe inline scripts

#### Input Validation
**Contact form validation:**
- Sanitizes HTML/scripts from inputs
- Enforces character limits
- Validates email format
- Trims whitespace

#### CSRF Protection
**Implementation:**
- Cookie-based tokens
- Hidden `_csrf` input in all forms
- Validated on POST requests
- Protected routes: `/contact`, `/create-checkout-session`

#### HTTPS Enforcement
**Production mode only:**
- Checks `NODE_ENV=production`
- Redirects HTTP → HTTPS
- Uses `X-Forwarded-Proto` header (for reverse proxies)

#### Environment Variables
**Configuration:**
- `STRIPE_SECRET_KEY` - Payment API credentials
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)
- `.env` file gitignored

### 5. Development Workflow
**Git branching strategy:**
- Never commit directly to `main`
- Feature branches: `feat/description` or `fix/description`
- Commit format: `feat:`, `fix:`, `chore:` prefix
- PR workflow: branch → push → PR → merge → cleanup

**Local development:**
```bash
node index.js  # Runs on http://localhost:3000
```

**Production deployment:**
- Hosted on DigitalOcean server
- PM2 process manager
- Manual start/stop for cost control
- See [PM2-CHEATSHEET.md](PM2-CHEATSHEET.md) for commands

## File Structure

```
server-ui/
├── index.js                    # Main server file (all routes & logic)
├── package.json                # Dependencies & scripts
├── package-lock.json           # Dependency lock file
├── .env                        # Environment variables (gitignored)
├── .gitignore                  # Git ignore rules
├── index.html                  # Homepage
├── about.html                  # About page
├── contact.html                # Original contact page (unused)
├── terms.html                  # Terms page
├── public/
│   └── styles.css              # Global CSS stylesheet
├── .github/
│   └── copilot-instructions.md # AI agent instructions
├── SECURITY.md                 # Security documentation
├── DEV-CHEATSHEET.md           # Git workflow guide
├── PM2-CHEATSHEET.md           # Production deployment guide
└── password for Web Application server.md  # Server credentials
```

## Current Dependencies

**Production dependencies:**
```json
{
  "express": "^5.2.1",
  "dotenv": "^17.2.3",
  "stripe": "^17.5.0",
  "helmet": "^8.1.0",
  "express-rate-limit": "^7.5.0",
  "express-validator": "^7.2.1",
  "cookie-parser": "^1.4.7",
  "csurf": "^1.11.0"
}
```

## Setup Instructions

### Local Development
1. Clone repository
2. Install dependencies: `npm install`
3. Create `.env` file with:
   ```
   STRIPE_SECRET_KEY=sk_test_your_key_here
   PORT=3000
   NODE_ENV=development
   ```
4. Start server: `node index.js`
5. Visit: http://localhost:3000

### Production Deployment
1. SSH to server: `ssh deploy@68.183.203.226`
2. Navigate: `cd ~/server-ui`
3. Pull latest: `git pull origin main`
4. Install deps: `npm install`
5. Set environment: `NODE_ENV=production` in `.env`
6. Start with PM2: `pm2 start index.js --name localbiz-demo`

## Current Status

### ✅ Complete
- [x] Static website structure
- [x] Contact form with validation
- [x] Stripe payment integration (basic)
- [x] Rate limiting on all routes
- [x] Security headers (Helmet)
- [x] CSRF protection
- [x] HTTPS enforcement (production)
- [x] Environment variable management
- [x] Git workflow documentation
- [x] Security documentation

### 🚧 In Progress / Planned
- [ ] Contact form email notifications
- [ ] Database integration for form submissions
- [ ] Payment success/cancel page handlers
- [ ] Multiple Stripe products/pricing
- [ ] User authentication system
- [ ] Admin dashboard
- [ ] Enhanced UI/UX design
- [ ] Email service integration
- [ ] Analytics tracking

### ⚠️ Known Limitations
1. **Contact form:** Only logs to console, no persistence
2. **Payment:** Hardcoded single product ($20)
3. **No database:** All data ephemeral
4. **Success/cancel pages:** No custom handling for payment results
5. **No email:** Contact submissions not sent anywhere
6. **Test script:** Placeholder only (`npm test` fails)
7. **Port:** Hardcoded fallback (3000) if env var missing

## API Endpoints

### Public Routes
| Method | Path | Description | Protection |
|--------|------|-------------|-----------|
| GET | `/` | Homepage | Rate limited |
| GET | `/about` | About page | Rate limited |
| GET | `/contact` | Contact form | Rate limited, CSRF |
| GET | `/terms` | Terms page | Rate limited |
| GET | `/pay` | Payment page | Rate limited, CSRF |

### Form Handlers
| Method | Path | Description | Protection |
|--------|------|-------------|-----------|
| POST | `/contact` | Submit contact form | Rate limited (5/hr), CSRF, Validated |
| POST | `/create-checkout-session` | Create Stripe session | Rate limited (10/15min), CSRF |

## Testing Checklist

### Local Testing
- [x] Server starts without errors
- [x] All pages load correctly
- [x] Contact form validates inputs
- [x] Contact form rejects invalid data
- [x] CSRF tokens present in forms
- [x] Rate limiting triggers after threshold
- [x] Payment button redirects to Stripe

### Production Testing
- [ ] HTTPS redirect works
- [ ] Stripe live mode transactions
- [ ] PM2 keeps server running
- [ ] Rate limits persist across restarts
- [ ] Security headers in responses
- [ ] No secrets in git history

## Documentation
- **Security:** See [SECURITY.md](SECURITY.md)
- **Git Workflow:** See [DEV-CHEATSHEET.md](DEV-CHEATSHEET.md)
- **Deployment:** See [PM2-CHEATSHEET.md](PM2-CHEATSHEET.md)
- **AI Instructions:** See [.github/copilot-instructions.md](.github/copilot-instructions.md)

## Server Information
- **Production URL:** http://68.183.203.226:3000
- **Server:** DigitalOcean Droplet
- **Access:** See "password for Web Application server.md"
- **Process Manager:** PM2
- **User:** deploy@localbiz

---

**Last Updated:** January 16, 2026  
**Version:** 1.0.0  
**Status:** MVP Complete - Security Hardened
