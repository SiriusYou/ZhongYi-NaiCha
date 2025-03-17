/**
 * Authentication middleware for API Gateway
 * Validates JWT tokens before forwarding requests to protected microservices
 */

const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token is present
  if (!token) {
    return res.status(401).json({ 
      error: 'Authorization Denied',
      message: 'No authentication token provided' 
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user info to request
    req.user = decoded.user;
    
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    res.status(401).json({ 
      error: 'Authorization Denied',
      message: 'Invalid authentication token' 
    });
  }
}; 