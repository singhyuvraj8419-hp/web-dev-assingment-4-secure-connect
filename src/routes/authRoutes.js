// src/routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authenticateToken');
const { validateSignup, validateLogin } = require('../middleware/validateInput');

const router = express.Router();

// Public routes
router.post('/signup', validateSignup, authController.signup);
router.post('/login', validateLogin, authController.login);

// Protected routes (requires valid JWT)
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
