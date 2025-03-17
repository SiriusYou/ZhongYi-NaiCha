const moment = require('moment');

/**
 * Analyze consumption patterns based on user orders
 * @param {Array} orders - User's order history
 * @param {Array} recipes - Recipe details for the orders
 * @returns {Object} - Analysis results
 */
function analyzeConsumption(orders, recipes) {
  if (!orders || orders.length === 0) {
    return {
      totalOrders: 0,
      frequencyByDay: {},
      frequencyByWeek: {},
      favoriteRecipes: [],
      frequentIngredients: [],
      consumptionByProperty: {},
      totalSpending: 0,
      averageSpending: 0,
    };
  }

  // Get the recipes map for easy lookup
  const recipesMap = recipes.reduce((acc, recipe) => {
    acc[recipe._id] = recipe;
    return acc;
  }, {});

  // Calculate total spending
  const totalSpending = orders.reduce(
    (total, order) => total + (order.totalAmount || 0),
    0
  );

  // Analyze order frequency by day of week
  const frequencyByDay = orders.reduce((acc, order) => {
    const dayOfWeek = moment(order.createdAt).format('dddd');
    acc[dayOfWeek] = (acc[dayOfWeek] || 0) + 1;
    return acc;
  }, {});

  // Analyze order frequency by week
  const frequencyByWeek = orders.reduce((acc, order) => {
    const weekNumber = moment(order.createdAt).week();
    const year = moment(order.createdAt).year();
    const weekKey = `${year}-W${weekNumber}`;
    acc[weekKey] = (acc[weekKey] || 0) + 1;
    return acc;
  }, {});

  // Get favorite recipes (most ordered)
  const recipeFrequency = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      const recipeId = item.product.toString();
      acc[recipeId] = (acc[recipeId] || 0) + (item.quantity || 1);
    });
    return acc;
  }, {});

  const favoriteRecipes = Object.entries(recipeFrequency)
    .map(([recipeId, count]) => ({
      recipeId,
      name: recipesMap[recipeId] ? recipesMap[recipeId].name : 'Unknown Recipe',
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Analyze most frequent ingredients
  const ingredientFrequency = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      const recipeId = item.product.toString();
      const recipe = recipesMap[recipeId];
      if (recipe && recipe.ingredients) {
        recipe.ingredients.forEach(ingredient => {
          const ingredientName = ingredient.name || ingredient.toString();
          ingredientFrequency[ingredientName] = (ingredientFrequency[ingredientName] || 0) + 1;
        });
      }
    });
  });

  const frequentIngredients = Object.entries(ingredientFrequency)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Analyze consumption by TCM properties
  const consumptionByProperty = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      const recipeId = item.product.toString();
      const recipe = recipesMap[recipeId];
      if (recipe) {
        // Analyze by nature (hot, cold, etc.)
        if (recipe.tcmProperties && recipe.tcmProperties.nature) {
          const nature = recipe.tcmProperties.nature;
          consumptionByProperty.nature = consumptionByProperty.nature || {};
          consumptionByProperty.nature[nature] = (consumptionByProperty.nature[nature] || 0) + 1;
        }

        // Analyze by taste (sweet, bitter, etc.)
        if (recipe.tcmProperties && recipe.tcmProperties.taste) {
          const taste = recipe.tcmProperties.taste;
          consumptionByProperty.taste = consumptionByProperty.taste || {};
          consumptionByProperty.taste[taste] = (consumptionByProperty.taste[taste] || 0) + 1;
        }

        // Analyze by functions (clears heat, nourishes yin, etc.)
        if (recipe.tcmProperties && recipe.tcmProperties.functions) {
          const functions = Array.isArray(recipe.tcmProperties.functions) 
            ? recipe.tcmProperties.functions 
            : [recipe.tcmProperties.functions];
          
          consumptionByProperty.functions = consumptionByProperty.functions || {};
          functions.forEach(func => {
            consumptionByProperty.functions[func] = (consumptionByProperty.functions[func] || 0) + 1;
          });
        }
      }
    });
  });

  return {
    totalOrders: orders.length,
    frequencyByDay,
    frequencyByWeek,
    favoriteRecipes,
    frequentIngredients,
    consumptionByProperty,
    totalSpending,
    averageSpending: totalSpending / orders.length,
  };
}

/**
 * Generate health insights based on consumption patterns and health data
 * @param {Object} consumptionAnalysis - Results from analyzeConsumption
 * @param {Object} healthProfile - User's health profile
 * @returns {Object} - Health insights
 */
