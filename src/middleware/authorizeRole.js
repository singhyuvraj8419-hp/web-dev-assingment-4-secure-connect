// src/middleware/authorizeRole.js

/**
 * Role-Based Access Control (RBAC) Middleware Factory:
 * Restricts access to routes based on user role established during authentication.
 *
 * @param {...string} allowedRoles - List of roles permitted to access the route (e.g. 'admin')
 * @returns {Function} Express middleware function
 */
function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    // Ensure request has already passed through authenticateToken
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authentication required before authorization check.' },
      });
    }

    // Check if the authenticated user's role matches one of the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Requires role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}.`,
        },
      });
    }

    next();
  };
}

module.exports = authorizeRole;
