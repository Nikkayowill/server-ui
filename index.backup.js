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

const app = express();

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.'
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 contact form submissions per hour
  message: 'Too many contact submissions, please try again later.'
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 payment attempts per 15 minutes
  message: 'Too many payment attempts, please try again later.'
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for Stripe
}));

app.use(express.static('public'));

app.use(cookieParser());
app.use(express.urlencoded({ extended: false })); // lets us read form bodies

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

// CSRF protection
const csrfProtection = csrf({ cookie: true });

// HTTPS redirect middleware (only in production)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login?message=Please login to proceed with payment');
  }
}

// Helper function to create real DigitalOcean server
async function createRealServer(userId, plan, stripeChargeId = null) {
  const specs = {
    basic: { ram: '1 GB', cpu: '1 CPU', storage: '25 GB SSD', bandwidth: '1 TB', slug: 's-1vcpu-1gb' },
    priority: { ram: '2 GB', cpu: '2 CPUs', storage: '50 GB SSD', bandwidth: '2 TB', slug: 's-2vcpu-2gb' },
    premium: { ram: '4 GB', cpu: '2 CPUs', storage: '80 GB SSD', bandwidth: '4 TB', slug: 's-2vcpu-4gb' }
  };

  const selectedSpec = specs[plan] || specs.basic;
  const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + '!@#';

  // Setup script for automatic Nginx + Certbot installation
  const setupScript = `#!/bin/bash
# Update system
apt-get update

# Install Nginx and Certbot
apt-get install -y nginx certbot python3-certbot-nginx

# Configure firewall
ufw allow 'Nginx Full'
ufw allow OpenSSH
echo "y" | ufw enable

# Create basic Nginx config
cat > /etc/nginx/sites-available/default << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /var/www/html;
    index index.html index.htm;
    
    server_name _;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

# Create welcome page
cat > /var/www/html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Server Ready</title>
    <style>
        body { font-family: Arial; text-align: center; padding: 50px; background: #1a1a1a; color: #e0e0e0; }
        h1 { color: #88fe00; }
    </style>
</head>
<body>
    <h1>🚀 Your Server is Ready!</h1>
    <p>Nginx is installed and running.</p>
    <p>SSL ready with Certbot - just add your domain!</p>
</body>
</html>
EOF

echo "Setup complete!" > /root/setup.log
`;

  try {
    // Create droplet via DigitalOcean API
    const response = await axios.post('https://api.digitalocean.com/v2/droplets', {
      name: `basement-${userId}-${Date.now()}`,
      region: 'nyc3',
      size: selectedSpec.slug,
      image: 'ubuntu-22-04-x64',
      ssh_keys: null,
      backups: false,
      ipv6: false,
      user_data: setupScript,
      monitoring: true,
      tags: ['basement-server']
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const droplet = response.data.droplet;
    console.log('Droplet created:', droplet.id);
    
    // Save to database
    const result = await pool.query(
      `INSERT INTO servers (user_id, plan, status, ip_address, ssh_username, ssh_password, specs, stripe_charge_id)
       VALUES ($1, $2, 'provisioning', $3, 'root', $4, $5, $6)
       RETURNING *`,
      [userId, plan, droplet.networks?.v4?.[0]?.ip_address || 'pending', password, JSON.stringify(selectedSpec), stripeChargeId]
    );

    // Always poll for IP - droplet might not have it immediately
    console.log('Starting polling for droplet:', droplet.id, 'server:', result.rows[0].id);
    pollDropletStatus(droplet.id, result.rows[0].id);

    return result.rows[0];
  } catch (error) {
    console.error('DigitalOcean API error:', error.response?.data || error.message);
    
    // Save failed server to database
    const result = await pool.query(
      `INSERT INTO servers (user_id, plan, status, ip_address, ssh_username, ssh_password, specs, stripe_charge_id)
       VALUES ($1, $2, 'failed', 'N/A', 'root', 'N/A', $3, $4)
       RETURNING *`,
      [userId, plan, JSON.stringify(specs[plan] || specs.basic), stripeChargeId]
    );
    
    return result.rows[0];
  }
}

// Poll droplet until IP is assigned
async function pollDropletStatus(dropletId, serverId) {
  const maxAttempts = 30;
  let attempts = 0;

  const interval = setInterval(async () => {
    attempts++;
    try {
      const response = await axios.get(`https://api.digitalocean.com/v2/droplets/${dropletId}`, {
        headers: { 'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}` }
      });

      const droplet = response.data.droplet;
      const ip = droplet.networks?.v4?.[0]?.ip_address;

      if (ip && droplet.status === 'active') {
        await pool.query(
          'UPDATE servers SET ip_address = $1, status = $2 WHERE id = $3',
          [ip, 'running', serverId]
        );
        console.log(`Server ${serverId} is now running at ${ip}`);
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        await pool.query(
          'UPDATE servers SET status = $1 WHERE id = $2',
          ['failed', serverId]
        );
        console.error(`Server ${serverId} provisioning failed - timeout`);
        clearInterval(interval);
      }
    } catch (error) {
      console.error('Polling error:', error.message);
      if (attempts >= maxAttempts) {
        await pool.query(
          'UPDATE servers SET status = $1 WHERE id = $2',
          ['failed', serverId]
        );
        clearInterval(interval);
      }
    }
  }, 10000); // Check every 10 seconds
  return result.rows[0];
}

// Helper function to generate footer HTML
// Helper function to generate responsive nav HTML
app.get('/', (req, res) => {
  res.send(`
${getHTMLHead('Basement - Cloud Hosting Without the Headache')}
    <link rel="stylesheet" href="/css/home.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <section class="hero">
        <h1>Basement</h1>
        <p class="sub">Cloud hosting without the cloud headache. Get a real server. Deploy your apps. Full control when you want it, management when you don't.</p>
        <div class="cta-group">
            <a href="/pricing" class="btn primary">View Pricing</a>
            <a href="/docs" class="btn">Documentation</a>
        </div>
    </section>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
});
app.get('/about', (req, res) => {
  res.send(`
${getHTMLHead('About - Basement')}
    <link rel="stylesheet" href="/css/pages.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>ABOUT BASEMENT</h1>
        
        <p>I'm Kayo, an IT Web Programming student at NSCC in Halifax, graduating May 2026. Before switching to tech, I worked as a tradesman—different tools, same problem-solving mindset.</p>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">WHY I BUILT THIS</h2>
        
        <p>I wanted to prove I could build and deploy a real production application from the ground up. Not just for a grade, but something that actually handles payments, provisions servers, and solves a real problem.</p>
        
        <p>Cloud hosting doesn't need to be complicated. You shouldn't need a PhD to deploy a Node app or a static site. Basement gives you a real server you can SSH into, plus a dashboard for the routine stuff. Simple.</p>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">HOW IT WORKS</h2>
        
        <p>I'm running this as a small operation. The infrastructure is enterprise-grade (DigitalOcean droplets), but I'm building features incrementally based on what users actually need. Current setup handles individual developers and small teams deploying web apps, APIs, and services.</p>
        
        <p>As more people use it, I expand capabilities. I prioritize stability over speed—every feature gets tested properly before it ships.</p>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">THE TECH</h2>
        
        <p>Built with <strong style="color: #e0e6f0;">Node.js</strong>, <strong style="color: #e0e6f0;">Express</strong>, <strong style="color: #e0e6f0;">PostgreSQL</strong>, and <strong style="color: #e0e6f0;">Stripe</strong>. Servers run <strong style="color: #e0e6f0;">Ubuntu LTS</strong> on <strong style="color: #e0e6f0;">DigitalOcean</strong>. Security includes automated OS updates, daily backups, and DDoS protection.</p>
        
        <h2 style="color: var(--glow); font-size: 24px; margin: 32px 0 16px;">OPEN SOURCE</h2>
        
        <p>The entire dashboard and deployment tooling is open source. You can see how everything works, contribute improvements, or fork it for your own projects. Transparency matters.</p>
        
        <p><a href="#" style="color: var(--glow); text-decoration: underline;" target="_blank" rel="noopener noreferrer">View on GitHub →</a></p>
        
        <p style="margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(136, 254, 0, 0.1);">This is my capstone project and portfolio piece. If you're evaluating my work or have questions about the technical implementation, <a href="/contact" style="color: var(--glow); text-decoration: underline;">reach out</a>.</p>
        
        <a href="/" class="link-back">Back to home</a>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
});

// Register route (GET)
app.get('/register', csrfProtection, (req, res) => {
  res.send(`
${getHTMLHead('Register - Basement')}
    <link rel="stylesheet" href="/css/auth.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="auth-container">
        <div class="auth-card">
            <h1>CREATE ACCOUNT</h1>
            <form method="POST" action="/register">
                <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" required>
                </div>
                
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" minlength="8" required>
                </div>
                
                <div class="form-group">
                    <label>Confirm Password</label>
                    <input type="password" name="confirmPassword" minlength="8" required>
                </div>
                
                <button type="submit" class="btn">Register</button>
            </form>
            
            <p class="link">Already have an account? <a href="/login">Login</a></p>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
});
app.get('/contact', csrfProtection, (req, res) => {
  res.send(`
${getHTMLHead('Contact - Basement')}
    <link rel="stylesheet" href="/css/contact.css">
</head>
<body>
  <div class="matrix-bg"></div>
  
  ${getResponsiveNav(req)}
  
  <div class="contact-container">
    <h1>Contact Us</h1>
    <p class="subtitle">Get in touch with our team</p>
    
    <form method="POST" action="/contact">
      <input type="hidden" name="_csrf" value="${req.csrfToken()}">
      
      <label>
        <span>Name</span>
        <input type="text" name="name" required>
      </label>
      
      <label>
        <span>Email</span>
        <input type="email" name="email" required>
      </label>
      
      <label>
        <span>Message</span>
        <textarea name="message" required></textarea>
      </label>
      
      <button type="submit">Send Message</button>
    </form>
  </div>
  
  ${getFooter()}
  ${getScripts('nav.js')}
  `);
});

app.post('/contact', 
  contactLimiter,
  csrfProtection,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 1000 })
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(`
        <h1>Validation Error</h1>
        <ul>${errors.array().map(err => `<li>${err.msg}</li>`).join('')}</ul>
        <a href="/contact">Go back</a>
      `);
    }
    console.log('Form received:', req.body);
    res.redirect('/');
  }
);

// Register POST handler
app.post('/register',
  csrfProtection,
  [
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords must match')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send(`
        <h1 style="color: #88FE00;">Validation Error</h1>
        <ul>${errors.array().map(err => `<li>${err.msg}</li>`).join('')}</ul>
        <a href="/register" style="color: #88FE00;">Go back</a>
      `);
    }

    try {
      const { email, password } = req.body;
      
      // Check if user exists
      const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (userCheck.rows.length > 0) {
        return res.status(400).send('Email already registered. <a href="/login">Login</a>');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Insert user
      await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
        [email, passwordHash]
      );

      res.redirect('/login');
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).send('Registration failed');
    }
  }
);

// Login GET route
app.get('/login', csrfProtection, (req, res) => {
  const message = req.query.message || '';
  const error = req.query.error || '';
  res.send(`
${getHTMLHead('Login - Basement')}
    <link rel="stylesheet" href="/css/auth.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="auth-container">
        <div class="auth-card">
            <h1>LOGIN</h1>
            ${message ? `<div class="message">${message}</div>` : ''}
            ${error ? `<div class="error">${error}</div>` : ''}
            <form method="POST" action="/login">
                <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" required>
                </div>
                
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" required>
                </div>
                
                <button type="submit" class="btn">Login</button>
            </form>
            
            <p class="link">Don't have an account? <a href="/register">Register</a></p>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
});

// Login POST handler
app.post('/login',
  csrfProtection,
  [
    body('email').trim().isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/login?error=Invalid email or password');
    }

    try {
      const { email, password } = req.body;
      
      // Find user
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.redirect('/login?error=Invalid email or password');
      }

      const user = result.rows[0];
      
      // Check password
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.redirect('/login?error=Invalid email or password');
      }

      // Set session
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userRole = user.role;

      res.redirect('/');
    } catch (error) {
      console.error('Login error:', error);
      return res.redirect('/login?error=An error occurred. Please try again.');
    }
  }
);

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Server action route (restart/stop)
app.post('/server-action', requireAuth, async (req, res) => {
  try {
    const action = req.body.action;
    const userId = req.session.userId;

    // Get user's server
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    // Update server status based on action
    let newStatus;
    let successMessage;
    
    if (action === 'start') {
      newStatus = 'running';
      successMessage = 'Server started successfully';
    } else if (action === 'restart') {
      newStatus = 'running';
      successMessage = 'Server restarted successfully';
    } else if (action === 'stop') {
      newStatus = 'stopped';
      successMessage = 'Server stopped successfully';
    } else {
      return res.redirect('/dashboard?error=Invalid action');
    }

    await pool.query(
      'UPDATE servers SET status = $1 WHERE user_id = $2',
      [newStatus, userId]
    );

    res.redirect('/dashboard?success=' + successMessage);
  } catch (error) {
    console.error('Server action error:', error);
    res.redirect('/dashboard?error=Action failed');
  }
});

// Delete server route
app.post('/delete-server', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get user's server
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const server = serverResult.rows[0];

    // Find and destroy the DigitalOcean droplet
    // Droplet name format: basement-{userId}-{timestamp}
    try {
      // List all droplets with our tag
      const dropletsResponse = await axios.get('https://api.digitalocean.com/v2/droplets?tag_name=basement-server', {
        headers: {
          'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      // Find droplet matching this user
      const droplet = dropletsResponse.data.droplets.find(d => 
        d.name.startsWith(`basement-${userId}-`)
      );

      if (droplet) {
        // Destroy the droplet
        await axios.delete(`https://api.digitalocean.com/v2/droplets/${droplet.id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`Destroyed droplet ${droplet.id} for user ${userId}`);
      } else {
        console.log(`No droplet found for user ${userId}, proceeding with database cleanup`);
      }
    } catch (doError) {
      console.error('DigitalOcean deletion error:', doError.response?.data || doError.message);
      // Continue with database deletion even if DO call fails
    }

    // Delete server from database
    await pool.query(
      'DELETE FROM servers WHERE user_id = $1',
      [userId]
    );

    console.log(`Deleted server record for user ${userId}`);
    res.redirect('/pricing?message=Server deleted successfully');
  } catch (error) {
    console.error('Delete server error:', error);
    res.redirect('/dashboard?error=Failed to delete server');
  }
});

// Deploy route
app.post('/deploy', requireAuth, async (req, res) => {
  try {
    const gitUrl = req.body.git_url;
    const userId = req.session.userId;

    // Validate Git URL format
    if (!gitUrl || !gitUrl.includes('github.com') && !gitUrl.includes('gitlab.com') && !gitUrl.includes('bitbucket.org')) {
      return res.redirect('/dashboard?error=Invalid Git URL');
    }

    // Get user's server
    const serverResult = await pool.query(
      'SELECT id FROM servers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const serverId = serverResult.rows[0].id;

    // Store deployment in database
    await pool.query(
      'INSERT INTO deployments (server_id, user_id, git_url, status, output) VALUES ($1, $2, $3, $4, $5)',
      [serverId, userId, gitUrl, 'pending', 'Deployment queued...']
    );

    // In real implementation, this would:
    // 1. SSH into the droplet
    // 2. Clone the repo
    // 3. Install dependencies
    // 4. Start the app
    
    res.redirect('/dashboard?success=Deployment initiated! Check deployment history below.');
  } catch (error) {
    console.error('Deploy error:', error);
    res.redirect('/dashboard?error=Deployment failed');
  }
});

// Add domain route
app.post('/add-domain', requireAuth, async (req, res) => {
  try {
    const domain = req.body.domain.toLowerCase().trim();
    const userId = req.session.userId;

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domain || !domainRegex.test(domain)) {
      return res.redirect('/dashboard?error=Invalid domain format');
    }

    // Get user's server
    const serverResult = await pool.query(
      'SELECT id FROM servers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No server found');
    }

    const serverId = serverResult.rows[0].id;

    // Check if domain already exists
    const existingDomain = await pool.query(
      'SELECT id FROM domains WHERE domain = $1',
      [domain]
    );

    if (existingDomain.rows.length > 0) {
      return res.redirect('/dashboard?error=Domain already in use');
    }

    // Store domain in database
    await pool.query(
      'INSERT INTO domains (server_id, user_id, domain, ssl_enabled) VALUES ($1, $2, $3, $4)',
      [serverId, userId, domain, false]
    );

    // In real implementation, this would:
    // 1. Configure Nginx on the droplet
    // 2. Set up SSL certificate with Let's Encrypt
    
    res.redirect('/dashboard?success=Domain added! Configure your DNS as shown above.');
  } catch (error) {
    console.error('Add domain error:', error);
    res.redirect('/dashboard?error=Failed to add domain');
  }
});

// Helper function to execute SSH command
function executeSSHCommand(host, username, password, command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        
        let output = '';
        let errorOutput = '';
        
        stream.on('close', (code) => {
          conn.end();
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`Command failed with code ${code}: ${errorOutput}`));
          }
        });
        
        stream.on('data', (data) => {
          output += data.toString();
        });
        
        stream.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
      });
    });
    
    conn.on('error', (err) => {
      reject(err);
    });
    
    conn.connect({
      host,
      port: 22,
      username,
      password,
      readyTimeout: 30000
    });
  });
}

// Enable SSL route
app.post('/enable-ssl', requireAuth, async (req, res) => {
  try {
    const domain = req.body.domain.toLowerCase().trim();
    const userId = req.session.userId;
    const email = req.session.userEmail || 'admin@basement.com';

    // Validate domain
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domain || !domainRegex.test(domain)) {
      return res.redirect('/dashboard?error=Invalid domain format');
    }

    // Get user's server
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1 AND status = $2',
      [userId, 'running']
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/dashboard?error=No running server found');
    }

    const server = serverResult.rows[0];

    // Execute certbot command via SSH
    const certbotCommand = `certbot --nginx -d ${domain} --non-interactive --agree-tos --email ${email} --redirect`;
    
    console.log(`[SSL] Enabling SSL for ${domain} on server ${server.ip_address}`);
    
    try {
      const output = await executeSSHCommand(
        server.ip_address,
        server.ssh_username,
        server.ssh_password,
        certbotCommand
      );
      
      console.log(`[SSL] Success for ${domain}:`, output);
      
      // Update domain in database
      await pool.query(
        'UPDATE domains SET ssl_enabled = true WHERE domain = $1 AND user_id = $2',
        [domain, userId]
      );
      
      res.redirect('/dashboard?success=SSL enabled! Your site is now secure with HTTPS');
    } catch (sshError) {
      console.error('[SSL] SSH error:', sshError.message);
      res.redirect('/dashboard?error=Failed to enable SSL. Make sure your domain points to your server IP');
    }
  } catch (error) {
    console.error('Enable SSL error:', error);
    res.redirect('/dashboard?error=Failed to enable SSL');
  }
});

// Dashboard route
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // Get user's server info
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [req.session.userId]
    );

    // No server state - show simplified dashboard
    if (serverResult.rows.length === 0) {
      return res.send(`
${getDashboardHead('Dashboard - Basement')}
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Dashboard</h1>
        
        ${req.query.success ? `<div class="alert success">${req.query.success}<span class="alert-close" onclick="this.parentElement.style.display='none'">&times;</span></div>` : ''}
        ${req.query.error ? `<div class="alert error">${req.query.error}<span class="alert-close" onclick="this.parentElement.style.display='none'">&times;</span></div>` : ''}
        ${req.query.message ? `<div class="alert success">${req.query.message}<span class="alert-close" onclick="this.parentElement.style.display='none'">&times;</span></div>` : ''}
        
        <div class="card" style="text-align: center; padding: 64px 32px;">
            <h2 style="font-size: 32px; margin-bottom: 16px;">Welcome to Basement</h2>
            <p style="color: #8892a0; font-size: 16px; margin-bottom: 32px;">You don't have a server yet. Get started by choosing a plan.</p>
            <a href="/pricing" class="btn" style="display: inline-block; padding: 16px 32px; font-size: 16px;">View Plans</a>
        </div>
        
        <div class="dashboard-grid" style="margin-top: 32px;">
            <div class="card">
                <h3 style="color: var(--glow); margin-bottom: 16px;">📊 Monitor</h3>
                <p style="color: #8892a0; font-size: 14px;">Track your server's performance, CPU usage, memory, and disk space in real-time.</p>
            </div>
            
            <div class="card">
                <h3 style="color: var(--glow); margin-bottom: 16px;">🚀 Deploy</h3>
                <p style="color: #8892a0; font-size: 14px;">Connect your Git repository and deploy applications with a single click.</p>
            </div>
            
            <div class="card">
                <h3 style="color: var(--glow); margin-bottom: 16px;">🌐 Domains</h3>
                <p style="color: #8892a0; font-size: 14px;">Add custom domains and manage DNS settings for your applications.</p>
            </div>
            
            <div class="card">
                <h3 style="color: var(--glow); margin-bottom: 16px;">🔒 SSH Access</h3>
                <p style="color: #8892a0; font-size: 14px;">Full SSH access to your server with secure credentials and connection details.</p>
            </div>
        </div>
    </div>
    
    <script src="/js/nav.js"></script>
</body>
</html>
      `);
    }

    const server = serverResult.rows[0];
    
    // Get deployment history
    const deploymentsResult = await pool.query(
      'SELECT * FROM deployments WHERE user_id = $1 ORDER BY deployed_at DESC LIMIT 10',
      [req.session.userId]
    );

    // Get domains
    const domainsResult = await pool.query(
      'SELECT * FROM domains WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.userId]
    );
    
    const deployments = deploymentsResult.rows;
    const domains = domainsResult.rows;
    const specs = typeof server.specs === 'string' ? JSON.parse(server.specs) : server.specs;

    res.send(`
${getDashboardHead('Dashboard - Basement')}
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Dashboard</h1>
        
        ${req.query.success ? `<div class="alert success">${req.query.success}<span class="alert-close" onclick="this.parentElement.style.display='none'">&times;</span></div>` : ''}
        ${req.query.error ? `<div class="alert error">${req.query.error}<span class="alert-close" onclick="this.parentElement.style.display='none'">&times;</span></div>` : ''}
        
        <div class="dashboard-grid">
            <div class="card">
                <h2>Server Status</h2>
                <p><span class="status ${server.status}">${server.status}</span></p>
                ${server.status === 'provisioning' ? '<p style="color: #8892a0; font-size: 13px; margin-top: 12px;">⏳ Setting up your server... This page will auto-refresh.</p>' : ''}
                ${server.status === 'failed' ? '<p style="color: #ff4444; font-size: 13px; margin-top: 12px;">❌ Server provisioning failed. Please contact support.</p>' : ''}
                <p style="margin-top: 16px;"><strong>Plan:</strong> ${server.plan.charAt(0).toUpperCase() + server.plan.slice(1)}</p>
                <p><strong>Created:</strong> ${new Date(server.created_at).toLocaleDateString()}</p>
            </div>
            
            <div class="card">
                <h2>Server Specs</h2>
                <p><strong>RAM:</strong> ${specs.ram}</p>
                <p><strong>CPU:</strong> ${specs.cpu}</p>
                <p><strong>Storage:</strong> ${specs.storage}</p>
                <p><strong>Bandwidth:</strong> ${specs.bandwidth}</p>
            </div>
            
            <div class="card">
                <h2>Connection Details</h2>
                <p><strong>IP Address:</strong></p>
                <div class="copy-box">
                    <span>${server.ip_address}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${server.ip_address}')">Copy</button>
                </div>
            </div>
            
            <div class="card">
                <h2>Resource Usage</h2>
                <div class="resource-item">
                    <div class="resource-label">
                        <span>CPU</span>
                        <span>${Math.floor(Math.random() * 30 + 15)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.floor(Math.random() * 30 + 15)}%"></div>
                    </div>
                </div>
                <div class="resource-item">
                    <div class="resource-label">
                        <span>RAM</span>
                        <span>${Math.floor(Math.random() * 40 + 30)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.floor(Math.random() * 40 + 30)}%"></div>
                    </div>
                </div>
                <div class="resource-item">
                    <div class="resource-label">
                        <span>Disk</span>
                        <span>${Math.floor(Math.random() * 20 + 10)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.floor(Math.random() * 20 + 10)}%"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-bottom: 32px;">
            <h2>SSH Access</h2>
            <p style="margin-bottom: 16px;">Use these credentials to connect to your server via SSH:</p>
            
            <p><strong>Username:</strong></p>
            <div class="copy-box">
                <span>${server.ssh_username}</span>
                <button class="copy-btn" onclick="copyToClipboard('${server.ssh_username}')">Copy</button>
            </div>
            
            <p><strong>Password:</strong></p>
            <div class="copy-box">
                <span>${server.ssh_password}</span>
                <button class="copy-btn" onclick="copyToClipboard('${server.ssh_password}')">Copy</button>
            </div>
            
            <p><strong>Connection command:</strong></p>
            <div class="copy-box">
                <span>ssh ${server.ssh_username}@${server.ip_address}</span>
                <button class="copy-btn" onclick="copyToClipboard('ssh ${server.ssh_username}@${server.ip_address}')">Copy</button>
            </div>
        </div>
        
        <div class="card">
            <h2>Server Controls</h2>
            <p style="margin-bottom: 16px;">Manage your server</p>
            
            ${server.status === 'stopped' ? `
                <form action="/server-action" method="POST" style="display: inline;">
                    <input type="hidden" name="action" value="start">
                    <button type="submit" class="btn">Start Server</button>
                </form>
            ` : `
                <form action="/server-action" method="POST" style="display: inline;">
                    <input type="hidden" name="action" value="restart">
                    <button type="submit" class="btn">Restart Server</button>
                </form>
                <form action="/server-action" method="POST" style="display: inline;">
                    <input type="hidden" name="action" value="stop">
                    <button type="submit" class="btn">Stop Server</button>
                </form>
            `}
            
            <form action="/delete-server" method="POST" style="margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255, 68, 68, 0.2);" onsubmit="return confirm('Are you sure? This will permanently destroy your server and all data on it.');">
                <p style="color: #ff4444; font-size: 13px; margin-bottom: 12px;">⚠️ Danger Zone</p>
                <button type="submit" class="btn" style="background: transparent; border-color: #ff4444; color: #ff4444;">Delete Server</button>
            </form>
        </div>
        
        <div class="card" style="grid-column: 1 / -1;">
            <h2>Deployment</h2>
            <p style="margin-bottom: 16px; color: #8892a0;">Deploy your application from a Git repository</p>
            <form action="/deploy" method="POST">
                <label style="display: block; margin-bottom: 8px;">
                    <span style="color: var(--glow); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Git Repository URL</span>
                    <input type="url" name="git_url" placeholder="https://github.com/username/repo.git" 
                        style="width: 100%; padding: 12px; margin-top: 8px; background: rgba(0, 0, 0, 0.3); 
                        border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 4px; color: #e0e6f0; font-family: inherit;" required>
                </label>
                <button type="submit" class="btn" style="margin-top: 12px;">Deploy from Git</button>
            </form>
            
            ${deployments.length > 0 ? `
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(136, 254, 0, 0.1);">
                <h3 style="font-size: 14px; margin-bottom: 16px; color: var(--glow); text-transform: uppercase; letter-spacing: 1px;">Recent Deployments</h3>
                ${deployments.map(dep => `
                <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(136, 254, 0, 0.1); border-radius: 4px; padding: 16px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <code style="font-size: 12px; color: #e0e6f0; word-break: break-all;">${dep.git_url}</code>
                        <span style="font-size: 10px; padding: 4px 12px; background: ${dep.status === 'success' ? 'rgba(136, 254, 0, 0.2)' : dep.status === 'failed' ? 'rgba(255, 68, 68, 0.2)' : 'rgba(255, 184, 0, 0.2)'}; color: ${dep.status === 'success' ? 'var(--glow)' : dep.status === 'failed' ? '#ff4444' : '#ffb800'}; border-radius: 4px; text-transform: uppercase; font-weight: 600; white-space: nowrap; margin-left: 12px;">${dep.status}</span>
                    </div>
                    <p style="font-size: 11px; color: #666; margin: 0;">${new Date(dep.deployed_at).toLocaleString()}</p>
                </div>
                `).join('')}
            </div>
            ` : '<p style="color: #666; font-size: 12px; margin-top: 16px; font-style: italic;">No deployments yet. Deploy your first app above!</p>'}
        </div>
        
        <div class="card" style="grid-column: 1 / -1;">
            <h2>Custom Domains</h2>
            <p style="margin-bottom: 16px; color: #8892a0;">Connect a domain you own to your server</p>
            
            <form action="/add-domain" method="POST" style="margin-bottom: 24px;">
                <label style="display: block; margin-bottom: 8px;">
                    <span style="color: var(--glow); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Domain Name</span>
                    <input type="text" name="domain" placeholder="example.com" 
                        style="width: 100%; padding: 12px; margin-top: 8px; background: rgba(0, 0, 0, 0.3); 
                        border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 4px; color: #e0e6f0; font-family: inherit;" required>
                </label>
                <button type="submit" class="btn" style="margin-top: 12px;">Add Domain</button>
            </form>
            
            <div style="background: rgba(136, 254, 0, 0.05); border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: var(--glow); font-size: 16px; margin-bottom: 16px;">🔒 One-Click SSL</h3>
                <p style="color: #8892a0; font-size: 13px; line-height: 1.6; margin-bottom: 16px;">
                    Secure your domain with free HTTPS certificate from Let's Encrypt. Make sure your domain's DNS is pointing to your server IP before enabling SSL.
                </p>
                <form action="/enable-ssl" method="POST">
                    <label style="display: block; margin-bottom: 8px;">
                        <span style="color: var(--glow); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Domain to Secure</span>
                        <input type="text" name="domain" placeholder="example.com" 
                            style="width: 100%; padding: 12px; margin-top: 8px; background: rgba(0, 0, 0, 0.3); 
                            border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 4px; color: #e0e6f0; font-family: inherit;" required>
                    </label>
                    <button type="submit" class="btn" style="margin-top: 12px; background: rgba(136, 254, 0, 0.9); color: #000;">Enable SSL</button>
                </form>
            </div>
            
            <div style="background: rgba(136, 254, 0, 0.05); border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 6px; padding: 16px;">
                <h3 style="color: var(--glow); font-size: 14px; margin-bottom: 12px;">DNS Configuration</h3>
                <p style="color: #8892a0; font-size: 13px; line-height: 1.6; margin-bottom: 8px;">
                    To point your domain to this server, add these DNS records at your domain registrar (GoDaddy, Namecheap, etc.):
                </p>
                <div style="background: rgba(0, 0, 0, 0.3); padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 12px;">
                    <div style="margin-bottom: 8px;">
                        <strong style="color: var(--glow);">A Record:</strong><br>
                        Name: <span style="color: #e0e6f0;">@</span> (or leave blank)<br>
                        Value: <span style="color: #e0e6f0;">${server.ip_address}</span><br>
                        TTL: <span style="color: #e0e6f0;">3600</span>
                    </div>
                    <div style="margin-top: 12px;">
                        <strong style="color: var(--glow);">A Record (www):</strong><br>
                        Name: <span style="color: #e0e6f0;">www</span><br>
                        Value: <span style="color: #e0e6f0;">${server.ip_address}</span><br>
                        TTL: <span style="color: #e0e6f0;">3600</span>
                    </div>
                </div>
                <p style="color: #666; font-size: 11px; margin-top: 12px;">
                    DNS changes can take 24-48 hours to propagate worldwide
                </p>
            </div>
            
            ${domains.length > 0 ? `
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(136, 254, 0, 0.1);">
                <h3 style="font-size: 14px; margin-bottom: 16px; color: var(--glow); text-transform: uppercase; letter-spacing: 1px;">Your Domains</h3>
                ${domains.map(dom => `
                <div style="background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(136, 254, 0, 0.1); border-radius: 4px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <code style="font-size: 14px; color: #e0e6f0; font-weight: 500;">${dom.domain}</code>
                        <p style="font-size: 11px; color: #666; margin: 6px 0 0 0;">Added ${new Date(dom.created_at).toLocaleDateString()}</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${dom.ssl_enabled ? '<span style="font-size: 11px; padding: 6px 12px; background: rgba(136, 254, 0, 0.2); color: var(--glow); border-radius: 4px; font-weight: 600;">🔒 SSL Active</span>' : '<span style="font-size: 11px; padding: 6px 12px; background: rgba(255, 184, 0, 0.2); color: #ffb800; border-radius: 4px; font-weight: 600;">⚠️ No SSL</span>'}
                    </div>
                </div>
                `).join('')}
            </div>
            ` : '<p style="color: #666; font-size: 12px; margin-top: 16px; font-style: italic;">No domains configured yet. Add your first domain above!</p>'}
        </div>
    </div>
    
    ${getFooter()}
    
    ${getScripts('nav.js', 'dashboard.js')}
    `);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('An error occurred loading your dashboard');
  }
});

// route for privacy policy (next)

app.get('/pricing', (req, res) => res.send(`
${getHTMLHead('Pricing - Basement')}
    <link rel="stylesheet" href="/css/pricing.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <section class="page-header">
        <h1>Simple Pricing</h1>
        <p>Real servers. Real specs. No surprises. Your bill will never exceed your plan.</p>
    </section>
    
    <section class="pricing-grid">
        <div class="plan">
            <div class="plan-header">
                <div class="plan-name">Basic</div>
                <div class="plan-price">$25<span style="font-size: 16px;">/mo</span></div>
                <div class="plan-cycle">Perfect for side projects</div>
            </div>
            <ul class="plan-features">
                <li><strong>1 GB RAM</strong></li>
                <li><strong>1 CPU core</strong></li>
                <li><strong>25 GB SSD storage</strong></li>
                <li><strong>1 TB bandwidth</strong></li>
                <li>Full SSH/root access</li>
                <li>Daily automated backups</li>
                <li>Security updates included</li>
                <li>Web dashboard</li>
                <li>Email support (48hr response)</li>
                <li>Open source tools</li>
            </ul>
            <a href="/pay?plan=basic"><button class="btn">Select Basic</button></a>
        </div>
        
        <div class="plan featured">
            <div class="plan-header">
                <div class="plan-name" style="color: var(--glow);">Priority</div>
                <div class="plan-price">$60<span style="font-size: 16px;">/mo</span></div>
                <div class="plan-cycle">Most popular • For production apps</div>
            </div>
            <ul class="plan-features">
                <li><strong>2 GB RAM</strong></li>
                <li><strong>2 CPU cores</strong></li>
                <li><strong>50 GB SSD storage</strong></li>
                <li><strong>2 TB bandwidth</strong></li>
                <li>Full SSH/root access</li>
                <li>Daily automated backups</li>
                <li>Security updates included</li>
                <li>Web dashboard</li>
                <li class="divider">Plus everything in Basic:</li>
                <li class="highlight">Priority support (12hr response)</li>
                <li class="highlight">SSL automation</li>
                <li class="highlight">One-click staging environments</li>
                <li class="highlight">Advanced monitoring</li>
                <li class="highlight">Deploy logs & history</li>
            </ul>
            <a href="/pay?plan=priority"><button class="btn primary">Select Priority</button></a>
        </div>
        
        <div class="plan">
            <div class="plan-header">
                <div class="plan-name">Premium</div>
                <div class="plan-price">$120<span style="font-size: 16px;">/mo</span></div>
                <div class="plan-cycle">For serious projects</div>
            </div>
            <ul class="plan-features">
                <li><strong>4 GB RAM</strong></li>
                <li><strong>2 CPU cores</strong></li>
                <li><strong>80 GB SSD storage</strong></li>
                <li><strong>4 TB bandwidth</strong></li>
                <li>Full SSH/root access</li>
                <li>Daily automated backups</li>
                <li>Security updates included</li>
                <li>Web dashboard</li>
                <li>Priority support (12hr response)</li>
                <li>SSL automation</li>
                <li>Staging environments</li>
                <li class="divider">Plus everything in Priority:</li>
                <li class="highlight">Direct chat support</li>
                <li class="highlight">Custom deployment assistance</li>
                <li class="highlight">Database optimization help</li>
                <li class="highlight">Performance tuning</li>
                <li class="highlight">Priority feature requests</li>
            </ul>
            <a href="/pay?plan=premium"><button class="btn">Select Premium</button></a>
        </div>
    </section>
    
    ${getFooter()}
    ${getScripts('nav.js')}
`));

app.get('/terms', (req, res) => {
  res.send(`
${getHTMLHead('Terms of Service - Basement')}
    <link rel="stylesheet" href="/css/pages.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Terms of Service</h1>
        <p>Put the real legalese here later.</p>
        <a href="/" class="link-back">Back to home</a>
    </div>
    
    ${getFooter()}
</body>
</html>
  `);
});

// Privacy Policy route
app.get('/privacy', (req, res) => {
  res.send(`
${getHTMLHead('Privacy Policy - Basement')}
    <link rel="stylesheet" href="/css/pages.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Privacy Policy</h1>
        <p><strong>Last Updated:</strong> January 16, 2026</p>
        
        <p>LocalBiz ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. Please read this policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.</p>
        
        <h2>1. Information We Collect</h2>
        
        <p><strong>1.1 Personal Information You Provide</strong></p>
        <p>We collect information that you voluntarily provide to us when you:</p>
        <ul>
            <li><strong>Register for an account:</strong> Email address and encrypted password</li>
            <li><strong>Submit inquiries:</strong> Name, email address, phone number (if provided), and message content through our contact form</li>
            <li><strong>Make purchases:</strong> Billing information including name, address, and payment card details (processed securely by our payment processor, Stripe)</li>
        </ul>
        
        <p><strong>1.2 Automatically Collected Information</strong></p>
        <p>When you access our website, we may automatically collect certain information, including:</p>
        <ul>
            <li><strong>Log data:</strong> IP address, browser type, operating system, referring URLs, pages viewed, and timestamps</li>
            <li><strong>Session data:</strong> Authentication tokens stored in cookies to maintain your logged-in state</li>
            <li><strong>Device information:</strong> Screen resolution, device type, and browser capabilities</li>
        </ul>
        
        <h2>2. How We Use Your Information</h2>
        
        <p>We use the information we collect for legitimate business purposes, including:</p>
        <ul>
            <li><strong>Service Delivery:</strong> To create and manage your account, process transactions, and deliver the services you request</li>
            <li><strong>Communication:</strong> To respond to your inquiries, provide customer support, and send transactional emails regarding your account or purchases</li>
            <li><strong>Security:</strong> To monitor and prevent fraudulent activity, unauthorized access, and other illegal activities</li>
            <li><strong>Improvement:</strong> To analyze usage patterns, diagnose technical problems, and improve our website functionality and user experience</li>
            <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, legal processes, or enforceable governmental requests</li>
            <li><strong>Business Operations:</strong> To maintain records for accounting, auditing, and business continuity purposes</li>
        </ul>
        
        <h2>3. Information Sharing and Disclosure</h2>
        
        <p>We do not sell, rent, or trade your personal information to third parties. We may share your information only in the following circumstances:</p>
        
        <p><strong>3.1 Service Providers</strong></p>
        <ul>
            <li><strong>Stripe, Inc.:</strong> We use Stripe to process payments. Your payment information is transmitted directly to Stripe and is subject to <a href="https://stripe.com/privacy" target="_blank" style="color: var(--glow);">Stripe's Privacy Policy</a>. We never store complete payment card information on our servers.</li>
        </ul>
        
        <p><strong>3.2 Legal Requirements</strong></p>
        <p>We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court order, subpoena, or government investigation).</p>
        
        <p><strong>3.3 Business Transfers</strong></p>
        <p>In the event of a merger, acquisition, reorganization, bankruptcy, or sale of assets, your information may be transferred as part of that transaction. You will be notified via email and/or prominent notice on our website of any such change in ownership or control.</p>
        
        <p><strong>3.4 Protection of Rights</strong></p>
        <p>We may disclose information when we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a legal request.</p>
        
        <h2>4. Data Security</h2>
        
        <p>We implement industry-standard security measures to protect your personal information:</p>
        <ul>
            <li><strong>Encryption:</strong> All passwords are hashed using bcrypt with a salt factor of 10, making them irreversible and secure against brute-force attacks</li>
            <li><strong>Secure Transmission:</strong> We use HTTPS/TLS encryption to protect data transmitted between your browser and our servers (when configured in production)</li>
            <li><strong>Session Security:</strong> Session cookies are marked as HTTP-only to prevent client-side script access and are configured with secure flags in production environments</li>
            <li><strong>Payment Security:</strong> All payment processing is handled by Stripe, a PCI-DSS Level 1 certified service provider. We never store complete payment card information</li>
            <li><strong>Database Security:</strong> User data is stored in a secured PostgreSQL database with restricted access and regular backups</li>
            <li><strong>Access Controls:</strong> Administrative access to user data is restricted to authorized personnel only</li>
        </ul>
        
        <p>However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.</p>
        
        <h2>5. Your Rights and Choices</h2>
        
        <p>Depending on your location and applicable law, you may have the following rights:</p>
        
        <p><strong>5.1 Access and Portability</strong></p>
        <p>You have the right to request access to the personal information we hold about you and to receive that information in a portable format.</p>
        
        <p><strong>5.2 Correction</strong></p>
        <p>You have the right to request correction of inaccurate or incomplete personal information.</p>
        
        <p><strong>5.3 Deletion</strong></p>
        <p>You have the right to request deletion of your personal information, subject to certain legal exceptions (e.g., completion of transactions, legal compliance, fraud prevention).</p>
        
        <p><strong>5.4 Objection and Restriction</strong></p>
        <p>You have the right to object to or request restriction of certain processing of your personal information.</p>
        
        <p><strong>5.5 Withdrawal of Consent</strong></p>
        <p>Where processing is based on consent, you have the right to withdraw that consent at any time.</p>
        
        <p><strong>5.6 Marketing Communications</strong></p>
        <p>You may opt out of receiving promotional communications from us by following the unsubscribe instructions in those messages.</p>
        
        <p>To exercise any of these rights, please contact us through our <a href="/contact" style="color: var(--glow);">contact form</a>. We will respond to your request within 30 days.</p>
        
        <h2>6. Data Retention</h2>
        
        <p>We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Account information is retained until you request deletion. Transaction records may be retained for accounting and legal compliance purposes for up to 7 years.</p>
        
        <h2>7. Cookies and Tracking Technologies</h2>
        
        <p>We use cookies and similar tracking technologies to enhance your experience on our website:</p>
        
        <p><strong>7.1 Essential Cookies</strong></p>
        <p>We use session cookies that are essential for the operation of our website. These cookies:</p>
        <ul>
            <li>Maintain your login state across pages</li>
            <li>Provide CSRF protection for form submissions</li>
            <li>Enable secure authentication</li>
        </ul>
        
        <p>These cookies are strictly necessary for the website to function and cannot be disabled without affecting core functionality.</p>
        
        <p><strong>7.2 Cookie Management</strong></p>
        <p>You can configure your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.</p>
        
        <h2>8. Third-Party Links</h2>
        
        <p>Our website may contain links to third-party websites or services that are not owned or controlled by LocalBiz. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of every website you visit.</p>
        
        <h2>9. Children's Privacy</h2>
        
        <p>Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately, and we will take steps to delete such information.</p>
        
        <h2>10. International Data Transfers</h2>
        
        <p>Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those of your country. By using our services, you consent to the transfer of your information to these countries.</p>
        
        <h2>11. Changes to This Privacy Policy</h2>
        
        <p>We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by:</p>
        <ul>
            <li>Posting the updated policy on this page with a new "Last Updated" date</li>
            <li>Sending an email notification to the address associated with your account (for material changes)</li>
        </ul>
        
        <p>Your continued use of our services after any changes indicates your acceptance of the updated policy.</p>
        
        <h2>12. California Privacy Rights</h2>
        
        <p>If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA):</p>
        <ul>
            <li>Right to know what personal information is collected, used, shared, or sold</li>
            <li>Right to delete personal information held by businesses</li>
            <li>Right to opt-out of sale of personal information (note: we do not sell personal information)</li>
            <li>Right to non-discrimination for exercising your CCPA rights</li>
        </ul>
        
        <h2>13. European Privacy Rights</h2>
        
        <p>If you are located in the European Economic Area (EEA), you have rights under the General Data Protection Regulation (GDPR), including the right to lodge a complaint with a supervisory authority if you believe our processing of your personal information violates applicable law.</p>
        
        <h2>14. Contact Information</h2>
        
        <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
        <ul>
            <li><strong>Email:</strong> Via our <a href="/contact" style="color: var(--glow);">contact form</a></li>
            <li><strong>Response Time:</strong> We aim to respond to all inquiries within 48 hours</li>
        </ul>
        
        <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(136, 254, 0, 0.1); font-size: 13px;">By using LocalBiz services, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.</p>
        
        <a href="/" class="link-back">Back to home</a>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
});

// FAQ page
app.get('/faq', (req, res) => {
  res.send(`
${getHTMLHead('FAQ - Basement')}
    <link rel="stylesheet" href="/css/faq.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Frequently Asked Questions</h1>
        <p class="subtitle">Find answers to common questions about our services</p>
        
        <div class="faq-section">
            <h2 class="section-title">General</h2>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>What services does LocalBiz provide?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>LocalBiz offers comprehensive business solutions tailored to your needs. Our services include web development, digital marketing support, and ongoing technical assistance. Each plan is designed to help local businesses establish and grow their online presence.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>How do I get started?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Getting started is simple:</p>
                        <ul>
                            <li>Create a free account on our platform</li>
                            <li>Choose a service plan that fits your needs</li>
                            <li>Complete the secure checkout process</li>
                            <li>Access your dashboard immediately after payment</li>
                        </ul>
                        <p>Our support team will reach out within 24 hours to guide you through onboarding.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>Is my data secure?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Absolutely. We take security seriously:</p>
                        <ul>
                            <li>All passwords are encrypted using industry-standard bcrypt hashing</li>
                            <li>Payment processing is handled by Stripe, a PCI-DSS Level 1 certified provider</li>
                            <li>We never store your credit card information</li>
                            <li>Session data is secured with HTTP-only cookies</li>
                        </ul>
                        <p>Read our <a href="/privacy">Privacy Policy</a> for complete details.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="faq-section">
            <h2 class="section-title">Pricing & Billing</h2>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>What payment methods do you accept?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>We accept all major credit and debit cards through our secure payment processor, Stripe. This includes Visa, Mastercard, American Express, and Discover.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>Can I change my plan later?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Yes! You can upgrade or downgrade your plan at any time from your dashboard. Changes take effect immediately, and billing is prorated based on your current billing cycle.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>Do you offer refunds?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>We offer a 14-day money-back guarantee for all new subscriptions. If you're not satisfied within the first 14 days, contact our support team for a full refund. After 14 days, refunds are evaluated on a case-by-case basis.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>Is there a free trial?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>While we don't offer a traditional free trial, our Basic plan starts at just $20/month with no long-term commitment. You can cancel anytime, and our 14-day money-back guarantee gives you risk-free opportunity to try our services.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="faq-section">
            <h2 class="section-title">Support</h2>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>How fast is your support response time?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Response times vary by plan:</p>
                        <ul>
                            <li><strong>Basic:</strong> 24-48 hours via email support</li>
                            <li><strong>Priority:</strong> 12 hours with priority queue access</li>
                            <li><strong>Premium:</strong> Dedicated support with custom response times</li>
                        </ul>
                        <p>Critical issues are prioritized across all plans.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>What support channels are available?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>We offer multiple support channels:</p>
                        <ul>
                            <li>Email support (all plans)</li>
                            <li>Contact form on our website</li>
                            <li>Direct chat access (Priority and Premium plans)</li>
                            <li>Phone support (Premium plan only)</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>Do you provide training or onboarding?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Yes! All new customers receive an onboarding guide and access to our documentation. Priority and Premium plans include personalized onboarding sessions with our team to ensure you get the most out of our services.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="faq-section">
            <h2 class="section-title">Account Management</h2>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>How do I cancel my subscription?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>You can cancel your subscription anytime from your dashboard. Navigate to Settings > Billing > Cancel Subscription. Your services will remain active until the end of your current billing period.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>Can I change my email address?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Yes, you can update your email address from your account settings. You'll need to verify your new email address before the change takes effect.</p>
                    </div>
                </div>
            </div>
            
            <div class="faq-item">
                <div class="faq-question" onclick="toggleFaq(this)">
                    <h3>What happens if I forget my password?</h3>
                    <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                    <div class="faq-answer-content">
                        <p>Click "Forgot Password" on the login page. We'll send a secure reset link to your registered email address. Follow the link to create a new password.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="cta-box">
            <h2>Still Have Questions?</h2>
            <p>Can't find the answer you're looking for? Our support team is here to help.</p>
            <a href="/contact" class="btn">Contact Support</a>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js', 'faq.js')}
  `);
});

// Documentation page
app.get('/docs', (req, res) => {
  res.send(`
${getHTMLHead('Documentation - Basement')}
    <link rel="stylesheet" href="/css/docs.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Documentation</h1>
        <p class="subtitle">Complete guide to Basement hosting—what you get, how to use it, and technical details.</p>
        
        <h2>What You Get</h2>
        <p>When you sign up, you get a dedicated cloud server (VPS - Virtual Private Server). This is a complete Linux machine that you control.</p>
        
        <p><strong>It's like renting a computer that runs 24/7 in a data center.</strong></p>
        
        <ul>
            <li><strong>Full root/SSH access</strong> - Complete control over your server</li>
            <li><strong>Dedicated IP address</strong> - Point your domain wherever you want</li>
            <li><strong>Install anything</strong> - Node, Python, Docker, databases, whatever you need</li>
            <li><strong>Deploy your way</strong> - Git, FTP, rsync, manual uploads - your choice</li>
        </ul>
        
        <h2>Two Ways to Manage Your Server</h2>
        <p>You decide how much control you want at any given time.</p>
        
        <h3>Dashboard</h3>
        <p>A web interface for common tasks:</p>
        <ul>
            <li>Deploy your code with a few clicks</li>
            <li>Restart your server</li>
            <li>View logs and monitor resources</li>
            <li>Set up SSL certificates automatically</li>
            <li>Manage backups</li>
        </ul>
        <p>Good for routine operations and quick deployments.</p>
        
        <h3>Direct SSH Access</h3>
        <p>Full terminal access to your server:</p>
        <ul>
            <li>Configure web servers (Nginx, Apache)</li>
            <li>Set up custom services</li>
            <li>Install any dependencies</li>
            <li>Run background processes</li>
            <li>Debug directly in production</li>
        </ul>
        <p>Good when you need precise control or custom configurations.</p>
        
        <h3>Use Both</h3>
        <p>Most people use the dashboard for everyday tasks and SSH when they need it. You're not locked into one approach.</p>
        
        <div class="info-box">
            <h3>Managed Infrastructure</h3>
            <p>While you have full control, we handle the foundational maintenance:</p>
            <ul style="margin-bottom: 0;">
                <li><strong>Security updates:</strong> Operating system patches applied automatically</li>
                <li><strong>Daily backups:</strong> Server snapshots every 24 hours</li>
                <li><strong>Uptime monitoring:</strong> We're alerted if your server goes down</li>
                <li><strong>DDoS protection:</strong> Network-level protection included</li>
            </ul>
        </div>
        
        <h2>Getting Started</h2>
        <p>Here's the process from signup to deployment:</p>
        
        <ol>
            <li><strong>Choose a plan</strong> - Basic ($25), Priority ($60), or Premium ($120)</li>
            <li><strong>Complete payment</strong> - Secure checkout via Stripe</li>
            <li><strong>Server provisioning</strong> - Takes about 60 seconds</li>
            <li><strong>Receive credentials</strong> - Dashboard access and SSH details via email</li>
            <li><strong>Deploy</strong> - Use the dashboard or SSH directly</li>
        </ol>
        
        <p>Your server is live immediately. No approval process, no configuration maze.</p>
        
        <h2>Technical Stack</h2>
        <p>Full transparency on our infrastructure:</p>
        
        <ul>
            <li><strong>Cloud Provider:</strong> DigitalOcean data centers</li>
            <li><strong>Operating System:</strong> Ubuntu LTS (long-term support)</li>
            <li><strong>Dashboard:</strong> Custom Node.js application</li>
            <li><strong>Payment Processing:</strong> Stripe</li>
            <li><strong>Monitoring:</strong> Open-source tooling</li>
        </ul>
        
        <div class="info-box">
            <h3>Open Source</h3>
            <p>The dashboard and deployment tools are open source:</p>
            <ul style="margin-bottom: 0;">
                <li>Review the code and understand how everything works</li>
                <li>Contribute improvements or report issues</li>
                <li>Fork it and modify for your needs</li>
                <li>Verify security practices</li>
            </ul>real provisioning)
    if (existingServer.rows.length === 0) {
      const plan = req.query.plan || 'basic';
      await createReal
        <h2>Who This Works For</h2>
        <p>Basement is designed for:</p>
        <ul>
            <li>Solo developers deploying projects</li>
            <li>Students learning production deployment</li>
            <li>Indie founders running applications</li>
            <li>Small to medium teams wanting server control without infrastructure management</li>
            <li>Anyone comfortable with basic Linux commands</li>
        </ul>
        
        <p><strong>Note:</strong> We're a small team building and expanding features over time. The infrastructure can support enterprise workloads, but our feature set and support capacity are currently focused on smaller deployments as we grow.</p>
        
        <h2>Pricing Structure</h2>
        <p>Three tiers based on server resources and support level:</p>
        
        <p><strong>Basic ($25/mo):</strong> 1 GB RAM, 1 CPU, 25 GB storage. Email support with 48-hour response. Suitable for static sites, small APIs, personal projects.</p>
        
        <p><strong>Priority ($60/mo):</strong> 2 GB RAM, 2 CPUs, 50 GB storage. Priority support with 12-hour response, SSL automation, staging environments. Suitable for production applications.</p>
        
        <p><strong>Premium ($120/mo):</strong> 4 GB RAM, 2 CPUs, 80 GB storage. Direct chat support, deployment assistance, performance optimization. Suitable for revenue-generating applications.</p>
        
        <p><strong>No usage charges.</strong> Your monthly bill is capped at your plan price. No surprise bandwidth or storage overages.</p>
        
        <h2>Support Approach</h2>
        <p>Documentation-first support model:</p>
        <ul>
            <li>Comprehensive guides (including this page)</li>
            <li>FAQ covering common questions</li>
            <li>GitHub discussions for community help</li>
            <li>Open issues for bug reports</li>
        </ul>
        
        <p>Email support included with all plans. Higher tiers provide faster response times and direct chat access for urgent issues.</p>
        
        <div class="cta-box">
            <h2>Ready to Get Started?</h2>
            <p>All plans include a 14-day money-back guarantee.</p>
            <a href="/pricing" class="btn primary">View Pricing</a>
            <a href="/contact" class="btn">Contact Us</a>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
});

// Payment Success page
app.get('/payment-success', requireAuth, async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    
    // Check if user already has a server
    const existingServer = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [req.session.userId]
    );

    // If no server exists, create one (real provisioning)
    if (existingServer.rows.length === 0) {
      const plan = req.query.plan || 'basic';
      
      // Get the checkout session to retrieve the charge ID
      let chargeId = null;
      if (sessionId) {
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent']
          });
          
          // Get charge ID from payment intent
          if (session.payment_intent && typeof session.payment_intent === 'object') {
            const paymentIntent = session.payment_intent;
            if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
              chargeId = paymentIntent.charges.data[0].id;
              console.log('Retrieved charge ID:', chargeId);
            }
          }
        } catch (stripeError) {
          console.error('Error retrieving session:', stripeError.message);
        }
      }
      
      await createRealServer(req.session.userId, plan, chargeId);
    }

  } catch (error) {
    console.error('Error creating server:', error);
  }

  res.send(`
${getHTMLHead('Payment Successful - Basement')}
    <link rel="stylesheet" href="/css/payment.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="success-container">
        <div class="success-card">
            <div class="success-icon">✓</div>
            <h1>Payment Successful!</h1>
            <p class="subtitle">Thank you for your purchase. Your payment has been processed successfully.</p>
            
            <div class="info-box">
                <h3>What's Next?</h3>
                <p><strong>Confirmation Email:</strong> You'll receive a confirmation email at ${req.session.userEmail || 'your registered email'} with your receipt and order details.</p>
                <p><strong>Access:</strong> Your services are now active. You can access them immediately from your dashboard.</p>
                <p><strong>Support:</strong> If you have any questions, our support team is ready to help you get started.</p>
            </div>
            
            <div class="btn-group">
                <a href="/dashboard" class="btn primary">Go to Dashboard</a>
                <a href="/" class="btn">Back to Home</a>
            </div>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
});

// Payment Cancel page
app.get('/payment-cancel', requireAuth, (req, res) => {
  res.send(`
${getHTMLHead('Payment Cancelled - Basement')}
    <link rel="stylesheet" href="/css/payment.css">
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="cancel-container">
        <div class="cancel-card">
            <div class="cancel-icon">✕</div>
            <h1>Payment Cancelled</h1>
            <p class="subtitle">Your payment was cancelled and no charges were made to your account.</p>
            
            <div class="info-box">
                <h3>What Happened?</h3>
                <p>You cancelled the payment process before it was completed. This is perfectly fine - no charges were processed.</p>
                <p><strong>Need Help?</strong> If you encountered any issues during checkout or have questions about our pricing plans, please don't hesitate to contact us.</p>
                <p><strong>Ready to Try Again?</strong> You can return to the pricing page to select a plan that works for you.</p>
            </div>
            
            <div class="btn-group">
                <a href="/pricing" class="btn primary">View Pricing</a>
                <a href="/contact" class="btn">Contact Support</a>
                <a href="/" class="btn">Back to Home</a>
            </div>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
});

app.get('/pay', requireAuth, csrfProtection, (req, res) => {
  const plan = req.query.plan || 'basic';
  const planConfig = {
    basic: { name: 'Basic Plan', price: 25, description: '1GB RAM, 1 CPU, 25GB SSD - Perfect for small projects' },
    priority: { name: 'Priority Plan', price: 60, description: '2GB RAM, 2 CPUs, 50GB SSD - For production apps' },
    premium: { name: 'Premium Plan', price: 120, description: '4GB RAM, 2 CPUs, 80GB SSD - For serious projects' }
  };
  const selectedPlan = planConfig[plan] || planConfig.basic;
  
  res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Checkout - LocalBiz</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        nav { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); width: 95%; max-width: 1200px; z-index: 1000;
            background: rgba(2, 8, 20, 0.85); backdrop-filter: blur(16px); padding: 16px 32px; border-radius: 8px;
            box-shadow: 0 0 30px rgba(136, 254, 0, 0.12), inset 0 0 0 1px rgba(136, 254, 0, 0.1); }
        nav ul { display: flex; gap: 40px; justify-content: space-between; align-items: center; flex-wrap: wrap; list-style: none; }
        .logo { font-size: 22px; font-weight: 700; color: #cfff90; text-shadow: 0 0 10px rgba(136, 254, 0, 0.5); }
        nav li a { text-transform: uppercase; letter-spacing: 1.5px; color: #8892a0; font-size: 11px; transition: .3s; }
        nav a:hover { color: var(--glow); text-shadow: 0 0 8px var(--glow); }
        
        .checkout-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 120px 5vw 60px; }
        .checkout-card { background: rgba(2, 8, 20, 0.6); border: 1px solid rgba(136, 254, 0, 0.15); border-radius: 8px; 
            padding: 48px; max-width: 500px; width: 100%; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); }
        .checkout-card h1 { font-size: 32px; margin-bottom: 12px; color: var(--glow); text-align: center; }
        .checkout-card .price { font-size: 48px; font-weight: 700; color: #fff; text-align: center; margin: 24px 0; }
        .checkout-card .description { text-align: center; color: #8892a0; font-size: 14px; margin-bottom: 32px; }
        
        .btn { width: 100%; padding: 16px 32px; border: 1px solid var(--glow); background: var(--glow); color: #0a0812; 
            font-family: inherit; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; 
            cursor: pointer; transition: .3s; border-radius: 4px; }
        .btn:hover { box-shadow: 0 0 40px var(--glow); transform: translateY(-2px); }
        .btn:active { transform: translateY(0); }
        
        footer { text-align: center; padding: 40px 5vw; border-top: 1px solid rgba(136, 254, 0, 0.1); color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="checkout-container">
        <div class="checkout-card">
            <h1>${selectedPlan.name}</h1>
            <div class="price">$${selectedPlan.price}<span style="font-size: 20px;">.00</span></div>
            <p class="description">${selectedPlan.description}</p>
            <form action="/create-checkout-session" method="POST">
                <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                <input type="hidden" name="plan" value="${plan}">
                <button type="submit" class="btn">Pay with Stripe</button>
            </form>
        </div>
    </div>
    
    ${getFooter()}
    <script src="https://js.stripe.com/v3/"></script>
</body>
</html>
`);
});

app.post('/create-checkout-session', requireAuth, paymentLimiter, csrfProtection, async (req, res) => {
  try {
    const plan = req.body.plan || 'basic';
    const planPrices = {
      basic: { amount: 2500, name: 'Basic Plan' },
      priority: { amount: 6000, name: 'Priority Plan' },
      premium: { amount: 12000, name: 'Premium Plan' }
    };
    const selectedPlan = planPrices[plan] || planPrices.basic;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: selectedPlan.name,
              description: `${selectedPlan.name} - Monthly subscription`,
            },
            unit_amount: selectedPlan.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/payment-success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/payment-cancel`,
      metadata: {
        plan: plan,
        user_id: req.session.userId
      }
    });
    res.redirect(303, session.url);
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).send('Payment processing error');
  }
});

// Stripe webhook endpoint - MUST be before express.json() middleware
// Webhooks need raw body for signature verification
app.post('/webhook/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  console.log('Received webhook event:', event.type);

  try {
    switch (event.type) {
      case 'charge.refunded':
        const charge = event.data.object;
        console.log('Charge refunded:', charge.id);

        // Find server by charge ID
        const serverResult = await pool.query(
          'SELECT * FROM servers WHERE stripe_charge_id = $1',
          [charge.id]
        );

        if (serverResult.rows.length > 0) {
          const server = serverResult.rows[0];
          console.log(`Found server ${server.id} for refunded charge ${charge.id}`);

          // Find and destroy the DigitalOcean droplet
          try {
            const dropletsResponse = await axios.get('https://api.digitalocean.com/v2/droplets?tag_name=basement-server', {
              headers: {
                'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
                'Content-Type': 'application/json'
              }
            });

            const droplet = dropletsResponse.data.droplets.find(d => 
              d.name.startsWith(`basement-${server.user_id}-`)
            );

            if (droplet) {
              await axios.delete(`https://api.digitalocean.com/v2/droplets/${droplet.id}`, {
                headers: {
                  'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
                  'Content-Type': 'application/json'
                }
              });
              console.log(`Destroyed droplet ${droplet.id} for refunded server ${server.id}`);
            }
          } catch (doError) {
            console.error('DigitalOcean deletion error:', doError.response?.data || doError.message);
          }

          // Delete server from database
          await pool.query('DELETE FROM servers WHERE id = $1', [server.id]);
          console.log(`Deleted server ${server.id} from database due to refund`);
        } else {
          console.log(`No server found for charge ID: ${charge.id}`);
        }
        break;

      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);
        // This is handled by the payment-success redirect already
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({received: true});
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({error: 'Webhook processing failed'});
  }
});

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

