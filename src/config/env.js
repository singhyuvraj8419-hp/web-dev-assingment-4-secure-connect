// src/config/env.js
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

/**
 * Validate and export application configuration.
 * Exits process early if critical secrets or variables are missing.
 */
function validateEnv() {
  const missingVars = [];

  if (!process.env.JWT_SECRET) {
    missingVars.push('JWT_SECRET');
  } else if (process.env.JWT_SECRET.length < 16) {
    console.error('FATAL ERROR: JWT_SECRET must be at least 16 characters long for adequate security.');
    process.exit(1);
  }

  if (!process.env.MONGO_URI) {
    missingVars.push('MONGO_URI');
  }

  if (missingVars.length > 0) {
    console.error(`FATAL ERROR: Missing required environment variable(s): ${missingVars.join(', ')}`);
    console.error('Please configure your .env file based on .env.example before starting the server.');
    process.exit(1);
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);
  if (isNaN(saltRounds) || saltRounds < 10) {
    console.warn('WARNING: BCRYPT_SALT_ROUNDS not set or less than 10. Defaulting to 12.');
  }

  return {
    PORT: parseInt(process.env.PORT, 10) || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
    BCRYPT_SALT_ROUNDS: isNaN(saltRounds) ? 12 : saltRounds,
  };
}

const config = validateEnv();

module.exports = config;
