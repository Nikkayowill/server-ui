# Security Documentation

## Current Security Measures

### 1. Rate Limiting (express-rate-limit)
**What it does:** Prevents abuse by limiting the number of requests from a single IP address.

**Implementation:**
- **General limiter**: 100 requests per 15 minutes (all routes)
- **Contact form**: 5 submissions per hour
- **Payment attempts**: 10 attempts per 15 minutes

**Why it matters:** Protects against brute-force attacks, spam, and denial-of-service (DoS) attempts.

### 2. Security Headers (Helmet.js)
**What it does:** Sets HTTP headers that protect against common web vulnerabilities.

**Headers applied:**
- `X-Content-Type-Options: nosniff` - Prevents MIME-type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking attacks
- `X-XSS-Protection: 1; mode=block` - Enables browser XSS protection
- `Strict-Transport-Security` - Forces HTTPS connections
- Content Security Policy disabled for Stripe inline scripts

**Why it matters:** Defends against XSS, clickjacking, and other injection attacks.

### 3. Input Validation (express-validator)
**What it does:** Validates and sanitizes user input before processing.

**Contact form validation:**
- **Name**: Required, trimmed, max 100 characters
- **Email**: Valid email format, normalized (lowercase, trimmed)
- **Message**: Required, trimmed, max 1000 characters

**Why it matters:** Prevents malicious input, SQL injection attempts, and XSS attacks through form submissions.

### 4. CSRF Protection (csurf)
**What it does:** Protects against Cross-Site Request Forgery attacks.

**Implementation:**
- Generates unique tokens for each session
- Tokens embedded in forms as hidden fields (`_csrf`)
- Server validates token on POST requests

**Protected routes:**
- `/contact` form submission
- `/create-checkout-session` payment processing

**Why it matters:** Prevents attackers from tricking users into making unauthorized requests.

### 5. HTTPS Enforcement (Production Only)
**What it does:** Automatically redirects HTTP traffic to HTTPS.

**Implementation:**
- Only active when `NODE_ENV=production`
- Checks `X-Forwarded-Proto` header (for reverse proxies like nginx)
- Redirects insecure requests to secure versions

**Why it matters:** Ensures all data transmission is encrypted, protecting sensitive information like payment details.

### 6. Environment Variables
**What it does:** Keeps sensitive configuration out of source code.

**Protected values:**
- `STRIPE_SECRET_KEY` - Payment processing credentials
- `PORT` - Server port configuration
- `NODE_ENV` - Environment mode (development/production)

**Why it matters:** Prevents credential leaks in version control and allows different configurations per environment.

## Security Best Practices Followed

1. **Dependencies isolated**: Sensitive packages (dotenv, stripe) loaded at startup
2. **Cookie security**: Cookie parser enables secure session handling
3. **Middleware ordering**: Security middleware applied before route handlers
4. **Error handling**: Stripe errors caught and logged without exposing details to users
5. **Git ignored**: `.env` file excluded from version control

## Future Security Enhancements

### High Priority
- [ ] **SQL/NoSQL Injection Protection**: Add parameterized queries when database is integrated
- [ ] **Session Management**: Implement secure session storage (Redis/MongoDB)
- [ ] **Password Hashing**: Use bcrypt for user authentication (if adding login)
- [ ] **Two-Factor Authentication (2FA)**: For admin/payment accounts
- [ ] **API Key Rotation**: Automated Stripe key rotation strategy

### Medium Priority
- [ ] **Content Security Policy (CSP)**: Strict CSP rules after Stripe integration finalized
- [ ] **Logging & Monitoring**: Winston + Sentry for security event tracking
- [ ] **Request Size Limits**: Prevent large payload attacks (`express.json({ limit: '10kb' })`)
- [ ] **IP Whitelisting**: Restrict admin routes to specific IPs
- [ ] **File Upload Security**: If adding file uploads, validate MIME types and sizes

### Low Priority
- [ ] **Web Application Firewall (WAF)**: CloudFlare or AWS WAF
- [ ] **Security Audits**: Regular dependency vulnerability scans (`npm audit`)
- [ ] **Penetration Testing**: Professional security assessment before production launch
- [ ] **Subresource Integrity (SRI)**: For CDN-loaded scripts
- [ ] **CAPTCHA**: Google reCAPTCHA for contact/payment forms

## Security Testing Checklist

- [x] Rate limiting works on all protected endpoints
- [x] Helmet headers present in response (check DevTools → Network)
- [x] Invalid form inputs rejected with proper error messages
- [x] CSRF tokens present in forms (view page source)
- [x] HTTPS redirect works in production mode
- [ ] Stripe test mode transactions successful
- [ ] No sensitive data in git history
- [ ] Environment variables loaded correctly

## Security Contacts & Resources

**Stripe Security:** https://stripe.com/docs/security  
**OWASP Top 10:** https://owasp.org/www-project-top-ten/  
**npm Security Advisories:** https://www.npmjs.com/advisories

---

**Last Updated:** January 16, 2026  
**Reviewed By:** AI Agent  
**Next Review:** Before production deployment
