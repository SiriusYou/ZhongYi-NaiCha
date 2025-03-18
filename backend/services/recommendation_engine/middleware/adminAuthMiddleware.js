/**
 * Admin authentication middleware
 * Verifies that the authenticated user has admin privileges
 * Should be used after the authMiddleware
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
module.exports = function(req, res, next) {
  // Check if user exists and has admin role
  if (!req.user || !req.user.role || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied',
      message: 'Admin privileges required for this operation'
    });
  }
  
  next();
}; 