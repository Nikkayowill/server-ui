const bcrypt = require('bcrypt');
const pool = require('../db');
const { validationResult } = require('express-validator');
const { getHTMLHead, getFooter, getScripts, getResponsiveNav } = require('../helpers');
const { createEmailToken, isTokenValid } = require('../utils/emailToken');
const { sendConfirmationEmail } = require('../services/email');

// GET /register - Display registration form with CSRF token
const showRegister = (req, res) => {
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
    const { email, password } = req.body;
    
    // Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).send('Email already registered. <a href="/login">Login</a>');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Generate email confirmation token
    const { token, expiresAt } = createEmailToken();
    
    // Insert user with token
    await pool.query(
      'INSERT INTO users (email, password_hash, email_token, token_expires_at) VALUES ($1, $2, $3, $4)',
      [email, passwordHash, token, expiresAt]
    );

    // Send confirmation email
    const emailResult = await sendConfirmationEmail(email, token);
    
    if (emailResult.success) {
      req.session.flashMessage = `Confirmation email sent to ${email}. Check your inbox!`;
      res.redirect('/login');
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
    <link rel="stylesheet" href="/css/auth.css">
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
<body>
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

    // Check if email is confirmed
    if (!user.email_confirmed) {
      return res.redirect('/login?error=Please confirm your email before logging in.&email=' + encodeURIComponent(email));
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
    <link rel="stylesheet" href="/css/auth.css">
</head>
<body>
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
    <link rel="stylesheet" href="/css/auth.css">
</head>
<body>
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
    <link rel="stylesheet" href="/css/auth.css">
</head>
<body>
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
    <link rel="stylesheet" href="/css/auth.css">
</head>
<body>
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

    const user = result.rows[0];

    // Check if already confirmed
    if (user.email_confirmed) {
      return res.redirect('/login?message=Your email is already confirmed. You can login now.');
    }

    // Generate new token
    const { token, expiresAt } = createEmailToken();

    // Update user with new token
    await pool.query(
      'UPDATE users SET email_token = $1, token_expires_at = $2 WHERE email = $3',
      [token, expiresAt, email]
    );

    // Send confirmation email
    const emailResult = await sendConfirmationEmail(email, token);

    if (emailResult.success) {
      return res.redirect('/login?message=Confirmation email resent. Check your inbox!');
    } else {
      console.error('Failed to resend confirmation email:', emailResult.error);
      return res.redirect('/login?error=Failed to send email. Please try again later.');
    }
  } catch (error) {
    console.error('Resend confirmation error:', error);
    return res.redirect('/login?error=Failed to resend confirmation email');
  }
};

module.exports = {
  showRegister,
  handleRegister,
  showLogin,
  handleLogin,
  confirmEmail,
  handleLogout,
  resendConfirmation
};
