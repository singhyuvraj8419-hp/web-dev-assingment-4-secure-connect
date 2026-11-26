// src/models/noteModel.js
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

const COLLECTION_NAME = 'notes';

/**
 * Format raw note document for API response.
 */
function toSafeNote(doc) {
  if (!doc) return null;
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    title: doc.title,
    content: doc.content,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Create a new note owned by the authenticated user.
 */
async function createNote({ userId, title, content }) {
  const db = getDB();
  const now = new Date();

  const newNote = {
    userId: userId.toString(), // Store owner ID derived strictly from JWT
    title: title.trim(),
    content: content.trim(),
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection(COLLECTION_NAME).insertOne(newNote);
  return {
    ...newNote,
    _id: result.insertedId,
  };
}

/**
 * Find all notes belonging to a specific user.
 * Database query explicitly enforces ownership constraint.
 */
async function findNotesByUserId(userId) {
  const db = getDB();
  const notes = await db
    .collection(COLLECTION_NAME)
    .find({ userId: userId.toString() })
    .sort({ createdAt: -1 })
    .toArray();

  return notes.map(toSafeNote);
}

/**
 * Find a specific note by ID and owner ID.
 * Direct database-level ownership check.
 */
async function findNoteByIdAndUser(noteId, userId) {
  if (!ObjectId.isValid(noteId)) {
    return null;
  }

  const db = getDB();
  const note = await db.collection(COLLECTION_NAME).findOne({
    _id: new ObjectId(noteId),
    userId: userId.toString(),
  });

  return toSafeNote(note);
}

/**
 * Update note content/title for a note owned by user.
 * Ownership check is embedded directly in the update filter.
 */
async function updateNoteByIdAndUser(noteId, userId, { title, content }) {
  if (!ObjectId.isValid(noteId)) {
    return null;
  }

  const updateFields = {
    updatedAt: new Date(),
  };

  if (typeof title === 'string') {
    updateFields.title = title.trim();
  }
  if (typeof content === 'string') {
    updateFields.content = content.trim();
  }

  const db = getDB();
  const result = await db.collection(COLLECTION_NAME).findOneAndUpdate(
    {
      _id: new ObjectId(noteId),
      userId: userId.toString(),
    },
    { $set: updateFields },
    { returnDocument: 'after' }
  );

  return toSafeNote(result);
}

/**
 * Delete a note owned by user.
 * Ownership check is embedded directly in the delete filter.
 */
async function deleteNoteByIdAndUser(noteId, userId) {
  if (!ObjectId.isValid(noteId)) {
    return false;
  }

  const db = getDB();
  const result = await db.collection(COLLECTION_NAME).deleteOne({
    _id: new ObjectId(noteId),
    userId: userId.toString(),
  });

  return result.deletedCount > 0;
}

module.exports = {
  toSafeNote,
  createNote,
  findNotesByUserId,
  findNoteByIdAndUser,
  updateNoteByIdAndUser,
  deleteNoteByIdAndUser,
};
