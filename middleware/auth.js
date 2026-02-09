const pool = require('../db');

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    // Check if it's an API request (client expects JSON response)
    const acceptsJson = req.headers['accept']?.includes('application/json');
    const isApiPath = req.path.startsWith('/api') || req.path === '/create-payment-intent';
    
    if (acceptsJson || isApiPath || req.xhr) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    res.redirect('/login?warning=Please login to continue');
  }
}

// Admin-only guard (always checks database for security)
async function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/dashboard?error=Admin access required');
  }
  
  try {
    const userId = req.session.userId;
    
    // Always query database (no cache - prevents cache poisoning)
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      // User doesn't exist - invalidate session
      req.session.destroy();
      return res.redirect('/login?error=Session invalid');
    }
    
    const actualRole = result.rows[0].role;
    
    // Verify admin role
    if (actualRole === 'admin') {
      return next();
    } else {
      return res.redirect('/dashboard?error=Admin access required');
    }
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).send('Authentication error');
  }
}

module.exports = { requireAuth, requireAdmin };
