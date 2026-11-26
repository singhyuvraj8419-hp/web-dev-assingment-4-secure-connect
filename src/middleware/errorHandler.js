// src/middleware/errorHandler.js
const config = require('../config/env');

/**
 * 404 Route Not Found Middleware.
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      message: `Resource not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

/**
 * Centralized Application Error Handling Middleware.
 * Catches all errors forwarded via next(err) or thrown synchronously.
 */
function errorHandler(err, req, res, next) {
  // If headers have already been sent to client, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle JSON body parse errors (e.g., malformed JSON sent in request body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: { message: 'Malformed JSON payload in request body.' },
    });
  }

  // Handle MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: { message: `An account with that ${field} already exists.` },
    });
  }

  // Determine appropriate HTTP status code
  const statusCode = err.statusCode || err.status || 500;

  // Log error details on the server side
  console.error(`[ERROR] ${req.method} ${req.originalUrl} - ${err.message}`);
  if (config.NODE_ENV === 'development' && statusCode === 500) {
    console.error(err.stack);
  }

  // Send sanitized, safe response to the client
  res.status(statusCode).json({
    success: false,
    error: {
      message: statusCode === 500 && config.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : err.message || 'An unexpected error occurred.',
    },
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
