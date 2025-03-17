const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Category = require('../models/Category');
const Recipe = require('../models/Recipe');

// @route   GET api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/categories/:id
// @desc    Get category by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category || !category.isActive) {
      return res.status(404).json({ msg: 'Category not found' });
    }
    
    res.json(category);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Category not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/categories/slug/:slug
// @desc    Get category by slug
// @access  Public
router.get('/slug/:slug', async (req, res) => {
  try {
    const category = await Category.findOne({ 
      slug: req.params.slug,
      isActive: true 
    });
    
    if (!category) {
      return res.status(404).json({ msg: 'Category not found' });
    }
    
    res.json(category);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/categories/:id/recipes
// @desc    Get recipes by category ID with pagination
// @access  Public
router.get('/:id/recipes', async (req, res) => {
  try {
    // Check category exists
    const category = await Category.findById(req.params.id);
    if (!category || !category.isActive) {
      return res.status(404).json({ msg: 'Category not found' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get total count for pagination
    const total = await Recipe.countDocuments({ 
      category: req.params.id,
      isActive: true 
    });
    
    // Get recipes with pagination
    const recipes = await Recipe.find({ 
      category: req.params.id,
      isActive: true 
    })
      .sort({ 'rating.average': -1, createdAt: -1 })
      .populate('ingredients.ingredient', 'name chineseName slug')
      .skip(skip)
      .limit(limit);
    
    res.json({
      category,
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
      return res.status(404).json({ msg: 'Category not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/categories
// @desc    Create a new category
// @access  Private (Admin only - will add middleware later)
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('slug', 'Slug is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if slug already exists
      const existingCategory = await Category.findOne({ slug: req.body.slug });
      if (existingCategory) {
        return res.status(400).json({ msg: 'Slug already exists' });
      }

      // Create new category from request body
      const newCategory = new Category({
        name: req.body.name,
        description: req.body.description,
        slug: req.body.slug,
        imageUrl: req.body.imageUrl || '',
        order: req.body.order || 0,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true
      });

      const category = await newCategory.save();
      res.json(category);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/categories/:id
// @desc    Update a category
// @access  Private (Admin only - will add middleware later)
router.put('/:id', async (req, res) => {
  try {
    // Check if category exists
    let category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ msg: 'Category not found' });
    }

    // Check if slug already exists (if changing slug)
    if (req.body.slug && req.body.slug !== category.slug) {
      const existingCategory = await Category.findOne({ 
        slug: req.body.slug, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingCategory) {
        return res.status(400).json({ msg: 'Slug already exists' });
      }
    }

    // Update category
    category = await Category.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(category);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Category not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/categories/:id
// @desc    Delete a category
// @access  Private (Admin only - will add middleware later)
router.delete('/:id', async (req, res) => {
  try {
    // Check if category exists
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ msg: 'Category not found' });
    }

    // Check if category is in use
    const recipeCount = await Recipe.countDocuments({ category: req.params.id });
    if (recipeCount > 0) {
      return res.status(400).json({ 
        msg: 'Cannot delete category with associated recipes',
        count: recipeCount
      });
    }

    // Delete category
    await Category.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Category removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Category not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 