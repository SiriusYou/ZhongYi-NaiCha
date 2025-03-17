const express = require('express');
const router = express.Router();
const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');

// @route   GET api/search
// @desc    Search recipes and ingredients
// @access  Public
router.get('/', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ msg: 'Search query is required' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Search recipes
    const recipeResults = await Recipe.find(
      { 
        $text: { $search: query },
        isActive: true 
      },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, 'rating.average': -1 })
      .populate('category', 'name slug')
      .populate('ingredients.ingredient', 'name chineseName slug')
      .skip(skip)
      .limit(limit);
    
    // Get total recipe count
    const recipeCount = await Recipe.countDocuments(
      { 
        $text: { $search: query },
        isActive: true 
      }
    );
    
    // Search ingredients
    const ingredientResults = await Ingredient.find(
      { 
        $text: { $search: query },
        isActive: true 
      },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, isCommon: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total ingredient count
    const ingredientCount = await Ingredient.countDocuments(
      { 
        $text: { $search: query },
        isActive: true 
      }
    );
    
    // Return combined results
    res.json({
      query,
      results: {
        recipes: {
          items: recipeResults,
          total: recipeCount,
          page,
          limit,
          pages: Math.ceil(recipeCount / limit)
        },
        ingredients: {
          items: ingredientResults,
          total: ingredientCount,
          page,
          limit,
          pages: Math.ceil(ingredientCount / limit)
        }
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/search/recipes
// @desc    Search only recipes
// @access  Public
router.get('/recipes', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ msg: 'Search query is required' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build search query
    const searchQuery = { 
      $text: { $search: query },
      isActive: true 
    };
    
    // Add filters if provided
    if (req.query.category) {
      searchQuery.category = req.query.category;
    }
    
    if (req.query.constitution) {
      searchQuery.suitableConstitutions = req.query.constitution;
    }
    
    if (req.query.season) {
      searchQuery.suitableSeasons = req.query.season;
    }
    
    // Search recipes
    const recipeResults = await Recipe.find(
      searchQuery,
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, 'rating.average': -1 })
      .populate('category', 'name slug')
      .populate('ingredients.ingredient', 'name chineseName slug')
      .skip(skip)
      .limit(limit);
    
    // Get total recipe count
    const recipeCount = await Recipe.countDocuments(searchQuery);
    
    // Return results
    res.json({
      query,
      results: {
        items: recipeResults,
        total: recipeCount,
        page,
        limit,
        pages: Math.ceil(recipeCount / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/search/ingredients
// @desc    Search only ingredients
// @access  Public
router.get('/ingredients', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ msg: 'Search query is required' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build search query
    const searchQuery = { 
      $text: { $search: query },
      isActive: true 
    };
    
    // Add filters if provided
    if (req.query.nature) {
      searchQuery['properties.nature'] = req.query.nature;
    }
    
    if (req.query.taste) {
      searchQuery['properties.taste'] = req.query.taste;
    }
    
    if (req.query.common === 'true') {
      searchQuery.isCommon = true;
    }
    
    // Search ingredients
    const ingredientResults = await Ingredient.find(
      searchQuery,
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' }, isCommon: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total ingredient count
    const ingredientCount = await Ingredient.countDocuments(searchQuery);
    
    // Return results
    res.json({
      query,
      results: {
        items: ingredientResults,
        total: ingredientCount,
        page,
        limit,
        pages: Math.ceil(ingredientCount / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/search/recommendations
// @desc    Get personalized recipe recommendations based on health profile
// @access  Public (would be Private with auth in production)
router.get('/recommendations', async (req, res) => {
  try {
    // In production, these would come from the user's health profile
    const constitution = req.query.constitution || '';
    const season = req.query.season || getCurrentSeason();
    const symptoms = req.query.symptoms ? req.query.symptoms.split(',') : [];
    
    // Build query for recipes suitable for this user
    const query = { isActive: true };
    
    // Filter by constitution if provided
    if (constitution && constitution !== '') {
      query.suitableConstitutions = constitution;
    }
    
    // Filter by season if provided
    if (season && season !== '') {
      query.suitableSeasons = season;
    }
    
    // If symptoms provided, look for recipes with matching health benefits
    // This is a simple implementation - in production, you might want a more sophisticated matching algorithm
    if (symptoms.length > 0) {
      const symptomRegex = symptoms.map(s => new RegExp(s, 'i'));
      query.healthBenefits = { $in: symptomRegex };
    }
    
    // Get recipes with pagination
    const limit = parseInt(req.query.limit) || 10;
    const recipes = await Recipe.find(query)
      .sort({ 'rating.average': -1, createdAt: -1 })
      .populate('category', 'name slug')
      .populate('ingredients.ingredient', 'name chineseName slug')
      .limit(limit);
    
    res.json({
      recommendations: recipes,
      filters: {
        constitution,
        season,
        symptoms
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Helper function to get current season
function getCurrentSeason() {
  const month = new Date().getMonth();
  
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

module.exports = router; 