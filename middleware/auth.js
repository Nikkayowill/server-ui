// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login?message=Please login to proceed with payment');
  }
}

module.exports = { requireAuth };
