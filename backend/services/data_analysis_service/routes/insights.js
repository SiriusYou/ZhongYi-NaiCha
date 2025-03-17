const express = require('express');
const router = express.Router();
const moment = require('moment');

// Middleware
const auth = require('../middleware/auth');

// Models
const ConsumptionStat = require('../models/ConsumptionStat');

// Utilities
const { generateHealthInsights } = require('../utils/analysisHelpers');
const { getHealthData, getRecommendations } = require('../utils/serviceRequests');

// @route   GET api/insights/health
// @desc    Get health insights based on consumption patterns
// @access  Private
router.get('/health', auth, async (req, res) => {
  try {
    // Fetch user health profile
    const healthProfile = await getHealthData(req.user.id, req.header('x-auth-token'));
    
    if (!healthProfile) {
      return res.status(404).json({ msg: 'Health profile not found' });
    }
    
    // Get query parameters for time range
    const { 
      period = 'monthly',
      limit = 3
    } = req.query;
    
    // Query consumption stats for the specified period
    const stats = await ConsumptionStat.find({ 
      userId: req.user.id,
      period
    })
    .sort({ date: -1 })
    .limit(parseInt(limit, 10));
    
    if (!stats || stats.length === 0) {
      return res.status(404).json({ msg: 'No consumption data found for generating insights' });
    }
    
    // Combine consumption data from all periods
    const combinedConsumptionAnalysis = {
      totalOrders: stats.reduce((sum, stat) => sum + stat.totalOrders, 0),
      totalSpending: stats.reduce((sum, stat) => sum + stat.totalSpent, 0),
      frequencyByDay: {},
      frequencyByWeek: {},
      favoriteRecipes: [],
      frequentIngredients: [],
      consumptionByProperty: {
        nature: {},
        taste: {},
        functions: {}
      }
    };
    
    // Process favorite recipes
    const recipeFrequency = {};
    stats.forEach(stat => {
      if (stat.recipes && stat.recipes.length > 0) {
        stat.recipes.forEach(recipe => {
          if (!recipeFrequency[recipe.recipeId]) {
            recipeFrequency[recipe.recipeId] = {
              recipeId: recipe.recipeId,
              name: recipe.name,
              count: 0
            };
          }
          recipeFrequency[recipe.recipeId].count += recipe.count;
        });
      }
    });
    
    combinedConsumptionAnalysis.favoriteRecipes = Object.values(recipeFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Process frequent ingredients
    const ingredientFrequency = {};
    stats.forEach(stat => {
      if (stat.ingredients && stat.ingredients.length > 0) {
        stat.ingredients.forEach(ingredient => {
          if (!ingredientFrequency[ingredient.name]) {
            ingredientFrequency[ingredient.name] = 0;
          }
          ingredientFrequency[ingredient.name] += ingredient.count;
        });
      }
    });
    
    combinedConsumptionAnalysis.frequentIngredients = Object.entries(ingredientFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Process TCM properties
    stats.forEach(stat => {
      // Process nature
      if (stat.tcmProperties && stat.tcmProperties.nature) {
        Object.entries(stat.tcmProperties.nature).forEach(([nature, count]) => {
          if (!combinedConsumptionAnalysis.consumptionByProperty.nature[nature]) {
            combinedConsumptionAnalysis.consumptionByProperty.nature[nature] = 0;
          }
          combinedConsumptionAnalysis.consumptionByProperty.nature[nature] += count;
        });
      }
      
      // Process taste
      if (stat.tcmProperties && stat.tcmProperties.taste) {
        Object.entries(stat.tcmProperties.taste).forEach(([taste, count]) => {
          if (!combinedConsumptionAnalysis.consumptionByProperty.taste[taste]) {
            combinedConsumptionAnalysis.consumptionByProperty.taste[taste] = 0;
          }
          combinedConsumptionAnalysis.consumptionByProperty.taste[taste] += count;
        });
      }
      
      // Process functions
      if (stat.tcmProperties && stat.tcmProperties.functions) {
        Object.entries(stat.tcmProperties.functions).forEach(([func, count]) => {
          if (!combinedConsumptionAnalysis.consumptionByProperty.functions[func]) {
            combinedConsumptionAnalysis.consumptionByProperty.functions[func] = 0;
          }
          combinedConsumptionAnalysis.consumptionByProperty.functions[func] += count;
        });
      }
    });
    
    // Generate health insights
    const insights = generateHealthInsights(combinedConsumptionAnalysis, healthProfile);
    
    // Get recipe recommendations based on health profile
    let recommendations = [];
    try {
      recommendations = await getRecommendations(healthProfile, req.header('x-auth-token'));
    } catch (err) {
      console.error('Error fetching recipe recommendations:', err.message);
      // Continue without recommendations
    }
    
    // Return insights and recommendations
    res.json({
      insights,
      recommendations: recommendations.slice(0, 5), // Limit to 5 recommendations
      analysisBasedOn: {
        periods: stats.length,
        totalOrders: combinedConsumptionAnalysis.totalOrders,
        latestData: stats[0] ? moment(stats[0].date).format('YYYY-MM-DD') : null,
      }
    });
  } catch (err) {
    console.error('Error generating health insights:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/insights/consumption
// @desc    Get consumption pattern insights
// @access  Private
router.get('/consumption', auth, async (req, res) => {
  try {
    // Get query parameters for time range
    const { 
      period = 'monthly',
      compareWithPrevious = true,
      limit = 3
    } = req.query;
    
    // Query consumption stats for the specified period
    const currentStats = await ConsumptionStat.find({ 
      userId: req.user.id,
      period
    })
    .sort({ date: -1 })
    .limit(parseInt(limit, 10));
    
    if (!currentStats || currentStats.length === 0) {
      return res.status(404).json({ msg: 'No consumption data found for generating insights' });
    }
    
    // Gather insights
    const insights = {
      currentPeriod: {
        totalOrders: currentStats.reduce((sum, stat) => sum + stat.totalOrders, 0),
        totalSpent: currentStats.reduce((sum, stat) => sum + stat.totalSpent, 0),
        totalItems: currentStats.reduce((sum, stat) => sum + stat.totalItems, 0),
        averageOrderValue: 0,
        topRecipes: [],
        topIngredients: [],
        dominantProperties: {
          nature: {},
          taste: {},
          functions: {}
        }
      },
      comparison: {
        orderChange: 0,
        spendingChange: 0,
        newRecipes: []
      },
      patterns: []
    };
    
    // Calculate average order value
    if (insights.currentPeriod.totalOrders > 0) {
      insights.currentPeriod.averageOrderValue = 
        insights.currentPeriod.totalSpent / insights.currentPeriod.totalOrders;
    }
    
    // Process favorite recipes
    const recipeFrequency = {};
    currentStats.forEach(stat => {
      if (stat.recipes && stat.recipes.length > 0) {
        stat.recipes.forEach(recipe => {
          if (!recipeFrequency[recipe.recipeId]) {
            recipeFrequency[recipe.recipeId] = {
              recipeId: recipe.recipeId,
              name: recipe.name,
              count: 0,
              amount: 0
            };
          }
          recipeFrequency[recipe.recipeId].count += recipe.count;
          recipeFrequency[recipe.recipeId].amount += recipe.totalAmount;
        });
      }
    });
    
    insights.currentPeriod.topRecipes = Object.values(recipeFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Process frequent ingredients
    const ingredientFrequency = {};
    currentStats.forEach(stat => {
      if (stat.ingredients && stat.ingredients.length > 0) {
        stat.ingredients.forEach(ingredient => {
          if (!ingredientFrequency[ingredient.name]) {
            ingredientFrequency[ingredient.name] = 0;
          }
          ingredientFrequency[ingredient.name] += ingredient.count;
        });
      }
    });
    
    insights.currentPeriod.topIngredients = Object.entries(ingredientFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Process TCM properties
    currentStats.forEach(stat => {
      // Process nature
      if (stat.tcmProperties && stat.tcmProperties.nature) {
        Object.entries(stat.tcmProperties.nature).forEach(([nature, count]) => {
          if (!insights.currentPeriod.dominantProperties.nature[nature]) {
            insights.currentPeriod.dominantProperties.nature[nature] = 0;
          }
          insights.currentPeriod.dominantProperties.nature[nature] += count;
        });
      }
      
      // Process taste
      if (stat.tcmProperties && stat.tcmProperties.taste) {
        Object.entries(stat.tcmProperties.taste).forEach(([taste, count]) => {
          if (!insights.currentPeriod.dominantProperties.taste[taste]) {
            insights.currentPeriod.dominantProperties.taste[taste] = 0;
          }
          insights.currentPeriod.dominantProperties.taste[taste] += count;
        });
      }
      
      // Process functions
      if (stat.tcmProperties && stat.tcmProperties.functions) {
        Object.entries(stat.tcmProperties.functions).forEach(([func, count]) => {
          if (!insights.currentPeriod.dominantProperties.functions[func]) {
            insights.currentPeriod.dominantProperties.functions[func] = 0;
          }
          insights.currentPeriod.dominantProperties.functions[func] += count;
        });
      }
    });
    
    // Sort properties by frequency
    insights.currentPeriod.dominantProperties.nature = Object.entries(
      insights.currentPeriod.dominantProperties.nature
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    insights.currentPeriod.dominantProperties.taste = Object.entries(
      insights.currentPeriod.dominantProperties.taste
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    insights.currentPeriod.dominantProperties.functions = Object.entries(
      insights.currentPeriod.dominantProperties.functions
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    // If comparing with previous period, get previous stats
    if (compareWithPrevious === 'true' || compareWithPrevious === true) {
      // Find the oldest date in current stats to use as cutoff
      const oldestCurrentDate = currentStats.reduce((oldest, stat) => {
        return stat.date < oldest ? stat.date : oldest;
      }, currentStats[0].date);
      
      // Query stats for previous period
      const previousStats = await ConsumptionStat.find({ 
        userId: req.user.id,
        period,
        date: { $lt: oldestCurrentDate }
      })
      .sort({ date: -1 })
      .limit(currentStats.length);
      
      if (previousStats && previousStats.length > 0) {
        const previousTotalOrders = previousStats.reduce((sum, stat) => sum + stat.totalOrders, 0);
        const previousTotalSpent = previousStats.reduce((sum, stat) => sum + stat.totalSpent, 0);
        
        // Calculate percentage changes
        if (previousTotalOrders > 0) {
          insights.comparison.orderChange = (
            (insights.currentPeriod.totalOrders - previousTotalOrders) / previousTotalOrders
          ) * 100;
        }
        
        if (previousTotalSpent > 0) {
          insights.comparison.spendingChange = (
            (insights.currentPeriod.totalSpent - previousTotalSpent) / previousTotalSpent
          ) * 100;
        }
        
        // Find new recipes in current period
        const previousRecipeIds = new Set();
        previousStats.forEach(stat => {
          if (stat.recipes && stat.recipes.length > 0) {
            stat.recipes.forEach(recipe => {
              previousRecipeIds.add(recipe.recipeId.toString());
            });
          }
        });
        
        insights.comparison.newRecipes = insights.currentPeriod.topRecipes.filter(
          recipe => !previousRecipeIds.has(recipe.recipeId.toString())
        );
      }
    }
    
    // Add consumption pattern insights
    if (insights.currentPeriod.topRecipes.length > 0) {
      insights.patterns.push({
        type: 'favorite',
        description: `Your favorite tea is ${insights.currentPeriod.topRecipes[0].name} with ${insights.currentPeriod.topRecipes[0].count} orders`
      });
    }
    
    if (insights.currentPeriod.dominantProperties.nature.length > 0) {
      insights.patterns.push({
        type: 'nature',
        description: `You predominantly consume teas with ${insights.currentPeriod.dominantProperties.nature[0].name} properties`
      });
    }
    
    if (insights.comparison.orderChange > 20) {
      insights.patterns.push({
        type: 'trend',
        description: `Your tea consumption has increased by ${Math.round(insights.comparison.orderChange)}% compared to the previous period`
      });
    } else if (insights.comparison.orderChange < -20) {
      insights.patterns.push({
        type: 'trend',
        description: `Your tea consumption has decreased by ${Math.round(Math.abs(insights.comparison.orderChange))}% compared to the previous period`
      });
    }
    
    if (insights.comparison.newRecipes.length > 0) {
      insights.patterns.push({
        type: 'discovery',
        description: `You've discovered ${insights.comparison.newRecipes.length} new teas in this period`
      });
    }
    
    // Return insights
    res.json(insights);
  } catch (err) {
    console.error('Error generating consumption insights:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/insights/seasonal
// @desc    Get seasonal consumption recommendations
// @access  Private
router.get('/seasonal', auth, async (req, res) => {
  try {
    // Get current season
    const currentMonth = moment().month() + 1; // 1-12
    let currentSeason = 'spring';
    if (currentMonth >= 3 && currentMonth <= 5) currentSeason = 'spring';
    else if (currentMonth >= 6 && currentMonth <= 8) currentSeason = 'summer';
    else if (currentMonth >= 9 && currentMonth <= 11) currentSeason = 'autumn';
    else currentSeason = 'winter';
    
    // Define seasonal properties
    const seasonalProperties = {
      'spring': {
        recommended: ['sweet', 'pungent'],
        avoid: ['sour'],
        focus: ['liver', 'detoxification'],
        constitutions: ['liver_qi_stagnation', 'blood_deficiency'],
        description: 'Spring is the season of renewal and growth. Focus on supporting liver function and gentle detoxification.'
      },
      'summer': {
        recommended: ['bitter', 'pungent'],
        avoid: ['salty'],
        focus: ['heart', 'cooling'],
        constitutions: ['yin_deficiency', 'damp_heat'],
        description: 'Summer brings heat and requires cooling properties. Focus on heart health and maintaining body fluids.'
      },
      'autumn': {
        recommended: ['pungent', 'sour'],
        avoid: ['spicy'],
        focus: ['lung', 'moistening'],
        constitutions: ['qi_deficiency', 'lung_dryness'],
        description: 'Autumn brings dryness and cooler temperatures. Focus on lung health and maintaining moisture.'
      },
      'winter': {
        recommended: ['salty', 'bitter'],
        avoid: ['cold'],
        focus: ['kidney', 'warming'],
        constitutions: ['yang_deficiency', 'kidney_deficiency'],
        description: 'Winter is a time for conservation and nourishment. Focus on kidney health and maintaining warmth.'
      }
    };
    
    // Get current seasonal recommendations
    const seasonalRecs = seasonalProperties[currentSeason];
    
    // Get recommendations from recipe service
    let recipeRecommendations = [];
    try {
      // Construct a mock health profile based on seasonal needs
      const seasonalHealthProfile = {
        constitution: seasonalRecs.constitutions[0],
        season: currentSeason,
        symptoms: seasonalRecs.focus
      };
      
      // Get seasonal recipe recommendations
      recipeRecommendations = await getRecommendations(
        seasonalHealthProfile, 
        req.header('x-auth-token')
      );
    } catch (err) {
      console.error('Error fetching seasonal recommendations:', err.message);
      // Continue without recommendations
    }
    
    // Prepare the response
    const response = {
      currentSeason,
      seasonalRecommendations: {
        description: seasonalRecs.description,
        recommendedTastes: seasonalRecs.recommended,
        tasksToAvoid: seasonalRecs.avoid,
        healthFocus: seasonalRecs.focus,
        beneficialConstitutions: seasonalRecs.constitutions
      },
      recipeRecommendations: recipeRecommendations.slice(0, 5), // Limit to 5 recommendations
      generalAdvice: [
        `In ${currentSeason}, consider increasing consumption of teas with ${seasonalRecs.recommended.join(' or ')} tastes`,
        `Avoid excessive consumption of teas with ${seasonalRecs.avoid.join(' or ')} properties during ${currentSeason}`,
        `Focus on teas that support ${seasonalRecs.focus.join(' and ')} during this season`
      ]
    };
    
    res.json(response);
  } catch (err) {
    console.error('Error generating seasonal insights:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 