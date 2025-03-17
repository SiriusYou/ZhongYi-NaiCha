const express = require('express');
const { check, validationResult } = require('express-validator');
const moment = require('moment');
const path = require('path');
const router = express.Router();

// Middleware
const auth = require('../middleware/auth');

// Models
const AnalysisReport = require('../models/AnalysisReport');
const ConsumptionStat = require('../models/ConsumptionStat');

// Utilities
const { generateTrendData } = require('../utils/analysisHelpers');
const { generateLineChart, generateBarChart } = require('../utils/chartGenerator');
const { generateTrendsReport } = require('../utils/pdfGenerator');
const { 
  getUserData, 
  getConsumptionData, 
  getRecipeDetails, 
  getHealthDataHistory 
} = require('../utils/serviceRequests');

// @route   GET api/trends/consumption
// @desc    Get consumption trends data
// @access  Private
router.get('/consumption', auth, async (req, res) => {
  try {
    // Get query parameters
    const { 
      period = 'weekly',
      property = 'nature',
      limit = 12,
      startDate,
      endDate 
    } = req.query;
    
    // Validate property
    if (!['nature', 'taste', 'functions'].includes(property)) {
      return res.status(400).json({ msg: 'Invalid property. Must be nature, taste, or functions.' });
    }
    
    // Build query
    const query = { 
      userId: req.user.id,
      period
    };
    
    // Add date range if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Get consumption stats for the specified period
    const stats = await ConsumptionStat.find(query)
      .sort({ date: 1 })
      .limit(parseInt(limit, 10));
    
    if (!stats || stats.length === 0) {
      return res.status(404).json({ msg: 'No consumption data found for the specified parameters' });
    }
    
    // Extract dates and TCM property data
    const dates = stats.map(stat => moment(stat.date).format('MMM D'));
    
    // Find all unique properties across all stats
    const uniqueProperties = new Set();
    stats.forEach(stat => {
      const properties = stat.tcmProperties[property] || {};
      Object.keys(properties).forEach(prop => uniqueProperties.add(prop));
    });
    
    // Create data series for each property
    const series = [];
    uniqueProperties.forEach(prop => {
      const data = stats.map(stat => {
        const properties = stat.tcmProperties[property] || {};
        return properties[prop] || 0;
      });
      
      series.push({
        name: prop,
        data
      });
    });
    
    // Create result object
    const result = {
      dates,
      series,
      period,
      property
    };
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching consumption trends:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/trends/orders
// @desc    Get order trends data
// @access  Private
router.get('/orders', auth, async (req, res) => {
  try {
    // Get query parameters
    const { 
      period = 'weekly',
      metric = 'count', // count, items, or spending
      limit = 12,
      startDate,
      endDate 
    } = req.query;
    
    // Validate metric
    if (!['count', 'items', 'spending'].includes(metric)) {
      return res.status(400).json({ msg: 'Invalid metric. Must be count, items, or spending.' });
    }
    
    // Build query
    const query = { 
      userId: req.user.id,
      period
    };
    
    // Add date range if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Get consumption stats for the specified period
    const stats = await ConsumptionStat.find(query)
      .sort({ date: 1 })
      .limit(parseInt(limit, 10));
    
    if (!stats || stats.length === 0) {
      return res.status(404).json({ msg: 'No consumption data found for the specified parameters' });
    }
    
    // Extract dates and metric data
    const dates = stats.map(stat => moment(stat.date).format('MMM D'));
    let data;
    
    switch (metric) {
      case 'count':
        data = stats.map(stat => stat.totalOrders);
        break;
      case 'items':
        data = stats.map(stat => stat.totalItems);
        break;
      case 'spending':
        data = stats.map(stat => stat.totalSpent);
        break;
      default:
        data = stats.map(stat => stat.totalOrders);
    }
    
    // Create result object
    const result = {
      dates,
      data,
      period,
      metric
    };
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching order trends:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/trends/recipes
// @desc    Get recipe consumption trends
// @access  Private
router.get('/recipes', auth, async (req, res) => {
  try {
    // Get query parameters
    const { 
      period = 'weekly',
      limit = 12,
      recipeCount = 5,
      startDate,
      endDate 
    } = req.query;
    
    // Build query
    const query = { 
      userId: req.user.id,
      period
    };
    
    // Add date range if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Get consumption stats for the specified period
    const stats = await ConsumptionStat.find(query)
      .sort({ date: 1 })
      .limit(parseInt(limit, 10));
    
    if (!stats || stats.length === 0) {
      return res.status(404).json({ msg: 'No consumption data found for the specified parameters' });
    }
    
    // Find top recipes across all periods
    const recipeFrequency = {};
    
    stats.forEach(stat => {
      if (stat.recipes && stat.recipes.length > 0) {
        stat.recipes.forEach(recipe => {
          if (!recipeFrequency[recipe.recipeId]) {
            recipeFrequency[recipe.recipeId] = {
              id: recipe.recipeId,
              name: recipe.name,
              totalCount: 0
            };
          }
          
          recipeFrequency[recipe.recipeId].totalCount += recipe.count;
        });
      }
    });
    
    // Sort recipes by total count and take top N
    const topRecipes = Object.values(recipeFrequency)
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, parseInt(recipeCount, 10));
    
    // Extract dates
    const dates = stats.map(stat => moment(stat.date).format('MMM D'));
    
    // Create data series for each top recipe
    const series = [];
    topRecipes.forEach(topRecipe => {
      const data = stats.map(stat => {
        const recipe = stat.recipes.find(r => r.recipeId.toString() === topRecipe.id.toString());
        return recipe ? recipe.count : 0;
      });
      
      series.push({
        name: topRecipe.name,
        data
      });
    });
    
    // Create result object
    const result = {
      dates,
      series,
      period,
      topRecipes
    };
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching recipe trends:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/trends/report
// @desc    Generate a trends analysis report
// @access  Private
router.post(
  '/report',
  [
    auth,
    [
      check('startDate', 'Start date is required').not().isEmpty(),
      check('endDate', 'End date is required').not().isEmpty(),
      check('period', 'Period is required').isIn(['weekly', 'monthly', 'quarterly'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, period, title } = req.body;
    
    try {
      // Fetch user profile data
      const userProfile = await getUserData(req.user.id, req.header('x-auth-token'));
      
      // Fetch consumption data for the specified period
      const consumptionData = await getConsumptionData(
        req.user.id, 
        req.header('x-auth-token'),
        { startDate, endDate }
      );
      
      if (!consumptionData || consumptionData.length === 0) {
        return res.status(400).json({ 
          msg: 'No consumption data found for the specified period' 
        });
      }
      
      // Get unique recipe IDs from orders
      const recipeIds = new Set();
      consumptionData.forEach(order => {
        order.items.forEach(item => {
          recipeIds.add(item.product.toString());
        });
      });
      
      // Get recipe details
      const recipeDetails = await getRecipeDetails(
        Array.from(recipeIds), 
        req.header('x-auth-token')
      );
      
      // Get health data history (if available)
      let healthData = [];
      try {
        healthData = await getHealthDataHistory(
          req.user.id, 
          req.header('x-auth-token'),
          20 // Limit to last 20 records
        );
      } catch (err) {
        console.error('Error fetching health data history:', err.message);
        // Continue without health data
      }
      
      // Generate trend data
      const trendData = generateTrendData(consumptionData, recipeDetails, healthData);
      
      // Generate charts for the report
      const chartPaths = [];
      
      // Order counts trend chart
      if (trendData.timeLabels.length > 0 && trendData.consumption.orderCounts.length > 0) {
        const orderData = {
          labels: trendData.timeLabels,
          datasets: [{
            label: 'Number of Orders',
            data: trendData.consumption.orderCounts
          }]
        };
        
        const orderChartPath = await generateLineChart(
          orderData,
          'Order Frequency Trend',
          `orders-trend-${req.user.id}-${Date.now()}.png`
        );
        
        chartPaths.push({
          title: 'Order Frequency Trend',
          path: orderChartPath,
          type: 'line'
        });
      }
      
      // TCM Nature trends chart
      if (trendData.timeLabels.length > 0 && 
          trendData.consumption.propertyTrends.nature && 
          Object.keys(trendData.consumption.propertyTrends.nature).length > 0) {
        
        const datasets = [];
        
        Object.entries(trendData.consumption.propertyTrends.nature).forEach(([nature, values]) => {
          datasets.push({
            label: nature,
            data: values
          });
        });
        
        const natureData = {
          labels: trendData.timeLabels,
          datasets
        };
        
        const natureChartPath = await generateLineChart(
          natureData,
          'TCM Nature Consumption Trend',
          `nature-trend-${req.user.id}-${Date.now()}.png`,
          true // transparent
        );
        
        chartPaths.push({
          title: 'TCM Nature Consumption Trend',
          path: natureChartPath,
          type: 'line'
        });
      }
      
      // Health metrics chart if available
      if (trendData.timeLabels.length > 0 && 
          trendData.health && 
          Object.keys(trendData.health).length > 0) {
        
        // Pick the first health metric available for demonstration
        const healthMetric = Object.keys(trendData.health)[0];
        const healthValues = trendData.health[healthMetric];
        
        // Only create chart if we have actual values
        if (healthValues.some(val => val !== null)) {
          const healthData = {
            labels: trendData.timeLabels,
            datasets: [{
              label: healthMetric,
              data: healthValues
            }]
          };
          
          const healthChartPath = await generateLineChart(
            healthData,
            `${healthMetric} Trend`,
            `health-trend-${req.user.id}-${Date.now()}.png`
          );
          
          chartPaths.push({
            title: `${healthMetric} Trend`,
            path: healthChartPath,
            type: 'line'
          });
        }
      }
      
      // Generate PDF report
      const reportFileName = `trends-report-${req.user.id}-${Date.now()}.pdf`;
      const pdfPath = await generateTrendsReport(
        userProfile,
        {
          trendData,
          period: {
            startDate: moment(startDate).format('YYYY-MM-DD'),
            endDate: moment(endDate).format('YYYY-MM-DD'),
            periodType: period
          }
        },
        chartPaths.map(chart => chart.path),
        reportFileName
      );
      
      // Get the PDF URL
      const pdfUrl = `/storage/pdfs/${reportFileName}`;
      
      // Save the report to database
      const reportTitle = title || `Trends Analysis Report (${moment(startDate).format('MMM D')} - ${moment(endDate).format('MMM D, YYYY')})`;
      
      const insightsToSave = [];
      
      // Add insights based on trend data
      if (trendData.consumption && trendData.consumption.orderCounts) {
        // Calculate trend direction for orders
        const orderCounts = trendData.consumption.orderCounts;
        if (orderCounts.length >= 2) {
          const firstHalf = orderCounts.slice(0, Math.floor(orderCounts.length / 2));
          const secondHalf = orderCounts.slice(Math.floor(orderCounts.length / 2));
          
          const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
          const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
          
          const trendPercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
          
          if (trendPercent > 10) {
            insightsToSave.push({
              category: 'Consumption Trend',
              description: `Your tea consumption has increased by approximately ${Math.round(trendPercent)}% over the analyzed period`,
              level: 'info'
            });
          } else if (trendPercent < -10) {
            insightsToSave.push({
              category: 'Consumption Trend',
              description: `Your tea consumption has decreased by approximately ${Math.round(Math.abs(trendPercent))}% over the analyzed period`,
              level: 'warning'
            });
          } else {
            insightsToSave.push({
              category: 'Consumption Trend',
              description: 'Your tea consumption has remained relatively stable over the analyzed period',
              level: 'info'
            });
          }
        }
      }
      
      // Add TCM property trends insights
      if (trendData.consumption && trendData.consumption.propertyTrends.nature) {
        const natureTrends = trendData.consumption.propertyTrends.nature;
        
        // Find the most consistently consumed nature
        let mostConsistentNature = '';
        let highestConsistency = 0;
        
        Object.entries(natureTrends).forEach(([nature, values]) => {
          if (values.length >= 2) {
            // Calculate consistency as inverse of variation coefficient
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const nonZeroValues = values.filter(v => v > 0);
            if (nonZeroValues.length > 0 && avg > 0) {
              // Only calculate for natures that appear regularly
              const consistency = nonZeroValues.length / values.length;
              if (consistency > highestConsistency) {
                highestConsistency = consistency;
                mostConsistentNature = nature;
              }
            }
          }
        });
        
        if (mostConsistentNature) {
          insightsToSave.push({
            category: 'Property Trend',
            description: `You consistently consume teas with ${mostConsistentNature} nature properties`,
            level: 'info'
          });
        }
      }
      
      // Create charts array for database
      const chartsToSave = chartPaths.map(chart => {
        const filename = path.basename(chart.path);
        return {
          title: chart.title,
          description: `Chart showing ${chart.title.toLowerCase()}`,
          filePath: chart.path,
          fileUrl: `/storage/charts/${filename}`,
          chartType: chart.type
        };
      });
      
      const report = new AnalysisReport({
        userId: req.user.id,
        reportType: 'trends',
        title: reportTitle,
        summary: `Trends analysis based on ${consumptionData.length} orders between ${moment(startDate).format('MMM D')} and ${moment(endDate).format('MMM D, YYYY')}.`,
        filePath: pdfPath,
        fileUrl: pdfUrl,
        dataPoints: consumptionData.length,
        dateRange: {
          start: new Date(startDate),
          end: new Date(endDate)
        },
        insights: insightsToSave,
        charts: chartsToSave,
        metadata: {
          generatedBy: 'system',
          version: '1.0'
        }
      });
      
      await report.save();
      
      res.json({
        report,
        message: 'Trends analysis report generated successfully'
      });
    } catch (err) {
      console.error('Error generating trends report:', err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router; 