/**
 * Admin authentication middleware for protecting admin-only routes
 * This middleware should be used after the regular auth middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
module.exports = function(req, res, next) {
  // Check if user exists in request (set by auth middleware)
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'User authentication required before checking admin status' 
    });
  }

  // Check if user has admin role
  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Admin privileges required.' 
    });
  }

  // If user is admin, proceed
  next();
};