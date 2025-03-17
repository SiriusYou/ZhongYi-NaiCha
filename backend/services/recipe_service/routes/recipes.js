const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Recipe = require('../models/Recipe');
const Category = require('../models/Category');
const Ingredient = require('../models/Ingredient');

// @route   GET api/recipes
// @desc    Get all recipes with pagination and filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build query based on filters
    const query = { isActive: true };
    
    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Filter by suitable constitutions
    if (req.query.constitution) {
      query.suitableConstitutions = req.query.constitution;
    }
    
    // Filter by season
    if (req.query.season) {
      query.suitableSeasons = req.query.season;
    }
    
    // Filter by difficulty
    if (req.query.difficulty) {
      query.difficulty = req.query.difficulty;
    }
    
    // Filter by preparation time
    if (req.query.maxTime) {
      query.preparationTime = { $lte: parseInt(req.query.maxTime) };
    }
    
    // Filter by health benefits (partial match)
    if (req.query.benefit) {
      query.healthBenefits = { $regex: req.query.benefit, $options: 'i' };
    }
    
    // Get total count for pagination
    const total = await Recipe.countDocuments(query);
    
    // Get recipes with pagination
    const recipes = await Recipe.find(query)
      .sort({ 'rating.average': -1, createdAt: -1 })
      .populate('category', 'name slug')
      .populate('ingredients.ingredient', 'name chineseName slug imageUrl')
      .skip(skip)
      .limit(limit);
    
    res.json({
      recipes,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/recipes/:id
// @desc    Get recipe by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('ingredients.ingredient', 'name chineseName slug imageUrl properties healthBenefits contraindications');
    
    if (!recipe) {
      return res.status(404).json({ msg: 'Recipe not found' });
    }
    
    res.json(recipe);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Recipe not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/recipes/slug/:slug
// @desc    Get recipe by slug
// @access  Public
router.get('/slug/:slug', async (req, res) => {
  try {
    const recipe = await Recipe.findOne({ 
      slug: req.params.slug,
      isActive: true
    })
      .populate('category', 'name slug')
      .populate('ingredients.ingredient', 'name chineseName slug imageUrl properties healthBenefits contraindications');
    
    if (!recipe) {
      return res.status(404).json({ msg: 'Recipe not found' });
    }
    
    res.json(recipe);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/recipes
// @desc    Create a new recipe
// @access  Private (Admin only - will add middleware later)
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('slug', 'Slug is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('ingredients', 'At least one ingredient is required').isArray({ min: 1 }),
    check('steps', 'At least one step is required').isArray({ min: 1 }),
    check('preparationTime', 'Preparation time is required').isNumeric(),
    check('healthBenefits', 'At least one health benefit is required').isArray({ min: 1 }),
    check('category', 'Category is required').not().isEmpty(),
    check('suitableConstitutions', 'At least one suitable constitution is required').isArray({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if slug already exists
      const existingRecipe = await Recipe.findOne({ slug: req.body.slug });
      if (existingRecipe) {
        return res.status(400).json({ msg: 'Slug already exists' });
      }

      // Validate category exists
      const category = await Category.findById(req.body.category);
      if (!category) {
        return res.status(400).json({ msg: 'Category not found' });
      }

      // Validate ingredients exist
      const ingredientIds = req.body.ingredients.map(ing => ing.ingredient);
      const foundIngredients = await Ingredient.find({ _id: { $in: ingredientIds } });
      if (foundIngredients.length !== ingredientIds.length) {
        return res.status(400).json({ msg: 'One or more ingredients not found' });
      }

      // Create new recipe from request body
      const newRecipe = new Recipe(req.body);
      const recipe = await newRecipe.save();

      res.json(recipe);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/recipes/:id
// @desc    Update a recipe
// @access  Private (Admin only - will add middleware later)
router.put('/:id', async (req, res) => {
  try {
    // Check if recipe exists
    let recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ msg: 'Recipe not found' });
    }

    // Check if slug already exists (if changing slug)
    if (req.body.slug && req.body.slug !== recipe.slug) {
      const existingRecipe = await Recipe.findOne({ 
        slug: req.body.slug, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingRecipe) {
        return res.status(400).json({ msg: 'Slug already exists' });
      }
    }

    // Validate category exists if provided
    if (req.body.category) {
      const category = await Category.findById(req.body.category);
      if (!category) {
        return res.status(400).json({ msg: 'Category not found' });
      }
    }

    // Validate ingredients exist if provided
    if (req.body.ingredients && req.body.ingredients.length > 0) {
      const ingredientIds = req.body.ingredients.map(ing => ing.ingredient);
      const foundIngredients = await Ingredient.find({ _id: { $in: ingredientIds } });
      if (foundIngredients.length !== ingredientIds.length) {
        return res.status(400).json({ msg: 'One or more ingredients not found' });
      }
    }

    // Update recipe
    recipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(recipe);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Recipe not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/recipes/:id
// @desc    Delete a recipe
// @access  Private (Admin only - will add middleware later)
router.delete('/:id', async (req, res) => {
  try {
    // Check if recipe exists
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) {
      return res.status(404).json({ msg: 'Recipe not found' });
    }

    // Delete recipe
    await Recipe.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Recipe removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Recipe not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/recipes/:id/rating
// @desc    Rate a recipe
// @access  Public (would be Private with user auth in production)
router.post(
  '/:id/rating',
  [
    check('rating', 'Rating is required and must be between 1 and 5').isFloat({ min: 1, max: 5 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const recipe = await Recipe.findById(req.params.id);
      if (!recipe) {
        return res.status(404).json({ msg: 'Recipe not found' });
      }

      // Calculate new average rating
      const currentTotal = recipe.rating.average * recipe.rating.count;
      const newCount = recipe.rating.count + 1;
      const newAverage = (currentTotal + req.body.rating) / newCount;

      // Update recipe with new rating
      const updatedRecipe = await Recipe.findByIdAndUpdate(
        req.params.id,
        { 
          $set: { 
            'rating.average': newAverage,
            'rating.count': newCount
          } 
        },
        { new: true }
      );

      res.json(updatedRecipe.rating);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Recipe not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router; 