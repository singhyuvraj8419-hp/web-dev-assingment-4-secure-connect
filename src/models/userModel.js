// src/models/userModel.js
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

const COLLECTION_NAME = 'users';

/**
 * Remove sensitive fields like passwordHash from user document before returning to client.
 */
function toSafeUser(userDoc) {
  if (!userDoc) return null;
  return {
    id: userDoc._id.toString(),
    username: userDoc.username,
    email: userDoc.email,
    role: userDoc.role,
    createdAt: userDoc.createdAt,
  };
}

/**
 * Create a new user in the database.
 */
async function createUser({ username, email, passwordHash, role = 'user' }) {
  const db = getDB();
  const now = new Date();

  const newUser = {
    username: username.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    role, // strictly assigned ('user' or 'admin' provisioned via script)
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection(COLLECTION_NAME).insertOne(newUser);
  return {
    ...newUser,
    _id: result.insertedId,
  };
}

/**
 * Find user by email (case-insensitive lookup via lowercased value).
 */
async function findByEmail(email) {
  const db = getDB();
  return db.collection(COLLECTION_NAME).findOne({
    email: email.trim().toLowerCase(),
  });
}

/**
 * Find user by username.
 */
async function findByUsername(username) {
  const db = getDB();
  return db.collection(COLLECTION_NAME).findOne({
    username: username.trim(),
  });
}

/**
 * Find user by MongoDB ObjectId.
 */
async function findById(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  const db = getDB();
  return db.collection(COLLECTION_NAME).findOne({
    _id: new ObjectId(id),
  });
}

/**
 * Return all users in safe format (Admin use only).
 */
async function findAllUsers() {
  const db = getDB();
  const users = await db
    .collection(COLLECTION_NAME)
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray();

  return users.map((u) => ({
    id: u._id.toString(),
    username: u.username,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  }));
}

module.exports = {
  toSafeUser,
  createUser,
  findByEmail,
  findByUsername,
  findById,
  findAllUsers,
};
