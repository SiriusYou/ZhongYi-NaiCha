const express = require('express');
const router = express.Router();
const SeasonalContentService = require('../services/SeasonalContentService');
const RecommendationService = require('../services/RecommendationService');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const mongoose = require('mongoose');

/**
 * @route GET /api/seasonal/highlights
 * @desc Get seasonal content highlights for a user
 * @access Private
 */
router.get('/highlights', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    const seasonalHighlights = await RecommendationService.getSeasonalContentHighlights(userId, { limit });
    
    // Track impressions for any explicit promotions
    if (seasonalHighlights && seasonalHighlights.length > 0) {
      seasonalHighlights.forEach(content => {
        if (content.promotionId) {
          // Don't await to avoid delaying response
          SeasonalContentService.trackImpression(content.promotionId).catch(err => {
            console.error(`Error tracking impression: ${err.message}`);
          });
        }
      });
    }
    
    res.json({
      success: true,
      data: seasonalHighlights
    });
  } catch (error) {
    console.error('Error fetching seasonal highlights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seasonal content highlights',
      message: error.message
    });
  }
});

/**
 * @route GET /api/seasonal/info
 * @desc Get current seasonal TCM information
 * @access Public
 */
router.get('/info', async (req, res) => {
  try {
    const seasonalInfo = SeasonalContentService.getTCMSeasonalInfo();
    
    res.json({
      success: true,
      data: seasonalInfo
    });
  } catch (error) {
    console.error('Error fetching seasonal TCM info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seasonal TCM information',
      message: error.message
    });
  }
});

/**
 * @route POST /api/seasonal/track-click/:promotionId
 * @desc Track a click on a seasonal promotion
 * @access Private
 */
router.post('/track-click/:promotionId', authMiddleware, async (req, res) => {
  try {
    const { promotionId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(promotionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid promotion ID'
      });
    }
    
    await SeasonalContentService.trackClick(promotionId);
    
    res.json({
      success: true,
      message: 'Click tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking promotion click:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track promotion click',
      message: error.message
    });
  }
});

// Admin routes - require admin privileges
router.use(adminMiddleware);

/**
 * @route GET /api/seasonal/promotions
 * @desc Get all seasonal promotions
 * @access Admin
 */
router.get('/promotions', async (req, res) => {
  try {
    const { active } = req.query;
    
    let promotions;
    if (active === 'true') {
      promotions = await SeasonalContentService.getActivePromotions();
    } else {
      // Get all promotions from MongoDB directly
      promotions = await mongoose.model('SeasonalContent').find().sort({ createdAt: -1 });
    }
    
    res.json({
      success: true,
      data: promotions
    });
  } catch (error) {
    console.error('Error fetching seasonal promotions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seasonal promotions',
      message: error.message
    });
  }
});

/**
 * @route GET /api/seasonal/promotions/:id
 * @desc Get a specific seasonal promotion by ID
 * @access Admin
 */
router.get('/promotions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid promotion ID'
      });
    }
    
    const promotion = await mongoose.model('SeasonalContent').findById(id);
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: 'Seasonal promotion not found'
      });
    }
    
    res.json({
      success: true,
      data: promotion
    });
  } catch (error) {
    console.error('Error fetching seasonal promotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seasonal promotion',
      message: error.message
    });
  }
});

/**
 * @route POST /api/seasonal/promotions
 * @desc Create a new seasonal promotion
 * @access Admin
 */
router.post('/promotions', async (req, res) => {
  try {
    const promotionData = req.body;
    
    // Add metadata
    promotionData.metadata = promotionData.metadata || {};
    promotionData.metadata.createdBy = req.user.id;
    
    const promotion = await SeasonalContentService.createPromotion(promotionData);
    
    res.status(201).json({
      success: true,
      data: promotion,
      message: 'Seasonal promotion created successfully'
    });
  } catch (error) {
    console.error('Error creating seasonal promotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create seasonal promotion',
      message: error.message
    });
  }
});

/**
 * @route PUT /api/seasonal/promotions/:id
 * @desc Update an existing seasonal promotion
 * @access Admin
 */
router.put('/promotions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid promotion ID'
      });
    }
    
    // Add updated metadata
    updateData.metadata = updateData.metadata || {};
    updateData.metadata.lastUpdatedBy = req.user.id;
    
    const promotion = await SeasonalContentService.updatePromotion(id, updateData);
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: 'Seasonal promotion not found'
      });
    }
    
    res.json({
      success: true,
      data: promotion,
      message: 'Seasonal promotion updated successfully'
    });
  } catch (error) {
    console.error('Error updating seasonal promotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update seasonal promotion',
      message: error.message
    });
  }
});

/**
 * @route DELETE /api/seasonal/promotions/:id
 * @desc Delete a seasonal promotion
 * @access Admin
 */
router.delete('/promotions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid promotion ID'
      });
    }
    
    const success = await SeasonalContentService.deletePromotion(id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Seasonal promotion not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Seasonal promotion deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting seasonal promotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete seasonal promotion',
      message: error.message
    });
  }
});

/**
 * @route POST /api/seasonal/auto-generate
 * @desc Generate a seasonal promotion automatically based on current season
 * @access Admin
 */
router.post('/auto-generate', async (req, res) => {
  try {
    const promotion = await SeasonalContentService.createAutomaticSeasonalPromotion();
    
    res.status(201).json({
      success: true,
      data: promotion,
      message: 'Automatic seasonal promotion created successfully'
    });
  } catch (error) {
    console.error('Error creating automatic seasonal promotion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create automatic seasonal promotion',
      message: error.message
    });
  }
});

/**
 * @route GET /api/seasonal/effectiveness
 * @desc Get effectiveness metrics for seasonal promotions
 * @access Admin
 */
router.get('/effectiveness', async (req, res) => {
  try {
    const effectiveness = await SeasonalContentService.calculatePromotionEffectiveness();
    
    res.json({
      success: true,
      data: effectiveness
    });
  } catch (error) {
    console.error('Error fetching promotion effectiveness:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch promotion effectiveness',
      message: error.message
    });
  }
});

module.exports = router; 