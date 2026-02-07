// Sentry must be initialized FIRST, before any other imports
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

require('dotenv').config();

// Initialize Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: 1.0, // Capture 100% of transactions in production (adjust as needed)
    profilesSampleRate: 1.0, // Capture 100% of profiles
    environment: process.env.NODE_ENV || 'development',
  });
  console.log('[SENTRY] Error monitoring initialized');
}

const express = require('express');
// express-rate-limit used via middleware/rateLimiter, not directly
const helmet = require('helmet');
const { body } = require('express-validator');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db');
// Helpers imported by controllers directly — not needed in index.js
const { createRealServer: createRealServerService, syncDigitalOceanDroplets: syncDigitalOceanDropletsService } = require('./services/digitalocean');
const { monitorSubscriptions } = require('./services/subscriptionMonitor');
const { checkAndProvisionSSL } = require('./services/autoSSL');
const { sendServerRequestEmail } = require('./services/email');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const { generalLimiter, contactLimiter, paymentLimiter, emailVerifyLimiter, deploymentLimiter } = require('./middleware/rateLimiter');
const pagesController = require('./controllers/pagesController');
const gettingStartedController = require('./controllers/gettingStartedController');
const authController = require('./controllers/authController');
const dashboardController = require('./controllers/dashboardController');
const paymentController = require('./controllers/paymentController');
const serverController = require('./controllers/serverController');
const adminController = require('./controllers/adminController');
const adminUpdatesController = require('./controllers/adminUpdatesController');
const domainController = require('./controllers/domainController');
const githubWebhookController = require('./controllers/githubWebhookController');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');
const { runMigrations } = require('./migrations/run-migrations');
const { passport, initializeGoogleAuth } = require('./services/googleAuth');

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

// GitHub webhook endpoint - needs raw body for signature verification
// Use custom middleware to capture raw body while also parsing JSON
const githubWebhookMiddleware = express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
});

// Server-wide webhook (legacy)
app.post('/webhook/github/:serverId', githubWebhookMiddleware, githubWebhookController.githubWebhook);

// Per-domain webhook (multi-site)
app.post('/webhook/github/:serverId/:domainId', githubWebhookMiddleware, githubWebhookController.githubWebhook);

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

// Initialize Passport for Google OAuth
initializeGoogleAuth();
app.use(passport.initialize());
app.use(passport.session());

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
app.get('/is-this-safe', pagesController.showSafety);
app.get('/compare', pagesController.showCompare);

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

// Google OAuth routes
app.get('/auth/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login?error=Google authentication failed' }),
  (req, res) => {
    // Successful authentication - set session from passport user
    req.session.userId = req.user.id;
    req.session.userEmail = req.user.email;
    req.session.userRole = req.user.role;
    req.session.emailConfirmed = req.user.email_confirmed;
    
    // Redirect based on role
    if (req.user.role === 'admin') {
      res.redirect('/admin');
    } else {
      res.redirect('/dashboard');
    }
  }
);

// Email confirmation route
app.get('/confirm-email/:token', authController.confirmEmail);

// Code verification routes
app.get('/verify-email', authController.showVerifyEmail);
app.post('/verify-email', emailVerifyLimiter, authController.verifyEmailCode);
app.post('/resend-code', emailVerifyLimiter, authController.resendCode);
app.get('/resend-confirmation', emailVerifyLimiter, authController.resendConfirmation);

// Password reset routes
app.get('/forgot-password', csrfProtection, authController.showForgotPassword);
app.post('/forgot-password', 
  csrfProtection,
  emailVerifyLimiter,
  [body('email').trim().isEmail().normalizeEmail()],
  authController.handleForgotPassword
);
app.get('/reset-password/:token', csrfProtection, authController.showResetPassword);
app.post('/reset-password/:token',
  csrfProtection,
  [
    body('password').isLength({ min: 8 }),
    body('confirmPassword').custom((value, { req }) => value === req.body.password)
  ],
  authController.handleResetPassword
);

// Logout route
app.get('/logout', authController.handleLogout);

