const express = require('express');
const router = express.Router();
const csrf = require('csurf');
const { requireAuth } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const paymentController = require('../controllers/paymentController');

const csrfProtection = csrf({ cookie: true });

// Checkout page
router.get('/pay', requireAuth, csrfProtection, paymentController.showCheckout);

// Create Stripe checkout session
router.post('/create-checkout-session', requireAuth, paymentLimiter, csrfProtection, paymentController.createCheckoutSession);

// Payment success/cancel pages
router.get('/payment-success', requireAuth, paymentController.paymentSuccess);
router.get('/payment-cancel', requireAuth, paymentController.paymentCancel);

// Stripe webhook (raw body required - configured in index.js)
router.post('/webhook/stripe', express.raw({type: 'application/json'}), paymentController.stripeWebhook);

module.exports = router;
