const express = require('express');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
console.log('🔑 Stripe Key:', process.env.STRIPE_SECRET_KEY?.substring(0, 20) + '...');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db');
const bcrypt = require('bcrypt');

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

// Helper function to generate auth links in nav
function getAuthLinks(req) {
  if (req.session.userId) {
    return '<li><a href="/dashboard">Dashboard</a></li><li><a href="/logout">Logout</a></li>';
  } else {
    return '<li><a href="/login">Login</a></li>';
  }
}

// Helper function to create mock server
async function createMockServer(userId, plan) {
  const specs = {
    basic: { ram: '1 GB', cpu: '1 CPU', storage: '25 GB SSD', bandwidth: '1 TB' },
    priority: { ram: '2 GB', cpu: '2 CPUs', storage: '50 GB SSD', bandwidth: '2 TB' },
    premium: { ram: '4 GB', cpu: '2 CPUs', storage: '80 GB SSD', bandwidth: '4 TB' }
  };

  // Generate fake IP address (192.0.2.x is reserved for documentation)
  const fakeIp = `192.0.2.${Math.floor(Math.random() * 254) + 1}`;
  
  // Generate random password for SSH
  const fakePassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '!@#';

  const result = await pool.query(
    `INSERT INTO servers (user_id, plan, status, ip_address, ssh_username, ssh_password, specs)
     VALUES ($1, $2, 'running', $3, 'ubuntu', $4, $5)
     RETURNING *`,
    [userId, plan, fakeIp, fakePassword, JSON.stringify(specs[plan])]
  );

  return result.rows[0];
}

// Helper function to generate footer HTML
function getFooter() {
  return `
    <footer style="background: rgba(2, 8, 20, 0.8); border-top: 1px solid rgba(136, 254, 0, 0.1); padding: 60px 5vw 30px; margin-top: 80px;">
      <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 40px; margin-bottom: 40px;">
        <div>
          <h3 style="color: var(--glow); font-size: 18px; margin-bottom: 16px; letter-spacing: 1px;">LocalBiz</h3>
          <p style="color: #8892a0; font-size: 13px; line-height: 1.6; margin-bottom: 16px;">Empowering local businesses with modern web solutions and dedicated support.</p>
          <div style="display: flex; gap: 12px; margin-top: 20px;">
            <a href="#" style="width: 36px; height: 36px; border: 1px solid rgba(136, 254, 0, 0.3); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--glow); transition: .3s; text-decoration: none;" onmouseover="this.style.background='var(--glow)'; this.style.color='#0a0812';" onmouseout="this.style.background='transparent'; this.style.color='var(--glow)';">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="#" style="width: 36px; height: 36px; border: 1px solid rgba(136, 254, 0, 0.3); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--glow); transition: .3s; text-decoration: none;" onmouseover="this.style.background='var(--glow)'; this.style.color='#0a0812';" onmouseout="this.style.background='transparent'; this.style.color='var(--glow)';">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            </a>
            <a href="#" style="width: 36px; height: 36px; border: 1px solid rgba(136, 254, 0, 0.3); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--glow); transition: .3s; text-decoration: none;" onmouseover="this.style.background='var(--glow)'; this.style.color='#0a0812';" onmouseout="this.style.background='transparent'; this.style.color='var(--glow)';">
              <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          </div>
        </div>
        
        <div>
          <h4 style="color: #e0e6f0; font-size: 14px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">Quick Links</h4>
          <ul style="list-style: none; padding: 0;">
            <li style="margin-bottom: 10px;"><a href="/" style="color: #8892a0; font-size: 13px; text-decoration: none; transition: .3s;" onmouseover="this.style.color='var(--glow)'" onmouseout="this.style.color='#8892a0'">Home</a></li>
            <li style="margin-bottom: 10px;"><a href="/about" style="color: #8892a0; font-size: 13px; text-decoration: none; transition: .3s;" onmouseover="this.style.color='var(--glow)'" onmouseout="this.style.color='#8892a0'">About</a></li>
            <li style="margin-bottom: 10px;"><a href="/pricing" style="color: #8892a0; font-size: 13px; text-decoration: none; transition: .3s;" onmouseover="this.style.color='var(--glow)'" onmouseout="this.style.color='#8892a0'">Pricing</a></li>
            <li style="margin-bottom: 10px;"><a href="/contact" style="color: #8892a0; font-size: 13px; text-decoration: none; transition: .3s;" onmouseover="this.style.color='var(--glow)'" onmouseout="this.style.color='#8892a0'">Contact</a></li>
            <li style="margin-bottom: 10px;"><a href="/faq" style="color: #8892a0; font-size: 13px; text-decoration: none; transition: .3s;" onmouseover="this.style.color='var(--glow)'" onmouseout="this.style.color='#8892a0'">FAQ</a></li>
          </ul>
        </div>
        
        <div>
          <h4 style="color: #e0e6f0; font-size: 14px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">Legal</h4>
          <ul style="list-style: none; padding: 0;">
            <li style="margin-bottom: 10px;"><a href="/privacy" style="color: #8892a0; font-size: 13px; text-decoration: none; transition: .3s;" onmouseover="this.style.color='var(--glow)'" onmouseout="this.style.color='#8892a0'">Privacy Policy</a></li>
            <li style="margin-bottom: 10px;"><a href="/terms" style="color: #8892a0; font-size: 13px; text-decoration: none; transition: .3s;" onmouseover="this.style.color='var(--glow)'" onmouseout="this.style.color='#8892a0'">Terms of Service</a></li>
          </ul>
        </div>
        
        <div>
          <h4 style="color: #e0e6f0; font-size: 14px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px;">Contact</h4>
          <p style="color: #8892a0; font-size: 13px; line-height: 1.8; margin-bottom: 8px;">Email: <a href="mailto:support@localbiz.com" style="color: var(--glow); text-decoration: none;">support@localbiz.com</a></p>
          <p style="color: #8892a0; font-size: 13px; line-height: 1.8; margin-bottom: 8px;">Response Time: 24-48hrs</p>
          <p style="color: #8892a0; font-size: 13px; line-height: 1.8;">Available Mon-Fri, 9AM-5PM EST</p>
        </div>
      </div>
      
      <div style="border-top: 1px solid rgba(136, 254, 0, 0.1); padding-top: 24px; text-align: center;">
        <p style="color: #666; font-size: 12px;">&copy; 2026 LocalBiz. All rights reserved.</p>
      </div>
    </footer>
  `;
}

