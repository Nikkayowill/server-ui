const express = require('express');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');
const { Client } = require('ssh2');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db');
const bcrypt = require('bcrypt');
const { getHTMLHead, getDashboardHead, getScripts, getFooter, getAuthLinks, getResponsiveNav } = require('./helpers');
const { createRealServer: createRealServerService, syncDigitalOceanDroplets: syncDigitalOceanDropletsService } = require('./services/digitalocean');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const { generalLimiter, contactLimiter, paymentLimiter, emailVerifyLimiter } = require('./middleware/rateLimiter');
const pagesController = require('./controllers/pagesController');
const gettingStartedController = require('./controllers/gettingStartedController');
const authController = require('./controllers/authController');
const dashboardController = require('./controllers/dashboardController');
const paymentController = require('./controllers/paymentController');
const serverController = require('./controllers/serverController');
const adminController = require('./controllers/adminController');
const domainController = require('./controllers/domainController');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');
const { sendServerRequestEmail } = require('./services/email');

const app = express();

// Trust reverse proxy headers from Nginx so rate limiters and HTTPS redirects work correctly
// See: https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', 1);

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Request logger
app.use(logger);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for Stripe
}));

app.use(express.static('public'));

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

// Stripe webhook endpoint must be registered BEFORE express.json()
// to preserve the raw request body for signature verification
app.post('/webhook/stripe', express.raw({type: 'application/json'}), paymentController.stripeWebhook);

app.use(express.json()); // Parse JSON request bodies

// Session configuration
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (reduced from 30)
    httpOnly: true, // Prevents XSS access to session cookie
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax', // CSRF protection - allows Stripe redirects
    path: '/', // Cookie available across entire site
    domain: process.env.NODE_ENV === 'production' ? 'cloudedbasement.ca' : undefined
  },
  name: 'sessionId', // Rename from default 'connect.sid' for obscurity
  rolling: true // Reset expiry on each request (sliding session)
}));

// CSRF protection
const csrfProtection = csrf({ cookie: true });

// HTTPS redirect middleware (only in production)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

// ======================
// ROUTES
// ======================

// Health check endpoint (for load balancers and monitoring)
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbCheck = await pool.query('SELECT NOW()');
    
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      database: dbCheck.rows.length > 0 ? 'connected' : 'error'
    });
  } catch (error) {
    console.error('[HEALTH] Database check failed:', error.message);
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      database: 'disconnected',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database unavailable'
    });
  }
});

app.get('/', pagesController.showHome);
app.get('/about', pagesController.showAbout);

// Register route (GET)
app.get('/register', csrfProtection, authController.showRegister);
app.get('/contact', csrfProtection, pagesController.showContact);

app.post('/contact', 
  contactLimiter,
  csrfProtection,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 1000 })
  ],
  pagesController.submitContact
);

// Register POST handler
app.post('/register',
  csrfProtection,
  [
    body('email').trim().isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('confirmPassword').custom((value, { req }) => value === req.body.password)
  ],
  authController.handleRegister
);

// Login GET route
app.get('/login', csrfProtection, authController.showLogin);

