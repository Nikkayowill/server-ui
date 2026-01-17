const express = require('express');
const router = express.Router();
const csrf = require('csurf');
const { body } = require('express-validator');
const { contactLimiter } = require('../middleware/rateLimiter');

// Import all page controllers (will create next)
const homeController = require('../controllers/homeController');
const aboutController = require('../controllers/aboutController');
const pricingController = require('../controllers/pricingController');
const termsController = require('../controllers/termsController');
const privacyController = require('../controllers/privacyController');
const faqController = require('../controllers/faqController');
const docsController = require('../controllers/docsController');
const contactController = require('../controllers/contactController');

const csrfProtection = csrf({ cookie: true });

// Static pages
router.get('/', homeController.showHome);
router.get('/about', aboutController.showAbout);
router.get('/pricing', pricingController.showPricing);
router.get('/terms', termsController.showTerms);
router.get('/privacy', privacyController.showPrivacy);
router.get('/faq', faqController.showFaq);
router.get('/docs', docsController.showDocs);

// Contact form
router.get('/contact', csrfProtection, contactController.showContact);
router.post('/contact', 
  contactLimiter,
  csrfProtection,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').trim().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 1000 })
  ],
  contactController.submitContact
);

module.exports = router;
