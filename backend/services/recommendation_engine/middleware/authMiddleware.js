const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Authentication middleware for protecting routes
 * Verifies JWT tokens and adds user data to request object
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required',
      message: 'No authentication token provided'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Add user data to request
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ 
      success: false, 
      error: 'Authentication failed',
      message: 'Invalid authentication token'
    });
  }
}; 