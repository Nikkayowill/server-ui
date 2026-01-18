// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login?message=Please login to proceed with payment');
  }
}

// Admin-only guard; relies on req.session.userRole being set during login
function requireAdmin(req, res, next) {
  if (req.session.userId && req.session.userRole === 'admin') {
    return next();
  }
  return res.redirect('/dashboard?error=Admin access required');
}

module.exports = { requireAuth, requireAdmin };