// Helper function to generate responsive nav HTML
function getResponsiveNav(req) {
  return `
    <nav>
        <div class="nav-container">
            <div class="logo">LocalBiz</div>
            <button class="hamburger" aria-label="Toggle menu">
                <span></span>
                <span></span>
                <span></span>
            </button>
            <ul class="nav-links">
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/docs">Docs</a></li>
                <li><a href="/pricing">Pricing</a></li>
                <li><a href="/contact">Contact</a></li>
                ${getAuthLinks(req)}
            </ul>
        </div>
    </nav>
    
    <style>
        nav { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); width: 95%; max-width: 1200px; z-index: 1000;
            background: rgba(2, 8, 20, 0.85); backdrop-filter: blur(16px) saturate(120%); padding: 16px 32px; border-radius: 8px;
            box-shadow: 0 0 30px rgba(136, 254, 0, 0.12), inset 0 0 0 1px rgba(136, 254, 0, 0.1); }
        .nav-container { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .logo { font-size: 22px; font-weight: 700; color: #cfff90; text-shadow: 0 0 10px rgba(136, 254, 0, 0.5); flex-shrink: 0; }
        .hamburger { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 8px; 
            flex-shrink: 0; z-index: 1001; margin-left: auto; width: 41px; height: 41px; justify-content: center; align-items: center; }
        .hamburger span { width: 25px; height: 2px; background: var(--glow); transition: .3s; display: block; }
        .hamburger.active span:nth-child(1) { transform: rotate(45deg) translate(7px, 7px); }
        .hamburger.active span:nth-child(2) { opacity: 0; }
        .hamburger.active span:nth-child(3) { transform: rotate(-45deg) translate(7px, -7px); }
        
        .nav-links { display: flex; gap: 40px; list-style: none; margin: 0; padding: 0; }
        .nav-links li a { text-transform: uppercase; letter-spacing: 1.5px; color: #8892a0; font-size: 11px; transition: .3s; text-decoration: none; }
        .nav-links a:hover { color: var(--glow); text-shadow: 0 0 8px var(--glow); }
        
        @media (max-width: 768px) {
            nav { top: 0; left: 0; transform: none; width: 100%; border-radius: 0; padding: 16px 20px; max-width: 100%; }
            .nav-container { width: 100%; }
            .hamburger { display: flex; }
            .nav-links { position: fixed; top: 0; right: -100%; width: 280px; height: 100vh; flex-direction: column; 
                background: rgba(2, 8, 20, 0.98); padding: 80px 30px 30px; gap: 24px; transition: right 0.3s ease;
                box-shadow: -5px 0 30px rgba(0, 0, 0, 0.5); z-index: 1000; }
            .nav-links.active { right: 0; }
            .nav-links li a { font-size: 14px; display: block; padding: 12px 0; }
        }
    </style>
    
    <script>
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        
        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('nav')) {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            }
        });
    </script>
  `;
}

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Basement - Cloud Hosting Without the Headache</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; scroll-behavior: smooth; --glow: #88FE00; }
        ul li, ol li { list-style: none; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .hero { padding: 180px 5vw 120px; text-align: center; position: relative; overflow: hidden; }
        .hero h1 { font-size: clamp(36px, 8vw, 72px); font-weight: 700; line-height: 1.1; letter-spacing: -2px; margin-bottom: 20px;
            background: linear-gradient(180deg, #fff 0%, #cfff90 100%); -webkit-background-clip: text; background-clip: text; color: transparent;
            text-shadow: 0 0 20px rgba(136, 254, 0, 0.3); }
        .hero .sub { font-size: 18px; color: #8892a0; max-width: 600px; margin: 0 auto 40px; line-height: 1.6; }
        .cta-group { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin-top: 40px; }
        
        .btn { padding: 14px 32px; border: 1px solid var(--glow); background: transparent; color: var(--glow); font-family: inherit;
            font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; cursor: pointer; position: relative; overflow: hidden;
            transition: .3s; border-radius: 4px; text-decoration: none; display: inline-block; }
        .btn:hover { background: var(--glow); color: #0a0812; box-shadow: 0 0 25px var(--glow); }
        .btn:active { transform: scale(0.98); }
        .btn.primary { background: var(--glow); color: #0a0812; font-weight: 600; }
        .btn.primary:hover { box-shadow: 0 0 40px var(--glow); }
        
        footer { text-align: center; padding: 60px 5vw 40px; border-top: 1px solid rgba(136, 254, 0, 0.1); color: #666; font-size: 12px; }
        
        @media (max-width: 768px) {
            .hero { padding-top: 140px; }
        }
    </style>
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
</body>
</html>
  `);
});
app.get('/about', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About Us - LocalBiz</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .content { padding: 140px 5vw 60px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 42px; margin-bottom: 16px; color: var(--glow); }
        p { color: #8892a0; font-size: 15px; line-height: 1.8; margin-bottom: 20px; }
        .link-back { display: inline-block; margin-top: 32px; padding: 12px 24px; border: 1px solid var(--glow); color: var(--glow);
            font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 4px; transition: .3s; }
        .link-back:hover { background: var(--glow); color: #0a0812; box-shadow: 0 0 25px var(--glow); }
        
        .profile-img { width: 120px; height: 120px; border-radius: 50%; border: 2px solid var(--glow); 
            background: rgba(2, 8, 20, 0.6); display: block; margin: 40px auto 0; 
            box-shadow: 0 0 30px rgba(136, 254, 0, 0.2); object-fit: cover; }
        
        footer { text-align: center; padding: 40px 5vw; border-top: 1px solid rgba(136, 254, 0, 0.1); color: #666; font-size: 12px; }
    </style>
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
</body>
</html>
  `);
});

// Register route (GET)
app.get('/register', csrfProtection, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - LocalBiz</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
        .auth-card { background: rgba(2, 8, 20, 0.6); border: 1px solid rgba(136, 254, 0, 0.15); border-radius: 8px; 
            padding: 48px; max-width: 450px; width: 100%; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); }
        h1 { font-size: 32px; margin-bottom: 24px; color: var(--glow); text-align: center; }
        
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8892a0; margin-bottom: 8px; }
        input { width: 100%; padding: 12px 16px; background: rgba(2, 8, 20, 0.8); border: 1px solid rgba(136, 254, 0, 0.2); 
            border-radius: 4px; color: #e0e6f0; font-family: inherit; font-size: 14px; transition: .3s; }
        input:focus { outline: none; border-color: var(--glow); box-shadow: 0 0 15px rgba(136, 254, 0, 0.2); }
        
        .btn { width: 100%; padding: 14px; border: none; background: var(--glow); color: #0a0812; 
            font-family: inherit; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; 
            cursor: pointer; transition: .3s; border-radius: 4px; margin-top: 8px; }
        .btn:hover { box-shadow: 0 0 40px var(--glow); transform: translateY(-2px); }
        
        .link { display: block; text-align: center; margin-top: 20px; color: #8892a0; font-size: 13px; }
        .link a { color: var(--glow); text-decoration: none; }
        .link a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    
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
</body>
</html>
  `);
});
app.get('/contact', csrfProtection, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact - LocalBiz</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
    a { text-decoration: none; color: inherit; }
    
    .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
        repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
        repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
    
    .contact-container { min-height: 100vh; padding: 140px 5vw 60px; max-width: 700px; margin: 0 auto; }
    h1 { font-size: 42px; margin-bottom: 16px; color: var(--glow); }
    .subtitle { color: #8892a0; font-size: 15px; margin-bottom: 40px; }
    
    form { background: rgba(2, 8, 20, 0.6); border: 1px solid rgba(136, 254, 0, 0.15); border-radius: 8px; padding: 40px; }
    label { display: block; margin-bottom: 24px; }
    label span { display: block; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--glow); }
    input, textarea { width: 100%; padding: 12px 16px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(136, 254, 0, 0.2); 
        border-radius: 4px; color: #e0e6f0; font-family: inherit; font-size: 14px; transition: .3s; }
    input:focus, textarea:focus { outline: none; border-color: var(--glow); box-shadow: 0 0 10px rgba(136, 254, 0, 0.2); }
    textarea { min-height: 150px; resize: vertical; }
    
    button { width: 100%; padding: 16px; background: var(--glow); color: #0a0812; border: none; border-radius: 4px; 
        font-family: inherit; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; 
        cursor: pointer; transition: .3s; }
    button:hover { box-shadow: 0 0 30px var(--glow); transform: translateY(-2px); }
    button:active { transform: translateY(0); }
    
    footer { text-align: center; padding: 40px 5vw; border-top: 1px solid rgba(136, 254, 0, 0.1); color: #666; font-size: 12px; }
  </style>
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
</body>
</html>
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
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - LocalBiz</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .auth-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; padding-top: 100px; }
        .auth-card { background: rgba(2, 8, 20, 0.6); border: 1px solid rgba(136, 254, 0, 0.15); border-radius: 8px; 
            padding: 48px; max-width: 450px; width: 100%; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); }
        h1 { font-size: 32px; margin-bottom: 24px; color: var(--glow); text-align: center; }
        
        .form-group { margin-bottom: 20px; }
        label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #8892a0; margin-bottom: 8px; }
        input { width: 100%; padding: 12px 16px; background: rgba(2, 8, 20, 0.8); border: 1px solid rgba(136, 254, 0, 0.2); 
            border-radius: 4px; color: #e0e6f0; font-family: inherit; font-size: 14px; transition: .3s; }
        input:focus { outline: none; border-color: var(--glow); box-shadow: 0 0 15px rgba(136, 254, 0, 0.2); }
        
        .btn { width: 100%; padding: 14px; border: none; background: var(--glow); color: #0a0812; 
            font-family: inherit; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; 
            cursor: pointer; transition: .3s; border-radius: 4px; margin-top: 8px; }
        .btn:hover { box-shadow: 0 0 40px var(--glow); transform: translateY(-2px); }
        
        .message { background: rgba(136, 254, 0, 0.1); border: 1px solid rgba(136, 254, 0, 0.3); color: var(--glow); 
            padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 13px; text-align: center; }
        
        .error { background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.3); color: rgba(255, 120, 120, 0.9); 
            padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 13px; text-align: center; }
        
        .link { display: block; text-align: center; margin-top: 20px; color: #8892a0; font-size: 13px; }
        .link a { color: var(--glow); text-decoration: none; }
        .link a:hover { text-decoration: underline; }
    </style>
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
</body>
</html>
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

// Dashboard route
app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // Get user's server info
    const serverResult = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [req.session.userId]
    );

    if (serverResult.rows.length === 0) {
      return res.redirect('/pricing?message=Please select a plan to get started');
    }

    const server = serverResult.rows[0];
    const specs = typeof server.specs === 'string' ? JSON.parse(server.specs) : server.specs;

    res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Basement</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .content { padding: 140px 5vw 60px; max-width: 1200px; margin: 0 auto; }
        h1 { font-size: 42px; margin-bottom: 32px; color: var(--glow); }
        
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 32px; }
        
        .card { background: rgba(2, 8, 20, 0.6); border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 8px; padding: 24px; }
        .card h2 { font-size: 18px; color: var(--glow); margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; }
        .card p { color: #8892a0; font-size: 14px; line-height: 1.8; margin-bottom: 12px; }
        .card p:last-child { margin-bottom: 0; }
        
        .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .status.running { background: rgba(136, 254, 0, 0.2); color: var(--glow); }
        .status.stopped { background: rgba(255, 68, 68, 0.2); color: #ff4444; }
        
        .copy-box { background: rgba(136, 254, 0, 0.05); border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 4px; 
            padding: 12px; margin: 12px 0; font-family: 'Courier New', monospace; font-size: 13px; display: flex; 
            justify-content: space-between; align-items: center; }
        .copy-btn { background: var(--glow); color: #0a0812; border: none; padding: 6px 12px; border-radius: 4px; 
            cursor: pointer; font-size: 11px; font-weight: 600; text-transform: uppercase; transition: .3s; }
        .copy-btn:hover { box-shadow: 0 0 15px var(--glow); }
        
        .btn { display: inline-block; padding: 12px 24px; border: 1px solid var(--glow); background: transparent; 
            color: var(--glow); font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; cursor: pointer; 
            border-radius: 4px; transition: .3s; margin-right: 12px; text-decoration: none; }
        .btn:hover { background: var(--glow); color: #0a0812; box-shadow: 0 0 25px var(--glow); }
        
        .resource-item { margin-bottom: 20px; }
        .resource-item:last-child { margin-bottom: 0; }
        .resource-label { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
        .resource-label span:first-child { color: #8892a0; }
        .resource-label span:last-child { color: var(--glow); font-weight: 600; }
        .progress-bar { height: 8px; background: rgba(136, 254, 0, 0.1); border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, var(--glow), #cfff90); border-radius: 4px; transition: width 0.3s; }
    </style>
</head>
<body>
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="content">
        <h1>Dashboard</h1>
        
        <div class="dashboard-grid">
            <div class="card">
                <h2>Server Status</h2>
                <p><span class="status ${server.status}">${server.status}</span></p>
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
            <button class="btn" disabled>Restart Server</button>
            <button class="btn" disabled>View Logs</button>
            <p style="margin-top: 16px; font-size: 12px; color: #666;">Controls coming soon</p>
        </div>
    </div>
    
    ${getFooter()}
    
    <script>
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Copied to clipboard!');
            });
        }
    </script>
</body>
</html>
    `);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('An error occurred loading your dashboard');
  }
});

