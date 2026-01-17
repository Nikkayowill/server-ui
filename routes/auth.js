const express = require('express');
const router = express.Router();
const csrf = require('csurf');
const authController = require('../controllers/authController');
const { body } = require('express-validator');

const csrfProtection = csrf({ cookie: true });

// GET /register
router.get('/register', csrfProtection, authController.showRegister);

// POST /register
router.post('/register',
  csrfProtection,
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  authController.register
);

// GET /login
router.get('/login', csrfProtection, authController.showLogin);

// POST /login
router.post('/login',
  csrfProtection,
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  authController.login
);

// GET /logout
router.get('/logout', authController.logout);

module.exports = router;
