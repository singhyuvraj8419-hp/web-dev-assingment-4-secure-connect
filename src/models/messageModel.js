// src/models/messageModel.js
const { getDB } = require('../config/database');

const COLLECTION_NAME = 'messages';

/**
 * Persist an authenticated chat message to MongoDB.
 *
 * @param {Object} messageData
 * @param {string} messageData.conversationId - Validated conversation room ID
 * @param {string} messageData.senderId - Authenticated sender's user ID (from JWT)
 * @param {string} messageData.senderUsername - Authenticated sender's username (from JWT)
 * @param {string} messageData.message - Validated message text
 */
async function saveMessage({ conversationId, senderId, senderUsername, message }) {
  const db = getDB();
  const now = new Date();

  const newDoc = {
    conversationId: conversationId.trim(),
    senderId: senderId.toString(),
    senderUsername: senderUsername.trim(),
    message: message.trim(),
    timestamp: now,
  };

  const result = await db.collection(COLLECTION_NAME).insertOne(newDoc);
  return {
    id: result.insertedId.toString(),
    conversationId: newDoc.conversationId,
    senderId: newDoc.senderId,
    senderUsername: newDoc.senderUsername,
    message: newDoc.message,
    timestamp: newDoc.timestamp,
  };
}

/**
 * Retrieve recent messages for a conversation room.
 */
async function findMessagesByConversation(conversationId, limit = 50) {
  const db = getDB();
  const docs = await db
    .collection(COLLECTION_NAME)
    .find({ conversationId: conversationId.trim() })
    .sort({ timestamp: 1 })
    .limit(limit)
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    conversationId: doc.conversationId,
    senderId: doc.senderId,
    senderUsername: doc.senderUsername,
    message: doc.message,
    timestamp: doc.timestamp,
  }));
}

module.exports = {
  saveMessage,
  findMessagesByConversation,
};
