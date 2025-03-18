const express = require('express');
const router = express.Router();
const PersonalizedContentService = require('../../services/recommendation_engine/services/PersonalizedContentService');
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const logger = require('../../utils/logger');

/**
 * @route   GET /api/personalized-content/quizzes
 * @desc    Get personalized quizzes for the current user
 * @access  Private
 */
router.get('/quizzes', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Parse query parameters
    const options = {
      limit: parseInt(req.query.limit) || 5,
      difficulty: req.query.difficulty || null,
      quizType: req.query.quizType || null,
      includeCompleted: req.query.includeCompleted === 'true'
    };
    
    // Get user profile and health data from user service
    // This is a simplified version - in a real app, we'd fetch this from a service
    const userProfile = req.user;
    const healthProfile = userProfile.healthProfile || {};
    const preferredTags = userProfile.preferences?.preferredTags || [];
    
    // Get personalized quizzes
    const quizzes = await PersonalizedContentService.getPersonalizedQuizzes(
      userId,
      {
        ...options,
        healthProfile,
        preferredTags
      }
    );
    
    res.json({
      success: true,
      count: quizzes.length,
      data: quizzes
    });
  } catch (error) {
    logger.error(`Error fetching personalized quizzes: ${error.message}`, {
      error: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/personalized-content/tutorials
 * @desc    Get personalized tutorials for the current user
 * @access  Private
 */
router.get('/tutorials', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Parse query parameters
    const options = {
      limit: parseInt(req.query.limit) || 5,
      difficulty: req.query.difficulty || null,
      tutorialType: req.query.tutorialType || null,
      includeCompleted: req.query.includeCompleted === 'true'
    };
    
    // Get user profile and health data
    const userProfile = req.user;
    const healthProfile = userProfile.healthProfile || {};
    const preferredTags = userProfile.preferences?.preferredTags || [];
    
    // Get personalized tutorials
    const tutorials = await PersonalizedContentService.getPersonalizedTutorials(
      userId,
      {
        ...options,
        healthProfile,
        preferredTags
      }
    );
    
    res.json({
      success: true,
      count: tutorials.length,
      data: tutorials
    });
  } catch (error) {
    logger.error(`Error fetching personalized tutorials: ${error.message}`, {
      error: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/personalized-content/mixed
 * @desc    Get mixed personalized content (articles, quizzes, tutorials)
 * @access  Private
 */
router.get('/mixed', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Parse query parameters
    const options = {
      limit: parseInt(req.query.limit) || 10,
      contentRatios: {
        articles: parseFloat(req.query.articleRatio) || 0.5,
        quizzes: parseFloat(req.query.quizRatio) || 0.3,
        tutorials: parseFloat(req.query.tutorialRatio) || 0.2
      }
    };
    
    // Normalize ratios to ensure they sum to 1
    const { articles, quizzes, tutorials } = options.contentRatios;
    const total = articles + quizzes + tutorials;
    
    if (total !== 1) {
      options.contentRatios = {
        articles: articles / total,
        quizzes: quizzes / total,
        tutorials: tutorials / total
      };
    }
    
    // Get user profile and health data
    const userProfile = req.user;
    const healthProfile = userProfile.healthProfile || {};
    const preferredTags = userProfile.preferences?.preferredTags || [];
    
    // Get mixed personalized content
    const content = await PersonalizedContentService.getMixedPersonalizedContent(
      userId,
      {
        ...options,
        healthProfile,
        preferredTags
      }
    );
    
    res.json({
      success: true,
      count: content.length,
      data: content
    });
  } catch (error) {
    logger.error(`Error fetching mixed personalized content: ${error.message}`, {
      error: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/personalized-content/quizzes/:quizId/submit
 * @desc    Submit quiz results
 * @access  Private
 */
router.post('/quizzes/:quizId/submit', [
  auth,
  check('score', 'Score is required').not().isEmpty(),
  check('answers', 'Answers are required').isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  
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
    logger.error(`Error submitting quiz result: ${error.message}`, {
      error: error.stack,
      userId: req.user?.id,
      quizId: req.params.quizId
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/personalized-content/tutorials/:tutorialId/progress
 * @desc    Track tutorial progress
 * @access  Private
 */
router.post('/tutorials/:tutorialId/progress', [
  auth,
  check('stepCompleted', 'Step completed is required').not().isEmpty(),
  check('completionPercentage', 'Completion percentage is required').isFloat({ min: 0, max: 100 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  
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
    logger.error(`Error tracking tutorial progress: ${error.message}`, {
      error: error.stack,
      userId: req.user?.id,
      tutorialId: req.params.tutorialId
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/personalized-content/quizzes
 * @desc    Create a new quiz (admin only)
 * @access  Private/Admin
 */
router.post('/quizzes', [
  auth,
  // middleware to check if user is admin would go here
  check('title', 'Title is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('questions', 'Questions are required').isArray({ min: 1 }),
  check('resultCategories', 'Result categories are required').isArray({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  
  try {
    // Add author information
    const quizData = {
      ...req.body,
      author: req.user.id,
      authorName: req.user.name
    };
    
    // Create the quiz
    const quiz = await PersonalizedContentService.createQuiz(quizData);
    
    res.status(201).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    logger.error(`Error creating quiz: ${error.message}`, {
      error: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/personalized-content/tutorials
 * @desc    Create a new tutorial (admin only)
 * @access  Private/Admin
 */
router.post('/tutorials', [
  auth,
  // middleware to check if user is admin would go here
  check('title', 'Title is required').not().isEmpty(),
  check('description', 'Description is required').not().isEmpty(),
  check('steps', 'Steps are required').isArray({ min: 1 }),
  check('tutorialType', 'Tutorial type is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  
  try {
    // Add author information
    const tutorialData = {
      ...req.body,
      author: req.user.id,
      authorName: req.user.name
    };
    
    // Create the tutorial
    const tutorial = await PersonalizedContentService.createTutorial(tutorialData);
    
    res.status(201).json({
      success: true,
      data: tutorial
    });
  } catch (error) {
    logger.error(`Error creating tutorial: ${error.message}`, {
      error: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router; 