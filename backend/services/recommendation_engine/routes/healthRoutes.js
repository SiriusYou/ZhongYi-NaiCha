const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * @route   GET /health
 * @desc    Basic health check endpoint
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'recommendation-engine',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /health/detailed
 * @desc    Detailed health check with dependency status
 * @access  Public
 */
router.get('/detailed', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    
    res.status(200).json({
      status: 'ok',
      service: 'recommendation-engine',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        database: {
          status: dbStatus,
          type: 'MongoDB'
        }
      },
      system: {
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
        },
        node: process.version,
        platform: process.platform,
        pid: process.pid
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'recommendation-engine',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route   GET /health/ready
 * @desc    Readiness check for the service
 * @access  Public
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'error',
        service: 'recommendation-engine',
        timestamp: new Date().toISOString(),
        message: 'Database connection not ready'
      });
    }
    
    // Service is ready to handle traffic
    res.status(200).json({
      status: 'ok',
      service: 'recommendation-engine',
      timestamp: new Date().toISOString(),
      message: 'Service is ready to handle traffic'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'recommendation-engine',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route   GET /health/live
 * @desc    Liveness check for the service
 * @access  Public
 */
router.get('/live', (req, res) => {
  // Simple check that the service is running
  res.status(200).json({
    status: 'ok',
    service: 'recommendation-engine',
    timestamp: new Date().toISOString(),
    message: 'Service is alive'
  });
});

module.exports = router; 