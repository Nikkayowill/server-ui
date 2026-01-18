const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // Apply limiter only to non-GET requests to avoid throttling normal browsing
  // This prevents static asset and page loads from being rate limited
  max: 300, // 300 non-GET requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
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

module.exports = {
  generalLimiter,
  contactLimiter,
  paymentLimiter
};
