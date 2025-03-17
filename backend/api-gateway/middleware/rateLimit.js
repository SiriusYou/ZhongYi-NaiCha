/**
 * Rate limiting middleware for API Gateway
 * Protects APIs from excessive requests
 */

const rateLimit = require('express-rate-limit');

// Get rate limit settings from environment variables
const WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000; // Default: 15 minutes
const DEFAULT_MAX = process.env.RATE_LIMIT_MAX || 100;
const AUTH_MAX = process.env.AUTH_RATE_LIMIT_MAX || 10;
const PUBLIC_MAX = process.env.PUBLIC_RATE_LIMIT_MAX || 300;

// Create different rate limiters for various endpoints
const createDefaultLimiter = () => rateLimit({
  windowMs: parseInt(WINDOW_MS, 10),
  max: parseInt(DEFAULT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'You have exceeded the request limit. Please try again later.'
  }
});

// More strict limits for auth endpoints to prevent brute force
const createAuthLimiter = () => rateLimit({
  windowMs: parseInt(WINDOW_MS, 10),
  max: parseInt(AUTH_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Authentication Attempts',
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  }
});

// Higher limits for public endpoints
const createPublicLimiter = () => rateLimit({
  windowMs: parseInt(WINDOW_MS, 10),
  max: parseInt(PUBLIC_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'You have exceeded the request limit. Please try again later.'
  }
});

module.exports = {
  defaultLimiter: createDefaultLimiter(),
  authLimiter: createAuthLimiter(),
  publicLimiter: createPublicLimiter()
}; 