const express = require('express');
const { check, validationResult } = require('express-validator');
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Middleware
const auth = require('../middleware/auth');

// Models
const AnalysisReport = require('../models/AnalysisReport');

// Utilities
const { analyzeConsumption, generateHealthInsights } = require('../utils/analysisHelpers');
const { generateHealthReport, generateTrendsReport } = require('../utils/pdfGenerator');
const { generateLineChart, generateBarChart, generatePieChart } = require('../utils/chartGenerator');
const { 
  getUserData, 
  getHealthData, 
  getHealthDataHistory,
  getConsumptionData, 
  getRecipeDetails, 
  getRecommendations 
} = require('../utils/serviceRequests');

// @route   GET api/reports
// @desc    Get all reports for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const reports = await AnalysisReport.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('-insights -charts.filePath');

    res.json(reports);
  } catch (err) {
    console.error('Error fetching reports:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/reports/:id
// @desc    Get a specific report
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const report = await AnalysisReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ msg: 'Report not found' });
    }
    
    // Check if the report belongs to the user
    if (report.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    res.json(report);
  } catch (err) {
    console.error('Error fetching report:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Report not found' });
    }
    
    res.status(500).send('Server Error');
  }
});

// @route   POST api/reports/health
// @desc    Generate a health analysis report
// @access  Private
router.post(
  '/health',
  [
    auth,
    [
      check('startDate', 'Start date is required').not().isEmpty(),
      check('endDate', 'End date is required').not().isEmpty(),
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, title } = req.body;
    
    try {
      // Fetch user profile data
      const userProfile = await getUserData(req.user.id, req.header('x-auth-token'));
      const healthData = await getHealthData(req.user.id, req.header('x-auth-token'));
      
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
      
      // Get recipe details for all consumed items
      const recipeIds = new Set();
      consumptionData.forEach(order => {
        order.items.forEach(item => {
          recipeIds.add(item.product.toString());
        });
      });
      
      const recipeDetails = await getRecipeDetails(
        Array.from(recipeIds), 
        req.header('x-auth-token')
      );
      
      // Analyze consumption patterns
      const analysis = analyzeConsumption(consumptionData, recipeDetails);
      
      // Generate health insights
      const insights = generateHealthInsights(analysis, healthData);
      
      // Generate charts for the report
      const chartPaths = [];
      
      // Consumption by nature chart
      if (analysis.consumptionByProperty.nature && Object.keys(analysis.consumptionByProperty.nature).length > 0) {
        const natureData = {
          labels: Object.keys(analysis.consumptionByProperty.nature),
          data: Object.values(analysis.consumptionByProperty.nature)
        };
        
        const natureChartPath = await generatePieChart(
          natureData,
          'Consumption by TCM Nature',
          `nature-${req.user.id}-${Date.now()}.png`
        );
        
        chartPaths.push({
          title: 'Consumption by TCM Nature',
          path: natureChartPath,
          type: 'pie'
        });
      }
      
      // Favorite recipes chart
      if (analysis.favoriteRecipes && analysis.favoriteRecipes.length > 0) {
        const recipeData = {
          labels: analysis.favoriteRecipes.map(r => r.name),
          data: analysis.favoriteRecipes.map(r => r.count)
        };
        
        const recipesChartPath = await generateBarChart(
          recipeData,
          'Most Consumed Recipes',
          `recipes-${req.user.id}-${Date.now()}.png`
        );
        
        chartPaths.push({
          title: 'Most Consumed Recipes',
          path: recipesChartPath,
          type: 'bar'
        });
      }
      
      // Frequent ingredients chart
      if (analysis.frequentIngredients && analysis.frequentIngredients.length > 0) {
        const ingredientData = {
          labels: analysis.frequentIngredients.slice(0, 5).map(i => i.name),
          data: analysis.frequentIngredients.slice(0, 5).map(i => i.count)
        };
        
        const ingredientsChartPath = await generateBarChart(
          ingredientData,
          'Most Common Ingredients',
          `ingredients-${req.user.id}-${Date.now()}.png`
        );
        
        chartPaths.push({
          title: 'Most Common Ingredients',
          path: ingredientsChartPath,
          type: 'bar'
        });
      }
      
      // Generate frequency by day chart
      if (analysis.frequencyByDay && Object.keys(analysis.frequencyByDay).length > 0) {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const sortedDays = Object.keys(analysis.frequencyByDay)
          .sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
        
        const dayData = {
          labels: sortedDays,
          data: sortedDays.map(day => analysis.frequencyByDay[day] || 0)
        };
        
        const daysChartPath = await generateBarChart(
          dayData,
          'Consumption by Day of Week',
          `days-${req.user.id}-${Date.now()}.png`
        );
        
        chartPaths.push({
          title: 'Consumption by Day of Week',
          path: daysChartPath,
          type: 'bar'
        });
      }
      
      // Generate PDF report
      const reportFileName = `health-report-${req.user.id}-${Date.now()}.pdf`;
      const pdfPath = await generateHealthReport(
        userProfile,
        {
          analysis,
          insights,
          period: {
            startDate: moment(startDate).format('YYYY-MM-DD'),
            endDate: moment(endDate).format('YYYY-MM-DD'),
          }
        },
        chartPaths.map(chart => chart.path),
        reportFileName
      );
      
      // Get the PDF URL
      const pdfUrl = `/storage/pdfs/${reportFileName}`;
      
      // Save the report to database
      const reportTitle = title || `Health Analysis Report (${moment(startDate).format('MMM D')} - ${moment(endDate).format('MMM D, YYYY')})`;
      
      const insightsToSave = [];
      
      // Add positive patterns as insights
      insights.positivePatterns.forEach(pattern => {
        insightsToSave.push({
          category: 'Positive Pattern',
          description: pattern,
          level: 'info'
        });
      });
      
      // Add improvement suggestions as insights
      insights.improvementSuggestions.forEach(suggestion => {
        insightsToSave.push({
          category: 'Improvement Suggestion',
          description: suggestion,
          level: 'recommendation'
        });
      });
      
      // Add seasonal recommendations as insights
      if (insights.seasonalRecommendations && insights.seasonalRecommendations.season) {
        insightsToSave.push({
          category: 'Seasonal Recommendation',
          description: `For ${insights.seasonalRecommendations.season}, focus on ${insights.seasonalRecommendations.healthFocus.join(' and ')}.`,
          level: 'recommendation'
        });
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
        reportType: 'health',
        title: reportTitle,
        summary: `Health analysis based on ${consumptionData.length} orders between ${moment(startDate).format('MMM D')} and ${moment(endDate).format('MMM D, YYYY')}.`,
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
        message: 'Health analysis report generated successfully'
      });
    } catch (err) {
      console.error('Error generating health report:', err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/reports/consumption
// @desc    Generate a consumption analysis report
// @access  Private
router.post(
  '/consumption',
  [
    auth,
    [
      check('startDate', 'Start date is required').not().isEmpty(),
      check('endDate', 'End date is required').not().isEmpty(),
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, title } = req.body;
    
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
      
      // Get recipe details for all consumed items
      const recipeIds = new Set();
      consumptionData.forEach(order => {
        order.items.forEach(item => {
          recipeIds.add(item.product.toString());
        });
      });
      
      const recipeDetails = await getRecipeDetails(
        Array.from(recipeIds), 
        req.header('x-auth-token')
      );
      
      // Analyze consumption patterns
      const analysis = analyzeConsumption(consumptionData, recipeDetails);
      
      // Generate charts for the report
      const chartPaths = [];
      
      // Consumption by nature chart
      if (analysis.consumptionByProperty.nature && Object.keys(analysis.consumptionByProperty.nature).length > 0) {
        const natureData = {
          labels: Object.keys(analysis.consumptionByProperty.nature),
          data: Object.values(analysis.consumptionByProperty.nature)
        };
        
        const natureChartPath = await generatePieChart(
          natureData,
          'Consumption by TCM Nature',
          `nature-${req.user.id}-${Date.now()}.png`
        );
        
        chartPaths.push({
          title: 'Consumption by TCM Nature',
          path: natureChartPath,
          type: 'pie'
        });
      }
      
      // Consumption by taste chart
      if (analysis.consumptionByProperty.taste && Object.keys(analysis.consumptionByProperty.taste).length > 0) {
        const tasteData = {
          labels: Object.keys(analysis.consumptionByProperty.taste),
          data: Object.values(analysis.consumptionByProperty.taste)
        };
        
        const tasteChartPath = await generatePieChart(
          tasteData,
          'Consumption by TCM Taste',
          `taste-${req.user.id}-${Date.now()}.png`
        );
        
        chartPaths.push({
          title: 'Consumption by TCM Taste',
          path: tasteChartPath,
          type: 'pie'
        });
      }
      
      // Favorite recipes chart
      if (analysis.favoriteRecipes && analysis.favoriteRecipes.length > 0) {
        const recipeData = {
          labels: analysis.favoriteRecipes.map(r => r.name),
          data: analysis.favoriteRecipes.map(r => r.count)
        };
        
        const recipesChartPath = await generateBarChart(
          recipeData,
          'Most Consumed Recipes',
          `recipes-${req.user.id}-${Date.now()}.png`
        );
        
        chartPaths.push({
          title: 'Most Consumed Recipes',
          path: recipesChartPath,
          type: 'bar'
        });
      }
      
      // Generate frequency by day chart
      if (analysis.frequencyByDay && Object.keys(analysis.frequencyByDay).length > 0) {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const sortedDays = Object.keys(analysis.frequencyByDay)
          .sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
        
        const dayData = {
          labels: sortedDays,
          data: sortedDays.map(day => analysis.frequencyByDay[day] || 0)
        };
        
        const daysChartPath = await generateBarChart(
          dayData,
          'Consumption by Day of Week',
          `days-${req.user.id}-${Date.now()}.png`
        );
        
        chartPaths.push({
          title: 'Consumption by Day of Week',
          path: daysChartPath,
          type: 'bar'
        });
      }
      
      // Generate PDF report
      const reportFileName = `consumption-report-${req.user.id}-${Date.now()}.pdf`;
      const pdfPath = await generateHealthReport(
        userProfile,
        {
          analysis,
          period: {
            startDate: moment(startDate).format('YYYY-MM-DD'),
            endDate: moment(endDate).format('YYYY-MM-DD'),
          }
        },
        chartPaths.map(chart => chart.path),
        reportFileName
      );
      
      // Get the PDF URL
      const pdfUrl = `/storage/pdfs/${reportFileName}`;
      
      // Save the report to database
      const reportTitle = title || `Consumption Analysis Report (${moment(startDate).format('MMM D')} - ${moment(endDate).format('MMM D, YYYY')})`;
      
      const insightsToSave = [];
      
      // Add insights based on consumption patterns
      if (analysis.favoriteRecipes && analysis.favoriteRecipes.length > 0) {
        insightsToSave.push({
          category: 'Favorite Recipe',
          description: `Your most consumed recipe is ${analysis.favoriteRecipes[0].name} (${analysis.favoriteRecipes[0].count} times)`,
          level: 'info'
        });
      }
      
      if (analysis.frequentIngredients && analysis.frequentIngredients.length > 0) {
        insightsToSave.push({
          category: 'Common Ingredient',
          description: `Your most common ingredient is ${analysis.frequentIngredients[0].name} (${analysis.frequentIngredients[0].count} times)`,
          level: 'info'
        });
      }
      
      // Add day of week insight
      if (analysis.frequencyByDay && Object.keys(analysis.frequencyByDay).length > 0) {
        const maxDay = Object.entries(analysis.frequencyByDay)
          .reduce((a, b) => a[1] > b[1] ? a : b)[0];
        
        insightsToSave.push({
          category: 'Consumption Pattern',
          description: `You consume most teas on ${maxDay}s`,
          level: 'info'
        });
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
        reportType: 'consumption',
        title: reportTitle,
        summary: `Consumption analysis based on ${consumptionData.length} orders between ${moment(startDate).format('MMM D')} and ${moment(endDate).format('MMM D, YYYY')}.`,
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
        message: 'Consumption analysis report generated successfully'
      });
    } catch (err) {
      console.error('Error generating consumption report:', err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/reports/:id
// @desc    Delete a report
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const report = await AnalysisReport.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ msg: 'Report not found' });
    }
    
    // Check if the report belongs to the user
    if (report.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Delete associated files
    if (report.filePath && fs.existsSync(report.filePath)) {
      fs.unlinkSync(report.filePath);
    }
    
    // Delete associated chart files
    if (report.charts && report.charts.length > 0) {
      report.charts.forEach(chart => {
        if (chart.filePath && fs.existsSync(chart.filePath)) {
          fs.unlinkSync(chart.filePath);
        }
      });
    }
    
    await report.remove();
    
    res.json({ msg: 'Report deleted' });
  } catch (err) {
    console.error('Error deleting report:', err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Report not found' });
    }
    
    res.status(500).send('Server Error');
  }
});

module.exports = router; 