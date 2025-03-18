const mongoose = require('mongoose');
const InteractiveQuiz = require('../models/InteractiveQuiz');
const GuidedTutorial = require('../models/GuidedTutorial');
const Content = require('../models/Content');
const logger = require('../../../utils/logger');

/**
 * Service for handling personalized content formats such as
 * interactive quizzes and guided tutorials
 */
class PersonalizedContentService {
  /**
   * Retrieves personalized quizzes based on user profile and preferences
   * 
   * @param {string} userId - User ID
   * @param {Object} options - Options for personalization
   * @param {Object} options.healthProfile - User's health profile
   * @param {Array} options.preferredTags - User's preferred content tags
   * @param {number} options.limit - Maximum number of quizzes to return
   * @param {string} options.difficulty - Filter by difficulty level
   * @param {string} options.quizType - Filter by quiz type
   * @param {boolean} options.includeCompleted - Whether to include completed quizzes
   * @returns {Promise<Array>} - List of personalized quizzes
   */
  async getPersonalizedQuizzes(userId, options = {}) {
    try {
      // Set default options
      const {
        healthProfile = {},
        preferredTags = [],
        limit = 5,
        difficulty = null,
        quizType = null,
        includeCompleted = false
      } = options;

      // Base query for active and published quizzes
      const query = {
        isActive: true,
        status: 'published'
      };

      // Apply filters if provided
      if (difficulty) {
        query.difficulty = difficulty;
      }

      if (quizType) {
        query.quizType = quizType;
      }

      // Exclude quizzes contraindicated for user health conditions
      if (healthProfile.conditions && healthProfile.conditions.length > 0) {
        query['personalization.contraindicatedForConditions'] = { 
          $nin: healthProfile.conditions 
        };
        
        // Boost quizzes that are helpful for user conditions
        query.$or = [
          { 'personalization.helpfulForConditions': { $in: healthProfile.conditions } },
          { tags: { $in: preferredTags } }
        ];
      } else if (preferredTags.length > 0) {
        // If no health conditions, just use preferred tags
        query.tags = { $in: preferredTags };
      }

      // If we don't want to include completed quizzes
      if (!includeCompleted && userId) {
        // TODO: Implement completed quiz tracking and exclusion
        // This would require another collection to track user progress
      }

      // Find quizzes matching our criteria
      const quizzes = await InteractiveQuiz.find(query)
        .sort({ 'metrics.popularity': -1 })
        .limit(limit);

      return quizzes;
    } catch (error) {
      logger.error(`Error getting personalized quizzes: ${error.message}`, { 
        userId, 
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * Retrieves personalized tutorials based on user profile and preferences
   * 
   * @param {string} userId - User ID
   * @param {Object} options - Options for personalization
   * @param {Object} options.healthProfile - User's health profile
   * @param {Array} options.preferredTags - User's preferred content tags
   * @param {number} options.limit - Maximum number of tutorials to return
   * @param {string} options.difficulty - Filter by difficulty level
   * @param {string} options.tutorialType - Filter by tutorial type
   * @param {boolean} options.includeCompleted - Whether to include completed tutorials
   * @returns {Promise<Array>} - List of personalized tutorials
   */
  async getPersonalizedTutorials(userId, options = {}) {
    try {
      // Set default options
      const {
        healthProfile = {},
        preferredTags = [],
        limit = 5,
        difficulty = null,
        tutorialType = null,
        includeCompleted = false
      } = options;

      // If we have a health profile with constitution, use the specialized method
      if (healthProfile.constitution) {
        return GuidedTutorial.findByHealthProfile(healthProfile, limit);
      }

      // Base query for active and published tutorials
      const query = {
        isActive: true,
        status: 'published'
      };

      // Apply filters if provided
      if (difficulty) {
        query.difficulty = difficulty;
      }

      if (tutorialType) {
        query.tutorialType = tutorialType;
      }

      // If we have preferred tags, include them in query
      if (preferredTags.length > 0) {
        query.tags = { $in: preferredTags };
      }

      // If we don't want to include completed tutorials
      if (!includeCompleted && userId) {
        // TODO: Implement completed tutorial tracking and exclusion
      }

      // Find tutorials matching our criteria
      const tutorials = await GuidedTutorial.find(query)
        .sort({ 'metrics.averageRating': -1 })
        .limit(limit);

      return tutorials;
    } catch (error) {
      logger.error(`Error getting personalized tutorials: ${error.message}`, { 
        userId, 
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * Gets a mix of personalized content including articles, quizzes, and tutorials
   * 
   * @param {string} userId - User ID
   * @param {Object} options - Options for personalization
   * @param {Object} options.healthProfile - User's health profile
   * @param {Array} options.preferredTags - User's preferred content tags
   * @param {number} options.limit - Maximum number of content items to return
   * @param {Object} options.contentRatios - Ratios for different content types
   * @returns {Promise<Array>} - Mixed personalized content
   */
  async getMixedPersonalizedContent(userId, options = {}) {
    try {
      // Set default options
      const {
        healthProfile = {},
        preferredTags = [],
        limit = 10,
        contentRatios = {
          articles: 0.5,  // 50% articles
          quizzes: 0.3,   // 30% quizzes
          tutorials: 0.2  // 20% tutorials
        }
      } = options;

      // Calculate number of items for each content type
      const articleCount = Math.max(1, Math.floor(limit * contentRatios.articles));
      const quizCount = Math.max(1, Math.floor(limit * contentRatios.quizzes));
      const tutorialCount = limit - articleCount - quizCount;

      // Get content of each type
      const [articles, quizzes, tutorials] = await Promise.all([
        // Get articles (assuming RecommendationService has this method)
        Content.find({ 
          isActive: true, 
          status: 'published',
          tags: { $in: preferredTags }
        })
        .sort({ 'metrics.viewCount': -1 })
        .limit(articleCount),
        
        // Get quizzes
        this.getPersonalizedQuizzes(userId, {
          healthProfile,
          preferredTags,
          limit: quizCount
        }),
        
        // Get tutorials
        this.getPersonalizedTutorials(userId, {
          healthProfile,
          preferredTags,
          limit: tutorialCount
        })
      ]);

      // Combine and format all content
      const allContent = [
        ...articles.map(article => ({
          ...article.toObject(),
          contentFormat: 'article'
        })),
        ...quizzes.map(quiz => ({
          ...quiz.toObject(),
          contentFormat: 'quiz'
        })),
        ...tutorials.map(tutorial => ({
          ...tutorial.toObject(),
          contentFormat: 'tutorial'
        }))
      ];

      // Shuffle content for better mixing
      this._shuffleArray(allContent);

      return allContent;
    } catch (error) {
      logger.error(`Error getting mixed personalized content: ${error.message}`, { 
        userId, 
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * Tracks a user's progress or interaction with personalized content
   * 
   * @param {string} userId - User ID
   * @param {string} contentId - Content ID
   * @param {string} contentType - Content type (quiz/tutorial)
   * @param {Object} progressData - Data about the progress/interaction
   * @returns {Promise<Object>} - Updated progress record
   */
  async trackContentProgress(userId, contentId, contentType, progressData) {
    try {
      // This would typically save to a UserContentProgress collection
      // For now, this is a placeholder
      logger.info(`Tracking content progress for user: ${userId}, content: ${contentId}`, {
        userId,
        contentId,
        contentType,
        progress: progressData
      });

      // In a real implementation, we would:
      // 1. Find or create a progress record
      // 2. Update it with the new progress data
      // 3. Return the updated record

      return {
        userId,
        contentId,
        contentType,
        progress: progressData,
        updatedAt: new Date()
      };
    } catch (error) {
      logger.error(`Error tracking content progress: ${error.message}`, { 
        userId, 
        contentId,
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * Submits a quiz result for a user
   * 
   * @param {string} userId - User ID
   * @param {string} quizId - Quiz ID
   * @param {Object} resultData - Quiz result data
   * @returns {Promise<Object>} - Processed result with recommendations
   */
  async submitQuizResult(userId, quizId, resultData) {
    try {
      // Find the quiz
      const quiz = await InteractiveQuiz.findById(quizId);
      if (!quiz) {
        throw new Error(`Quiz not found: ${quizId}`);
      }

      // Calculate result category based on score
      const score = resultData.score || 0;
      const resultCategory = quiz.resultCategories.find(category => {
        const [min, max] = category.scoreRange;
        return score >= min && score <= max;
      });

      if (!resultCategory) {
        throw new Error(`No matching result category found for score: ${score}`);
      }

      // Track the completion
      await this.trackContentProgress(userId, quizId, 'quiz', {
        completed: true,
        score,
        resultCategoryId: resultCategory._id,
        completedAt: new Date()
      });

      // Update quiz metrics
      quiz.metrics.completions += 1;
      await quiz.save();

      // Format the result for the user
      const formattedResult = {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          description: quiz.description
        },
        result: {
          title: resultCategory.title,
          description: resultCategory.description,
          score,
          healthRecommendations: resultCategory.healthRecommendations
        },
        recommendations: []
      };

      // Get recommended content if available
      if (resultCategory.recommendedContent && resultCategory.recommendedContent.length > 0) {
        const contentIds = resultCategory.recommendedContent.map(rec => rec.contentId);
        const recommendedContent = await Content.find({
          _id: { $in: contentIds },
          isActive: true
        });

        formattedResult.recommendations = recommendedContent.map(content => ({
          id: content._id,
          title: content.title,
          description: content.description,
          contentType: content.contentType
        }));
      }

      return formattedResult;
    } catch (error) {
      logger.error(`Error submitting quiz result: ${error.message}`, { 
        userId, 
        quizId,
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * Creates a new interactive quiz
   * 
   * @param {Object} quizData - Quiz data
   * @returns {Promise<Object>} - Created quiz
   */
  async createQuiz(quizData) {
    try {
      const quiz = new InteractiveQuiz(quizData);
      await quiz.save();
      return quiz;
    } catch (error) {
      logger.error(`Error creating quiz: ${error.message}`, { 
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * Creates a new guided tutorial
   * 
   * @param {Object} tutorialData - Tutorial data
   * @returns {Promise<Object>} - Created tutorial
   */
  async createTutorial(tutorialData) {
    try {
      const tutorial = new GuidedTutorial(tutorialData);
      await tutorial.save();
      return tutorial;
    } catch (error) {
      logger.error(`Error creating tutorial: ${error.message}`, { 
        error: error.stack 
      });
      throw error;
    }
  }

  /**
   * Utility method to shuffle an array in-place
   * 
   * @param {Array} array - Array to shuffle
   * @returns {Array} - The shuffled array
   */
  _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

module.exports = new PersonalizedContentService(); 