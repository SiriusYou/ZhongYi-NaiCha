const express = require('express');
const { check, validationResult } = require('express-validator');
const moment = require('moment');
const router = express.Router();

// Middleware
const auth = require('../middleware/auth');

// Models
const ConsumptionStat = require('../models/ConsumptionStat');

// Utilities
const { analyzeConsumption } = require('../utils/analysisHelpers');
const { getConsumptionData, getRecipeDetails } = require('../utils/serviceRequests');

// @route   GET api/consumption/stats
// @desc    Get consumption statistics for a user
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    // Get query parameters
    const { period = 'weekly', limit = 10, startDate, endDate } = req.query;
    
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
    
    // Query consumption stats
    const stats = await ConsumptionStat.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit, 10));
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching consumption stats:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/consumption/totals
// @desc    Get total consumption statistics
// @access  Private
router.get('/totals', auth, async (req, res) => {
  try {
    // Get query parameters
    const { startDate, endDate } = req.query;
    
    // Build query
    const query = { userId: req.user.id };
    
    // Add date range if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Aggregate consumption stats
    const totals = await ConsumptionStat.aggregate([
      { $match: query },
      { $group: {
        _id: null,
        totalOrders: { $sum: '$totalOrders' },
        totalItems: { $sum: '$totalItems' },
        totalSpent: { $sum: '$totalSpent' },
        // Count distinct recipes
        uniqueRecipes: { 
          $addToSet: '$recipes.recipeId' 
        }
      }},
      // Calculate aggregated stats
      { $project: {
        _id: 0,
        totalOrders: 1,
        totalItems: 1,
        totalSpent: 1,
        uniqueRecipesCount: { $size: '$uniqueRecipes' }
      }}
    ]);
    
    if (totals.length === 0) {
      return res.json({
        totalOrders: 0,
        totalItems: 0,
        totalSpent: 0,
        uniqueRecipesCount: 0
      });
    }
    
    res.json(totals[0]);
  } catch (err) {
    console.error('Error fetching total consumption stats:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/consumption/favorite-recipes
// @desc    Get user's favorite recipes
// @access  Private
router.get('/favorite-recipes', auth, async (req, res) => {
  try {
    // Get query parameters
    const { limit = 5, startDate, endDate } = req.query;
    
    // Build query
    const query = { userId: req.user.id };
    
    // Add date range if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Aggregate to find favorite recipes
    const favoriteRecipes = await ConsumptionStat.aggregate([
      { $match: query },
      // Unwind the recipes array
      { $unwind: '$recipes' },
      // Group by recipe
      { $group: {
        _id: '$recipes.recipeId',
        name: { $first: '$recipes.name' },
        totalCount: { $sum: '$recipes.count' },
        totalSpent: { $sum: '$recipes.totalAmount' }
      }},
      // Sort by count descending
      { $sort: { totalCount: -1 } },
      // Limit results
      { $limit: parseInt(limit, 10) },
      // Project final fields
      { $project: {
        _id: 0,
        recipeId: '$_id',
        name: 1,
        count: '$totalCount',
        totalSpent: 1
      }}
    ]);
    
    res.json(favoriteRecipes);
  } catch (err) {
    console.error('Error fetching favorite recipes:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/consumption/tcm-properties
// @desc    Get consumption by TCM properties
// @access  Private
router.get('/tcm-properties', auth, async (req, res) => {
  try {
    // Get query parameters
    const { propertyType = 'nature', startDate, endDate } = req.query;
    
    // Validate property type
    if (!['nature', 'taste', 'functions'].includes(propertyType)) {
      return res.status(400).json({ msg: 'Invalid property type. Must be nature, taste, or functions.' });
    }
    
    // Build query
    const query = { userId: req.user.id };
    
    // Add date range if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Define property path
    const propertyPath = `tcmProperties.${propertyType}`;
    
    // Aggregate consumption by TCM property
    const propertyConsumption = await ConsumptionStat.aggregate([
      { $match: query },
      // Unwind the properties map - this requires special handling for MongoDB maps
      { $project: {
        properties: { $objectToArray: `$${propertyPath}` }
      }},
      { $unwind: '$properties' },
      // Group by property
      { $group: {
        _id: '$properties.k',
        count: { $sum: '$properties.v' }
      }},
      // Sort by count descending
      { $sort: { count: -1 } },
      // Project final fields
      { $project: {
        _id: 0,
        property: '$_id',
        count: 1
      }}
    ]);
    
    res.json(propertyConsumption);
  } catch (err) {
    console.error('Error fetching TCM property consumption:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/consumption/generate-stats
// @desc    Generate/update consumption statistics
// @access  Private
router.post(
  '/generate-stats',
  [
    auth,
    [
      check('startDate', 'Start date is required').not().isEmpty(),
      check('endDate', 'End date is required').not().isEmpty(),
      check('period', 'Period is required').isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { startDate, endDate, period } = req.body;
    
    try {
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
      
      // Create recipesMap for easy lookup
      const recipesMap = recipeDetails.reduce((acc, recipe) => {
        acc[recipe._id] = recipe;
        return acc;
      }, {});
      
      // Group orders based on period
      const groupedOrders = {};
      
      consumptionData.forEach(order => {
        let periodKey;
        const orderDate = moment(order.createdAt);
        
        // Generate period key based on the specified period
        switch (period) {
          case 'daily':
            periodKey = orderDate.format('YYYY-MM-DD');
            break;
          case 'weekly':
            periodKey = `${orderDate.year()}-W${orderDate.week()}`;
            break;
          case 'monthly':
            periodKey = orderDate.format('YYYY-MM');
            break;
          case 'quarterly':
            const quarter = Math.floor((orderDate.month() / 3)) + 1;
            periodKey = `${orderDate.year()}-Q${quarter}`;
            break;
          case 'yearly':
            periodKey = orderDate.format('YYYY');
            break;
          default:
            periodKey = orderDate.format('YYYY-MM-DD');
        }
        
        if (!groupedOrders[periodKey]) {
          groupedOrders[periodKey] = [];
        }
        
        groupedOrders[periodKey].push(order);
      });
      
      // Generate stats for each period
      const generatedStats = [];
      
      for (const [periodKey, orders] of Object.entries(groupedOrders)) {
        // Get the date for this period
        let periodDate;
        switch (period) {
          case 'daily':
            periodDate = moment(periodKey, 'YYYY-MM-DD').toDate();
            break;
          case 'weekly':
            const [year, week] = periodKey.split('-W');
            periodDate = moment().year(parseInt(year)).week(parseInt(week)).startOf('week').toDate();
            break;
          case 'monthly':
            periodDate = moment(periodKey, 'YYYY-MM').startOf('month').toDate();
            break;
          case 'quarterly':
            const [qYear, quarter] = periodKey.split('-Q');
            const qMonth = (parseInt(quarter) - 1) * 3;
            periodDate = moment().year(parseInt(qYear)).month(qMonth).startOf('month').toDate();
            break;
          case 'yearly':
            periodDate = moment(periodKey, 'YYYY').startOf('year').toDate();
            break;
          default:
            periodDate = moment(periodKey, 'YYYY-MM-DD').toDate();
        }
        
        // Analyze consumption for this period
        const analysis = analyzeConsumption(orders, recipeDetails);
        
        // Gather order IDs
        const orderIds = orders.map(order => order._id);
        
        // Create recipe stats
        const recipeStats = [];
        if (analysis.favoriteRecipes && analysis.favoriteRecipes.length > 0) {
          analysis.favoriteRecipes.forEach(recipe => {
            // Calculate total amount spent on this recipe
            let totalAmount = 0;
            orders.forEach(order => {
              order.items.forEach(item => {
                if (item.product.toString() === recipe.recipeId) {
                  totalAmount += (item.price * item.quantity) || 0;
                }
              });
            });
            
            recipeStats.push({
              recipeId: recipe.recipeId,
              name: recipe.name,
              count: recipe.count,
              totalAmount
            });
          });
        }
        
        // Create ingredient stats
        const ingredientStats = [];
        if (analysis.frequentIngredients && analysis.frequentIngredients.length > 0) {
          analysis.frequentIngredients.forEach(ingredient => {
            ingredientStats.push({
              name: ingredient.name,
              count: ingredient.count
            });
          });
        }
        
        // Create TCM properties stats
        const tcmPropertiesStats = {
          nature: {},
          taste: {},
          functions: {}
        };
        
        if (analysis.consumptionByProperty) {
          if (analysis.consumptionByProperty.nature) {
            tcmPropertiesStats.nature = analysis.consumptionByProperty.nature;
          }
          
          if (analysis.consumptionByProperty.taste) {
            tcmPropertiesStats.taste = analysis.consumptionByProperty.taste;
          }
          
          if (analysis.consumptionByProperty.functions) {
            tcmPropertiesStats.functions = analysis.consumptionByProperty.functions;
          }
        }
        
        // Check if stat already exists for this period
        let existingStat = await ConsumptionStat.findOne({
          userId: req.user.id,
          period,
          date: periodDate
        });
        
        if (existingStat) {
          // Update existing stat
          existingStat.totalOrders = analysis.totalOrders;
          existingStat.totalItems = orders.reduce((total, order) => {
            return total + order.items.reduce((acc, item) => acc + (item.quantity || 1), 0);
          }, 0);
          existingStat.totalSpent = analysis.totalSpending;
          existingStat.recipes = recipeStats;
          existingStat.ingredients = ingredientStats;
          existingStat.tcmProperties = tcmPropertiesStats;
          existingStat.metadata.lastUpdated = new Date();
          existingStat.metadata.orderIds = orderIds;
          
          await existingStat.save();
          generatedStats.push(existingStat);
        } else {
          // Create new stat
          const totalItems = orders.reduce((total, order) => {
            return total + order.items.reduce((acc, item) => acc + (item.quantity || 1), 0);
          }, 0);
          
          const newStat = new ConsumptionStat({
            userId: req.user.id,
            period,
            date: periodDate,
            totalOrders: analysis.totalOrders,
            totalItems,
            totalSpent: analysis.totalSpending,
            recipes: recipeStats,
            ingredients: ingredientStats,
            tcmProperties: tcmPropertiesStats,
            metadata: {
              lastUpdated: new Date(),
              orderIds
            }
          });
          
          await newStat.save();
          generatedStats.push(newStat);
        }
      }
      
      res.json({
        stats: generatedStats,
        message: `Generated ${generatedStats.length} consumption statistics for ${period} periods`
      });
    } catch (err) {
      console.error('Error generating consumption stats:', err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router; 