// Login POST handler
app.post('/login',
  csrfProtection,
  [
    body('email').trim().isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  authController.handleLogin
);

// Email confirmation route
app.get('/confirm-email/:token', authController.confirmEmail);

// Code verification routes
app.get('/verify-email', authController.showVerifyEmail);
app.post('/verify-email', emailVerifyLimiter, authController.verifyEmailCode);
app.post('/resend-code', emailVerifyLimiter, authController.resendCode);

// Logout route
app.get('/logout', authController.handleLogout);

// Server action route (restart/stop)
app.post('/server-action', requireAuth, csrfProtection, serverController.serverAction);

// Delete server route
app.post('/delete-server', requireAuth, csrfProtection, serverController.deleteServer);

// Deploy route
app.post('/deploy', requireAuth, csrfProtection, serverController.deploy);

// Add domain route
app.post('/add-domain', requireAuth, csrfProtection, serverController.addDomain);

// Enable SSL route
app.post('/enable-ssl', requireAuth, csrfProtection, serverController.enableSSL);

// Dashboard route
app.get('/dashboard', requireAuth, csrfProtection, dashboardController.showDashboard);
app.post('/submit-ticket', requireAuth, dashboardController.submitSupportTicket);
app.post('/change-password', requireAuth, dashboardController.changePassword);

// Admin - dashboard
app.get('/admin', requireAuth, requireAdmin, csrfProtection, adminController.listUsers);
app.post('/admin/delete-user/:id', requireAuth, requireAdmin, csrfProtection, adminController.deleteUser);
app.post('/admin/delete-server/:id', requireAuth, requireAdmin, csrfProtection, adminController.deleteServer);
app.post('/admin/destroy-droplet/:id', requireAuth, requireAdmin, csrfProtection, adminController.destroyDroplet);

// Admin - domain management (API endpoints only - UI is in /admin/users)
app.get('/admin/domains/list', requireAuth, requireAdmin, domainController.listDomains);
app.post('/admin/domains', requireAuth, requireAdmin, domainController.addDomain);
app.put('/admin/domains/:id', requireAuth, requireAdmin, domainController.updateDomain);
app.delete('/admin/domains/:id', requireAuth, requireAdmin, domainController.deleteDomain);

// Pricing page
app.get('/pricing', pagesController.showPricing);

app.get('/terms', pagesController.showTerms);

app.get('/privacy', pagesController.showPrivacy);

// FAQ page
app.get('/faq', pagesController.showFaq);

// Documentation page
app.get('/docs', pagesController.showDocs);

// Getting Started Guide
app.get('/getting-started', requireAuth, gettingStartedController.showGettingStarted);

// Server Request Handler
app.post('/request-server', requireAuth, async (req, res) => {
  try {
    const { region, server_name, use_case } = req.body;
    
    // Check if user has already paid
    const paymentCheck = await pool.query(
      'SELECT * FROM payments WHERE user_id = $1 AND status = $2 LIMIT 1',
      [req.session.userId, 'succeeded']
    );
    
    if (paymentCheck.rows.length === 0) {
      return res.redirect('/pricing?error=payment_required');
    }
    
    // Check if user already has a server
    const serverCheck = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [req.session.userId]
    );
    
    if (serverCheck.rows.length > 0) {
      return res.redirect('/dashboard?error=server_exists');
    }
    
    // Check for existing pending request
    const existingTicket = await pool.query(
      'SELECT * FROM support_tickets WHERE user_id = $1 AND subject = $2 AND status IN ($3, $4)',
      [req.session.userId, 'Server Setup Request', 'open', 'in-progress']
    );
    
    if (existingTicket.rows.length > 0) {
      return res.redirect('/getting-started?error=request_already_pending');
    }
    
    // Store server request (you'll process this manually)
    await pool.query(
      `INSERT INTO support_tickets (user_id, subject, description, status) 
       VALUES ($1, $2, $3, $4)`,
      [
        req.session.userId,
        'Server Setup Request',
        `Region: ${region}\nServer Name: ${server_name || 'Not specified'}\nUse Case: ${use_case || 'Not specified'}`,
        'open'
      ]
    );
    
    // Get user email and send confirmation
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [req.session.userId]);
    const userEmail = userResult.rows[0].email;
    
    // Send confirmation email (don't wait for it)
    sendServerRequestEmail(userEmail, region, server_name || 'Default').catch(err => {
      console.error('Failed to send server request email:', err);
    });
    
    res.redirect('/getting-started?success=request_submitted');
  } catch (err) {
    console.error('Server request error:', err);
    res.status(500).send('Server error');
  }
});

// Payment Success page
app.get('/payment-success', requireAuth, paymentController.paymentSuccess);

// Payment Cancel page
app.get('/payment-cancel', requireAuth, paymentController.paymentCancel);

app.get('/pay', requireAuth, csrfProtection, paymentController.showCheckout);

app.post('/create-checkout-session', requireAuth, paymentLimiter, csrfProtection, paymentController.createCheckoutSession);

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/?message=Logged out successfully');
  });
});

// 404 error page - must be last route
app.use((req, res) => {
  res.status(404).send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        body { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .container { text-align: center; max-width: 500px; }
        h1 { font-size: 120px; color: var(--glow); text-shadow: 0 0 40px rgba(136, 254, 0, 0.5); margin-bottom: 20px; }
        h2 { font-size: 24px; margin-bottom: 16px; }
        p { color: #8892a0; line-height: 1.6; margin-bottom: 32px; }
        a { display: inline-block; padding: 14px 32px; background: var(--glow); color: #0a0812; text-decoration: none; border-radius: 4px; font-weight: 600; transition: all 0.3s; }
        a:hover { box-shadow: 0 0 30px rgba(136, 254, 0, 0.6); transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved. Let's get you back on track.</p>
        <a href="/">Go Home</a>
    </div>
</body>
</html>
  `);
});

// Run sync every hour (3600000 ms)
setInterval(syncDigitalOceanDropletsService, 3600000);

// Run sync on startup (after 30 seconds to let server initialize)
setTimeout(syncDigitalOceanDropletsService, 30000);

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));

// Graceful shutdown handler to cleanup polling intervals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  // Cleanup polling intervals
  const { cleanupPolls } = require('./services/digitalocean');
  cleanupPolls();
  
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});