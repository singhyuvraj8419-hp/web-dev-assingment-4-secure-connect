// src/routes/adminRoutes.js
const express = require('express');
const adminController = require('../controllers/adminController');
const authenticateToken = require('../middleware/authenticateToken');
const authorizeRole = require('../middleware/authorizeRole');

const router = express.Router();

// Require valid JWT AND admin role for all routes in this router
router.use(authenticateToken);
router.use(authorizeRole('admin'));

router.get('/users', adminController.getAllUsers);

module.exports = router;
