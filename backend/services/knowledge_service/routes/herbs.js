const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Herb = require('../models/Herb');
const Category = require('../models/Category');

// @route   GET api/herbs
// @desc    Get all herbs with pagination
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const categoryId = req.query.category;
    const nature = req.query.nature;
    const taste = req.query.taste;
    const meridian = req.query.meridian;
    
    // Build query
    const query = { isActive: true };
    if (categoryId) {
      query.categories = categoryId;
    }
    if (nature) {
      query['properties.nature'] = nature;
    }
    if (taste) {
      query['properties.taste'] = taste;
    }
    if (meridian) {
      query['properties.meridianAffinity'] = meridian;
    }
    
    // Get total count for pagination
    const total = await Herb.countDocuments(query);
    
    // Get herbs
    const herbs = await Herb.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .populate('categories', 'name slug')
      .select('-commonCombinations'); // Exclude detailed combinations for list view
    
    res.json({
      herbs,
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

// @route   GET api/herbs/:id
// @desc    Get herb by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const herb = await Herb.findById(req.params.id)
      .populate('categories', 'name slug')
      .populate('relatedHerbs', 'name chineseName slug imageUrl')
      .populate({
        path: 'commonCombinations.herbs',
        select: 'name chineseName slug imageUrl'
      });
    
    if (!herb) {
      return res.status(404).json({ msg: 'Herb not found' });
    }
    
    res.json(herb);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Herb not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/herbs/slug/:slug
// @desc    Get herb by slug
// @access  Public
router.get('/slug/:slug', async (req, res) => {
  try {
    const herb = await Herb.findOne({ 
      slug: req.params.slug,
      isActive: true 
    })
      .populate('categories', 'name slug')
      .populate('relatedHerbs', 'name chineseName slug imageUrl')
      .populate({
        path: 'commonCombinations.herbs',
        select: 'name chineseName slug imageUrl'
      });
    
    if (!herb) {
      return res.status(404).json({ msg: 'Herb not found' });
    }
    
    res.json(herb);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/herbs
// @desc    Create a herb
// @access  Private (Admin only - will add middleware later)
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('chineseName', 'Chinese name is required').not().isEmpty(),
    check('slug', 'Slug is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('properties.nature', 'Nature property is required').isIn(['寒', '凉', '平', '温', '热']),
    check('properties.taste', 'Taste property is required').isArray({ min: 1 }),
    check('functions', 'At least one function is required').isArray({ min: 1 }),
    check('indications', 'At least one indication is required').isArray({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if slug already exists
      const existingHerb = await Herb.findOne({ slug: req.body.slug });
      if (existingHerb) {
        return res.status(400).json({ msg: 'Slug already exists' });
      }

      // Validate categories if provided
      if (req.body.categories && req.body.categories.length > 0) {
        const categoryIds = req.body.categories;
        const validCategories = await Category.find({ _id: { $in: categoryIds } });
        if (validCategories.length !== categoryIds.length) {
          return res.status(400).json({ msg: 'One or more categories are invalid' });
        }
      }

      const { 
        name,
        chineseName,
        latinName,
        slug,
        description,
        properties,
        functions,
        indications,
        contraindications,
        dosage,
        preparation,
        imageUrl,
        categories,
        relatedHerbs,
        commonCombinations,
        isActive
      } = req.body;

      // Create new herb
      const newHerb = new Herb({
        name,
        chineseName,
        latinName,
        slug,
        description,
        properties,
        functions,
        indications,
        contraindications,
        dosage,
        preparation,
        imageUrl,
        categories,
        relatedHerbs,
        commonCombinations,
        isActive
      });

      const herb = await newHerb.save();
      res.json(herb);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/herbs/:id
// @desc    Update a herb
// @access  Private (Admin only - will add middleware later)
router.put('/:id', async (req, res) => {
  try {
    // Check if herb exists
    let herb = await Herb.findById(req.params.id);
    if (!herb) {
      return res.status(404).json({ msg: 'Herb not found' });
    }

    // Check if slug already exists (if changing slug)
    if (req.body.slug && req.body.slug !== herb.slug) {
      const existingHerb = await Herb.findOne({ 
        slug: req.body.slug, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingHerb) {
        return res.status(400).json({ msg: 'Slug already exists' });
      }
    }

    // Validate categories if provided
    if (req.body.categories && req.body.categories.length > 0) {
      const categoryIds = req.body.categories;
      const validCategories = await Category.find({ _id: { $in: categoryIds } });
      if (validCategories.length !== categoryIds.length) {
        return res.status(400).json({ msg: 'One or more categories are invalid' });
      }
    }

    // Build herb object
    const { 
      name,
      chineseName,
      latinName,
      slug,
      description,
      properties,
      functions,
      indications,
      contraindications,
      dosage,
      preparation,
      imageUrl,
      categories,
      relatedHerbs,
      commonCombinations,
      isActive
    } = req.body;

    const herbFields = {};
    if (name) herbFields.name = name;
    if (chineseName) herbFields.chineseName = chineseName;
    if (latinName !== undefined) herbFields.latinName = latinName;
    if (slug) herbFields.slug = slug;
    if (description) herbFields.description = description;
    if (properties) herbFields.properties = properties;
    if (functions) herbFields.functions = functions;
    if (indications) herbFields.indications = indications;
    if (contraindications) herbFields.contraindications = contraindications;
    if (dosage !== undefined) herbFields.dosage = dosage;
    if (preparation !== undefined) herbFields.preparation = preparation;
    if (imageUrl !== undefined) herbFields.imageUrl = imageUrl;
    if (categories) herbFields.categories = categories;
    if (relatedHerbs) herbFields.relatedHerbs = relatedHerbs;
    if (commonCombinations) herbFields.commonCombinations = commonCombinations;
    if (isActive !== undefined) herbFields.isActive = isActive;

    // Update herb
    herb = await Herb.findByIdAndUpdate(
      req.params.id,
      { $set: herbFields },
      { new: true }
    );

    res.json(herb);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Herb not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/herbs/:id
// @desc    Delete a herb
// @access  Private (Admin only - will add middleware later)
router.delete('/:id', async (req, res) => {
  try {
    // Check if herb exists
    const herb = await Herb.findById(req.params.id);
    if (!herb) {
      return res.status(404).json({ msg: 'Herb not found' });
    }

    // Delete herb
    await Herb.findByIdAndRemove(req.params.id);
    res.json({ msg: 'Herb removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Herb not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 