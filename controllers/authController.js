const bcrypt = require('bcrypt');
const path = require('path');
const crypto = require('crypto');
const pool = require('../db');
const { validationResult } = require('express-validator');
const { getHTMLHead, getFooter, getScripts, getResponsiveNav, escapeHtml } = require('../helpers');
const { createConfirmationCode, isCodeValid } = require('../utils/emailToken');
const { sendConfirmationEmail, sendWelcomeEmail } = require('../services/email');
const { isDisposableEmail } = require('../utils/emailValidation');

// Helper function to generate random verification code
function generateBotCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars like O, 0, I, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET /register - Display registration form with CSRF token
const showRegister = (req, res) => {
  // Generate and store bot verification code
  const botCode = generateBotCode();
  req.session.botCode = botCode;
  
  res.send(`
${getHTMLHead('Register - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full bg-gray-900/80 backdrop-blur-xl border border-blue-500/30 rounded mt-20 p-6 shadow-[0_0_70px_rgba(0,102,255,0.25),0_0_110px_rgba(0,102,255,0.12),inset_0_0_35px_rgba(0,102,255,0.03)]">
        <h1 class="text-2xl font-bold text-white text-center mb-6">CREATE ACCOUNT</h1>
        
        <form method="POST" action="/register" class="space-y-4">
          <input type="hidden" name="_csrf" value="${req.csrfToken()}">
          <input type="hidden" name="fingerprint" value="">
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input type="email" name="email" required 
              class="w-full px-4 py-2.5 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <input type="password" name="password" minlength="8" required 
              class="w-full px-4 py-2.5 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
            <input type="password" name="confirmPassword" minlength="8" required 
              class="w-full px-4 py-2.5 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Verify you're human</label>
            <p class="text-xs text-gray-400 mb-2">Type this code exactly as shown</p>
            <div class="bg-black/60 border border-blue-500/40 rounded px-4 py-3 mb-2 text-center">
              <span class="text-2xl font-mono font-bold text-blue-400 tracking-[0.3em]">${botCode}</span>
            </div>
            <input type="text" id="botCode" name="botCode" required maxlength="6"
              class="w-full px-4 py-2.5 bg-black/40 border border-red-500/50 rounded text-white text-center font-mono text-lg tracking-[0.3em] uppercase placeholder-gray-500 focus:outline-none focus:ring-1 transition-all"
              placeholder="TYPE CODE HERE">
          </div>
          
          <div class="flex items-start gap-2.5">
            <input type="checkbox" id="acceptTerms" name="acceptTerms" required 
              class="mt-0.5 w-4 h-4 cursor-pointer accent-blue-500">
            <label for="acceptTerms" class="text-sm text-gray-400 cursor-pointer">
              I agree to the <a href="/terms" target="_blank" class="text-blue-400 hover:text-blue-300 underline">Terms of Service</a>
            </label>
          </div>
          
          <button type="submit" id="submitBtn" disabled class="w-full py-2.5 bg-gray-600 text-white font-bold rounded cursor-not-allowed opacity-50 transition-all">
            Register
          </button>
        </form>
        
        <p class="text-center text-gray-400 mt-5 text-sm">
          Already have an account? <a href="/login" class="text-blue-400 hover:text-blue-300 font-medium">Login</a>
        </p>
        
        <div class="mt-5 pt-5 border-t border-blue-500/20 text-center">
          <p class="text-xs text-gray-500">
            By registering, you agree to our <a href="/terms" class="text-blue-400 hover:text-blue-300 underline">Terms</a> and <a href="/privacy" class="text-blue-400 hover:text-blue-300 underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js', 'fingerprint.js')}
    <script>
      const botInput = document.getElementById('botCode');
      const submitBtn = document.getElementById('submitBtn');
      const correctCode = '${botCode}';
      
      botInput.addEventListener('input', function() {
        const value = this.value.toUpperCase();
        this.value = value;
        
        if (value === correctCode) {
          // Correct code - green border, enable submit
          this.classList.remove('border-red-500/50');
          this.classList.add('border-green-500/50', 'focus:ring-green-500/50');
          submitBtn.disabled = false;
          submitBtn.classList.remove('bg-gray-600', 'cursor-not-allowed', 'opacity-50');
          submitBtn.classList.add('bg-blue-600', 'hover:bg-blue-500', 'hover:shadow-[0_0_30px_rgba(0,102,255,0.6)]', 'cursor-pointer');
        } else {
          // Incorrect code - red border, disable submit
          this.classList.remove('border-green-500/50', 'focus:ring-green-500/50');
          this.classList.add('border-red-500/50');
          submitBtn.disabled = true;
          submitBtn.classList.remove('bg-blue-600', 'hover:bg-blue-500', 'hover:shadow-[0_0_30px_rgba(0,102,255,0.6)]', 'cursor-pointer');
          submitBtn.classList.add('bg-gray-600', 'cursor-not-allowed', 'opacity-50');
        }
      });
    </script>
  `);
};

