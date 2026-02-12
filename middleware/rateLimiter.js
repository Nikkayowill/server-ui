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

const emailVerifyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 verification attempts per hour
  message: 'Too many verification attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const deploymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 deployments per hour per user
  message: 'Too many deployments, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.session?.userId?.toString() || 'anonymous' // Rate limit by user ID only
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8, // 8 login attempts per 15 minutes per IP
  message: 'Too many login attempts, please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registration attempts per hour per IP
  message: 'Too many registration attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  generalLimiter,
  contactLimiter,
  paymentLimiter,
  emailVerifyLimiter,
  deploymentLimiter,
  loginLimiter,
  registrationLimiter
};
