const express = require('express');
const router = express.Router();
const AnalyticsService = require('../services/AnalyticsService');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Require authentication and admin privileges for all analytics routes
router.use(authMiddleware, adminMiddleware);

/**
 * @route GET /api/analytics/overview
 * @desc Get overview metrics for the dashboard
 * @access Admin
 */
router.get('/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };
    
    const metrics = await AnalyticsService.getOverviewMetrics(options);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching overview metrics:', error);
    res.status(500).json({ error: 'Failed to fetch overview metrics' });
  }
});

/**
 * @route GET /api/analytics/algorithm-performance
 * @desc Get algorithm performance metrics
 * @access Admin
 */
router.get('/algorithm-performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };
    
    const metrics = await AnalyticsService.getAlgorithmPerformance(options);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching algorithm performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch algorithm performance metrics' });
  }
});

/**
 * @route GET /api/analytics/content-performance
 * @desc Get content performance metrics
 * @access Admin
 */
router.get('/content-performance', async (req, res) => {
  try {
    const { startDate, endDate, contentType, limit } = req.query;
    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      contentType: contentType || null,
      limit: limit ? parseInt(limit) : 20
    };
    
    const metrics = await AnalyticsService.getContentPerformance(options);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching content performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch content performance metrics' });
  }
});

/**
 * @route GET /api/analytics/user-engagement
 * @desc Get user engagement metrics
 * @access Admin
 */
router.get('/user-engagement', async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 20
    };
    
    const metrics = await AnalyticsService.getUserEngagementMetrics(options);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching user engagement metrics:', error);
    res.status(500).json({ error: 'Failed to fetch user engagement metrics' });
  }
});

/**
 * @route GET /api/analytics/category-performance
 * @desc Get category performance metrics
 * @access Admin
 */
router.get('/category-performance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };
    
    const metrics = await AnalyticsService.getCategoryPerformance(options);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching category performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch category performance metrics' });
  }
});

/**
 * @route GET /api/analytics/time-metrics
 * @desc Get time-based user activity metrics
 * @access Admin
 */
router.get('/time-metrics', async (req, res) => {
  try {
    const { startDate, endDate, interval } = req.query;
    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      interval: interval || 'day'
    };
    
    const metrics = await AnalyticsService.getTimeBasedMetrics(options);
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching time-based metrics:', error);
    res.status(500).json({ error: 'Failed to fetch time-based metrics' });
  }
});

/**
 * @route GET /api/analytics/user/:userId/effectiveness
 * @desc Get recommendation effectiveness metrics for a specific user
 * @access Admin
 */
router.get('/user/:userId/effectiveness', async (req, res) => {
  try {
    const { userId } = req.params;
    const metrics = await AnalyticsService.getUserRecommendationEffectiveness(userId);
    
    if (!metrics) {
      return res.status(404).json({ error: 'No recommendation data found for this user' });
    }
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching user recommendation effectiveness:', error);
    res.status(500).json({ error: 'Failed to fetch user recommendation effectiveness' });
  }
});

/**
 * @route GET /api/analytics/export
 * @desc Export analytics data as CSV or JSON
 * @access Admin
 */
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate, format = 'json', type = 'overview' } = req.query;
    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    };
    
    let data;
    
    // Get the requested data type
    switch (type) {
      case 'overview':
        data = await AnalyticsService.getOverviewMetrics(options);
        break;
      case 'algorithm':
        data = await AnalyticsService.getAlgorithmPerformance(options);
        break;
      case 'content':
        data = await AnalyticsService.getContentPerformance(options);
        break;
      case 'user':
        data = await AnalyticsService.getUserEngagementMetrics(options);
        break;
      case 'category':
        data = await AnalyticsService.getCategoryPerformance(options);
        break;
      case 'time':
        data = await AnalyticsService.getTimeBasedMetrics(options);
        break;
      default:
        return res.status(400).json({ error: 'Invalid data type requested' });
    }
    
    // Handle different export formats
    if (format === 'csv') {
      // Convert data to CSV format (implementation depends on data structure)
      // This is a simplified example
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${type}-${new Date().toISOString()}.csv`);
      
      // Basic CSV conversion for demonstration purposes
      let csv = '';
      if (data) {
        // Convert to CSV based on data type
        // This is just a placeholder - would need proper CSV conversion logic
        csv = 'date,metric,value\n';
        csv += `${new Date().toISOString()},exported,${type}\n`;
      }
      
      return res.send(csv);
    } else {
      // Default to JSON format
      return res.json(data);
    }
  } catch (error) {
    console.error('Error exporting analytics data:', error);
    res.status(500).json({ error: 'Failed to export analytics data' });
  }
});

module.exports = router; 