// POST /register - Handle registration with email confirmation
const handleRegister = async (req, res) => {
  // Validate bot verification code first
  if (!req.body.botCode || req.body.botCode.toUpperCase() !== req.session.botCode) {
    return res.status(400).send(`
      <h1 style="color: #ff4444;">Verification Failed</h1>
      <p>The verification code you entered is incorrect. Bots are not allowed.</p>
      <a href="/register" style="color: #88FE00;">Try again</a>
    `);
  }
  
  // Clear the bot code so it can't be reused
  delete req.session.botCode;
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => escapeHtml(err.msg));
    return res.status(400).send(`
      <h1 style="color: #88FE00;">Validation Error</h1>
      <ul>${errorMessages.map(msg => `<li>${msg}</li>`).join('')}</ul>
      <a href="/register" style="color: #88FE00;">Go back</a>
    `);
  }

  try {
    const { email, password, acceptTerms } = req.body;
    
    // Validate terms acceptance
    if (acceptTerms !== 'on') {
      return res.status(400).send(`
        <h1 style="color: #22d3ee;">Terms Required</h1>
        <p style="color: #e2e8f0;">You must accept the Terms of Service to register.</p>
        <a href="/register" style="color: #22d3ee;">Go back</a>
      `);
    }
    
    // Block disposable email addresses
    if (isDisposableEmail(email)) {
      return res.status(400).send(`
        <h1 style="color: #22d3ee;">Invalid Email</h1>
        <p style="color: #e2e8f0;">Temporary/disposable email addresses are not allowed. Please use a permanent email address.</p>
        <a href="/register" style="color: #22d3ee;">Go back</a>
      `);
    }
    
    // Get client IP address (handles proxy/load balancer)
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress;
    
    // Check if this IP has already used a trial in the last 90 days
    const ipTrialCheck = await pool.query(
      `SELECT COUNT(*) as count FROM users 
       WHERE signup_ip = $1 
       AND trial_used = true 
       AND trial_used_at > NOW() - INTERVAL '90 days'`,
      [clientIp]
    );
    
    const ipHasUsedTrial = parseInt(ipTrialCheck.rows[0].count) > 0;
    
    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).send('Email already registered. <a href="/login">Login</a>');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Generate 6-digit confirmation code
    const { code, expiresAt } = createConfirmationCode();
    
    // Get browser fingerprint (for trial abuse prevention)
    // Validate fingerprint format: must be 64-char hex string (SHA-256) or null
    let fingerprint = req.body.fingerprint || null;
    if (fingerprint) {
      fingerprint = String(fingerprint).trim();
      // Reject if not valid 64-char hex (SHA-256 output)
      if (!/^[a-f0-9]{64}$/i.test(fingerprint)) {
        fingerprint = null; // Invalid format, treat as no fingerprint
      }
    }
    
    // Check if this fingerprint has already used a trial (VPN bypass prevention)
    let fingerprintHasUsedTrial = false;
    if (fingerprint) {
      const fpTrialCheck = await pool.query(
        `SELECT COUNT(*) as count FROM users 
         WHERE browser_fingerprint = $1 
         AND trial_used = true 
         AND trial_used_at > NOW() - INTERVAL '90 days'`,
        [fingerprint]
      );
      fingerprintHasUsedTrial = parseInt(fpTrialCheck.rows[0].count) > 0;
    }
    
    // Insert user with code, terms acceptance, signup IP, and fingerprint
    await pool.query(
      `INSERT INTO users (email, password_hash, email_token, token_expires_at, terms_accepted_at, signup_ip, trial_used, browser_fingerprint) 
       VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7)`,
      [email, passwordHash, code, expiresAt, clientIp, ipHasUsedTrial || fingerprintHasUsedTrial, fingerprint]
    );

    // Send confirmation email with code (non-blocking)
    sendConfirmationEmail(email, code).catch(err => {
      console.error('Failed to send confirmation email:', err);
    });
    
    // Get the new user ID
    const newUser = await pool.query('SELECT id, role FROM users WHERE email = $1', [email]);
    
    // Create session immediately (allow access without confirmation)
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.redirect('/login?error=Registration successful. Please login.');
      }
      
      req.session.userId = newUser.rows[0].id;
      req.session.userEmail = email;
      req.session.userRole = newUser.rows[0].role;
      req.session.emailConfirmed = false; // Mark as unconfirmed
      req.session.flashMessage = `Welcome! Check your email (${email}) to verify your account.`;
      
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send('Registration failed');
  }
};

