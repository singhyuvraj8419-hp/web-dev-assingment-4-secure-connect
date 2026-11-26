// server.js
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const config = require('./src/config/env');
const { connectDB, closeDB } = require('./src/config/database');
const authRoutes = require('./src/routes/authRoutes');
const noteRoutes = require('./src/routes/noteRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const { initializeChatSocket } = require('./src/sockets/chatSocket');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO on the same HTTP server
const io = new Server(server, {
  cors: {
    // Restrict socket origins in development to localhost clients
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach Socket.IO handlers
initializeChatSocket(io);

// Security & Parsing Middleware
// Set essential defensive HTTP headers without external bloated dependencies
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Restrict request body size to prevent memory exhaustion attacks
app.use(express.json({ limit: '100kb' }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Secure Connect and Communication Platform API is healthy.',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Application Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/admin', adminRoutes);

// Centralized 404 and Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Start the application server.
 */
async function startServer() {
  try {
    // Connect to MongoDB before accepting traffic
    await connectDB();

    server.listen(config.PORT, () => {
      console.log(`====================================================`);
      console.log(`  Secure Connect and Communication Platform Started `);
      console.log(`  Environment : ${config.NODE_ENV}`);
      console.log(`  Port        : ${config.PORT}`);
      console.log(`  Health Check: http://localhost:${config.PORT}/api/health`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err.message);
    process.exit(1);
  }
}

// Graceful Shutdown Handling
async function handleShutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}. Closing server and database connection...`);
  server.close(async () => {
    try {
      await closeDB();
      console.log('[SHUTDOWN] Clean shutdown complete.');
      process.exit(0);
    } catch (err) {
      console.error('[SHUTDOWN] Error during shutdown:', err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// Start server if run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer };
