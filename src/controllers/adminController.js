// src/controllers/adminController.js
const userModel = require('../models/userModel');

/**
 * List all registered users (Admin only).
 * Protected by authenticateToken and authorizeRole('admin').
 */
async function getAllUsers(req, res, next) {
  try {
    const users = await userModel.findAllUsers();
    return res.status(200).json({
      success: true,
      data: {
        count: users.length,
        users,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllUsers,
};
