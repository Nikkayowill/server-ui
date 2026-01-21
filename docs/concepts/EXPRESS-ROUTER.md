# Express Router - Organized URL Handling

## What It Is

Express Router groups related routes together. Instead of 100 routes in one file, you split them into logical modules (auth routes, payment routes, dashboard routes, etc).

## Why We Use It

**Without Router (messy):**
```javascript
// index.js - 400 lines of routes
app.get('/register', authController.showRegister);
app.post('/register', authController.handleRegister);
app.get('/login', authController.showLogin);
app.post('/login', authController.handleLogin);
app.get('/logout', authController.handleLogout);
app.get('/dashboard', dashboardController.showDashboard);
app.post('/submit-ticket', dashboardController.submitTicket);
app.get('/pay', paymentController.showCheckout);
app.post('/create-checkout-session', paymentController.createSession);
// ... 50+ more routes
```

**With Router (organized):**
```javascript
// routes/auth.js - 20 lines
const router = require('express').Router();

router.get('/register', authController.showRegister);
router.post('/register', authController.handleRegister);
router.get('/login', authController.showLogin);
router.post('/login', authController.handleLogin);
router.get('/logout', authController.handleLogout);

module.exports = router;

// index.js - 5 lines
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/payments'));
```

## How It Works

**1. Create Router**
```javascript
// routes/payments.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');

router.get('/pay', requireAuth, csrfProtection, paymentController.showCheckout);
router.post('/create-checkout-session', requireAuth, paymentLimiter, csrfProtection, paymentController.createSession);

module.exports = router;
```

**2. Mount Router**
```javascript
// index.js
app.use('/', require('./routes/payments'));
```

Now `/pay` and `/create-checkout-session` routes exist.

## Our Router Structure

```
routes/
├── auth.js          # /register, /login, /logout, /verify-email
├── dashboard.js     # /dashboard, /submit-ticket, /change-password
├── pages.js         # /, /about, /pricing, /contact, /faq, /docs
├── payments.js      # /pay, /create-checkout-session, /webhook/stripe
└── servers.js       # /server-action, /delete-server, /deploy, /add-domain, /enable-ssl
```

## Customer Value

**Faster development:**
- Need to add payment feature? Only touch `routes/payments.js` and `controllers/paymentController.js`
- Need to fix login bug? Only look in `routes/auth.js` and `controllers/authController.js`
- No hunting through 2000-line index.js file

**Easier debugging:**
- Payment failing? Check payments route + payment controller
- Dashboard broken? Check dashboard route + dashboard controller
- Clear separation of concerns

**Better testing:**
- Can test auth routes independently
- Can test payment routes in isolation
- Mock only what you need

## Middleware on Routers

Apply middleware to entire groups:

```javascript
// All admin routes require admin role
const adminRouter = express.Router();
adminRouter.use(requireAuth);
adminRouter.use(requireAdmin);

adminRouter.get('/users', listUsers);
adminRouter.post('/delete-user/:id', deleteUser);
adminRouter.post('/destroy-droplet/:id', destroyDroplet);

app.use('/admin', adminRouter);
```

Now all `/admin/*` routes automatically check authentication + admin role.

## Path Prefixes

```javascript
// routes/api.js
const apiRouter = express.Router();

apiRouter.get('/servers', listServers);
apiRouter.get('/deployments', listDeployments);
apiRouter.post('/domains', addDomain);

// Mount with prefix
app.use('/api', apiRouter);
```

Creates:
- `/api/servers`
- `/api/deployments`
- `/api/domains`

Great for API versioning: `/api/v1`, `/api/v2`

## Real Example - Server Routes

```javascript
// routes/servers.js
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const serverController = require('../controllers/serverController');

// All routes require authentication
router.post('/server-action', requireAuth, csrfProtection, serverController.serverAction);
router.post('/delete-server', requireAuth, csrfProtection, serverController.deleteServer);
router.post('/deploy', requireAuth, csrfProtection, serverController.deploy);
router.post('/add-domain', requireAuth, csrfProtection, serverController.addDomain);
router.post('/enable-ssl', requireAuth, csrfProtection, serverController.enableSSL);

module.exports = router;
```

5 server management endpoints, all protected, organized in one place.

---

Without routers: 400-line index.js, impossible to navigate.  
With routers: Each file < 50 lines, crystal clear organization.
