// src/controllers/noteController.js
const { ObjectId } = require('mongodb');
const noteModel = require('../models/noteModel');
const appEvents = require('../events/appEvents');

/**
 * Helper to validate MongoDB ObjectId string.
 */
function isValidId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

/**
 * Create a new note.
 * Owner ID is strictly bound to req.user.userId (from JWT).
 */
async function createNote(req, res, next) {
  try {
    const { title, content } = req.body;
    const userId = req.user.userId;

    const createdNote = await noteModel.createNote({
      userId,
      title,
      content,
    });

    const safeNote = noteModel.toSafeNote(createdNote);

    // Emit event for structured audit logging
    appEvents.emit('note:created', {
      noteId: safeNote.id,
      userId: safeNote.userId,
      title: safeNote.title,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      message: 'Note created successfully.',
      data: { note: safeNote },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List all notes owned by the authenticated user.
 */
async function getNotes(req, res, next) {
  try {
    const userId = req.user.userId;
    const notes = await noteModel.findNotesByUserId(userId);

    return res.status(200).json({
      success: true,
      data: {
        count: notes.length,
        notes,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve a single note by ID.
 * Returns 404 if the note doesn't exist or is owned by another user.
 */
async function getNoteById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid note ID format.' },
      });
    }

    const note = await noteModel.findNoteByIdAndUser(id, userId);
    if (!note) {
      // 404 prevents resource enumeration/leakage across users
      return res.status(404).json({
        success: false,
        error: { message: 'Note not found.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: { note },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update a note owned by the authenticated user.
 */
async function updateNote(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, content } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid note ID format.' },
      });
    }

    const updatedNote = await noteModel.updateNoteByIdAndUser(id, userId, {
      title,
      content,
    });

    if (!updatedNote) {
      return res.status(404).json({
        success: false,
        error: { message: 'Note not found or you do not have permission to edit it.' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Note updated successfully.',
      data: { note: updatedNote },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a note owned by the authenticated user.
 */
async function deleteNote(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid note ID format.' },
      });
    }

    const deleted = await noteModel.deleteNoteByIdAndUser(id, userId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Note not found or you do not have permission to delete it.' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Note deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
};
