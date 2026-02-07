// pagesController.js - Re-export facade
// Individual controllers live in ./pages/ directory
// This file maintains backward compatibility with index.js route definitions

const { showAbout } = require('./pages/aboutController');
const { showTerms } = require('./pages/termsController');
const { showPricing } = require('./pages/pricingController');
const { showPrivacy } = require('./pages/privacyController');
const { showFaq } = require('./pages/faqController');
const { showDocs } = require('./pages/docsController');
const { showContact, submitContact } = require('./pages/contactController');
const { showHome } = require('./pages/homeController');
const { showSafety } = require('./pages/safetyController');

module.exports = {
  showAbout,
  showTerms,
  showPricing,
  showPrivacy,
  showFaq,
  showDocs,
  showContact,
  submitContact,
  showHome,
  showSafety
};