// GET /login - Display login form with CSRF token
const showLogin = (req, res) => {
  const flashMessage = req.session.flashMessage;
  delete req.session.flashMessage;
  const message = escapeHtml(req.query.message || '');
  const error = escapeHtml(req.query.error || '');
  const userEmail = escapeHtml(req.query.email || '');
  const showResend = req.query.error && req.query.error.includes('confirm your email') && userEmail;
  
  res.send(`
${getHTMLHead('Login - Basement')}
    ${flashMessage ? `
    <div class="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md mx-auto px-4">
      <div id="flashMessage" class="bg-brand text-gray-900 px-6 py-4 rounded-lg shadow-lg flex items-center justify-between">
        <span>${escapeHtml(flashMessage)}</span>
        <button onclick="dismissFlash()" class="ml-4 text-gray-900 hover:text-gray-700 font-bold text-xl">&times;</button>
      </div>
    </div>
    <script>
      function dismissFlash() {
        const msg = document.getElementById('flashMessage');
        msg.style.opacity = '0';
        msg.style.transform = 'translateY(-20px)';
        setTimeout(() => msg.remove(), 300);
      }
      setTimeout(() => {
        const msg = document.getElementById('flashMessage');
        if (msg) dismissFlash();
      }, 7000);
    </script>
    ` : ''}
    
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full bg-gray-900/80 backdrop-blur-xl border border-blue-500/30 rounded p-6 shadow-[0_0_70px_rgba(0,102,255,0.25),0_0_110px_rgba(0,102,255,0.12),inset_0_0_35px_rgba(0,102,255,0.03)]">
        <h1 class="text-2xl font-bold text-white text-center mb-6">LOGIN</h1>
        
        ${message ? `<div class="bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-2.5 rounded mb-5 text-sm">${message}</div>` : ''}
        ${error ? `<div class="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-2.5 rounded mb-5 text-sm">${error}</div>` : ''}
        ${showResend ? `<div class="bg-blue-500/10 border border-blue-500/30 text-blue-300 px-4 py-2.5 rounded mb-5 text-sm"><a href="/resend-confirmation?email=${encodeURIComponent(req.query.email)}" class="text-blue-400 hover:text-blue-300 underline">Resend confirmation email</a></div>` : ''}
        
        <form method="POST" action="/login" class="space-y-4">
          <input type="hidden" name="_csrf" value="${req.csrfToken()}">
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input type="email" name="email" required 
              class="w-full px-4 py-2.5 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <input type="password" name="password" required 
              class="w-full px-4 py-2.5 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all">
          </div>
          
          <button type="submit" class="w-full py-2.5 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all">
            Login
          </button>
        </form>
        
        <div class="text-center mt-3">
          <a href="/forgot-password" class="text-sm text-blue-400 hover:text-blue-300">Forgot password?</a>
        </div>
        
        <p class="text-center text-gray-400 mt-5 text-sm">
          Don't have an account? <a href="/register" class="text-blue-400 hover:text-blue-300 font-medium">Register</a>
        </p>
        
        <div class="mt-5 pt-5 border-t border-blue-500/20 text-center">
          <p class="text-xs text-gray-500">
            <a href="/terms" class="text-blue-400 hover:text-blue-300 underline">Terms</a> · 
            <a href="/privacy" class="text-blue-400 hover:text-blue-300 underline">Privacy</a> · 
            <a href="/contact" class="text-blue-400 hover:text-blue-300 underline">Support</a>
          </p>
        </div>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

// POST /login - Handle login with email/password check, bcrypt verification, session creation
const handleLogin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.redirect('/login?error=Invalid email or password');
  }

  try {
    const { email, password } = req.body;
    
    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    // Constant-time comparison to prevent timing attacks
    // Always run bcrypt.compare() even if user doesn't exist
    const user = result.rows.length > 0 ? result.rows[0] : null;
    
    // Use dummy hash if user doesn't exist (same bcrypt cost as real passwords)
    const dummyHash = '$2b$10$YourDummyHashHereForTimingConsistency1234567890123456789012';
    const hashToCompare = user ? user.password_hash : dummyHash;
    
    // Always run bcrypt (prevents timing attack that reveals valid emails)
    const match = await bcrypt.compare(password, hashToCompare);
    
    // Reject if user doesn't exist OR password doesn't match
    if (!user || !match) {
      return res.redirect('/login?error=Invalid email or password');
    }

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error on login:', err);
        return res.redirect('/login?error=An error occurred. Please try again.');
      }

      // Set session (allow login even without email confirmation)
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.userRole = user.role;
      req.session.emailConfirmed = user.email_confirmed; // Store confirmation status

      // Redirect based on role
      if (user.role === 'admin') {
        return res.redirect('/admin');
      } else {
        return res.redirect('/dashboard');
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.redirect('/login?error=An error occurred. Please try again.');
  }
};

// GET /confirm-email/:token - Verify email token and activate account
const confirmEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with this token
    const userResult = await pool.query(
      'SELECT id, email, email_confirmed, token_expires_at FROM users WHERE email_token = $1',
      [token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).send(`
${getHTMLHead('Invalid Token - Basement')}
    ${getResponsiveNav(req)}
    <main class="bg-gray-900 min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full bg-gray-800 border border-red-700 rounded-lg p-8 text-center">
        <h1 class="text-3xl font-bold text-red-400 mb-4">Invalid Token</h1>
        <p class="text-gray-400 mb-6">This confirmation link is invalid or has already been used.</p>
        <a href="/register" class="inline-block px-8 py-3 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">Register Again</a>
      </div>
    </main>
    ${getFooter()}
    ${getScripts('nav.js')}
      `);
    }

    const user = userResult.rows[0];

    // Check if token is expired
    if (!isCodeValid(user.token_expires_at)) {
      return res.status(400).send(`
${getHTMLHead('Token Expired - Basement')}
    ${getResponsiveNav(req)}
    <main class="bg-gray-900 min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full bg-gray-800 border border-red-700 rounded-lg p-8 text-center">
        <h1 class="text-3xl font-bold text-red-400 mb-4">Link Expired</h1>
        <p class="text-gray-400 mb-6">This confirmation link has expired (valid for 24 hours).</p>
        <a href="/register" class="inline-block px-8 py-3 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">Register Again</a>
      </div>
      </div>
    </main>
    ${getFooter()}
    ${getScripts('nav.js')}
      `);
    }

    // Check if already confirmed
    if (user.email_confirmed) {
      return res.status(400).send(`
${getHTMLHead('Already Confirmed - Basement')}
    ${getResponsiveNav(req)}
    <main class="bg-gray-900 min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full bg-gray-800 border border-green-700 rounded-lg p-8 text-center">
        <h1 class="text-3xl font-bold text-green-400 mb-4">Already Confirmed</h1>
        <p class="text-gray-400 mb-6">This email has already been confirmed.</p>
        <a href="/login" class="inline-block px-8 py-3 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">Login</a>
      </div>
    </main>
    ${getFooter()}
    ${getScripts('nav.js')}
      `);
    }

    // Mark email as confirmed and clear token
    await pool.query(
      'UPDATE users SET email_confirmed = true, email_token = NULL, token_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    res.send(`
${getHTMLHead('Email Confirmed - Basement')}
    ${getResponsiveNav(req)}
    <main class="bg-gray-900 min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full bg-gray-800 border border-green-700 rounded-lg p-8 text-center">
        <h1 class="text-3xl font-bold text-green-400 mb-4">✓ Email Confirmed!</h1>
        <p class="text-gray-400 mb-4">Your email has been successfully verified.</p>
        <p class="text-gray-500 mb-6">You can now login with your account.</p>
        <a href="/login" class="inline-block px-8 py-3 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">Go to Login</a>
      </div>
    </main>
    ${getFooter()}
    ${getScripts('nav.js')}
    `);
  } catch (error) {
    console.error('Email confirmation error:', error);
    res.status(500).send('Email confirmation failed');
  }
};

// GET /logout - Destroy session and redirect to login
const handleLogout = (req, res) => {
  req.session.flashMessage = 'Successfully logged out';
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
};

// GET /resend-confirmation - Resend confirmation email
const resendConfirmation = async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.redirect('/login?error=Email is required');
    }

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.redirect('/login?error=Account not found');
    }

    const user = result.rows[0];

    // Check if already confirmed
    if (user.email_confirmed) {
      return res.redirect('/login?message=Your email is already confirmed. You can login now.');
    }

    // Generate new confirmation code
    const { code, expiresAt } = createConfirmationCode();

    // Update user with new code (use email_token column, not confirmation_code)
    await pool.query(
      'UPDATE users SET email_token = $1, token_expires_at = $2 WHERE id = $3',
      [code, expiresAt, user.id]
    );

    // Send confirmation email
    await sendConfirmationEmail(email, code);

    // Set session email for the verify-email page to work
    req.session.userEmail = email;

    res.redirect(`/verify-email?email=${encodeURIComponent(email)}&message=Confirmation email sent! Check your inbox.`);
  } catch (error) {
    console.error('[RESEND CONFIRMATION] Error:', error);
    res.redirect('/login?error=Failed to resend confirmation email');
  }
};

// GET /verify-code - Display code verification form
const showVerifyCode = (req, res) => {
  const email = req.query.email || '';
  res.send(`
${getHTMLHead('Verify Code - Basement')}
<body class="bg-gray-900">
    <div class="matrix-bg"></div>
    
    ${getResponsiveNav(req)}
    
    <div class="auth-container">
        <div class="auth-card">
            <h1>VERIFY CODE</h1>
            <p style="color: #8892a0; text-align: center; margin-bottom: 30px;">Enter the 6-digit code sent to<br><strong>${email}</strong></p>
            <form method="POST" action="/verify-code">
                <input type="hidden" name="_csrf" value="${req.csrfToken()}">
                <input type="hidden" name="email" value="${email}">
                
                <div class="form-group">
                    <label>Confirmation Code</label>
                    <input type="text" name="code" placeholder="000000" maxlength="6" inputmode="numeric" required style="font-size: 24px; letter-spacing: 10px; text-align: center;">
                </div>
                
                <button type="submit" class="btn">Verify</button>
            </form>
            
            <p class="link" style="margin-top: 20px;"><a href="/register">Back to Register</a></p>
        </div>
    </div>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

// POST /verify-code - Verify the code
const handleVerifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Find user by email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.redirect(`/verify-code?email=${encodeURIComponent(email)}&error=Email not found`);
    }

    const user = result.rows[0];

    // Check if already confirmed
    if (user.email_confirmed) {
      return res.redirect('/login?message=Your email is already confirmed. You can login now.');
    }

    // Check if code matches and is valid
    if (user.email_token !== code || !isCodeValid(user.token_expires_at)) {
      return res.redirect(`/verify-code?email=${encodeURIComponent(email)}&error=Invalid or expired code`);
    }

    // Mark email as confirmed
    await pool.query(
      'UPDATE users SET email_confirmed = true WHERE id = $1',
      [user.id]
    );

    // Send welcome email (don't block on it)
    sendWelcomeEmail(user.email).catch(err => {
      console.error('[EMAIL] Failed to send welcome email:', err.message);
    });

    req.session.flashMessage = 'Email confirmed! You can now login.';
    res.redirect('/login');
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).send('Verification failed');
  }
};

