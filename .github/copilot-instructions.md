# LocalBiz Server - AI Agent Instructions

## Project Overview
Simple Express.js web server serving static HTML pages for a local business MVP. Includes basic contact form handling and Stripe payment integration stub.

## Architecture
- **Backend**: Express 5.2.1 (CommonJS) serving from root directory
- **Static Assets**: `/public/` directory (CSS only)
- **HTML Pages**: Root-level HTML files served via explicit routes
- **External Services**: Partial Stripe integration (checkout page exists, session creation incomplete)

## Key Routes
- `/` → `index.html` (home)
- `/about`, `/contact`, `/terms` → respective HTML files
- `POST /contact` → form handler (logs to console, redirects to home)
- `/pay` → inline Stripe checkout page (HTML in route handler)

## Development Workflow
**Local development:**
```bash
node index.js  # runs on http://localhost:3000
```

**Git workflow (strict):**
- Never work on `main` branch directly
- Create feature branches: `feat/short-description` or `fix/issue-name`
- Commit messages: present tense, prefixed (`feat:`, `fix:`, `chore:`)
- PR workflow: branch → push → PR → merge on GitHub → local cleanup

**Production deployment:**
- Uses PM2 on DigitalOcean server (see [PM2-CHEATSHEET.md](PM2-CHEATSHEET.md))
- Manual start/stop preferred for cost control: `pm2 start index.js --name localbiz-demo`

## Project Conventions
1. **Routing pattern**: Each HTML page gets explicit `app.get()` route pointing to root-level file
2. **Forms**: Use `express.urlencoded()` middleware; POST handlers log and redirect (no database yet)
3. **Static files**: Only CSS lives in `/public/`; HTML at root for explicit routing
4. **No tests**: Project uses placeholder test script
5. **Environment**: Stripe integration requires manual `.env` setup (not in repo)

## Critical Files
- [index.js](index.js) - All server logic, routes, and middleware
- [DEV-CHEATSHEET.md](DEV-CHEATSHEET.md) - Complete git workflow reference
- [PM2-CHEATSHEET.md](PM2-CHEATSHEET.md) - Production deployment commands
- [password for Web Application server.md](password%20for%20Web%20Application%20server.md) - Server credentials and access

## Adding New Pages
1. Create HTML file in root (e.g., `newpage.html`)
2. Add route in [index.js](index.js): `app.get('/newpage', (req, res) => res.sendFile(__dirname + '/newpage.html'));`
3. Update navigation in all existing HTML files
4. Follow git workflow: feature branch → commit → PR

## Known Gaps
- **Missing dependencies**: Code imports `dotenv` and `stripe` but they're not in `package.json`
- **Incomplete Stripe**: `/pay` route exists but `/create-checkout-session` POST endpoint not implemented
- **No `.env` file**: Stripe requires `STRIPE_SECRET_KEY` environment variable (not in repo)
- Contact form only logs data (no persistence or email)
- No automated tests or linting
- Hardcoded port 3000 (no environment variable)
