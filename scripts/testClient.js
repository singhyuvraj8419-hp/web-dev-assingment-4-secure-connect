// scripts/testClient.js
/**
 * Small, documented Socket.IO test client using `socket.io-client`.
 *
 * Usage:
 *   node scripts/testClient.js <JWT_TOKEN> [conversationId] [message]
 *
 * Example:
 *   node scripts/testClient.js eyJhbGciOiJIUzI1NiIsIn... direct:userA_userB "Hello world"
 */

const { io } = require('socket.io-client');

const token = process.argv[2];
const conversationId = process.argv[3] || 'global:announcements';
const messageText = process.argv[4] || 'Hello from Socket.IO test client!';

if (!token) {
  console.error('Usage: node scripts/testClient.js <JWT_TOKEN> [conversationId] [message]');
  console.error('Hint: Log in via /api/auth/login first to retrieve a valid JWT.');
  process.exit(1);
}

const SERVER_URL = 'http://localhost:3000';
console.log(`[TEST CLIENT] Connecting to ${SERVER_URL}...`);

const socket = io(SERVER_URL, {
  auth: { token },
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log(`[TEST CLIENT] Connected successfully! Socket ID: ${socket.id}`);

  console.log(`[TEST CLIENT] Attempting to join conversation room: "${conversationId}"...`);
  socket.emit('chat:join', { conversationId }, (response) => {
    console.log('[TEST CLIENT] Server acknowledgement for chat:join:', response);

    if (response && response.success) {
      console.log(`[TEST CLIENT] Sending message: "${messageText}"...`);
      socket.emit('chat:send', { conversationId, message: messageText }, (sendAck) => {
        console.log('[TEST CLIENT] Server acknowledgement for chat:send:', sendAck);
      });
    }
  });
});

socket.on('chat:joined', (data) => {
  console.log('[TEST CLIENT] Event received [chat:joined]:', data);
});

socket.on('chat:message', (data) => {
  console.log('[TEST CLIENT] Event received [chat:message]:', data);
});

socket.on('chat:error', (error) => {
  console.error('[TEST CLIENT] Event received [chat:error]:', error);
});

socket.on('connect_error', (err) => {
  console.error('[TEST CLIENT] Connection rejected / error:', err.message);
  socket.close();
  process.exit(1);
});

// Auto-exit after 5 seconds to prevent hanging during automated tests
setTimeout(() => {
  console.log('[TEST CLIENT] Test client session finished. Closing connection.');
  socket.close();
  process.exit(0);
}, 4000);