// GET /verify-email - Show code entry page
const showVerifyEmail = (req, res) => {
  const error = escapeHtml(req.query.error || '');
  const success = escapeHtml(req.query.success || '');
  
  res.send(`
${getHTMLHead('Verify Email - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-gray-900 min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full bg-gray-800 border border-gray-700 rounded-lg p-8">
        <h1 class="text-3xl font-bold text-white text-center mb-4">VERIFY EMAIL</h1>
        <p class="text-gray-400 text-center mb-8">
          We sent a 6-digit code to your email.<br>
          Enter it below to verify your account.
        </p>
        
        ${error ? `<div class="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6">${error}</div>` : ''}
        ${success ? `<div class="bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded-lg mb-6">${success}</div>` : ''}
        
        <form method="POST" action="/verify-email" id="verifyForm" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
            <input type="text" name="code" maxlength="6" pattern="[0-9]{6}" inputmode="numeric" required
              class="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-center text-2xl font-mono tracking-widest focus:border-brand focus:ring-2 focus:ring-brand focus:outline-none"
              placeholder="000000" autocomplete="off">
          </div>
          
          <button type="submit" class="w-full py-3 bg-blue-600 text-white font-bold">
            Verify Email
          </button>
        </form>
        
        <div class="mt-6 pt-6 border-t border-gray-700 text-center">
          <p class="text-gray-400 text-sm mb-2">Code expires in 15 minutes</p>
          <p class="text-gray-400 text-sm">
            Didn't receive it? <button type="button" id="resendBtn" class="text-brand hover:text-cyan-400 underline cursor-pointer">Resend Code</button>
          </p>
        </div>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
    
    <script>
      document.getElementById('resendBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('resendBtn');
        btn.textContent = 'Sending...';
        btn.disabled = true;
        
        try {
          const response = await fetch('/resend-code', { method: 'POST' });
          if (response.ok) {
            alert('Code resent! Check your email.');
          } else {
            alert('Failed to resend code. Please try again.');
          }
        } catch (err) {
          alert('Error sending code. Please try again.');
        } finally {
          btn.textContent = 'Resend Code';
          btn.disabled = false;
        }
      });
    </script>
  `);
};

