const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// Dashboard
router.get('/dashboard', requireAuth, dashboardController.showDashboard);

module.exports = router;
