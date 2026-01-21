# Middleware - Request Processing Pipeline

## What It Is

Middleware functions run **between** receiving a request and sending a response. They can modify the request, check credentials, log activity, or block bad actors before your route handler runs.

Think of it like airport security - every passenger (request) goes through checkpoints before boarding (route handler).

## Why We Use It

**1. Authentication Guard**
```javascript
// middleware/auth.js
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next(); // Allow request to continue
}

// Usage
app.get('/dashboard', requireAuth, showDashboard);
```

Without middleware: Every route would need 5 lines of auth checking code (repeated 50+ times).  
With middleware: One function protects all routes.

**2. Rate Limiting**
```javascript
// middleware/rateLimiter.js
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10
});

app.post('/create-checkout-session', paymentLimiter, createCheckout);
```

Without middleware: Attackers could spam payment endpoints 1000 times/second.  
With middleware: Max 10 payment attempts per 15 minutes per IP.

**3. CSRF Protection**
```javascript
app.use(csrf({ cookie: true }));

// Automatically validates tokens on POST
app.post('/add-domain', csrfProtection, addDomain);
```

Without middleware: Attackers could trick logged-in users into making requests.  
With middleware: Every form requires a valid CSRF token.

**4. Request Logging**
```javascript
// middleware/logger.js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${req.ip}`);
  next();
});
```

Logs every request for debugging and monitoring.

## Middleware Stack (Order Matters!)

```javascript
// 1. Trust proxy (for rate limiting behind Nginx)
app.set('trust proxy', 1);

// 2. Rate limiting (block bad actors early)
app.use(generalLimiter);

// 3. Request logger
app.use(logger);

// 4. Security headers
app.use(helmet());

// 5. Static files
app.use(express.static('public'));

// 6. Parse cookies
app.use(cookieParser());

// 7. Parse form data
app.use(express.urlencoded({ extended: false }));

// 8. Parse JSON
app.use(express.json());

// 9. Session management
app.use(session({ ... }));

// 10. CSRF protection
app.use(csrf({ cookie: true }));

// 11. Routes (your actual handlers)
app.get('/dashboard', requireAuth, dashboardController);

// 12. Error handler (catches everything)
app.use(errorHandler);
```

If you put CSRF **before** cookieParser, it fails (needs cookies to work).  
If you put errorHandler **first**, it catches nothing (must be last).

## Customer Value

Middleware = invisible security and performance layer.

**What customers notice:**
- Site doesn't go down from spam attacks (rate limiting)
- Payment forms are secure (CSRF)
- Dashboard requires login (auth)
- Fast response times (efficient pipeline)

**What customers DON'T notice:**
- 500 bots blocked per hour
- 3 SQL injection attempts stopped
- 12 CSRF attacks prevented

## Real-World Example

Customer clicks "Delete Server":

1. **generalLimiter** - Check if too many requests from this IP
2. **logger** - Log the request
3. **helmet** - Add security headers
4. **cookieParser** - Read session cookie
5. **session** - Load user session from database
6. **csrf** - Validate CSRF token from form
7. **requireAuth** - Verify user is logged in
8. **deleteServer** - Actually delete the server 
9. **errorHandler** - Catch any errors

Without middleware: Would need all that logic in deleteServer function (messy, repeated everywhere).  
With middleware: deleteServer just focuses on deleting, middleware handles everything else.

---

Middleware is the invisible infrastructure that makes routes simple and secure.
