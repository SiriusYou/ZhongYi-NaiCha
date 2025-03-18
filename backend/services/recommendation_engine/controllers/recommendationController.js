const { validationResult } = require('express-validator');
const RecommendationService = require('../services/RecommendationService');
const UserProfile = require('../models/UserProfile');
const UserBehavior = require('../models/UserBehavior');
const Content = require('../models/Content');
const UserInterest = require('../models/UserInterest');
const ABTest = require('../models/ABTest');
const PersonalizedContentService = require('../services/PersonalizedContentService');
const mongoose = require('mongoose');

/**
 * Get personalized recommendations for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, contentType, difficulty, excludeIds = [] } = req.query;
    
    // Convert string of comma-separated IDs to array if provided
    const excludeIdsArray = typeof excludeIds === 'string' 
      ? excludeIds.split(',').filter(id => mongoose.Types.ObjectId.isValid(id))
      : Array.isArray(excludeIds) ? excludeIds : [];
    
    // Set up options
    const options = {
      maxRecommendations: parseInt(limit),
      contentType,
      difficulty,
      excludeIds: excludeIdsArray
    };
    
    // Get recommendations
    const recommendations = await RecommendationService.getRecommendations(userId, options);
    
    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting recommendations',
      message: error.message
    });
  }
};

/**
 * Track user interaction with content
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.trackBehavior = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contentId, behaviorType } = req.body;
    
    // Validate inputs
    if (!contentId || !behaviorType) {
      return res.status(400).json({
        success: false,
        error: 'Content ID and behavior type are required'
      });
    }
    
    // Validate behaviorType
    const validBehaviors = ['view', 'like', 'share', 'click', 'save', 'comment'];
    if (!validBehaviors.includes(behaviorType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid behavior type',
        validTypes: validBehaviors
      });
    }
    
    // Track behavior
    await RecommendationService.trackUserBehavior(userId, contentId, behaviorType);
    
    res.json({
      success: true,
      message: 'Behavior tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking user behavior:', error);
    res.status(500).json({
      success: false,
      error: 'Error tracking user behavior',
      message: error.message
    });
  }
};

/**
 * Get similar content recommendations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSimilarContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const { limit = 10 } = req.query;
    
    // Validate contentId
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content ID'
      });
    }
    
    // Get similar content
    const similarContent = await RecommendationService.getSimilarContent(
      contentId, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      count: similarContent.length,
      data: similarContent
    });
  } catch (error) {
    console.error('Error getting similar content:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting similar content',
      message: error.message
    });
  }
};

/**
 * Get content recommendations for a specific category
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCategoryRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.params;
    const { limit = 10 } = req.query;
    
    // Get category recommendations
    const recommendations = await RecommendationService.getCategoryRecommendations(
      userId,
      category,
      parseInt(limit)
    );
    
    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    console.error('Error getting category recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting category recommendations',
      message: error.message
    });
  }
};

/**
 * Get trending content recommendations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTrendingContent = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get trending content
    const trendingContent = await RecommendationService.getTrendingContent(parseInt(limit));
    
    res.json({
      success: true,
      count: trendingContent.length,
      data: trendingContent
    });
  } catch (error) {
    console.error('Error getting trending content:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting trending content',
      message: error.message
    });
  }
};

/**
 * Get health-based content recommendations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getHealthRecommendations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;
    
    // Get health-based recommendations
    const recommendations = await RecommendationService.getHealthBasedRecommendations(
      userId,
      parseInt(limit)
    );
    
    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    console.error('Error getting health recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting health recommendations',
      message: error.message
    });
  }
};

/**
 * Get seasonal content recommendations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getSeasonalRecommendations = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get seasonal recommendations
    const recommendations = await RecommendationService.getSeasonalRecommendations(parseInt(limit));
    
    res.json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    console.error('Error getting seasonal recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting seasonal recommendations',
      message: error.message
    });
  }
};

/**
 * Get user interests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserInterests = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user interests
    const UserInterest = mongoose.model('UserInterest');
    const interests = await UserInterest.find({ userId })
      .sort({ weight: -1 })
      .lean();
    
    res.json({
      success: true,
      count: interests.length,
      data: interests
    });
  } catch (error) {
    console.error('Error getting user interests:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting user interests',
      message: error.message
    });
  }
};

/**
 * Create or update A/B test (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.manageABTest = async (req, res) => {
  try {
    const { 
      id,
      name, 
      description, 
      variants, 
      targetUserPercentage, 
      startDate, 
      endDate, 
      isActive 
    } = req.body;
    
    // Validate required fields
    if (!name || !variants || !Array.isArray(variants) || variants.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Name and at least two variants are required'
      });
    }
    
    // Create or update test
    let abTest;
    
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      // Update existing test
      abTest = await ABTest.findByIdAndUpdate(id, {
        name, 
        description, 
        variants, 
        targetUserPercentage: targetUserPercentage || 100, 
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date()
      }, { new: true });
      
      if (!abTest) {
        return res.status(404).json({
          success: false,
          error: 'A/B test not found'
        });
      }
    } else {
      // Create new test
      abTest = await ABTest.create({
        name, 
        description, 
        variants, 
        targetUserPercentage: targetUserPercentage || 100, 
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: isActive !== undefined ? isActive : true
      });
    }
    
    res.json({
      success: true,
      data: abTest
    });
  } catch (error) {
    console.error('Error managing A/B test:', error);
    res.status(500).json({
      success: false,
      error: 'Error managing A/B test',
      message: error.message
    });
  }
};

/**
 * Get A/B test results (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getABTestResults = async (req, res) => {
  try {
    const { testId } = req.params;
    
    // Validate testId
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid test ID'
      });
    }
    
    // Get test
    const abTest = await ABTest.findById(testId);
    if (!abTest) {
      return res.status(404).json({
        success: false,
        error: 'A/B test not found'
      });
    }
    
    // Analyze results
    const results = await RecommendationService.analyzeABTestResults(testId);
    
    res.json({
      success: true,
      test: abTest,
      results
    });
  } catch (error) {
    console.error('Error getting A/B test results:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting A/B test results',
      message: error.message
    });
  }
};

/**
 * List all A/B tests (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.listABTests = async (req, res) => {
  try {
    const { active } = req.query;
    
    // Build query
    const query = {};
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    // Get tests
    const tests = await ABTest.find(query)
      .sort({ startDate: -1 })
      .lean();
    
    res.json({
      success: true,
      count: tests.length,
      data: tests
    });
  } catch (error) {
    console.error('Error listing A/B tests:', error);
    res.status(500).json({
      success: false,
      error: 'Error listing A/B tests',
      message: error.message
    });
  }
};

/**
 * Get trending content
 * @route GET /api/recommendations/trending
 * @access Private
 */
