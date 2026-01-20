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
</head>
<body class="bg-gray-900">
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
                
                <div class="form-group" style="display: flex; align-items: flex-start; gap: 10px; margin-top: 20px;">
                    <input type="checkbox" id="acceptTerms" name="acceptTerms" required style="margin-top: 4px; width: 18px; height: 18px; cursor: pointer; accent-color: #22d3ee;">
                    <label for="acceptTerms" style="margin: 0; font-size: 0.9em; line-height: 1.5; cursor: pointer;">
                        I have read and agree to the <a href="/terms" target="_blank" style="color: #22d3ee; text-decoration: underline;">Terms of Service</a>
                    </label>
                </div>
                
                <button type="submit" class="btn">Register</button>
            </form>
            
            <p class="link">Already have an account? <a href="/login">Login</a></p>
        </div>
    </div>
    
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

    // Send confirmation email with code
    const emailResult = await sendConfirmationEmail(email, code);
    
    if (emailResult.success) {
      req.session.unverifiedEmail = email;
      req.session.flashMessage = `Confirmation code sent to ${email}. Check your inbox!`;
      res.redirect('/verify-email');
    } else {
      console.error('Failed to send confirmation email:', emailResult.error);
      res.status(500).send('Registration successful but email delivery failed. Please contact support.');
    }
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
    <style>
      .flash-message {
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(136, 254, 0, 0.15);
        color: var(--glow);
        padding: 12px 36px 12px 16px;
        border-radius: 6px;
        border: 1px solid rgba(136, 254, 0, 0.3);
        box-shadow: 0 2px 10px rgba(136, 254, 0, 0.1);
        font-weight: 400;
        font-size: 14px;
        z-index: 10000;
        animation: slideDown 0.3s ease-out;
        max-width: 400px;
        text-align: center;
      }
      .flash-message.fade-out {
        animation: fadeOut 0.5s ease-out forwards;
      }
      .flash-close {
        position: absolute;
        top: 6px;
        right: 8px;
        background: none;
        border: none;
        color: var(--glow);
        font-size: 18px;
        cursor: pointer;
        padding: 2px 6px;
        line-height: 1;
        opacity: 0.5;
        transition: opacity 0.2s;
      }
      .flash-close:hover {
        opacity: 1;
      }
      @keyframes slideDown {
        from {
          transform: translate(-50%, -100px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%);
          opacity: 1;
        }
      }
      @keyframes fadeOut {
        to {
          opacity: 0;
          transform: translate(-50%, -50px);
        }
      }
    </style>
</head>
<body class="bg-gray-900">
    <div class="matrix-bg"></div>
    
    ${flashMessage ? `
    <div class="flash-message" id="flashMessage">
      ${flashMessage}
      <button class="flash-close" onclick="dismissFlash()">&times;</button>
    </div>
    <script>
      function dismissFlash() {
        const msg = document.getElementById('flashMessage');
        msg.classList.add('fade-out');
        setTimeout(() => msg.remove(), 500);
      }
      setTimeout(() => {
        const msg = document.getElementById('flashMessage');
        if (msg) dismissFlash();
      }, 7000);
    </script>
    ` : ''}
    
    ${getResponsiveNav(req)}
    
    <div class="auth-container">
        <div class="auth-card">
            <h1>LOGIN</h1>
            ${message ? `<div class="message">${message}</div>` : ''}
            ${error ? `<div class="error">${error}</div>` : ''}
            ${showResend ? `<div class="message"><a href="/resend-confirmation?email=${encodeURIComponent(userEmail)}" style="color: var(--glow); text-decoration: underline;">Resend confirmation email</a></div>` : ''}
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
</head>
<body class="bg-gray-900">
    <div class="matrix-bg"></div>
    ${getResponsiveNav(req)}
    <div class="auth-container">
        <div class="auth-card" style="text-align: center;">
            <h1 style="color: #ff6b6b;">Invalid Token</h1>
            <p>This confirmation link is invalid or has already been used.</p>
            <a href="/register" class="btn" style="display: inline-block; margin-top: 20px;">Register Again</a>
        </div>
    </div>
    ${getFooter()}
</body>
</html>
      `);
    }

    const user = userResult.rows[0];

    // Check if token is expired
    if (!isTokenValid(user.token_expires_at)) {
      return res.status(400).send(`
${getHTMLHead('Token Expired - Basement')}
<body class="bg-gray-900">
    <div class="matrix-bg"></div>
    ${getResponsiveNav(req)}
    <div class="auth-container">
        <div class="auth-card" style="text-align: center;">
            <h1 style="color: #ff6b6b;">Link Expired</h1>
            <p>This confirmation link has expired (valid for 24 hours).</p>
            <a href="/register" class="btn" style="display: inline-block; margin-top: 20px;">Register Again</a>
        </div>
    </div>
    ${getFooter()}
</body>
</html>
      `);
    }

    // Check if already confirmed
    if (user.email_confirmed) {
      return res.status(400).send(`
${getHTMLHead('Already Confirmed - Basement')}
</head>
<body class="bg-gray-900">
    <div class="matrix-bg"></div>
    ${getResponsiveNav(req)}
    <div class="auth-container">
        <div class="auth-card" style="text-align: center;">
            <h1 style="color: #88FE00;">Already Confirmed</h1>
            <p>This email has already been confirmed.</p>
            <a href="/login" class="btn" style="display: inline-block; margin-top: 20px;">Login</a>
        </div>
    </div>
    ${getFooter()}
</body>
</html>
      `);
    }

    // Mark email as confirmed and clear token
    await pool.query(
      'UPDATE users SET email_confirmed = true, email_token = NULL, token_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    res.send(`
${getHTMLHead('Email Confirmed - Basement')}
</head>
<body class="bg-gray-900">
    <div class="matrix-bg"></div>
    ${getResponsiveNav(req)}
    <div class="auth-container">
        <div class="auth-card" style="text-align: center;">
            <h1 style="color: #88FE00;">✓ Email Confirmed!</h1>
            <p>Your email has been successfully verified.</p>
            <p style="color: #8892a0; margin-top: 20px;">You can now login with your account.</p>
            <a href="/login" class="btn" style="display: inline-block; margin-top: 30px;">Go to Login</a>
        </div>
    </div>
    ${getFooter()}
</body>
</html>
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
  res.sendFile(path.join(__dirname, '..', 'verify-email.html'));
};

// POST /verify-email - Handle code verification
const verifyEmailCode = async (req, res) => {
  try {
    const { code } = req.body;
    const email = req.session.unverifiedEmail;

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
    delete req.session.unverifiedEmail;

    // Redirect to dashboard
    res.redirect('/dashboard?message=Email confirmed! Welcome to Basement.');
  } catch (error) {
    console.error('Email verification error:', error);
    res.redirect('/verify-email?error=Verification failed. Please try again.');
  }
};

// POST /resend-code - Resend verification code (returns JSON)
const resendCode = async (req, res) => {
  try {
    // Get email from either unverified session or logged-in user
    let email = req.session.unverifiedEmail || req.session.userEmail;

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
