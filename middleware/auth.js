const pool = require('../db');

// Simple in-memory cache for user roles (5-minute TTL)
const roleCache = new Map(); // userId -> { role, expiry }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login?message=Please login to proceed with payment');
  }
}

// Admin-only guard with database revalidation
async function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/dashboard?error=Admin access required');
  }
  
  try {
    const userId = req.session.userId;
    const now = Date.now();
    
    // Check cache first
    const cached = roleCache.get(userId);
    if (cached && cached.expiry > now) {
      if (cached.role === 'admin') {
        return next();
      } else {
        return res.redirect('/dashboard?error=Admin access required');
      }
    }
    
    // Cache miss or expired - query database
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
    
    // Update cache
    roleCache.set(userId, {
      role: actualRole,
      expiry: now + CACHE_TTL
    });
    
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
