// src/controllers/authController.js
const bcrypt = require('bcrypt');
const config = require('../config/env');
const userModel = require('../models/userModel');
const { generateToken } = require('../utils/tokenUtils');
const appEvents = require('../events/appEvents');

/**
 * Handle user registration (Public signup).
 * New accounts are strictly assigned the 'user' role.
 */
async function signup(req, res, next) {
  try {
    const { username, email, password } = req.body;

    // Check for existing account by email
    const existingEmail = await userModel.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: { message: 'Email address is already registered.' },
      });
    }

    // Check for existing account by username
    const existingUsername = await userModel.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        error: { message: 'Username is already taken. Please choose another.' },
      });
    }

    // Hash the password using bcrypt with configured salt rounds
    const passwordHash = await bcrypt.hash(password, config.BCRYPT_SALT_ROUNDS);

    // Persist new user with strictly assigned 'user' role
    const createdUser = await userModel.createUser({
      username,
      email,
      passwordHash,
      role: 'user', // Public signup CANNOT assign admin privileges
    });

    const safeUser = userModel.toSafeUser(createdUser);

    // Emit internal event for structured audit logging
    appEvents.emit('user:registered', {
      userId: safeUser.id,
      username: safeUser.username,
      email: safeUser.email,
      role: safeUser.role,
      timestamp: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        user: safeUser,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle user login.
 * Verifies credentials, generates signed JWT, and returns safe user profile.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await userModel.findByEmail(email);
    if (!user) {
      // Use generic error message to prevent account enumeration
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password.' },
      });
    }

    // Verify password against stored bcrypt hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { message: 'Invalid email or password.' },
      });
    }

    // Generate signed JWT with user identity claims
    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    });

    const safeUser = userModel.toSafeUser(user);

    // Emit internal event for structured audit logging
    appEvents.emit('user:loggedIn', {
      userId: safeUser.id,
      username: safeUser.username,
      role: safeUser.role,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: safeUser,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Return authenticated user profile.
 * Route is protected by authenticateToken middleware.
 */
async function getMe(req, res, next) {
  try {
    const user = await userModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User account not found.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: userModel.toSafeUser(user),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  getMe,
};
