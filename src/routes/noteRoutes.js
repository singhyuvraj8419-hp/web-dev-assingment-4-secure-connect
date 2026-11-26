// src/routes/noteRoutes.js
const express = require('express');
const noteController = require('../controllers/noteController');
const authenticateToken = require('../middleware/authenticateToken');
const { validateNoteCreate, validateNoteUpdate } = require('../middleware/validateInput');

const router = express.Router();

// Enforce JWT authentication on ALL note operations
router.use(authenticateToken);

router.post('/', validateNoteCreate, noteController.createNote);
router.get('/', noteController.getNotes);
router.get('/:id', noteController.getNoteById);
router.put('/:id', validateNoteUpdate, noteController.updateNote);
router.delete('/:id', noteController.deleteNote);

module.exports = router;
