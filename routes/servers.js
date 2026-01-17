const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const serverController = require('../controllers/serverController');

// Server actions (start, stop, restart)
router.post('/server-action', requireAuth, serverController.serverAction);

// Delete server
router.post('/delete-server', requireAuth, serverController.deleteServer);

// Deploy application
router.post('/deploy', requireAuth, serverController.deploy);

// Add custom domain
router.post('/add-domain', requireAuth, serverController.addDomain);

// Enable SSL for domain
router.post('/enable-ssl', requireAuth, serverController.enableSSL);

module.exports = router;
