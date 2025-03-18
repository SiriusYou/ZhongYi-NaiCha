/**
 * Global error handling middleware
 * Provides consistent error responses across the API
 * 
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
module.exports = function(err, req, res, next) {
  // Log error for server-side debugging
  console.error('Error:', err);
  
  // Default error status code
  const statusCode = err.statusCode || 500;
  
  // Create formatted error response
  const errorResponse = {
    success: false,
    error: err.name || 'Error',
    message: err.message || 'An unexpected error occurred',
    // Include stack trace in development only
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };
  
  // Add validation errors if available
  if (err.errors) {
    errorResponse.errors = err.errors;
  }
  
  // Add error code if available
  if (err.code) {
    errorResponse.code = err.code;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
}; 