// POST /verify-email - Handle code verification
const verifyEmailCode = async (req, res) => {
  try {
    const { code } = req.body;
    const email = req.session.userEmail; // Use logged-in user's email

    if (!code || !email) {
      return res.redirect('/verify-email?error=Invalid request');
    }

    // Find user with this code
    const userResult = await pool.query(
      'SELECT id, email, email_confirmed, email_token, token_expires_at FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.redirect('/register?error=User not found');
    }

    const user = userResult.rows[0];

    // Check if already confirmed
    if (user.email_confirmed) {
      req.session.userId = user.id;
      req.session.emailConfirmed = true;
      return res.redirect('/dashboard');
    }

    // Verify code matches
    if (user.email_token !== code) {
      return res.redirect('/verify-email?error=Invalid code. Please try again.');
    }

    // Check if code is expired
    if (!isCodeValid(user.token_expires_at)) {
      return res.redirect('/verify-email?error=Code expired. Please request a new one.');
    }

    // Mark email as confirmed
    await pool.query(
      'UPDATE users SET email_confirmed = true, email_token = NULL, token_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    // Set session
    req.session.userId = user.id;
    req.session.emailConfirmed = true;

    // Redirect to dashboard
    res.redirect('/dashboard?success=Email confirmed! Welcome to Basement.');
  } catch (error) {
    console.error('Email verification error:', error);
    res.redirect('/verify-email?error=Verification failed. Please try again.');
  }
};

// POST /resend-code - Resend verification code (returns JSON)
const resendCode = async (req, res) => {
  try {
    // Get email from logged-in user
    let email = req.session.userEmail;

    if (!email) {
      return res.json({ success: false, error: 'No email in session' });
    }

    // Find user
    const result = await pool.query('SELECT id, email, email_confirmed FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.email_confirmed) {
      return res.json({ success: false, error: 'Email already confirmed' });
    }

    // Generate new code
    const { code, expiresAt } = createConfirmationCode();

    // Update user with new code
    await pool.query(
      'UPDATE users SET email_token = $1, token_expires_at = $2 WHERE id = $3',
      [code, expiresAt, user.id]
    );

    // Send confirmation email
    const emailResult = await sendConfirmationEmail(email, code);

    if (emailResult.success) {
      return res.json({ success: true, message: 'Code sent! Check your inbox.' });
    } else {
      return res.json({ success: false, error: 'Failed to send email. Try again.' });
    }
  } catch (error) {
    console.error('Resend code error:', error);
    return res.json({ success: false, error: 'Something went wrong' });
  }
};

// GET /forgot-password - Display forgot password form
const showForgotPassword = (req, res) => {
  const message = escapeHtml(req.query.message || '');
  const error = escapeHtml(req.query.error || '');
  
  res.send(`
${getHTMLHead('Forgot Password - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full bg-gray-900/80 backdrop-blur-xl border border-blue-500/30 rounded p-6 shadow-[0_0_70px_rgba(0,102,255,0.25),0_0_110px_rgba(0,102,255,0.12),inset_0_0_35px_rgba(0,102,255,0.03)]">
        <h1 class="text-2xl font-bold text-white text-center mb-2">RESET PASSWORD</h1>
        <p class="text-center text-gray-400 text-sm mb-6">Enter your email to receive a reset link</p>
        
        ${message ? `<div class="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 text-sm">${message}</div>` : ''}
        ${error ? `<div class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-sm">${error}</div>` : ''}
        
        <form method="POST" action="/forgot-password" class="space-y-4">
          <input type="hidden" name="_csrf" value="${req.csrfToken()}">
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Email Address</label>
            <input type="email" name="email" required 
              class="w-full px-4 py-2.5 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
              placeholder="your@email.com">
          </div>
          
          <button type="submit" class="w-full py-2.5 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all">
            Send Reset Link
          </button>
        </form>
        
        <p class="text-center text-gray-400 mt-5 text-sm">
          Remember your password? <a href="/login" class="text-blue-400 hover:text-blue-300 font-medium">Login</a>
        </p>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

// POST /forgot-password - Generate reset token and send email
const handleForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const result = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    
    // Always show success message (security: don't reveal if email exists)
    if (result.rows.length === 0) {
      return res.redirect('/forgot-password?message=If that email exists, you will receive a reset link shortly.');
    }
    
    const user = result.rows[0];
    
    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Store token in database
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, resetTokenExpires, user.id]
    );
    
    // Send reset email (don't wait for it)
    const resetLink = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
    sendPasswordResetEmail(user.email, resetLink).catch(err => {
      console.error('[FORGOT PASSWORD] Failed to send email:', err);
    });
    
    res.redirect('/forgot-password?message=If that email exists, you will receive a reset link shortly.');
  } catch (error) {
    console.error('[FORGOT PASSWORD] Error:', error);
    res.redirect('/forgot-password?error=An error occurred. Please try again.');
  }
};