exports.getTrendingContent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      contentType = 'all', 
      limit = 10,
      timeRange = 'week',
      tags = []
    } = req.query;

    // Parse tags if provided as comma-separated string
    const tagArray = Array.isArray(tags) 
      ? tags 
      : (typeof tags === 'string' && tags.length > 0) 
        ? tags.split(',').map(tag => tag.trim()) 
        : [];

    // Determine date range
    const now = new Date();
    let startDate;
    
    switch (timeRange) {
      case 'day':
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }

    // Build query
    const query = {
      status: 'published',
      isActive: true,
      ...(contentType !== 'all' ? { contentType } : {}),
      publishedAt: { $gte: startDate }
    };

    // Add tags filter if provided
    if (tagArray.length > 0) {
      query.tags = { $in: tagArray };
    }

    // Get trending content based on view count + recency
    // Using an aggregation pipeline to calculate a trending score
    const trendingContent = await Content.aggregate([
      { $match: query },
      // Calculate trending score: blend of views, likes, shares, and recency
      { $addFields: {
        daysSincePublished: {
          $divide: [
            { $subtract: [new Date(), "$publishedAt"] },
            1000 * 60 * 60 * 24 // convert ms to days
          ]
        }
      }},
      { $addFields: {
        // Trending score formula: (views + likes*2 + shares*3) / (daysSincePublished + 2)^1.5
        trendingScore: {
          $divide: [
            { $add: [
              "$metrics.viewCount", 
              { $multiply: ["$metrics.likeCount", 2] },
              { $multiply: ["$metrics.shareCount", 3] }
            ]},
            { $pow: [{ $add: ["$daysSincePublished", 2] }, 1.5] }
          ]
        }
      }},
      { $sort: { trendingScore: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      count: trendingContent.length,
      timeRange,
      recommendations: trendingContent
    });
  } catch (error) {
    console.error('Error getting trending content:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get trending content',
      error: error.message
    });
  }
};

/**
 * Get seasonal content
 * @route GET /api/recommendations/seasonal
 * @access Private
 */
exports.getSeasonalContent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      contentType = 'all', 
      limit = 10,
      season = null
    } = req.query;

    // Get current season if not specified
    const currentSeason = season || getCurrentSeason();

    // Build query
    const query = {
      status: 'published',
      isActive: true,
      ...(contentType !== 'all' ? { contentType } : {}),
      seasonalRelevance: currentSeason
    };

    // Get seasonal content
    const seasonalContent = await Content.find(query)
      .sort({ recommendationScore: -1, publishedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: seasonalContent.length,
      season: currentSeason,
      recommendations: seasonalContent
    });
  } catch (error) {
    console.error('Error getting seasonal content:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get seasonal content',
      error: error.message
    });
  }
};

/**
 * Update user interests
 * @route POST /api/recommendations/interests
 * @access Private
 */
