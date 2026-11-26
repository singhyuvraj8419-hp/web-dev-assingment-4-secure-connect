// src/events/appEvents.js
const EventEmitter = require('events');

/**
 * AppEventEmitter manages internal, process-level application events.
 *
 * NOTE FOR COLLEGE VIVA / LEARNING:
 * Node.js EventEmitter is an internal in-memory publish-subscribe mechanism.
 * It is completely distinct from Socket.IO:
 * - EventEmitter works INSIDE the server process between backend modules.
 * - Socket.IO works OVER THE NETWORK between the server and remote browser/mobile clients.
 * By default, EventEmitter calls listeners synchronously in the order they were registered.
 */
class AppEventEmitter extends EventEmitter {}

const appEvents = new AppEventEmitter();

// Prevent process crash if an 'error' event is emitted without a listener
appEvents.on('error', (err) => {
  console.error('[AUDIT EVENT ERROR] Unhandled event error:', err.message);
});

// Event Listener 1: User Registered
appEvents.on('user:registered', (payload) => {
  // Safe structured logging: NEVER log passwords or password hashes
  const timestamp = payload.timestamp || new Date().toISOString();
  console.log(`[AUDIT EVENT] [user:registered] timestamp="${timestamp}" userId="${payload.userId}" username="${payload.username}" email="${payload.email}" role="${payload.role}"`);
});

// Event Listener 2: User Logged In
appEvents.on('user:loggedIn', (payload) => {
  // Safe structured logging: NEVER log passwords or raw JWT tokens
  const timestamp = payload.timestamp || new Date().toISOString();
  console.log(`[AUDIT EVENT] [user:loggedIn] timestamp="${timestamp}" userId="${payload.userId}" username="${payload.username}" role="${payload.role}"`);
});

// Event Listener 3: Note Created
appEvents.on('note:created', (payload) => {
  // Safe structured logging: log metadata (id, userId, title length) NOT private content
  const timestamp = payload.timestamp || new Date().toISOString();
  console.log(`[AUDIT EVENT] [note:created] timestamp="${timestamp}" noteId="${payload.noteId}" userId="${payload.userId}" title="${payload.title}"`);
});

// Event Listener 4: Chat Message Received
appEvents.on('chat:messageReceived', (payload) => {
  // Safe structured logging: conversation metadata, sender ID, timestamp
  const timestamp = payload.timestamp || new Date().toISOString();
  console.log(`[AUDIT EVENT] [chat:messageReceived] timestamp="${timestamp}" conversationId="${payload.conversationId}" senderId="${payload.senderId}" sender="${payload.senderUsername}"`);
});

module.exports = appEvents;
