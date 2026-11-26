// src/middleware/authenticateToken.js
const { verifyToken } = require('../utils/tokenUtils');

/**
 * Authentication Middleware:
 * Inspects incoming HTTP requests for a valid JSON Web Token (JWT) in the Authorization header.
 *
 * If valid: attaches decoded user identity to req.user and calls next().
 * If invalid: responds with 401 Unauthorized.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Check if Authorization header is provided
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: { message: 'Authentication required. Missing Authorization header.' },
    });
  }

  // Header format MUST be "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      error: { message: 'Malformed Authorization header. Format must be "Bearer <token>".' },
    });
  }

  const token = parts[1];

  try {
    // Verify the JWT signature and expiration using our server secret
    const decoded = verifyToken(token);

    // Enforce that decoded token contains required identity fields
    if (!decoded || !decoded.userId || !decoded.role) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid token payload.' },
      });
    }

    // Attach verified identity strictly to req.user
    // Never trust identity claims passed in req.body or req.query!
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Access token has expired. Please log in again.' },
      });
    }

    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or forged access token.' },
    });
  }
}

module.exports = authenticateToken;