function generateHealthInsights(consumptionAnalysis, healthProfile) {
  const insights = {
    alignmentWithConstitution: {},
    seasonalRecommendations: {},
    positivePatterns: [],
    improvementSuggestions: [],
    healthTrends: {},
  };

  // Check if we have valid data to work with
  if (!consumptionAnalysis || !healthProfile) {
    return insights;
  }

  // Get current season
  const currentMonth = moment().month() + 1; // 1-12
  let currentSeason = 'spring';
  if (currentMonth >= 3 && currentMonth <= 5) currentSeason = 'spring';
  else if (currentMonth >= 6 && currentMonth <= 8) currentSeason = 'summer';
  else if (currentMonth >= 9 && currentMonth <= 11) currentSeason = 'autumn';
  else currentSeason = 'winter';

  // Check alignment with user's constitution
  const userConstitution = healthProfile.constitution;
  if (userConstitution && consumptionAnalysis.consumptionByProperty && consumptionAnalysis.consumptionByProperty.nature) {
    // Map constitutions to recommended natures
    const constitutionNatureMap = {
      'yang_deficiency': ['warm', 'hot'],
      'yin_deficiency': ['cool', 'cold'],
      'qi_deficiency': ['neutral', 'warm'],
      'blood_deficiency': ['warm', 'neutral'],
      'phlegm_dampness': ['warm', 'dry'],
      'damp_heat': ['cold', 'cool'],
      'liver_qi_stagnation': ['cool', 'neutral'],
      'balanced': ['neutral'],
    };

    const recommendedNatures = constitutionNatureMap[userConstitution] || ['neutral'];
    
    // Check if consumption aligns with recommended natures
    const natureConsumption = consumptionAnalysis.consumptionByProperty.nature;
    const totalNatureConsumption = Object.values(natureConsumption).reduce((a, b) => a + b, 0);
    
    let alignmentScore = 0;
    recommendedNatures.forEach(nature => {
      if (natureConsumption[nature]) {
        alignmentScore += natureConsumption[nature] / totalNatureConsumption;
      }
    });
    
    insights.alignmentWithConstitution = {
      constitution: userConstitution,
      recommendedNatures,
      alignmentScore: alignmentScore * 100, // as percentage
      isWellAligned: alignmentScore > 0.6,
    };
    
    // Add insights based on alignment
    if (alignmentScore > 0.8) {
      insights.positivePatterns.push(
        'Your tea consumption aligns very well with your constitutional needs'
      );
    } else if (alignmentScore > 0.6) {
      insights.positivePatterns.push(
        'Your tea consumption generally aligns with your constitutional needs'
      );
    } else if (alignmentScore < 0.3) {
      insights.improvementSuggestions.push(
        `Consider choosing more teas with ${recommendedNatures.join('/')} properties to better support your ${userConstitution.replace('_', ' ')} constitution`
      );
    }
  }

  // Generate seasonal recommendations
  const seasonalProperties = {
    'spring': {
      recommended: ['sweet', 'pungent'],
      avoid: ['sour'],
      focus: ['liver', 'detoxification']
    },
    'summer': {
      recommended: ['bitter', 'pungent'],
      avoid: ['salty'],
      focus: ['heart', 'cooling']
    },
    'autumn': {
      recommended: ['pungent', 'sour'],
      avoid: ['spicy'],
      focus: ['lung', 'moistening']
    },
    'winter': {
      recommended: ['salty', 'bitter'],
      avoid: ['cold'],
      focus: ['kidney', 'warming']
    }
  };

  const seasonalRecs = seasonalProperties[currentSeason];
  if (seasonalRecs) {
    insights.seasonalRecommendations = {
      season: currentSeason,
      recommendedTastes: seasonalRecs.recommended,
      tasksToAvoid: seasonalRecs.avoid,
      healthFocus: seasonalRecs.focus
    };
    
    // Add seasonal improvement suggestions
    insights.improvementSuggestions.push(
      `For ${currentSeason}, consider increasing consumption of teas with ${seasonalRecs.recommended.join(' or ')} tastes to support seasonal balance`
    );
    
    if (seasonalRecs.avoid.length > 0) {
      insights.improvementSuggestions.push(
        `In ${currentSeason}, it's beneficial to moderate consumption of teas with ${seasonalRecs.avoid.join(' or ')} properties`
      );
    }
  }

  // Check consumption patterns for health trends
  if (consumptionAnalysis.favoriteRecipes && consumptionAnalysis.favoriteRecipes.length > 0) {
    const topRecipe = consumptionAnalysis.favoriteRecipes[0];
    insights.positivePatterns.push(
      `Your frequent consumption of ${topRecipe.name} shows consistency in your health routine`
    );
  }

  // Add general insights based on consumption frequency
  if (consumptionAnalysis.totalOrders > 20) {
    insights.positivePatterns.push(
      'Your regular tea consumption demonstrates commitment to TCM-based health practices'
    );
  } else if (consumptionAnalysis.totalOrders < 5) {
    insights.improvementSuggestions.push(
      'Increasing your consumption frequency could help establish more consistent health benefits'
    );
  }

  return insights;
}

/**
 * Generate trend data for visualization
 * @param {Array} orders - User's order history
 * @param {Array} recipes - Recipe details for the orders
 * @param {Object} healthData - User's health data history
 * @returns {Object} - Trend data for visualization
 */
