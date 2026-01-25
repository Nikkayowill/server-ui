const bcrypt = require('bcrypt');
const path = require('path');
const pool = require('../db');
const { validationResult } = require('express-validator');
const { getHTMLHead, getFooter, getScripts, getResponsiveNav } = require('../helpers');
const { createConfirmationCode, isCodeValid } = require('../utils/emailToken');
const { sendConfirmationEmail } = require('../services/email');

// GET /register - Display registration form with CSRF token
const showRegister = (req, res) => {
  res.send(`
${getHTMLHead('Register - Basement')}
    ${getResponsiveNav(req)}
    
    <main class="bg-black min-h-screen flex items-center justify-center py-12 px-4">
      <div class="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 shadow-[0_8px_32px_rgba(255,255,255,0.1)]">
        <h1 class="text-2xl font-bold text-white text-center mb-6">CREATE ACCOUNT</h1>
        
        <form method="POST" action="/register" class="space-y-4">
          <input type="hidden" name="_csrf" value="${req.csrfToken()}">
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input type="email" name="email" required 
              class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:bg-white/10 focus:outline-none transition-all">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <input type="password" name="password" minlength="8" required 
              class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:bg-white/10 focus:outline-none transition-all">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
            <input type="password" name="confirmPassword" minlength="8" required 
              class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:bg-white/10 focus:outline-none transition-all">
          </div>
          
          <div class="flex items-start gap-2.5">
            <input type="checkbox" id="acceptTerms" name="acceptTerms" required 
              class="mt-0.5 w-4 h-4 cursor-pointer accent-white">
            <label for="acceptTerms" class="text-sm text-gray-400 cursor-pointer">
              I agree to the <a href="/terms" target="_blank" class="text-white/80 hover:text-white underline">Terms of Service</a>
            </label>
          </div>
          
          <button type="submit" class="w-full py-2.5 bg-white/90 text-black font-bold rounded-lg hover:bg-white hover:shadow-[0_8px_32px_rgba(255,255,255,0.3)] transition-all">
            Register
          </button>
        </form>
        
        <p class="text-center text-gray-400 mt-5 text-sm">
          Already have an account? <a href="/login" class="text-white/80 hover:text-white font-medium">Login</a>
        </p>
        
        <div class="mt-5 pt-5 border-t border-white/10 text-center">
          <p class="text-xs text-gray-500">
            By registering, you agree to our <a href="/terms" class="text-white/70 hover:text-white underline">Terms</a> and <a href="/privacy" class="text-white/70 hover:text-white underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </main>
    
    ${getFooter()}
    ${getScripts('nav.js')}
  `);
};

// POST /register - Handle registration with email confirmation
const handleRegister = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send(`
      <h1 style="color: #88FE00;">Validation Error</h1>
      <ul>${errors.array().map(err => `<li>${err.msg}</li>`).join('')}</ul>
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
    
    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).send('Email already registered. <a href="/login">Login</a>');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Generate 6-digit confirmation code
    const { code, expiresAt } = createConfirmationCode();
    
    // Insert user with code and terms acceptance timestamp
    await pool.query(
      'INSERT INTO users (email, password_hash, email_token, token_expires_at, terms_accepted_at) VALUES ($1, $2, $3, $4, NOW())',
      [email, passwordHash, code, expiresAt]
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
  const message = req.query.message || '';
  const error = req.query.error || '';
  const userEmail = req.query.email || '';
  const showResend = error.includes('confirm your email') && userEmail;
  
  res.send(`
${getHTMLHead('Login - Basement')}
    ${flashMessage ? `
    <div class="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md mx-auto px-4">
      <div id="flashMessage" class="bg-brand text-gray-900 px-6 py-4 rounded-lg shadow-lg flex items-center justify-between">
        <span>${flashMessage}</span>
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
      <div class="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg p-6 shadow-[0_8px_32px_rgba(255,255,255,0.1)]">
        <h1 class="text-2xl font-bold text-white text-center mb-6">LOGIN</h1>
        
        ${message ? `<div class="bg-green-500/10 border border-green-500/20 text-green-300 px-4 py-2.5 rounded-lg mb-5 text-sm">${message}</div>` : ''}
        ${error ? `<div class="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-2.5 rounded-lg mb-5 text-sm">${error}</div>` : ''}
        ${showResend ? `<div class="bg-white/10 border border-white/20 text-gray-300 px-4 py-2.5 rounded-lg mb-5 text-sm"><a href="/resend-confirmation?email=${encodeURIComponent(userEmail)}" class="text-white/80 hover:text-white underline">Resend confirmation email</a></div>` : ''}
        
        <form method="POST" action="/login" class="space-y-4">
          <input type="hidden" name="_csrf" value="${req.csrfToken()}">
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input type="email" name="email" required 
              class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:bg-white/10 focus:outline-none transition-all">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <input type="password" name="password" required 
              class="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-white/30 focus:bg-white/10 focus:outline-none transition-all">
          </div>
          
          <button type="submit" class="w-full py-2.5 bg-white/90 text-black font-bold rounded-lg hover:bg-white hover:shadow-[0_8px_32px_rgba(255,255,255,0.3)] transition-all">
            Login
          </button>
        </form>
        
        <p class="text-center text-gray-400 mt-5 text-sm">
          Don't have an account? <a href="/register" class="text-white/80 hover:text-white font-medium">Register</a>
        </p>
        
        <div class="mt-5 pt-5 border-t border-white/10 text-center">
          <p class="text-xs text-gray-500">
            <a href="/terms" class="text-white/70 hover:text-white underline">Terms</a> · 
            <a href="/privacy" class="text-white/70 hover:text-white underline">Privacy</a> · 
            <a href="/contact" class="text-white/70 hover:text-white underline">Support</a>
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
    if (result.rows.length === 0) {
      return res.redirect('/login?error=Invalid email or password');
    }

    const user = result.rows[0];
    
    // Check password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.redirect('/login?error=Invalid email or password');
    }

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
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
    if (!isTokenValid(user.token_expires_at)) {
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

    req.session.flashMessage = 'Email confirmed! You can now login.';
    res.redirect('/login');
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).send('Verification failed');
  }
};

    const user = result.rows[0];

    // Check if already confirmed
    if (user.email_confirmed) {
      return res.redirect('/login?message=Your email is already confirmed. You can login now.');
    }

    // Generate new code
    const { code, expiresAt } = createConfirmationCode();

    // Update user with new code
    await pool.query(
      'UPDATE users SET email_token = $1, token_expires_at = $2 WHERE email = $3',
      [code, expiresAt, email]
    );

    // Send confirmation email with code
    const emailResult = await sendConfirmationEmail(email, code);

    if (emailResult.success) {
      return res.redirect(`/verify-code?email=${encodeURIComponent(email)}&message=Code resent. Check your inbox!`);
    } else {
      console.error('Failed to resend confirmation email:', emailResult.error);
      return res.redirect(`/verify-code?email=${encodeURIComponent(email)}&error=Failed to send code. Please try again later.`);
    }
  } catch (error) {
    console.error('Resend code error:', error);
    return res.redirect('/login?error=Failed to resend code');
  }
};

// GET /verify-email - Show code entry page
const showVerifyEmail = (req, res) => {
  const error = req.query.error || '';
  const success = req.query.success || '';
  
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
          
          <button type="submit" class="w-full py-3 bg-brand text-gray-900 font-bold rounded-lg hover:bg-cyan-500 transition-colors">
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
  resendCode
};
