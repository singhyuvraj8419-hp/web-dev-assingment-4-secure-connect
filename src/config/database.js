// src/config/database.js
const { MongoClient } = require('mongodb');
const config = require('./env');

let client = null;
let db = null;

/**
 * Connect to MongoDB and set up necessary indexes.
 */
async function connectDB() {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(config.MONGO_URI);
    await client.connect();

    // Use default db from connection string or explicitly 'secure_connect_platform'
    db = client.db('secure_connect_platform');

    // Setup essential unique indexes
    const usersCollection = db.collection('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true });

    // Setup index for notes queried by owner
    const notesCollection = db.collection('notes');
    await notesCollection.createIndex({ userId: 1, createdAt: -1 });

    // Setup index for chat messages queried by conversation
    const messagesCollection = db.collection('messages');
    await messagesCollection.createIndex({ conversationId: 1, timestamp: 1 });

    console.log('[DATABASE] Connected to MongoDB successfully. Indexes verified.');
    return db;
  } catch (err) {
    console.error('[DATABASE] Failed to connect to MongoDB:', err.message);
    throw err;
  }
}

/**
 * Get active MongoDB database instance.
 */
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Please call connectDB() first.');
  }
  return db;
}

/**
 * Close database connection gracefully.
 */
async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[DATABASE] MongoDB connection closed.');
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB,
};
