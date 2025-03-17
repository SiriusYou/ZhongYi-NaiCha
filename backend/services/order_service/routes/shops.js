const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Shop = require('../models/Shop');

// @route   GET api/shops
// @desc    Get all shops with pagination and filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build query with filters
    const query = { isActive: true };
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Search by name
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: 'i' };
    }
    
    // Filter by delivery or pickup availability
    if (req.query.hasDelivery === 'true') {
      query['services.hasDelivery'] = true;
    }
    
    if (req.query.hasPickup === 'true') {
      query['services.hasPickup'] = true;
    }
    
    // Geospatial search - find shops within radius of coordinates
    if (req.query.lat && req.query.lng && req.query.radius) {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      const radius = parseInt(req.query.radius); // in kilometers
      
      // Convert radius from kilometers to radians
      // Earth's radius is approximately 6371 kilometers
      const radiusInRadians = radius / 6371;
      
      query.location = {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusInRadians]
        }
      };
    }
    
    // Get shops with pagination
    const shops = await Shop.find(query)
      .sort({ 'rating.average': -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Shop.countDocuments(query);
    
    res.json({
      shops,
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

// @route   GET api/shops/:id
// @desc    Get shop by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    
    // Check if shop exists
    if (!shop || !shop.isActive) {
      return res.status(404).json({ msg: 'Shop not found' });
    }
    
    res.json(shop);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shop not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/shops
// @desc    Create a new shop
// @access  Private (Admin only - TODO: Add admin middleware)
router.post(
  '/',
  [
    auth,
    [
      check('name', 'Name is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('address', 'Address details are required').isObject(),
      check('address.street', 'Street address is required').not().isEmpty(),
      check('address.city', 'City is required').not().isEmpty(),
      check('address.state', 'State/Province is required').not().isEmpty(),
      check('address.zipCode', 'Postal/ZIP code is required').not().isEmpty(),
      check('location', 'Location coordinates are required').isObject(),
      check('location.coordinates', 'Location coordinates must be an array of [longitude, latitude]').isArray({ min: 2, max: 2 }),
      check('contactInfo', 'Contact information is required').isObject(),
      check('contactInfo.phone', 'Phone number is required').not().isEmpty(),
      check('businessHours', 'Business hours are required').isArray({ min: 1 })
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      // TODO: Add check to verify user is an admin
      
      // Create new shop
      const newShop = new Shop(req.body);
      const shop = await newShop.save();
      
      res.json(shop);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/shops/:id
// @desc    Update a shop
// @access  Private (Admin only - TODO: Add admin middleware)
router.put('/:id', auth, async (req, res) => {
  try {
    // TODO: Add check to verify user is an admin
    
    // Check if shop exists
    let shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ msg: 'Shop not found' });
    }
    
    // Update shop
    shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    res.json(shop);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shop not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/shops/:id
// @desc    Delete a shop (soft delete)
// @access  Private (Admin only - TODO: Add admin middleware)
router.delete('/:id', auth, async (req, res) => {
  try {
    // TODO: Add check to verify user is an admin
    
    // Check if shop exists
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ msg: 'Shop not found' });
    }
    
    // Soft delete by setting isActive to false
    shop.isActive = false;
    shop.status = 'permanently_closed';
    await shop.save();
    
    res.json({ msg: 'Shop removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Shop not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/shops/nearby
// @desc    Find shops near a location
// @access  Public
router.get('/nearby', async (req, res) => {
  try {
    // Validate query parameters
    if (!req.query.lat || !req.query.lng) {
      return res.status(400).json({ msg: 'Latitude and longitude are required' });
    }
    
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    
    // Default radius is 5km
    const radius = parseInt(req.query.radius) || 5;
    
    // Max number of results
    const limit = parseInt(req.query.limit) || 10;
    
    // Find shops within radius with geospatial query
    const shops = await Shop.find({
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: radius * 1000 // Convert km to meters
        }
      }
    }).limit(limit);
    
    res.json({
      location: {
        lat,
        lng,
        radius
      },
      count: shops.length,
      shops
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/shops/:id/menu
// @desc    Update a shop's menu (available recipes)
// @access  Private (Admin/Shop owner only - TODO: Add middleware)
router.put(
  '/:id/menu',
  [
    auth,
    [
      check('availableRecipes', 'Menu items are required').isArray({ min: 1 }),
      check('availableRecipes.*.recipeId', 'Recipe ID is required for each menu item').not().isEmpty(),
      check('availableRecipes.*.price', 'Price is required for each menu item').isNumeric()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      // TODO: Add check to verify user is an admin or shop owner
      
      // Check if shop exists
      let shop = await Shop.findById(req.params.id);
      if (!shop) {
        return res.status(404).json({ msg: 'Shop not found' });
      }
      
      // Update shop menu
      shop = await Shop.findByIdAndUpdate(
        req.params.id,
        { $set: { 'menu.availableRecipes': req.body.availableRecipes } },
        { new: true }
      );
      
      res.json(shop.menu);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Shop not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/shops/:id/rating
// @desc    Rate a shop
// @access  Private
router.post(
  '/:id/rating',
  [
    auth,
    [
      check('rating', 'Rating is required and must be between 1 and 5').isFloat({ min: 1, max: 5 })
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const shop = await Shop.findById(req.params.id);
      if (!shop) {
        return res.status(404).json({ msg: 'Shop not found' });
      }
      
      // Calculate new average rating
      const currentTotal = shop.rating.average * shop.rating.count;
      const newCount = shop.rating.count + 1;
      const newAverage = (currentTotal + req.body.rating) / newCount;
      
      // Update shop with new rating
      const updatedShop = await Shop.findByIdAndUpdate(
        req.params.id,
        { 
          $set: { 
            'rating.average': newAverage,
            'rating.count': newCount
          } 
        },
        { new: true }
      );
      
      res.json(updatedShop.rating);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Shop not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router; 