// Helper function to send password reset email
async function sendPasswordResetEmail(email, resetLink) {
  const { sendEmail } = require('../services/email');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Reset Your Password</h2>
      <p>You requested to reset your password for Clouded Basement.</p>
      <p>Click the link below to set a new password:</p>
      <p style="margin: 30px 0;">
        <a href="${resetLink}">Reset Password</a>
      </p>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #0066cc;">${resetLink}</p>
      <p style="margin-top: 30px; color: #666;">This link expires in 1 hour.</p>
      <p style="color: #666;">If you didn't request this, you can safely ignore this email.</p>
      <hr style="margin: 30px 0; border: 1px solid #ddd;">
      <p style="color: #999; font-size: 12px;">Clouded Basement - Fast, Simple Cloud Hosting</p>
    </div>
  `;
  
  const text = `Reset your password for Clouded Basement.\n\nClick this link: ${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`;
  
  await sendEmail(email, 'Reset Your Password - Clouded Basement', html, text, true);
}

// GET /reset-password/:token - Display reset password form
const showResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token exists and is not expired
    const result = await pool.query(
      'SELECT id, email FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.redirect('/forgot-password?error=Invalid or expired reset link. Please request a new one.');
    }
    
    const errorMsg = escapeHtml(req.query.error || '');
    const successMsg = escapeHtml(req.query.message || '');
    
    res.send(`
${getHTMLHead('Reset Password - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full bg-gray-900/80 backdrop-blur-xl border border-blue-500/30 rounded p-6 shadow-[0_0_70px_rgba(0,102,255,0.25),0_0_110px_rgba(0,102,255,0.12),inset_0_0_35px_rgba(0,102,255,0.03)]">
        <h1 class="text-2xl font-bold text-white text-center mb-2">SET NEW PASSWORD</h1>
        <p class="text-center text-gray-400 text-sm mb-6">Enter your new password below</p>
        
        ${errorMsg ? `<div class="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-sm">${errorMsg}</div>` : ''}
        ${successMsg ? `<div class="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded text-green-400 text-sm">${successMsg}</div>` : ''}
        
        <form method="POST" action="/reset-password/${token}" class="space-y-4">
          <input type="hidden" name="_csrf" value="${req.csrfToken()}">
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
            <input type="password" name="password" minlength="8" required 
              class="w-full px-4 py-2.5 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
              placeholder="Minimum 8 characters">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
            <input type="password" name="confirmPassword" minlength="8" required 
              class="w-full px-4 py-2.5 bg-black/40 border border-blue-500/30 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
              placeholder="Re-enter password">
          </div>
          
          <button type="submit" class="w-full py-2.5 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] transition-all">
            Reset Password
          </button>
        </form>
        
        <p class="text-center text-gray-400 mt-5 text-sm">
          <a href="/login" class="text-blue-400 hover:text-blue-300 font-medium">Back to Login</a>
        </p>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
    `);
  } catch (error) {
    console.error('[RESET PASSWORD] Error:', error);
    res.redirect('/forgot-password?error=An error occurred. Please try again.');
  }
};

// POST /reset-password/:token - Update password
const handleResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    
    console.log('[RESET PASSWORD] Received request:', { token, passwordLength: password?.length, confirmPasswordLength: confirmPassword?.length });
    
    // Validate passwords match
    if (password !== confirmPassword) {
      console.log('[RESET PASSWORD] Passwords do not match');
      return res.redirect(`/reset-password/${token}?error=Passwords do not match`);
    }
    
    // Validate password length
    if (password.length < 8) {
      return res.redirect(`/reset-password/${token}?error=Password must be at least 8 characters`);
    }
    
    // Verify token exists and is not expired
    const result = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.redirect('/forgot-password?error=Invalid or expired reset link. Please request a new one.');
    }
    
    const userId = result.rows[0].id;
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashedPassword, userId]
    );
    
    console.log(`[RESET PASSWORD] Password reset successful for user ${userId}`);
    
    res.redirect('/login?message=Password reset successful! Please login with your new password.');
  } catch (error) {
    console.error('[RESET PASSWORD] Error:', error);
    res.redirect(`/reset-password/${req.params.token}?error=An error occurred. Please try again.`);
  }
};

module.exports = {
  showRegister,
  register: handleRegister,
  handleRegister,
  showLogin,
  login: handleLogin,
  handleLogin,
  confirmEmail,
  logout: handleLogout,
  handleLogout,
  showVerifyEmail,
  verifyEmailCode,
  resendCode,
  resendConfirmation,
  showForgotPassword,
  handleForgotPassword,
  showResetPassword,
  handleResetPassword
};