// API endpoint for deployment status polling (AJAX)
app.get('/api/deployment-status/:id', requireAuth, async (req, res) => {
  try {
    const deploymentId = parseInt(req.params.id);
    const result = await pool.query(
      'SELECT status, output, deployed_at FROM deployments WHERE id = $1 AND user_id = $2',
      [deploymentId, req.session.userId]
    );
    
    if (result.rows.length === 0) {
      // SECURITY: Return 403 instead of 404 to prevent enumeration
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching deployment status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Server action route (restart/stop)
app.post('/server-action', requireAuth, csrfProtection, serverController.serverAction);

// Delete server route
app.post('/delete-server', requireAuth, csrfProtection, serverController.deleteServer);

// Deploy route
app.post('/deploy', requireAuth, deploymentLimiter, csrfProtection, serverController.deploy);

// Delete deployment route
app.post('/delete-deployment', requireAuth, csrfProtection, serverController.deleteDeployment);

// Add domain route
app.post('/add-domain', requireAuth, csrfProtection, serverController.addDomain);

// Delete domain route
app.post('/delete-domain', requireAuth, csrfProtection, serverController.deleteDomain);

// Enable SSL route
app.post('/enable-ssl', requireAuth, csrfProtection, serverController.enableSSL);

// Auto-deploy routes
app.post('/enable-auto-deploy', requireAuth, csrfProtection, githubWebhookController.enableAutoDeploy);
app.post('/disable-auto-deploy', requireAuth, csrfProtection, githubWebhookController.disableAutoDeploy);
app.post('/enable-domain-autodeploy', requireAuth, csrfProtection, serverController.enableDomainAutoDeploy);
app.post('/disable-domain-autodeploy', requireAuth, csrfProtection, serverController.disableDomainAutoDeploy);

// Dashboard route
app.get('/dashboard', requireAuth, csrfProtection, dashboardController.showDashboard);
app.post('/submit-ticket', requireAuth, csrfProtection, dashboardController.submitSupportTicket);
app.post('/change-password', requireAuth, csrfProtection, dashboardController.changePassword);
app.post('/apply-updates', requireAuth, csrfProtection, dashboardController.applyUpdates);
app.post('/dashboard/dismiss-next-steps', requireAuth, csrfProtection, (req, res) => {
  req.session.dismissedNextSteps = true;
  res.json({ success: true });
});

// Database setup
app.post('/setup-database', requireAuth, csrfProtection, serverController.setupDatabase);

// Admin - dashboard
app.get('/admin', requireAuth, requireAdmin, csrfProtection, adminController.listUsers);
app.post('/admin/delete-user/:id', requireAuth, requireAdmin, csrfProtection, adminController.deleteUser);
app.post('/admin/cancel-provisioning/:id', requireAuth, requireAdmin, csrfProtection, adminController.cancelProvisioning);
app.post('/admin/delete-server/:id', requireAuth, requireAdmin, csrfProtection, adminController.deleteServer);
app.post('/admin/destroy-droplet/:id', requireAuth, requireAdmin, csrfProtection, adminController.destroyDroplet);

// Admin - Server Updates (secure update orchestration)
app.get('/admin/updates', requireAuth, requireAdmin, csrfProtection, adminUpdatesController.showUpdates);
app.get('/admin/updates/:id', requireAuth, requireAdmin, csrfProtection, adminUpdatesController.showUpdateDetail);
app.post('/admin/updates/create', requireAuth, requireAdmin, csrfProtection, adminUpdatesController.createUpdate);
app.post('/admin/updates/kill-switch', requireAuth, requireAdmin, csrfProtection, adminUpdatesController.toggleKillSwitch);
app.post('/admin/updates/:id/test', requireAuth, requireAdmin, csrfProtection, adminUpdatesController.testUpdate);
app.post('/admin/updates/:id/release', requireAuth, requireAdmin, csrfProtection, adminUpdatesController.releaseUpdate);
app.post('/admin/updates/:id/push', requireAuth, requireAdmin, csrfProtection, adminUpdatesController.pushUpdate);
app.post('/admin/updates/:id/retry', requireAuth, requireAdmin, csrfProtection, adminUpdatesController.retryFailedServers);
app.post('/admin/updates/:id/archive', requireAuth, requireAdmin, csrfProtection, adminUpdatesController.archiveUpdate);
app.post('/admin/updates/:id/delete', requireAuth, requireAdmin, csrfProtection, adminUpdatesController.deleteUpdate);

// Admin - domain management (API endpoints only - UI is in /admin/users)
app.get('/admin/domains/list', requireAuth, requireAdmin, domainController.listDomains);
app.post('/admin/domains', requireAuth, requireAdmin, csrfProtection, domainController.addDomain);
app.put('/admin/domains/:id', requireAuth, requireAdmin, csrfProtection, domainController.updateDomain);
app.delete('/admin/domains/:id', requireAuth, requireAdmin, csrfProtection, domainController.deleteDomain);

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
app.post('/request-server', requireAuth, deploymentLimiter, csrfProtection, async (req, res) => {
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
    
    // Check if user already has a server (exclude deleted/failed)
    const serverCheck = await pool.query(
      "SELECT * FROM servers WHERE user_id = $1 AND status NOT IN ('deleted', 'failed')",
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
      return res.redirect('/dashboard?error=Server request already pending');
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
    
    res.redirect('/dashboard?success=Server request submitted successfully');
  } catch (err) {
    console.error('Server request error:', err);
    res.status(500).send('Server error');
  }
});

// Free Trial Endpoint - provisions a Basic server for 3 days without payment
app.post('/start-trial', requireAuth, deploymentLimiter, csrfProtection, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Require email confirmation before starting trial
    if (!req.session.emailConfirmed) {
      return res.redirect('/dashboard?error=Please confirm your email before starting a trial');
    }
    
    // Global daily trial cap - prevent mass abuse (50 trials/day max)
    const dailyTrialCount = await pool.query(
      `SELECT COUNT(*) as count FROM servers 
       WHERE is_trial = true AND created_at > NOW() - INTERVAL '24 hours'`
    );
    if (parseInt(dailyTrialCount.rows[0].count) >= 50) {
      console.log(`[TRIAL] Daily trial cap reached (50/day). Rejecting user ${userId}`);
      return res.redirect('/dashboard?error=Trial signups temporarily limited. Please try again tomorrow or subscribe now.');
    }
    
    // Check if user has already used their trial
    const userResult = await pool.query(
      'SELECT trial_used, email, browser_fingerprint FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.redirect('/dashboard?error=User not found');
    }
    
    if (userResult.rows[0].trial_used) {
      return res.redirect('/dashboard?error=You have already used your free trial. Please subscribe to continue.');
    }
    
    // Check if user already has a server (exclude deleted/failed)
    const serverCheck = await pool.query(
      "SELECT * FROM servers WHERE user_id = $1 AND status NOT IN ('deleted', 'failed')",
      [userId]
    );
    
    if (serverCheck.rows.length > 0) {
      return res.redirect('/dashboard?error=You already have a server');
    }
    
    // Check if same IP has used trial within 90 days (prevent abuse)
    // Use req.ip which respects trust proxy setting instead of manually parsing headers
    const clientIp = req.ip || req.socket.remoteAddress;
    const recentTrialCheck = await pool.query(
      `SELECT id FROM users 
       WHERE signup_ip = $1 
       AND trial_used = true 
       AND trial_used_at > NOW() - INTERVAL '90 days'
       AND id != $2`,
      [clientIp, userId]
    );
    
    if (recentTrialCheck.rows.length > 0) {
      return res.redirect('/dashboard?error=A trial was recently used from this network. Please subscribe to continue.');
    }
    
    // Check if same browser fingerprint has used trial within 90 days (VPN bypass prevention)
    const userFingerprint = userResult.rows[0].browser_fingerprint;
    
    // Require fingerprint to start trial (prevents JS-disabled bypass)
    if (!userFingerprint) {
      return res.redirect('/dashboard?error=Browser verification required. Please enable JavaScript and try again.');
    }
    
    const fingerprintTrialCheck = await pool.query(
      `SELECT id FROM users 
       WHERE browser_fingerprint = $1 
       AND trial_used = true 
       AND trial_used_at > NOW() - INTERVAL '90 days'
       AND id != $2`,
      [userFingerprint, userId]
    );
    
    if (fingerprintTrialCheck.rows.length > 0) {
      console.log(`[TRIAL] Blocked trial for user ${userId} - device fingerprint already used`);
      return res.redirect('/dashboard?error=A trial was recently used from this device. Please subscribe to continue.');
    }
    
    console.log(`[TRIAL] Starting free trial for user ${userId}`);
    
    // Create server with no payment (this will trigger trial mode in createRealServer)
    // Pass null for stripeChargeId to indicate it's a trial
    await createRealServerService(userId, 'basic', null, 'monthly', null);
    
    // Note: trial_used is set to true inside createRealServer after successful creation
    
    res.redirect('/dashboard?success=Your 3-day free trial has started! Your server is being provisioned.&provisioning=true');
  } catch (err) {
    console.error('[TRIAL] Start trial error:', err);
    res.redirect('/dashboard?error=Failed to start trial. Please try again or contact support.');
  }
});

// Payment Success page
app.get('/payment-success', requireAuth, paymentController.paymentSuccess);

// Payment Cancel page
app.get('/payment-cancel', requireAuth, paymentController.paymentCancel);

app.get('/pay', requireAuth, csrfProtection, paymentController.showCheckout);

app.post('/create-payment-intent', requireAuth, paymentLimiter, csrfProtection, paymentController.createPaymentIntent);

app.post('/create-checkout-session', requireAuth, paymentLimiter, csrfProtection, paymentController.createCheckoutSession);

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

// Monitor subscriptions every 6 hours (check for expired trials and failed payments)
setInterval(monitorSubscriptions, 6 * 60 * 60 * 1000);

// Run subscription monitor on startup (after 60 seconds)
setTimeout(monitorSubscriptions, 60000);

// Auto-SSL: Check every 5 minutes for domains ready for SSL
setInterval(checkAndProvisionSSL, 5 * 60 * 1000);

// Run auto-SSL check on startup (after 2 minutes to let server initialize)
setTimeout(checkAndProvisionSSL, 2 * 60 * 1000);

// SSL Verification: Reconcile SSL states every 30 minutes
const { reconcileAllSSLStates } = require('./services/sslVerification');
setInterval(reconcileAllSSLStates, 30 * 60 * 1000);

// Run SSL verification on startup (after 3 minutes)
setTimeout(reconcileAllSSLStates, 3 * 60 * 1000);

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Run database migrations before starting server
runMigrations().then(() => {
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
}).catch(error => {
  console.error('Failed to run migrations:', error);
  process.exit(1);
});