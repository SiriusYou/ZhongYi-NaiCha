/**
 * Admin middleware
 * Checks if user has admin or moderator role
 */

const admin = (req, res, next) => {
  try {
    // Check if user is authenticated and has role in user object
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        error: 'Authorization Denied',
        message: 'No authentication provided'
      });
    }

    // Check if user role is admin or moderator
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'This action requires admin or moderator privileges'
      });
    }

    // User is admin or moderator, proceed
    next();
  } catch (err) {
    console.error('Admin middleware error:', err.message);
    res.status(500).json({
      error: 'Server Error',
      message: 'An unexpected error occurred while checking admin privileges'
    });
  }
};

module.exports = admin; 