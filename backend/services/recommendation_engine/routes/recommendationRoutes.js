const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const recommendationController = require('../controllers/recommendationController');
const authMiddleware = require('../middleware/authMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Protect all routes with authentication
router.use(authMiddleware);

/**
 * @route   GET /api/recommendations
 * @desc    Get personalized recommendations for the current user
 * @access  Private
 */
router.get('/', recommendationController.getRecommendations);

/**
 * @route   GET /api/recommendations/similar/:contentId
 * @desc    Get content similar to a specific content item
 * @access  Private
 */
router.get('/similar/:contentId', recommendationController.getSimilarContent);

/**
 * @route   GET /api/recommendations/category/:category
 * @desc    Get recommendations for a specific category
 * @access  Private
 */
router.get('/category/:category', recommendationController.getCategoryRecommendations);

/**
 * @route   GET /api/recommendations/trending
 * @desc    Get trending content recommendations
 * @access  Private
 */
router.get('/trending', recommendationController.getTrendingContent);

/**
 * @route   GET /api/recommendations/health
 * @desc    Get health-based content recommendations
 * @access  Private
 */
router.get('/health', recommendationController.getHealthRecommendations);

/**
 * @route   GET /api/recommendations/seasonal
 * @desc    Get seasonal content recommendations
 * @access  Private
 */
router.get('/seasonal', recommendationController.getSeasonalRecommendations);

/**
 * @route   GET /api/recommendations/interests
 * @desc    Get user interests
 * @access  Private
 */
router.get('/interests', recommendationController.getUserInterests);

/**
 * @route   GET /api/recommendations/quizzes
 * @desc    Get personalized quizzes
 * @access  Private
 */
router.get('/quizzes', recommendationController.getPersonalizedQuizzes);

/**
 * @route   GET /api/recommendations/tutorials
 * @desc    Get personalized tutorials
 * @access  Private
 */
router.get('/tutorials', recommendationController.getPersonalizedTutorials);

/**
 * @route   GET /api/recommendations/mixed
 * @desc    Get mixed personalized content (articles, quizzes, tutorials)
 * @access  Private
 */
router.get('/mixed', recommendationController.getMixedPersonalizedContent);

/**
 * @route   POST /api/recommendations/quizzes/:quizId/submit
 * @desc    Submit quiz results
 * @access  Private
 */
router.post(
  '/quizzes/:quizId/submit',
  [
    body('score').notEmpty().withMessage('Score is required'),
    body('answers').isArray().withMessage('Answers are required')
  ],
  recommendationController.submitQuizResult
);

/**
 * @route   POST /api/recommendations/tutorials/:tutorialId/progress
 * @desc    Track tutorial progress
 * @access  Private
 */
router.post(
  '/tutorials/:tutorialId/progress',
  [
    body('stepCompleted').notEmpty().withMessage('Step completed is required'),
    body('completionPercentage').isFloat({ min: 0, max: 100 }).withMessage('Valid completion percentage is required')
  ],
  recommendationController.trackTutorialProgress
);

/**
 * @route   POST /api/recommendations/track
 * @desc    Track user behavior with content
 * @access  Private
 */
router.post(
  '/track', 
  [
    body('contentId').notEmpty().withMessage('Content ID is required'),
    body('behaviorType').notEmpty().withMessage('Behavior type is required')
  ],
  recommendationController.trackBehavior
);

// Admin-only routes
router.use('/admin', adminAuthMiddleware);

/**
 * @route   POST /api/recommendations/admin/abtests
 * @desc    Create or update A/B test
 * @access  Private (Admin only)
 */
router.post(
  '/admin/abtests',
  [
    body('name').notEmpty().withMessage('Test name is required'),
    body('variants').isArray({ min: 2 }).withMessage('At least two variants are required')
  ],
  recommendationController.manageABTest
);

/**
 * @route   GET /api/recommendations/admin/abtests
 * @desc    List all A/B tests
 * @access  Private (Admin only)
 */
router.get('/admin/abtests', recommendationController.listABTests);

/**
 * @route   GET /api/recommendations/admin/abtests/:testId/results
 * @desc    Get A/B test results
 * @access  Private (Admin only)
 */
router.get('/admin/abtests/:testId/results', recommendationController.getABTestResults);

module.exports = router; 