# Rate Limiting - DDoS Protection

## What It Is

Rate limiting restricts how many requests a single IP address can make in a time window. It's like a bouncer at a club saying "you already came in 10 times this hour, come back later."

## Why We Need It

### 1. Brute Force Prevention

**Without rate limiting:**
```
Attacker: POST /login {email: admin@site.com, password: password1}
Server: Invalid
Attacker: POST /login {email: admin@site.com, password: password2}
Server: Invalid
... (repeats 1 million times)
Attacker: POST /login {email: admin@site.com, password: admin123}
Server: ✅ Login successful
```

10 million common passwords tested in 5 minutes → account hacked.

**With rate limiting:**
```
Attacker: POST /login (attempt 1)
Attacker: POST /login (attempt 2)
...
Attacker: POST /login (attempt 6)
Server: 429 Too Many Requests - Try again in 15 minutes
```

5 attempts/15min = 480 attempts/day max → would take 57 years to test 10M passwords.

### 2. Payment Spam Protection

**Without rate limiting:**
```
Attacker: POST /create-checkout-session (Stripe API call #1)
Attacker: POST /create-checkout-session (Stripe API call #2)
... (repeats 10,000 times)
Your Stripe bill: $5,000 in API overages
```

**With rate limiting:**
```
Attacker: POST /create-checkout-session (10 attempts)
Server: 429 Too Many Requests - Blocked for 15 minutes
Your Stripe bill: $0.10
```

### 3. Server Resource Protection

**Without rate limiting:**
- 1000 requests/second from one IP
- Each request hits database
- Database overwhelmed → site crashes for everyone
- $500+ in DigitalOcean bandwidth overages

**With rate limiting:**
- Max 100 requests/15min per IP
- Legitimate users unaffected
- Attackers blocked
- Server stays online

## Our Rate Limiting Strategy

### 1. General Limiter (All Routes)

```javascript
// middleware/rateLimiter.js
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min
  skip: (req) => req.method === 'GET', // Skip GET requests
  message: 'Too many requests from this IP, please try again later.'
});

app.use(generalLimiter);
```

**Applied to:** All non-GET routes (POST, DELETE, etc)

**Why skip GET:**
- GET requests are read-only (safe)
- No database writes
- Customers browse pricing page 50 times → shouldn't be blocked

**Why 100 requests:**
- Average user: 5-10 POST requests per session
- 100 = buffer for legitimate high activity
- Attackers typically send thousands

### 2. Contact Form Limiter

```javascript
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 submissions per hour
  message: 'Too many contact submissions. Please try again later.'
});

app.post('/contact', contactLimiter, csrfProtection, submitContact);
```

**Why strict:**
- Contact form sends emails (cost per email)
- Spammers submit thousands of fake forms
- Legitimate user rarely needs > 5 messages/hour

### 3. Payment Limiter

```javascript
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 payment attempts per 15 min
  message: 'Too many payment attempts. Please try again later.'
});

app.post('/create-checkout-session', paymentLimiter, csrfProtection, createCheckout);
```

**Why 10:**
- Payment fails → user retries 2-3 times
- 10 = generous buffer
- Prevents payment spam attacks

### 4. Email Verification Limiter

```javascript
const emailVerifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 verification attempts per hour
  message: 'Too many verification attempts. Please try again later.'
});

app.post('/verify-email', emailVerifyLimiter, verifyEmailCode);
app.post('/resend-code', emailVerifyLimiter, resendCode);
```

**Why needed:**
- Email sending costs money (per-email pricing)
- Attacker spams "resend code" → thousands of emails
- Legitimate user: 2-3 resends max

## How It Works Internally

**Storage (in-memory):**
```javascript
// Rate limiter stores in RAM:
{
  "IP:192.168.1.1:/login": {
    count: 3,
    resetTime: 1706000000000
  },
  "IP:10.0.0.5:/create-checkout-session": {
    count: 1,
    resetTime: 1706001000000
  }
}
```

**Request flow:**
1. Request comes in from `192.168.1.1` → `/login`
2. Check counter: `IP:192.168.1.1:/login` = 3
3. Increment: 3 → 4
4. Compare: 4 < 5 (max) → Allow request
5. Request #6 → 6 > 5 → Block with 429 status

**Reset:**
- After 15 minutes, counter automatically resets to 0
- IP can make requests again

## Behind a Reverse Proxy (Nginx/Cloudflare)

**Problem:**
```javascript
// Without trust proxy
req.ip; // "127.0.0.1" (Nginx server, NOT client)
```

All requests appear to come from `127.0.0.1` → rate limiter useless.

**Solution:**
```javascript
// index.js
app.set('trust proxy', 1);

// Now Express reads X-Forwarded-For header
req.ip; // "203.45.67.89" (actual client IP)
```

Nginx/Cloudflare sets `X-Forwarded-For: 203.45.67.89` → Express uses real IP.

## Response Headers

```
GET /dashboard
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706000000000
```

**What customers see:**
- `X-RateLimit-Remaining: 87` → "I have 87 requests left"
- `X-RateLimit-Reset: 1706000000000` → "Counter resets at 3:00 PM"

**When blocked:**
```
POST /create-checkout-session
HTTP/1.1 429 Too Many Requests
Retry-After: 900
Content-Type: application/json

{"error": "Too many payment attempts. Please try again later."}
```

`Retry-After: 900` = wait 900 seconds (15 minutes).

## Cost Savings

**Example attack (without rate limiting):**
- Attacker sends 1M requests to `/create-checkout-session`
- Each creates Stripe checkout session
- Stripe charges $0.005 per session
- Cost: **$5,000**

**With rate limiting:**
- Attacker blocked after 10 requests
- Cost: **$0.05**

**Email spam (without rate limiting):**
- Attacker spams "resend verification code"
- 10,000 emails sent via SendGrid
- SendGrid: $0.0001/email
- Cost: **$1 + reputation damage** (marked as spammer)

**With rate limiting:**
- Max 10 emails/hour
- Cost: **$0.001/hour**

## DDoS Protection

Rate limiting is **first line of defense**, not complete protection:

**Layer 1 - Rate Limiting (us):**
- Blocks simple attacks (100 req/15min)
- Protects against brute force
- Prevents resource exhaustion

**Layer 2 - Cloudflare/AWS Shield:**
- Blocks DDoS (millions req/sec)
- Geographic filtering
- Bot detection

**Layer 3 - DigitalOcean:**
- Network-level DDoS mitigation
- Automatic null-routing of attacks

Rate limiting alone won't stop massive DDoS, but stops 99% of attacks.

## Customer Impact

**What legitimate users notice:**
- Nothing (95% never hit limits)
- Occasional "please wait 15 minutes" if testing features rapidly

**What attackers notice:**
- Immediate 429 errors
- Can't brute-force passwords
- Can't spam forms
- Give up and move to easier target

**What you notice:**
- Server stays online during attacks
- No surprise Stripe/email bills
- Sleep soundly

---

Rate limiting = cheap insurance against expensive attacks.  
Without it: One attacker can bankrupt you or take down your site.  
With it: Attackers blocked, legitimate users unaffected, costs controlled.
