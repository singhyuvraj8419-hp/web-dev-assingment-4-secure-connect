// src/sockets/chatSocket.js
const { verifyToken } = require('../utils/tokenUtils');
const messageModel = require('../models/messageModel');
const appEvents = require('../events/appEvents');

/**
 * Validate whether a conversation room identifier is permitted for the given user.
 *
 * Direct Conversation Pattern:
 * Rooms follow format: `direct:<userA>_<userB>`
 * Both user IDs are concatenated in lexicographical order.
 * A user is authorized if and only if their authenticated userId matches userA or userB.
 *
 * @param {string} conversationId
 * @param {string} userId
 * @returns {boolean}
 */
function isUserAuthorizedForConversation(conversationId, userId) {
  if (typeof conversationId !== 'string') return false;

  const trimmed = conversationId.trim();

  // Pattern: direct:<id1>_<id2>
  if (trimmed.startsWith('direct:')) {
    const idsPart = trimmed.slice(7);
    const members = idsPart.split('_');
    if (members.length === 2) {
      return members[0] === userId || members[1] === userId;
    }
  }

  // Optional: Global announcement/broadcast room (allowed for all authenticated users)
  if (trimmed === 'global:announcements') {
    return true;
  }

  return false;
}

/**
 * Helper to generate canonical direct conversation ID between two user IDs.
 */
function getDirectConversationId(userId1, userId2) {
  const sorted = [String(userId1), String(userId2)].sort();
  return `direct:${sorted[0]}_${sorted[1]}`;
}

/**
 * Initialize Socket.IO with JWT authentication and real-time chat handlers.
 *
 * @param {import('socket.io').Server} io
 */
function initializeChatSocket(io) {
  // Connection Authentication Middleware
  io.use((socket, next) => {
    try {
      // Look for token in auth payload or headers
      let token = socket.handshake.auth && socket.handshake.auth.token;

      if (!token && socket.handshake.headers && socket.handshake.headers.authorization) {
        const parts = socket.handshake.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
          token = parts[1];
        }
      }

      if (!token) {
        return next(new Error('Authentication error: Missing access token.'));
      }

      // Verify JWT signature and expiration
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return next(new Error('Authentication error: Invalid token payload.'));
      }

      // Attach authenticated identity to socket instance
      socket.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
      };

      console.log(`[SOCKET] Authenticated connection accepted for user: ${socket.user.username} (ID: ${socket.user.userId})`);
      next();
    } catch (err) {
      console.warn(`[SOCKET] Authentication rejected: ${err.message}`);
      return next(new Error('Authentication error: Invalid or expired token.'));
    }
  });

  // Socket Connection Event Handler
  io.on('connection', (socket) => {
    const { userId, username } = socket.user;

    // Handle Event: chat:join
    socket.on('chat:join', async (payload, callback) => {
      try {
        const conversationId = payload && payload.conversationId;

        if (!conversationId || typeof conversationId !== 'string') {
          const errResponse = { success: false, error: 'A valid conversationId string is required.' };
          socket.emit('chat:error', errResponse);
          if (typeof callback === 'function') callback(errResponse);
          return;
        }

        // Authorization check: User must be a participant of the conversation
        if (!isUserAuthorizedForConversation(conversationId, userId)) {
          const errResponse = {
            success: false,
            error: 'Unauthorized: You are not a permitted member of this conversation room.',
          };
          socket.emit('chat:error', errResponse);
          if (typeof callback === 'function') callback(errResponse);
          return;
        }

        // Join the Socket.IO room
        socket.join(conversationId);

        // Fetch recent message history
        const history = await messageModel.findMessagesByConversation(conversationId, 50);

        const successResponse = {
          success: true,
          message: `Joined room ${conversationId}`,
          conversationId,
          history,
        };

        socket.emit('chat:joined', successResponse);
        if (typeof callback === 'function') callback(successResponse);
      } catch (err) {
        const errResponse = { success: false, error: 'Failed to join conversation room.' };
        socket.emit('chat:error', errResponse);
        if (typeof callback === 'function') callback(errResponse);
      }
    });

    // Handle Event: chat:send
    socket.on('chat:send', async (payload, callback) => {
      try {
        const { conversationId, message } = payload || {};

        if (!conversationId || typeof conversationId !== 'string') {
          const errResponse = { success: false, error: 'conversationId is required.' };
          socket.emit('chat:error', errResponse);
          if (typeof callback === 'function') callback(errResponse);
          return;
        }

        if (!message || typeof message !== 'string' || !message.trim()) {
          const errResponse = { success: false, error: 'Message cannot be empty.' };
          socket.emit('chat:error', errResponse);
          if (typeof callback === 'function') callback(errResponse);
          return;
        }

        if (message.trim().length > 2000) {
          const errResponse = { success: false, error: 'Message must not exceed 2,000 characters.' };
          socket.emit('chat:error', errResponse);
          if (typeof callback === 'function') callback(errResponse);
          return;
        }

        // Verify that the user is authorized to send to this conversation
        if (!isUserAuthorizedForConversation(conversationId, userId)) {
          const errResponse = {
            success: false,
            error: 'Unauthorized: You cannot send messages to a room you are not a member of.',
          };
          socket.emit('chat:error', errResponse);
          if (typeof callback === 'function') callback(errResponse);
          return;
        }

        // Persist message to database
        // Security: Sender identity is strictly derived from socket.user, NEVER from client payload!
        const savedMessage = await messageModel.saveMessage({
          conversationId: conversationId.trim(),
          senderId: userId,
          senderUsername: username,
          message: message.trim(),
        });

        // Broadcast to all sockets in the conversation room
        io.to(conversationId).emit('chat:message', savedMessage);

        // Emit internal EventEmitter event for structured audit logging
        appEvents.emit('chat:messageReceived', {
          conversationId: savedMessage.conversationId,
          senderId: savedMessage.senderId,
          senderUsername: savedMessage.senderUsername,
          timestamp: savedMessage.timestamp.toISOString(),
        });

        const successResponse = { success: true, message: savedMessage };
        if (typeof callback === 'function') callback(successResponse);
      } catch (err) {
        const errResponse = { success: false, error: 'Failed to process and save chat message.' };
        socket.emit('chat:error', errResponse);
        if (typeof callback === 'function') callback(errResponse);
      }
    });

    // Handle Disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[SOCKET] User ${username} disconnected (Reason: ${reason})`);
    });
  });
}

module.exports = {
  initializeChatSocket,
  isUserAuthorizedForConversation,
  getDirectConversationId,
};
