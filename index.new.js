const express = require('express');
require('dotenv').config();
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db');
const { generalLimiter } = require('./middleware/rateLimiter');
const { syncDigitalOceanDroplets } = require('./services/digitalocean');

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for Stripe
}));

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Static files
app.use(express.static('public'));

// Body parsers
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

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
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// HTTPS redirect middleware (only in production)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const dashboardRoutes = require('./routes/dashboard');
const paymentRoutes = require('./routes/payments');
const pageRoutes = require('./routes/pages');

// Mount routes
app.use('/', authRoutes);          // /register, /login, /logout
app.use('/', serverRoutes);        // /server-action, /delete-server, /deploy, /add-domain, /enable-ssl
app.use('/', dashboardRoutes);     // /dashboard
app.use('/', paymentRoutes);       // /pay, /create-checkout-session, /payment-success, /payment-cancel, /webhook/stripe
app.use('/', pageRoutes);          // /, /about, /pricing, /terms, /privacy, /faq, /docs, /contact

// Run sync every hour (3600000 ms)
setInterval(syncDigitalOceanDroplets, 3600000);

// Run sync on startup (after 30 seconds to let server initialize)
setTimeout(syncDigitalOceanDroplets, 30000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