// DigitalOcean sync - Check if droplets still exist
async function syncDigitalOceanDroplets() {
  try {
    console.log('[Sync] Starting DigitalOcean droplet sync...');
    
    // Get all servers marked as running
    const result = await pool.query(
      "SELECT * FROM servers WHERE status = 'running'"
    );
    
    if (result.rows.length === 0) {
      console.log('[Sync] No running servers to sync');
      return;
    }
    
    // Get all droplets from DigitalOcean
    const dropletsResponse = await axios.get('https://api.digitalocean.com/v2/droplets?tag_name=basement-server', {
      headers: {
        'Authorization': `Bearer ${process.env.DIGITALOCEAN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const droplets = dropletsResponse.data.droplets;
    const dropletNames = droplets.map(d => d.name);
    
    console.log(`[Sync] Found ${result.rows.length} servers in DB, ${droplets.length} droplets in DO`);
    
    // Check each server
    for (const server of result.rows) {
      const expectedName = `basement-${server.user_id}-`;
      const dropletExists = dropletNames.some(name => name.startsWith(expectedName));
      
      if (!dropletExists) {
        console.log(`[Sync] Droplet missing for server ${server.id} (user ${server.user_id})`);
        
        // Update database - mark as deleted
        await pool.query(
          "UPDATE servers SET status = 'deleted' WHERE id = $1",
          [server.id]
        );
        
        console.log(`[Sync] Updated server ${server.id} status to 'deleted'`);
      }
    }
    
    console.log('[Sync] DigitalOcean sync completed');
  } catch (error) {
    console.error('[Sync] Error syncing droplets:', error.message);
  }
}

// Run sync every hour (3600000 ms)
setInterval(syncDigitalOceanDroplets, 3600000);

// Run sync on startup (after 30 seconds to let server initialize)
setTimeout(syncDigitalOceanDroplets, 30000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));