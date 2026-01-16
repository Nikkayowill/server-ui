# LocalBiz Server - Complete Implementation Documentation

## Project Overview
A production-ready Express.js web server for a local business MVP featuring payment processing, contact forms, and comprehensive security hardening.

## Technology Stack

### Core Framework
- **Express.js 5.2.1** - Web application framework
- **Node.js** - JavaScript runtime
- **CommonJS** - Module system

### Payment Processing
- **Stripe** - Payment gateway integration
- **Stripe Checkout** - Hosted payment page
- Test & Live mode support

### Security Packages
- **helmet** - HTTP security headers
- **express-rate-limit** - Request throttling/rate limiting
- **express-validator** - Input validation and sanitization
- **csurf** - CSRF token protection
- **cookie-parser** - Cookie handling for CSRF
- **dotenv** - Environment variable management

## Implemented Features

### 1. Static Website Pages
**Location:** Root directory HTML files

**Pages:**
- `index.html` - Homepage with basic navigation
- `about.html` - About page
- `contact.html` - Original contact page (now superseded by dynamic version)
- `terms.html` - Terms & conditions page

**Routing Pattern:**
```javascript
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/about', (req, res) => res.sendFile(__dirname + '/about.html'));
app.get('/terms', (req, res) => res.sendFile(__dirname + '/terms.html'));
```

**CSS Styling:**
- Single stylesheet: `/public/styles.css`
- Served via `express.static('public')`

### 2. Contact Form System
**Route:** `GET /contact` and `POST /contact`

**Features:**
- **Dynamic form generation** with CSRF token injection
- **Input validation:**
  - Name: Required, max 100 characters, trimmed
  - Email: Valid email format, normalized (lowercase)
  - Message: Required, max 1000 characters, trimmed
- **Rate limiting:** 5 submissions per hour per IP
- **CSRF protection:** Prevents cross-site forgery attacks
- **Error handling:** Displays validation errors with "Go back" link
- **Success behavior:** Logs submission to console, redirects to home

**Current limitations:**
- No database storage
- No email notifications
- Data only logged to console

### 3. Stripe Payment Integration
**Routes:** `GET /pay` and `POST /create-checkout-session`

**Payment Flow:**
1. User visits `/pay` → sees checkout button
2. Clicks "Pay with Stripe" → submits form with CSRF token
3. Server creates Stripe Checkout Session
4. User redirected to Stripe-hosted payment page
5. After payment → redirected back with success/cancel status

**Configuration:**
- **Product:** "LocalBiz Service"
- **Price:** $20.00 USD (hardcoded)
- **Payment method:** Card only
- **Mode:** One-time payment (not subscription)
- **Success URL:** `/?success=true`
- **Cancel URL:** `/?canceled=true`

**Security:**
- Rate limited: 10 payment attempts per 15 minutes
- CSRF protected
- API key stored in `.env` file
- Error handling prevents sensitive data exposure

**API Key Setup:**
- Test key: `sk_test_...`
- Live key: `sk_live_...` (currently configured)
- Stored in `STRIPE_SECRET_KEY` environment variable

### 4. Security Implementation

#### Rate Limiting
**Global limiter:**
- 100 requests per 15 minutes per IP
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
