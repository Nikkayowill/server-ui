const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// Dashboard
router.get('/dashboard', requireAuth, dashboardController.showDashboard);
router.post('/submit-ticket', requireAuth, dashboardController.submitSupportTicket);
router.post('/change-password', requireAuth, dashboardController.changePassword);

module.exports = router;
