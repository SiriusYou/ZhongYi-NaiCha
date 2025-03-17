/**
 * API Gateway routes configuration
 * This file defines the routing for all microservices
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();
const auth = require('./middleware/auth');

// Middleware to handle forwarding requests to microservices
const forwardRequest = (targetServiceUrl) => {
  return async (req, res) => {
    try {
      // Build the target URL
      const url = `${targetServiceUrl}${req.originalUrl}`;
      
      // Forward the request with its method, headers, and body
      const response = await axios({
        method: req.method,
        url,
        data: req.body,
        headers: {
          'Content-Type': req.get('Content-Type') || 'application/json',
          // Forward authentication token if present
          ...(req.get('x-auth-token') ? { 'x-auth-token': req.get('x-auth-token') } : {})
        },
        // Forward query parameters
        params: req.query,
        // Set timeout
        timeout: 30000
      });
      
      // Return the response from the microservice
      return res.status(response.status).json(response.data);
    } catch (error) {
      console.error(`Error forwarding to ${targetServiceUrl}:`, error.message);
      
      // Return appropriate error based on the service response
      if (error.response) {
        // The service responded with an error status
        return res.status(error.response.status).json(error.response.data);
      } else if (error.request) {
        // The request was made but no response was received
        return res.status(503).json({ 
          error: 'Service Unavailable',
          message: 'The requested service is currently unavailable'
        });
      } else {
        // Something happened in setting up the request
        return res.status(500).json({ 
          error: 'Internal Server Error',
          message: 'Failed to process your request'
        });
      }
    }
  };
};

// Load service URLs from environment variables
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5000';
const RECOMMENDATION_SERVICE_URL = process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:5001';
const RECIPE_SERVICE_URL = process.env.RECIPE_SERVICE_URL || 'http://localhost:5002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:5003';
const COMMUNITY_SERVICE_URL = process.env.COMMUNITY_SERVICE_URL || 'http://localhost:5004';
const DATA_ANALYSIS_SERVICE_URL = process.env.DATA_ANALYSIS_SERVICE_URL || 'http://localhost:5005';
const KNOWLEDGE_SERVICE_URL = process.env.KNOWLEDGE_SERVICE_URL || 'http://localhost:5006';

// Public routes (no authentication required)
// User authentication routes
router.all('/api/auth/login', forwardRequest(USER_SERVICE_URL));
router.all('/api/auth/register', forwardRequest(USER_SERVICE_URL));
router.all('/api/auth/verify', forwardRequest(USER_SERVICE_URL));
// Public knowledge and recipe routes
router.all('/api/knowledge/public*', forwardRequest(KNOWLEDGE_SERVICE_URL));
router.all('/api/articles/public*', forwardRequest(KNOWLEDGE_SERVICE_URL));
router.all('/api/recipes/public*', forwardRequest(RECIPE_SERVICE_URL));
router.all('/api/categories/public*', forwardRequest(RECIPE_SERVICE_URL));

// Protected routes (authentication required)
// User service routes
router.all('/api/users*', auth, forwardRequest(USER_SERVICE_URL));
router.all('/api/auth/logout', auth, forwardRequest(USER_SERVICE_URL));
router.all('/api/profile*', auth, forwardRequest(USER_SERVICE_URL));

// Recommendation service routes
router.all('/api/recommendations*', auth, forwardRequest(RECOMMENDATION_SERVICE_URL));

// Knowledge center routes (protected)
router.all('/api/knowledge*', auth, forwardRequest(KNOWLEDGE_SERVICE_URL));
router.all('/api/articles*', auth, forwardRequest(KNOWLEDGE_SERVICE_URL));

// Recipe routes (protected)
router.all('/api/recipes*', auth, forwardRequest(RECIPE_SERVICE_URL));
router.all('/api/categories*', auth, forwardRequest(RECIPE_SERVICE_URL));
router.all('/api/ingredients*', auth, forwardRequest(RECIPE_SERVICE_URL));

// Order routes
router.all('/api/orders*', auth, forwardRequest(ORDER_SERVICE_URL));
router.all('/api/shops*', auth, forwardRequest(ORDER_SERVICE_URL));
router.all('/api/payments*', auth, forwardRequest(ORDER_SERVICE_URL));

// Community routes
router.all('/api/community*', auth, forwardRequest(COMMUNITY_SERVICE_URL));
router.all('/api/posts*', auth, forwardRequest(COMMUNITY_SERVICE_URL));
router.all('/api/comments*', auth, forwardRequest(COMMUNITY_SERVICE_URL));
router.all('/api/experts*', auth, forwardRequest(COMMUNITY_SERVICE_URL));
router.all('/api/discussions*', auth, forwardRequest(COMMUNITY_SERVICE_URL));
router.all('/api/notifications*', auth, forwardRequest(COMMUNITY_SERVICE_URL));
router.all('/api/likes*', auth, forwardRequest(COMMUNITY_SERVICE_URL));

// Data analysis routes
router.all('/api/reports*', auth, forwardRequest(DATA_ANALYSIS_SERVICE_URL));
router.all('/api/consumption*', auth, forwardRequest(DATA_ANALYSIS_SERVICE_URL));
router.all('/api/trends*', auth, forwardRequest(DATA_ANALYSIS_SERVICE_URL));
router.all('/api/insights*', auth, forwardRequest(DATA_ANALYSIS_SERVICE_URL));

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    gateway: 'active',
    timestamp: new Date().toISOString()
  });
});

// Service discovery - provide information about available services
router.get('/services', (req, res) => {
  res.status(200).json({
    services: [
      { name: 'user-service', url: USER_SERVICE_URL, endpoints: ['/api/users', '/api/auth', '/api/profile'] },
      { name: 'recommendation-service', url: RECOMMENDATION_SERVICE_URL, endpoints: ['/api/recommendations'] },
      { name: 'knowledge-service', url: KNOWLEDGE_SERVICE_URL, endpoints: ['/api/knowledge', '/api/articles'] },
      { name: 'recipe-service', url: RECIPE_SERVICE_URL, endpoints: ['/api/recipes', '/api/categories', '/api/ingredients'] },
      { name: 'order-service', url: ORDER_SERVICE_URL, endpoints: ['/api/orders', '/api/shops', '/api/payments'] },
      { name: 'community-service', url: COMMUNITY_SERVICE_URL, endpoints: ['/api/posts', '/api/comments', '/api/experts', '/api/discussions', '/api/notifications', '/api/likes'] },
      { name: 'data-analysis-service', url: DATA_ANALYSIS_SERVICE_URL, endpoints: ['/api/reports', '/api/consumption', '/api/trends', '/api/insights'] }
    ]
  });
});

module.exports = router; 