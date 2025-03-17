const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Ingredient = require('../models/Ingredient');
const Recipe = require('../models/Recipe');

// @route   GET api/ingredients
// @desc    Get all ingredients with pagination and filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build query based on filters
    const query = { isActive: true };
    
    // Filter by property nature
    if (req.query.nature) {
      query['properties.nature'] = req.query.nature;
    }
    
    // Filter by property taste
    if (req.query.taste) {
      query['properties.taste'] = req.query.taste;
    }
    
    // Filter by common status
    if (req.query.common === 'true') {
      query.isCommon = true;
    }
    
    // Filter by health benefits (partial match)
    if (req.query.benefit) {
      query.healthBenefits = { $regex: req.query.benefit, $options: 'i' };
    }
    
    // Search by name
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { chineseName: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Get total count for pagination
    const total = await Ingredient.countDocuments(query);
    
    // Get ingredients with pagination
    const ingredients = await Ingredient.find(query)
      .sort({ isCommon: -1, name: 1 })
      .skip(skip)
      .limit(limit);
    
    res.json({
      ingredients,
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

// @route   GET api/ingredients/:id
// @desc    Get ingredient by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id);
    
    if (!ingredient || !ingredient.isActive) {
      return res.status(404).json({ msg: 'Ingredient not found' });
    }
    
    res.json(ingredient);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Ingredient not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/ingredients/slug/:slug
// @desc    Get ingredient by slug
// @access  Public
router.get('/slug/:slug', async (req, res) => {
  try {
    const ingredient = await Ingredient.findOne({ 
      slug: req.params.slug,
      isActive: true 
    });
    
    if (!ingredient) {
      return res.status(404).json({ msg: 'Ingredient not found' });
    }
    
    res.json(ingredient);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/ingredients/:id/recipes
// @desc    Get recipes that use this ingredient
// @access  Public
router.get('/:id/recipes', async (req, res) => {
  try {
    // Check ingredient exists
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient || !ingredient.isActive) {
      return res.status(404).json({ msg: 'Ingredient not found' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get recipes that contain this ingredient
    const recipes = await Recipe.find({ 
      'ingredients.ingredient': req.params.id,
      isActive: true
    })
      .sort({ 'rating.average': -1, createdAt: -1 })
      .populate('category', 'name slug')
      .populate('ingredients.ingredient', 'name chineseName slug')
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Recipe.countDocuments({ 
      'ingredients.ingredient': req.params.id,
      isActive: true
    });
    
    res.json({
      ingredient,
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
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Ingredient not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/ingredients
// @desc    Create a new ingredient
// @access  Private (Admin only - will add middleware later)
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('chineseName', 'Chinese name is required').not().isEmpty(),
    check('slug', 'Slug is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('properties', 'Properties are required').isObject()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if slug already exists
      const existingIngredient = await Ingredient.findOne({ slug: req.body.slug });
      if (existingIngredient) {
        return res.status(400).json({ msg: 'Slug already exists' });
      }

      // Create new ingredient from request body
      const newIngredient = new Ingredient(req.body);
      const ingredient = await newIngredient.save();

      res.json(ingredient);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/ingredients/:id
// @desc    Update an ingredient
// @access  Private (Admin only - will add middleware later)
router.put('/:id', async (req, res) => {
  try {
    // Check if ingredient exists
    let ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ msg: 'Ingredient not found' });
    }

    // Check if slug already exists (if changing slug)
    if (req.body.slug && req.body.slug !== ingredient.slug) {
      const existingIngredient = await Ingredient.findOne({ 
        slug: req.body.slug, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingIngredient) {
        return res.status(400).json({ msg: 'Slug already exists' });
      }
    }

    // Update ingredient
    ingredient = await Ingredient.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(ingredient);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Ingredient not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/ingredients/:id
// @desc    Delete an ingredient
// @access  Private (Admin only - will add middleware later)
router.delete('/:id', async (req, res) => {
  try {
    // Check if ingredient exists
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ msg: 'Ingredient not found' });
    }

    // Check if ingredient is in use
    const recipeCount = await Recipe.countDocuments({ 'ingredients.ingredient': req.params.id });
    if (recipeCount > 0) {
      return res.status(400).json({ 
        msg: 'Cannot delete ingredient that is used in recipes',
        count: recipeCount 
      });
    }

    // Delete ingredient
    await Ingredient.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Ingredient removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Ingredient not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 