// src/utils/tokenUtils.js
const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Generate a signed JWT for an authenticated user identity.
 *
 * @param {Object} payload - User claims to embed in token (userId, username, role)
 * @returns {string} Signed JWT string
 */
function generateToken(payload) {
  // Only embed non-sensitive identity claims in the payload
  const tokenPayload = {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
  };

  return jwt.sign(tokenPayload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 *
 * @param {string} token - Raw JWT string
 * @returns {Object} Decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken,
};