// route for privacy policy (next)

app.get('/pricing', (req, res) => res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pricing - LocalBiz</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; scroll-behavior: smooth; --glow: #88FE00; }
        ul li, ol li { list-style: none; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .page-header { padding: 160px 5vw 80px; text-align: center; max-width: 800px; margin: 0 auto; }
        .page-header h1 { font-size: clamp(32px, 6vw, 56px); font-weight: 700; letter-spacing: -2px; margin-bottom: 16px; color: var(--glow); }
        .page-header p { color: #8892a0; font-size: 15px; line-height: 1.7; }
        
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; padding: 40px 5vw 80px; max-width: 1200px; margin: 0 auto; }
        .plan { background: rgba(2, 8, 20, 0.6); border: 1px solid rgba(136, 254, 0, 0.15); border-radius: 8px; padding: 40px 32px;
            position: relative; transition: .3s; display: flex; flex-direction: column; }
        .plan:hover { transform: translateY(-8px); box-shadow: 0 15px 50px rgba(136, 254, 0, 0.18); }
        .plan.featured { border-color: var(--glow); box-shadow: 0 0 40px rgba(136, 254, 0, 0.2); }
        .plan-header { border-bottom: 1px solid rgba(136, 254, 0, 0.2); padding-bottom: 24px; margin-bottom: 24px; }
        .plan-name { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--glow); margin-bottom: 8px; }
        .plan-price { font-size: 42px; font-weight: 700; color: #fff; margin: 8px 0; }
        .plan-cycle { font-size: 12px; color: #8892a0; }
        .plan-features { flex-grow: 1; margin: 24px 0; }
        .plan-features li { padding: 10px 0; color: #8892a0; font-size: 13px; position: relative; padding-left: 24px; }
        .plan-features li::before { content: '> '; position: absolute; left: 0; color: var(--glow); }
        .plan-features li.highlight { color: #e0e6f0; font-weight: 500; }
        .plan-features li.highlight::before { content: '+ '; color: var(--glow); text-shadow: 0 0 8px var(--glow); font-weight: 700; }
        .plan-features li.divider { color: #666; font-size: 12px; font-style: italic; margin-top: 12px; padding-top: 12px; 
            border-top: 1px solid rgba(136, 254, 0, 0.1); }
        .plan-features li.divider::before { content: ''; }
        
        .btn { width: 100%; padding: 14px 32px; border: 1px solid var(--glow); background: transparent; color: var(--glow); 
            font-family: inherit; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; cursor: pointer; 
            transition: .3s; border-radius: 4px; margin-top: auto; }
        .btn:hover { background: var(--glow); color: #0a0812; box-shadow: 0 0 25px var(--glow); }
        .btn.primary { background: var(--glow); color: #0a0812; font-weight: 600; }
        .btn.primary:hover { box-shadow: 0 0 40px var(--glow); }
        
        footer { text-align: center; padding: 60px 5vw 40px; border-top: 1px solid rgba(136, 254, 0, 0.1); color: #666; font-size: 12px; }
    </style>
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
</body>
</html>
`));

app.get('/terms', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - LocalBiz</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .content { padding: 140px 5vw 60px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 42px; margin-bottom: 16px; color: var(--glow); }
        p { color: #8892a0; font-size: 15px; line-height: 1.8; margin-bottom: 20px; }
        .link-back { display: inline-block; margin-top: 32px; padding: 12px 24px; border: 1px solid var(--glow); color: var(--glow);
            font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 4px; transition: .3s; }
        .link-back:hover { background: var(--glow); color: #0a0812; box-shadow: 0 0 25px var(--glow); }
        
        footer { text-align: center; padding: 40px 5vw; border-top: 1px solid rgba(136, 254, 0, 0.1); color: #666; font-size: 12px; }
    </style>
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
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - LocalBiz</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .content { padding: 140px 5vw 60px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 42px; margin-bottom: 16px; color: var(--glow); }
        h2 { font-size: 24px; margin-top: 32px; margin-bottom: 12px; color: #e0e6f0; }
        p { color: #8892a0; font-size: 15px; line-height: 1.8; margin-bottom: 20px; }
        ul { color: #8892a0; font-size: 15px; line-height: 1.8; margin-bottom: 20px; margin-left: 24px; }
        li { margin-bottom: 8px; }
        .link-back { display: inline-block; margin-top: 32px; padding: 12px 24px; border: 1px solid var(--glow); color: var(--glow);
            font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 4px; transition: .3s; }
        .link-back:hover { background: var(--glow); color: #0a0812; box-shadow: 0 0 25px var(--glow); }
        
        footer { text-align: center; padding: 40px 5vw; border-top: 1px solid rgba(136, 254, 0, 0.1); color: #666; font-size: 12px; }
    </style>
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
</body>
</html>
  `);
});

// FAQ page
app.get('/faq', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FAQ - LocalBiz</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .content { padding: 140px 5vw 60px; max-width: 900px; margin: 0 auto; }
        h1 { font-size: 48px; margin-bottom: 16px; color: var(--glow); text-align: center; }
        .subtitle { text-align: center; color: #8892a0; font-size: 16px; margin-bottom: 60px; }
        
        .faq-section { margin-bottom: 48px; }
        .section-title { font-size: 24px; color: var(--glow); margin-bottom: 24px; text-transform: uppercase; 
            letter-spacing: 2px; border-bottom: 1px solid rgba(136, 254, 0, 0.2); padding-bottom: 12px; }
        
        .faq-item { background: rgba(2, 8, 20, 0.4); border: 1px solid rgba(136, 254, 0, 0.1); border-radius: 6px; 
            margin-bottom: 16px; overflow: hidden; transition: .3s; }
        .faq-item:hover { border-color: rgba(136, 254, 0, 0.3); }
        
        .faq-question { padding: 20px 24px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; 
            user-select: none; transition: .3s; }
        .faq-question:hover { background: rgba(136, 254, 0, 0.05); }
        .faq-question h3 { font-size: 16px; color: #e0e6f0; font-weight: 500; }
        .faq-toggle { color: var(--glow); font-size: 24px; font-weight: 300; transition: .3s; }
        .faq-item.active .faq-toggle { transform: rotate(45deg); }
        
        .faq-answer { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; }
        .faq-answer-content { padding: 0 24px 20px; color: #8892a0; font-size: 14px; line-height: 1.8; }
        .faq-answer-content p { margin-bottom: 12px; }
        .faq-answer-content ul { margin-left: 20px; margin-bottom: 12px; }
        .faq-answer-content li { margin-bottom: 8px; }
        .faq-answer-content a { color: var(--glow); text-decoration: underline; }
        
        .cta-box { background: rgba(136, 254, 0, 0.05); border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 8px; 
            padding: 32px; text-align: center; margin-top: 60px; }
        .cta-box h2 { font-size: 24px; color: var(--glow); margin-bottom: 12px; }
        .cta-box p { color: #8892a0; font-size: 15px; margin-bottom: 24px; }
        .btn { display: inline-block; padding: 14px 28px; border: 1px solid var(--glow); color: var(--glow); 
            font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; 
            border-radius: 4px; transition: .3s; }
        .btn:hover { background: var(--glow); color: #0a0812; box-shadow: 0 0 40px var(--glow); transform: translateY(-2px); }
        
        footer { text-align: center; padding: 40px 5vw; border-top: 1px solid rgba(136, 254, 0, 0.1); color: #666; font-size: 12px; }
    </style>
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
    
    <script>
        function toggleFaq(element) {
            const item = element.parentElement;
            const answer = item.querySelector('.faq-answer');
            const isActive = item.classList.contains('active');
            
            // Close all other FAQs
            document.querySelectorAll('.faq-item').forEach(faq => {
                faq.classList.remove('active');
                faq.querySelector('.faq-answer').style.maxHeight = null;
            });
            
            // Toggle current FAQ
            if (!isActive) {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        }
    </script>
</body>
</html>
  `);
});

// Documentation page
app.get('/docs', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation - Basement</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .content { padding: 140px 5vw 60px; max-width: 900px; margin: 0 auto; }
        h1 { font-size: 48px; margin-bottom: 16px; color: var(--glow); }
        .subtitle { color: #8892a0; font-size: 18px; margin-bottom: 60px; line-height: 1.6; }
        
        h2 { font-size: 28px; margin-top: 48px; margin-bottom: 16px; color: #e0e6f0; }
        h3 { font-size: 20px; margin-top: 32px; margin-bottom: 12px; color: var(--glow); }
        p { color: #8892a0; font-size: 15px; line-height: 1.8; margin-bottom: 20px; }
        
        ul, ol { color: #8892a0; font-size: 15px; line-height: 1.8; margin-bottom: 20px; margin-left: 24px; }
        li { margin-bottom: 12px; }
        
        code { background: rgba(136, 254, 0, 0.1); color: var(--glow); padding: 2px 8px; border-radius: 3px; font-size: 14px; }
        
        .info-box { background: rgba(136, 254, 0, 0.05); border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 6px; 
            padding: 24px; margin: 32px 0; }
        .info-box h3 { margin-top: 0; }
        
        .cta-box { background: rgba(136, 254, 0, 0.05); border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 8px; 
            padding: 32px; text-align: center; margin-top: 60px; }
        .cta-box h2 { margin-top: 0; font-size: 24px; color: var(--glow); margin-bottom: 12px; }
        .cta-box p { margin-bottom: 24px; }
        .btn { display: inline-block; padding: 14px 28px; border: 1px solid var(--glow); color: var(--glow); 
            font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; 
            border-radius: 4px; transition: .3s; margin: 0 8px; }
        .btn:hover { background: var(--glow); color: #0a0812; box-shadow: 0 0 40px var(--glow); transform: translateY(-2px); }
        .btn.primary { background: var(--glow); color: #0a0812; }
    </style>
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
            </ul>
            <p style="margin-top: 16px; margin-bottom: 0;"><a href="#" style="color: var(--glow); text-decoration: underline;">View source on GitHub →</a></p>
        </div>
        
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
</body>
</html>
  `);
});

// Payment Success page
app.get('/payment-success', requireAuth, async (req, res) => {
  try {
    // Check if user already has a server
    const existingServer = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1',
      [req.session.userId]
    );

    // If no server exists, create one (mock for now)
    if (existingServer.rows.length === 0) {
      const plan = req.query.plan || 'basic'; // Get plan from query param
      await createMockServer(req.session.userId, plan);
    }

  } catch (error) {
    console.error('Error creating server:', error);
  }

  res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Successful - LocalBiz</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .success-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; padding-top: 100px; }
        .success-card { background: rgba(2, 8, 20, 0.6); border: 1px solid rgba(136, 254, 0, 0.3); border-radius: 8px; 
            padding: 60px 48px; max-width: 600px; width: 100%; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); text-align: center; }
        
        .success-icon { width: 80px; height: 80px; margin: 0 auto 24px; border-radius: 50%; border: 3px solid var(--glow); 
            display: flex; align-items: center; justify-content: center; font-size: 48px; color: var(--glow); 
            box-shadow: 0 0 30px rgba(136, 254, 0, 0.3); animation: pulse 2s infinite; }
        
        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 30px rgba(136, 254, 0, 0.3); }
            50% { box-shadow: 0 0 50px rgba(136, 254, 0, 0.6); }
        }
        
        h1 { font-size: 36px; margin-bottom: 16px; color: var(--glow); }
        .subtitle { color: #8892a0; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
        
        .info-box { background: rgba(136, 254, 0, 0.05); border: 1px solid rgba(136, 254, 0, 0.2); border-radius: 6px; 
            padding: 24px; margin-bottom: 32px; text-align: left; }
        .info-box h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--glow); margin-bottom: 16px; }
        .info-box p { color: #8892a0; font-size: 14px; line-height: 1.8; margin-bottom: 12px; }
        .info-box p:last-child { margin-bottom: 0; }
        
        .btn-group { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
        .btn { padding: 14px 28px; border: 1px solid var(--glow); color: var(--glow); font-family: inherit; 
            font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; 
            cursor: pointer; transition: .3s; border-radius: 4px; display: inline-block; }
        .btn:hover { background: var(--glow); color: #0a0812; box-shadow: 0 0 40px var(--glow); transform: translateY(-2px); }
        .btn.primary { background: var(--glow); color: #0a0812; }
        .btn.primary:hover { box-shadow: 0 0 50px var(--glow); }
        
        footer { text-align: center; padding: 40px 5vw; color: #666; font-size: 12px; }
    </style>
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
</body>
</html>
  `);
});

// Payment Cancel page
app.get('/payment-cancel', requireAuth, (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Cancelled - LocalBiz</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { background: #0a0812; color: #e0e6f0; font-family: 'JetBrains Mono', monospace; --glow: #88FE00; }
        a { text-decoration: none; color: inherit; }
        
        .matrix-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -2; opacity: 0.04; pointer-events: none; background: 
            repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px),
            repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(136, 254, 0, 0.03) 1px, rgba(136, 254, 0, 0.03) 2px); }
        
        .cancel-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 20px; padding-top: 100px; }
        .cancel-card { background: rgba(2, 8, 20, 0.6); border: 1px solid rgba(136, 254, 0, 0.15); border-radius: 8px; 
            padding: 60px 48px; max-width: 600px; width: 100%; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); text-align: center; }
        
        .cancel-icon { width: 80px; height: 80px; margin: 0 auto 24px; border-radius: 50%; border: 3px solid rgba(255, 159, 28, 0.6); 
            display: flex; align-items: center; justify-content: center; font-size: 48px; color: rgba(255, 159, 28, 0.8); 
            box-shadow: 0 0 30px rgba(255, 159, 28, 0.2); }
        
        h1 { font-size: 36px; margin-bottom: 16px; color: #e0e6f0; }
        .subtitle { color: #8892a0; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
        
        .info-box { background: rgba(136, 254, 0, 0.03); border: 1px solid rgba(136, 254, 0, 0.1); border-radius: 6px; 
            padding: 24px; margin-bottom: 32px; text-align: left; }
        .info-box h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: var(--glow); margin-bottom: 16px; }
        .info-box p { color: #8892a0; font-size: 14px; line-height: 1.8; margin-bottom: 12px; }
        .info-box p:last-child { margin-bottom: 0; }
        
        .btn-group { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
        .btn { padding: 14px 28px; border: 1px solid var(--glow); color: var(--glow); font-family: inherit; 
            font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; 
            cursor: pointer; transition: .3s; border-radius: 4px; display: inline-block; }
        .btn:hover { background: var(--glow); color: #0a0812; box-shadow: 0 0 40px var(--glow); transform: translateY(-2px); }
        .btn.primary { background: var(--glow); color: #0a0812; }
        .btn.primary:hover { box-shadow: 0 0 50px var(--glow); }
        
        footer { text-align: center; padding: 40px 5vw; color: #666; font-size: 12px; }
    </style>
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
</body>
</html>
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
      success_url: `${req.protocol}://${req.get('host')}/payment-success?plan=${plan}`,
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));