function generateTrendData(orders, recipes, healthData = []) {
  // Group orders by week
  const ordersByWeek = orders.reduce((acc, order) => {
    const weekKey = moment(order.createdAt).format('YYYY-[W]WW');
    if (!acc[weekKey]) {
      acc[weekKey] = [];
    }
    acc[weekKey].push(order);
    return acc;
  }, {});

  // Calculate property consumption by week
  const propertiesByWeek = {};
  Object.entries(ordersByWeek).forEach(([weekKey, weekOrders]) => {
    const recipeIds = new Set();
    
    // Collect all recipe IDs from orders
    weekOrders.forEach(order => {
      order.items.forEach(item => {
        recipeIds.add(item.product.toString());
      });
    });
    
    // Calculate properties for these recipes
    const weekProperties = {
      nature: {},
      taste: {},
      functions: {}
    };
    
    recipeIds.forEach(recipeId => {
      const recipe = recipes.find(r => r._id.toString() === recipeId);
      if (recipe && recipe.tcmProperties) {
        // Process nature
        if (recipe.tcmProperties.nature) {
          const nature = recipe.tcmProperties.nature;
          weekProperties.nature[nature] = (weekProperties.nature[nature] || 0) + 1;
        }
        
        // Process taste
        if (recipe.tcmProperties.taste) {
          const taste = recipe.tcmProperties.taste;
          weekProperties.taste[taste] = (weekProperties.taste[taste] || 0) + 1;
        }
        
        // Process functions
        if (recipe.tcmProperties.functions) {
          const functions = Array.isArray(recipe.tcmProperties.functions) 
            ? recipe.tcmProperties.functions 
            : [recipe.tcmProperties.functions];
          
          functions.forEach(func => {
            weekProperties.functions[func] = (weekProperties.functions[func] || 0) + 1;
          });
        }
      }
    });
    
    propertiesByWeek[weekKey] = weekProperties;
  });

  // Process health data by week if available
  const healthByWeek = {};
  if (Array.isArray(healthData) && healthData.length > 0) {
    healthData.forEach(record => {
      const weekKey = moment(record.date).format('YYYY-[W]WW');
      if (!healthByWeek[weekKey]) {
        healthByWeek[weekKey] = [];
      }
      healthByWeek[weekKey].push(record);
    });
  }

  // Combine order and health data
  const weeks = [...new Set([
    ...Object.keys(ordersByWeek),
    ...Object.keys(healthByWeek)
  ])].sort();

  // Generate the final trend data
  const trendData = {
    timeLabels: weeks,
    consumption: {
      orderCounts: weeks.map(week => (ordersByWeek[week] || []).length),
      propertyTrends: {
        nature: {},
        taste: {},
        functions: {}
      }
    },
    health: {}
  };

  // Extract most common properties to track
  const allNatures = new Set();
  const allTastes = new Set();
  const allFunctions = new Set();

  Object.values(propertiesByWeek).forEach(weekProps => {
    Object.keys(weekProps.nature || {}).forEach(n => allNatures.add(n));
    Object.keys(weekProps.taste || {}).forEach(t => allTastes.add(t));
    Object.keys(weekProps.functions || {}).forEach(f => allFunctions.add(f));
  });

  // Create trend lines for each property
  [...allNatures].forEach(nature => {
    trendData.consumption.propertyTrends.nature[nature] = weeks.map(week => {
      const weekProps = propertiesByWeek[week] || { nature: {} };
      return weekProps.nature[nature] || 0;
    });
  });

  [...allTastes].forEach(taste => {
    trendData.consumption.propertyTrends.taste[taste] = weeks.map(week => {
      const weekProps = propertiesByWeek[week] || { taste: {} };
      return weekProps.taste[taste] || 0;
    });
  });

  [...allFunctions].forEach(func => {
    trendData.consumption.propertyTrends.functions[func] = weeks.map(week => {
      const weekProps = propertiesByWeek[week] || { functions: {} };
      return weekProps.functions[func] || 0;
    });
  });

  // Add health metrics if available
  if (Object.keys(healthByWeek).length > 0) {
    // Identify what health metrics are available
    const healthMetrics = new Set();
    Object.values(healthByWeek).forEach(weekRecords => {
      weekRecords.forEach(record => {
        Object.keys(record).forEach(key => {
          if (key !== 'date' && key !== '_id' && key !== 'userId') {
            healthMetrics.add(key);
          }
        });
      });
    });

    // Create trend lines for each health metric
    [...healthMetrics].forEach(metric => {
      trendData.health[metric] = weeks.map(week => {
        const weekRecords = healthByWeek[week] || [];
        if (weekRecords.length === 0) return null;
        
        // Average the metric for the week
        const sum = weekRecords.reduce((total, record) => {
          return total + (record[metric] || 0);
        }, 0);
        
        return sum / weekRecords.length;
      });
    });
  }

  return trendData;
}

module.exports = {
  analyzeConsumption,
  generateHealthInsights,
  generateTrendData
}; 