const bcrypt = require('bcrypt');
const pool = require('../db');
const { getHTMLHead, getScripts, getFooter, getAuthLinks, getResponsiveNav } = require('../helpers');

// GET /register
exports.showRegister = (req, res) => {
  const message = req.query.message || '';
  res.send(`
    ${getHTMLHead('Register')}
    <body>
      ${getResponsiveNav(getAuthLinks(req.session.userId))}
      <div class="container auth-container">
        <h1>Create an Account</h1>
        ${message ? `<div class="message error">${message}</div>` : ''}
        <form method="POST" action="/register" class="auth-form">
          <input type="hidden" name="_csrf" value="${req.csrfToken()}">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" required minlength="8">
          </div>
          <button type="submit" class="btn btn-primary">Register</button>
        </form>
        <p class="auth-link">Already have an account? <a href="/login">Login</a></p>
      </div>
      ${getFooter()}
      ${getScripts()}
    </body>
    </html>
  `);
};

// POST /register
exports.register = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Check if user exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.redirect('/register?message=Email already registered');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
      [email, hashedPassword]
    );
    
    // Set session
    req.session.userId = result.rows[0].id;
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    res.redirect('/register?message=Registration failed');
  }
};

// GET /login
exports.showLogin = (req, res) => {
  const message = req.query.message || '';
  res.send(`
    ${getHTMLHead('Login')}
    <body>
      ${getResponsiveNav(getAuthLinks(req.session.userId))}
      <div class="container auth-container">
        <h1>Login</h1>
        ${message ? `<div class="message error">${message}</div>` : ''}
        <form method="POST" action="/login" class="auth-form">
          <input type="hidden" name="_csrf" value="${req.csrfToken()}">
          <div class="form-group">
            <label>Email</label>
            <input type="email" name="email" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" name="password" required>
          </div>
          <button type="submit" class="btn btn-primary">Login</button>
        </form>
        <p class="auth-link">Don't have an account? <a href="/register">Register</a></p>
      </div>
      ${getFooter()}
      ${getScripts()}
    </body>
    </html>
  `);
};

// POST /login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.redirect('/login?message=Invalid credentials');
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.redirect('/login?message=Invalid credentials');
    }
    
    req.session.userId = user.id;
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/login?message=Login failed');
  }
};

// GET /logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
};