exports.updateUserInterests = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { 
      add = [], 
      remove = []
    } = req.body;

    // Process additions
    for (const tag of add) {
      await UserInterest.findOneAndUpdate(
        { userId, tag: tag.toLowerCase() },
        { 
          $inc: { interactionCount: 1 },
          $set: { 
            explicitlySelected: true,
            lastInteraction: new Date()
          }
        },
        { upsert: true }
      );
    }

    // Process removals
    if (remove.length > 0) {
      await UserInterest.updateMany(
        { userId, tag: { $in: remove.map(t => t.toLowerCase()) } },
        { $set: { explicitlySelected: false } }
      );
    }

    // Get updated interests
    const updatedInterests = await UserInterest.find({ userId })
      .sort({ score: -1 })
      .lean();

    res.json({
      success: true,
      message: 'Interests updated successfully',
      count: updatedInterests.length,
      interests: updatedInterests
    });
  } catch (error) {
    console.error('Error updating user interests:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update user interests',
      error: error.message
    });
  }
};

// Helper function to get current season
function getCurrentSeason() {
  const now = new Date();
  const month = now.getMonth();
  
  // Simplified seasonal determination
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

/**
 * Get personalized quizzes for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPersonalizedQuizzes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      limit = 5, 
      difficulty = null, 
      quizType = null,
      includeCompleted = false
    } = req.query;
    
    // Get personalized quizzes
    const quizzes = await RecommendationService.getPersonalizedQuizzes(userId, {
      limit: parseInt(limit),
      difficulty,
      quizType,
      includeCompleted: includeCompleted === 'true'
    });
    
    res.json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error) {
    console.error('Error getting personalized quizzes:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting personalized quizzes',
      message: error.message
    });
  }
};

/**
 * Get personalized tutorials for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPersonalizedTutorials = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      limit = 5, 
      difficulty = null, 
      tutorialType = null,
      includeCompleted = false
    } = req.query;
    
    // Get personalized tutorials
    const tutorials = await RecommendationService.getPersonalizedTutorials(userId, {
      limit: parseInt(limit),
      difficulty,
      tutorialType,
      includeCompleted: includeCompleted === 'true'
    });
    
    res.json({
      success: true,
      count: tutorials.length,
      data: tutorials
    });
  } catch (error) {
    console.error('Error getting personalized tutorials:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting personalized tutorials',
      message: error.message
    });
  }
};

/**
 * Get mixed personalized content (standard content, quizzes, and tutorials)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getMixedPersonalizedContent = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      limit = 10,
      articleRatio = 0.5,
      quizRatio = 0.3,
      tutorialRatio = 0.2
    } = req.query;
    
    // Parse content ratios
    const contentRatios = {
      articles: parseFloat(articleRatio),
      quizzes: parseFloat(quizRatio),
      tutorials: parseFloat(tutorialRatio)
    };
    
    // Normalize ratios to ensure they sum to 1
    const { articles, quizzes, tutorials } = contentRatios;
    const total = articles + quizzes + tutorials;
    
    if (total !== 1) {
      const normalizedRatios = {
        articles: articles / total,
        quizzes: quizzes / total,
        tutorials: tutorials / total
      };
      contentRatios.articles = normalizedRatios.articles;
      contentRatios.quizzes = normalizedRatios.quizzes;
      contentRatios.tutorials = normalizedRatios.tutorials;
    }
    
    // Get user profile
    const userProfile = await UserProfile.findOne({ userId }).lean();
    
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }
    
    // Extract health profile
    const healthProfile = {
      constitution: userProfile.constitution,
      conditions: userProfile.healthConditions || [],
      goals: userProfile.goals || []
    };
    
    // Get user preferred tags
    const userInterests = await UserInterest.find({ userId })
      .sort({ weight: -1 })
      .limit(20)
      .lean();
    
    const preferredTags = userInterests.map(interest => interest.tag);
    
    // Get mixed personalized content
    const content = await PersonalizedContentService.getMixedPersonalizedContent(userId, {
      healthProfile,
      preferredTags,
      limit: parseInt(limit),
      contentRatios
    });
    
    res.json({
      success: true,
      count: content.length,
      data: content
    });
  } catch (error) {
    console.error('Error getting mixed personalized content:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting mixed personalized content',
      message: error.message
    });
  }
};

/**
 * Submit quiz results
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.submitQuizResult = async (req, res) => {
  try {
    const userId = req.user.id;
    const { quizId } = req.params;
    const resultData = req.body;
    
    // Submit quiz result
    const result = await PersonalizedContentService.submitQuizResult(
      userId,
      quizId,
      resultData
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error submitting quiz result:', error);
    res.status(500).json({
      success: false,
      error: 'Error submitting quiz result',
      message: error.message
    });
  }
};

/**
 * Track tutorial progress
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.trackTutorialProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tutorialId } = req.params;
    const progressData = req.body;
    
    // Track tutorial progress
    const progress = await PersonalizedContentService.trackContentProgress(
      userId,
      tutorialId,
      'tutorial',
      progressData
    );
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error tracking tutorial progress:', error);
    res.status(500).json({
      success: false,
      error: 'Error tracking tutorial progress',
      message: error.message
    });
  }
}; 