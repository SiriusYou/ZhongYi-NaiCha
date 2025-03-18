const mongoose = require('mongoose');
const UserProfile = require('../models/UserProfile');
const UserBehavior = require('../models/UserBehavior');
const Content = require('../models/Content');
const UserInterest = require('../models/UserInterest');
const ABTest = require('../models/ABTest');
const { calculateSimilarity, exponentialDecay } = require('../utils/algorithms');
const RecommendationLog = require('../models/RecommendationLog');
const FeedbackProcessor = require('./FeedbackProcessor');
const HealthDataProcessor = require('./HealthDataProcessor');
const config = require('../config');
const SeasonalContentService = require('./SeasonalContentService');
const PersonalizedContentService = require('./PersonalizedContentService');
const InteractiveQuiz = require('../models/InteractiveQuiz');
const GuidedTutorial = require('../models/GuidedTutorial');

class RecommendationService {
  constructor() {
    this.defaultSettings = {
      maxRecommendations: 20,
      diversityWeight: 0.3,
      recencyWeight: 0.2,
      popularityWeight: 0.1,
      personalizedWeight: 0.4,
      seasonalBoost: 0.2,
      contentFormatMix: {
        standard: 0.7,   // Standard content (articles, recipes, etc.)
        quizzes: 0.15,   // Interactive quizzes
        tutorials: 0.15  // Guided tutorials
      }
    };
  }

  /**
   * Generate personalized content recommendations for a user
   * @param {string} userId - The user ID
   * @param {Object} options - Options for content recommendation
   * @param {string} options.contentType - Type of content ('article', 'recipe', 'tea', etc.)
   * @param {number} options.limit - Max number of recommendations to return
   * @param {boolean} options.includeViewed - Whether to include content the user has already viewed
   * @param {string[]} options.tags - Specific tags to filter by
   * @param {string} options.abTestId - A/B test ID to use for algorithm selection
   * @param {boolean} options.applyHealthData - Whether to consider health data for recommendations
   * @param {boolean} options.applySeasonalBoosts - Whether to apply seasonal content boosts
   * @param {boolean} options.includeInteractiveFormats - Whether to include quizzes and tutorials
   * @returns {Promise<Array>} - Array of recommended content items
   */
  async getPersonalizedRecommendations(userId, options = {}) {
    try {
      const {
        contentType = 'all',
        limit = 20,
        includeViewed = false,
        tags = [],
        abTestId = null,
        applyHealthData = true,
        applySeasonalBoosts = true,
        includeInteractiveFormats = true
      } = options;

      // Fetch user profile, behavior data, and personalized weights
      const [userProfile, userBehaviors, personalizedWeights] = await Promise.all([
        UserProfile.findOne({ userId }).lean(),
        UserBehavior.find({ userId }).sort({ timestamp: -1 }).limit(200).lean(),
        FeedbackProcessor.generatePersonalizedWeights(userId)
      ]);

      if (!userProfile) {
        return this.getFallbackRecommendations(contentType, limit, includeInteractiveFormats);
      }

      // Use personalized weights or default settings
      const weights = personalizedWeights || this.defaultSettings;

      // Determine which algorithm to use (potentially based on A/B test or user performance)
      const algorithm = await this._getRecommendationAlgorithm(userId, abTestId);

      // If we're including interactive formats, use mixed content recommendation
      if (includeInteractiveFormats) {
        return this._getMixedFormatRecommendations(
          userId, 
          userProfile, 
          userBehaviors, 
          options, 
          weights
        );
      }

      // Otherwise, continue with standard recommendation flow
      let recommendations;
      switch (algorithm) {
        case 'collaborative-filtering':
          recommendations = await this._getCollaborativeFilteringRecommendations(userId, options);
          break;
        case 'content-based':
          recommendations = await this._getContentBasedRecommendations(userId, userProfile, userBehaviors, options, weights);
          break;
        case 'hybrid':
        default:
          recommendations = await this._getHybridRecommendations(userId, userProfile, userBehaviors, options, weights);
      }

      // Apply post-processing filters with personalized settings
      recommendations = this._applyPostFilters(recommendations, userBehaviors, options, weights);

      // Log this recommendation event for future model training
      await this._logRecommendationEvent(userId, recommendations.map(r => r._id), algorithm);

      // Apply health data boost if option is enabled
      if (applyHealthData && recommendations.length > 0) {
        recommendations = await this._applyHealthDataBoost(userId, recommendations);
      }
      
      // Apply seasonal promotion boosts if option is enabled
      if (applySeasonalBoosts && recommendations.length > 0) {
        recommendations = await SeasonalContentService.applySeasonalBoosts(recommendations, userId);
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting personalized recommendations:', error.message);
      return this.getFallbackRecommendations(options.contentType, options.limit, options.includeInteractiveFormats);
    }
  }

  /**
   * Get recommendations that include a mix of standard content, quizzes, and tutorials
   * @param {string} userId - User ID 
   * @param {Object} userProfile - User profile
   * @param {Array} userBehaviors - User behavior data
   * @param {Object} options - Recommendation options
   * @param {Object} weights - Personalized weights
   * @returns {Promise<Array>} Mixed-format recommendations
   * @private 
   */
  async _getMixedFormatRecommendations(userId, userProfile, userBehaviors, options, weights = this.defaultSettings) {
    try {
      const { limit = 20, contentType = 'all' } = options;
      
      // Determine the mix of content types
      // Use personalized format mix if available, otherwise use defaults
      const formatMix = weights.contentFormatMix || this.defaultSettings.contentFormatMix;
      
      // Calculate how many items of each type to include based on limit
      const standardCount = Math.max(1, Math.floor(limit * formatMix.standard));
      const quizCount = Math.max(1, Math.floor(limit * formatMix.quizzes));
      const tutorialCount = limit - standardCount - quizCount;

      // Get standard content recommendations using existing methods
      const standardOptions = {
        ...options,
        limit: standardCount,
        includeInteractiveFormats: false
      };
      
      // Only filter by content type for standard content
      const standardRecommendations = await this._getStandardRecommendations(
        userId, 
        userProfile, 
        userBehaviors, 
        standardOptions, 
        weights
      );

      // Extract health profile from user profile
      const healthProfile = {
        constitution: userProfile.constitution,
        conditions: userProfile.healthConditions || [],
        goals: userProfile.goals || []
      };

      // Get user's preferred tags
      const userInterests = await UserInterest.find({ userId })
        .sort({ weight: -1 })
        .limit(20)
        .lean();
      
      const preferredTags = userInterests.map(interest => interest.tag);

      // Get personalized quizzes and tutorials in parallel
      const [quizzes, tutorials] = await Promise.all([
        // Get quizzes via PersonalizedContentService
        PersonalizedContentService.getPersonalizedQuizzes(userId, {
          healthProfile,
          preferredTags,
          limit: quizCount
        }),
        
        // Get tutorials via PersonalizedContentService
        PersonalizedContentService.getPersonalizedTutorials(userId, {
          healthProfile,
          preferredTags,
          limit: tutorialCount
        })
      ]);

      // Combine all content types
      const allRecommendations = [
        ...standardRecommendations.map(item => ({
          ...item,
          contentFormat: 'standard'
        })),
        ...quizzes.map(quiz => ({
          ...quiz,
          contentFormat: 'quiz'
        })),
        ...tutorials.map(tutorial => ({
          ...tutorial,
          contentFormat: 'tutorial'
        }))
      ];

      // Log recommendation event for analytics
      const contentIds = allRecommendations.map(item => item._id);
      await this._logRecommendationEvent(userId, contentIds, 'mixed_format');

      return allRecommendations;
    } catch (error) {
      console.error('Error getting mixed format recommendations:', error);
      // Fallback to standard recommendations
      return this._getStandardRecommendations(
        userId, 
        userProfile, 
        userBehaviors, 
        options, 
        weights
      );
    }
  }

  /**
   * Get standard content recommendations using existing algorithm selection logic
   * @private
   */
  async _getStandardRecommendations(userId, userProfile, userBehaviors, options, weights) {
    try {
      // Determine which algorithm to use
      const algorithm = await this._getRecommendationAlgorithm(userId, options.abTestId);
      
      // Get recommendations based on selected algorithm
      let recommendations;
      switch (algorithm) {
        case 'collaborative-filtering':
          recommendations = await this._getCollaborativeFilteringRecommendations(userId, options);
          break;
        case 'content-based':
          recommendations = await this._getContentBasedRecommendations(userId, userProfile, userBehaviors, options, weights);
          break;
        case 'hybrid':
        default:
          recommendations = await this._getHybridRecommendations(userId, userProfile, userBehaviors, options, weights);
      }

      // Apply post-processing filters with personalized settings
      recommendations = this._applyPostFilters(recommendations, userBehaviors, options, weights);

      // Apply health data boost if option is enabled
      if (options.applyHealthData && recommendations.length > 0) {
        recommendations = await this._applyHealthDataBoost(userId, recommendations);
      }
      
      // Apply seasonal promotion boosts if option is enabled
      if (options.applySeasonalBoosts && recommendations.length > 0) {
        recommendations = await SeasonalContentService.applySeasonalBoosts(recommendations, userId);
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting standard recommendations:', error);
      return this.getFallbackRecommendations(options.contentType, options.limit, options.includeInteractiveFormats);
    }
  }

  /**
   * Get content-based recommendations using user profile and behavior
   * @private
   */
  async _getContentBasedRecommendations(userId, userProfile, userBehaviors, options, weights = this.defaultSettings) {
    const { contentType, limit, includeViewed } = options;

    // Get user interests
    const userInterests = await UserInterest.find({ userId }).lean();
    const interestTags = userInterests.map(interest => interest.tag);

    // Build query for content
    const query = {
      ...(contentType !== 'all' ? { contentType } : {}),
      isActive: true,
      publishedAt: { $lte: new Date() }
    };

    // If we have interest tags, prioritize content with those tags
    if (interestTags.length > 0) {
      query.tags = { $in: interestTags };
    }

    // If we have tags to avoid from user feedback, exclude them
    if (weights.avoidTags && weights.avoidTags.length > 0) {
      query.tags = query.tags || {};
      query.tags.$nin = weights.avoidTags;
    }

    // If user has viewed content and we don't want to include viewed content
    if (!includeViewed && userBehaviors.length > 0) {
      const viewedContentIds = userBehaviors
        .filter(behavior => behavior.action === 'view')
        .map(behavior => behavior.contentId);

      if (viewedContentIds.length > 0) {
        query._id = { $nin: viewedContentIds };
      }
    }

    // Get base content
    let content = await Content.find(query)
      .sort({ publishedAt: -1 })
      .limit(limit * 3) // Get more than we need for scoring
      .lean();

    // Calculate seasonal relevance score (based on current season)
    const currentSeason = this._getCurrentSeason();
    content = content.map(item => {
      // Use personalized weights for the scoring formula
      const seasonalRelevance = this._calculateSeasonalRelevance(item, currentSeason);
      const recencyScore = this._calculateRecencyScore(item.publishedAt);
      
      // Use user's health profile for health relevance
      const healthRelevance = this._calculateHealthRelevance(item, userProfile);
      
      // Interest match score
      const interestScore = this._calculateInterestScore(item, interestTags);
      
      // Check if item has any tags that should be boosted
      const hasBoostTags = weights.boostTags && 
        weights.boostTags.length > 0 && 
        item.tags && 
        item.tags.some(tag => weights.boostTags.includes(tag));
      
      // Apply tag boost if applicable
      const tagBoost = hasBoostTags ? 0.2 : 0;
      
      // Time of day relevance - boost content that matches user's preferred time
      const timeOfDayBoost = this._calculateTimeOfDayRelevance(item, weights.preferredTimeOfDay);
      
      // Final relevance score is a weighted combination using personalized weights
      const relevanceScore = (
        weights.seasonalWeight * seasonalRelevance + 
        weights.recencyWeight * recencyScore + 
        weights.healthRelevanceWeight * healthRelevance + 
        weights.tagImportance * interestScore +
        tagBoost +
        timeOfDayBoost
      );
      
      return { ...item, relevanceScore };
    });

    // Sort by relevance score and limit
    content.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return content.slice(0, limit);
  }

  /**
   * Get collaborative filtering recommendations based on similar users
   * @private
   */
  async _getCollaborativeFilteringRecommendations(userId, options) {
    const { contentType, limit, includeViewed } = options;

    // Find similar users based on behavior patterns
    const similarUsers = await this._findSimilarUsers(userId);
    
    if (similarUsers.length === 0) {
      return this._getContentBasedRecommendations(userId, null, [], options);
    }
    
    // Get content viewed/liked by similar users
    const similarUserIds = similarUsers.map(u => u.userId);
    
    const similarUserBehaviors = await UserBehavior.find({
      userId: { $in: similarUserIds },
      action: { $in: ['like', 'save', 'share'] } // Focus on positive signals
    })
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();
    
    // Count content popularity among similar users
    const contentScores = {};
    similarUserBehaviors.forEach(behavior => {
      const contentId = behavior.contentId.toString();
      if (!contentScores[contentId]) {
        contentScores[contentId] = 0;
      }
      
      // Weight different actions differently
      const actionWeight = behavior.action === 'like' ? 1 : 
                          behavior.action === 'save' ? 1.5 : 
                          behavior.action === 'share' ? 2 : 0.5;
      
      // Account for similarity - more similar users have more influence
      const userSimilarity = similarUsers.find(u => u.userId.toString() === behavior.userId.toString())?.similarity || 0.5;
      
      contentScores[contentId] += actionWeight * userSimilarity;
    });
    
    // Get the actual content items
    const topContentIds = Object.entries(contentScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit * 2)
      .map(([contentId]) => contentId);
    
    if (topContentIds.length === 0) {
      return this._getContentBasedRecommendations(userId, null, [], options);
    }
    
    // Exclude already viewed content if specified
    let excludeIds = [];
    if (!includeViewed) {
      const userBehaviors = await UserBehavior.find({ 
        userId,
        action: 'view'
      }).select('contentId').lean();
      
      excludeIds = userBehaviors.map(b => b.contentId.toString());
    }
    
    // Filter out excluded IDs
    const filteredContentIds = topContentIds
      .filter(contentId => !excludeIds.includes(contentId));
    
    // Get content details
    const query = {
      _id: { $in: filteredContentIds.map(id => mongoose.Types.ObjectId(id)) },
      ...(contentType !== 'all' ? { contentType } : {}),
      isActive: true
    };
    
    let recommendations = await Content.find(query).lean();
    
    // Sort by score
    recommendations.sort((a, b) => {
      const scoreA = contentScores[a._id.toString()] || 0;
      const scoreB = contentScores[b._id.toString()] || 0;
      return scoreB - scoreA;
    });
    
    return recommendations.slice(0, limit);
  }

  /**
   * Get hybrid recommendations combining collaborative and content-based approaches
   * @private
   */
  async _getHybridRecommendations(userId, userProfile, userBehaviors, options, weights = this.defaultSettings) {
    try {
      // Get both types of recommendations
      const [collaborativeRecs, contentBasedRecs] = await Promise.all([
        this._getCollaborativeFilteringRecommendations(userId, {...options, limit: options.limit * 2}),
        this._getContentBasedRecommendations(userId, userProfile, userBehaviors, options, weights)
      ]);
      
      // If either method failed, return results from the other
      if (!collaborativeRecs || collaborativeRecs.length === 0) {
        return contentBasedRecs;
      }
      if (!contentBasedRecs || contentBasedRecs.length === 0) {
        return collaborativeRecs;
      }
      
      // Combine both sets with personalized blending
      const hybridRecs = [];
      const contentBasedMap = new Map(contentBasedRecs.map(item => [item._id.toString(), item]));
      const collaborativeMap = new Map(collaborativeRecs.map(item => [item._id.toString(), item]));
      
      // Set of all unique content IDs
      const allContentIds = new Set([
        ...contentBasedRecs.map(item => item._id.toString()),
        ...collaborativeRecs.map(item => item._id.toString())
      ]);
      
      // Score each unique item considering both recommendation methods
      const scoredItems = [];
      
      allContentIds.forEach(contentId => {
        const contentBasedItem = contentBasedMap.get(contentId);
        const collaborativeItem = collaborativeMap.get(contentId);
        
        // Calculate composite score
        let score = 0;
        
        if (contentBasedItem && collaborativeItem) {
          // Item appears in both sets - calculate weighted score
          // Use personalized weights to determine balance between content-based and collaborative
          const contentBasedWeight = weights.personalizedWeight || this.defaultSettings.personalizedWeight;
          const collaborativeWeight = 1 - contentBasedWeight;
          
          // Normalize relevance scores from both methods
          const contentBasedScore = contentBasedItem.relevanceScore || 0;
          const collaborativeScore = collaborativeItem.relevanceScore || 0;
          
          score = (contentBasedWeight * contentBasedScore) + (collaborativeWeight * collaborativeScore);
          
          // Boost items that appear in both recommendation sets
          score *= 1.2;  
        } else if (contentBasedItem) {
          // Only in content-based
          score = contentBasedItem.relevanceScore || 0;
        } else if (collaborativeItem) {
          // Only in collaborative
          score = collaborativeItem.relevanceScore || 0;
        }
        
        // Use the full item data from whichever source has it
        const item = contentBasedItem || collaborativeItem;
        scoredItems.push({
          ...item,
          relevanceScore: score
        });
      });
      
      // Sort by composite score and return top results
      scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
      return scoredItems.slice(0, options.limit);
    } catch (error) {
      console.error('Error generating hybrid recommendations:', error);
      // Fallback to content-based if hybrid fails
      return this._getContentBasedRecommendations(userId, userProfile, userBehaviors, options, weights);
    }
  }

  /**
   * Find users similar to the given user based on behavior patterns
   * @private
   */
  async _findSimilarUsers(userId) {
    // Get current user's behavior
    const userBehaviors = await UserBehavior.find({ userId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    
    if (userBehaviors.length < 5) {
      // Not enough data for this user yet
      return [];
    }
    
    // Get content IDs this user has interacted with
    const userContentIds = userBehaviors.map(b => b.contentId.toString());
    
    // Find other users who have interacted with some of these content items
    const potentialSimilarUserBehaviors = await UserBehavior.find({
      userId: { $ne: userId },
      contentId: { $in: userContentIds }
    }).lean();
    
    // Group by user
    const userBehaviorMap = new Map();
    potentialSimilarUserBehaviors.forEach(behavior => {
      const uid = behavior.userId.toString();
      if (!userBehaviorMap.has(uid)) {
        userBehaviorMap.set(uid, []);
      }
      userBehaviorMap.get(uid).push(behavior);
    });
    
    // Calculate similarity scores
    const similarityScores = [];
    userBehaviorMap.forEach((behaviors, uid) => {
      // Only consider users with sufficient overlap
      if (behaviors.length < 3) return;
      
      // Calculate Jaccard similarity (intersection over union)
      const otherUserContentIds = new Set(behaviors.map(b => b.contentId.toString()));
      const intersection = userContentIds.filter(id => otherUserContentIds.has(id)).length;
      const union = new Set([...userContentIds, ...otherUserContentIds]).size;
      
      const similarity = intersection / union;
      
      // Only keep users with meaningful similarity
      if (similarity > 0.1) {
        similarityScores.push({
          userId: uid,
          similarity,
          commonInteractions: intersection
        });
      }
    });
    
    // Sort by similarity and return top matches
    similarityScores.sort((a, b) => b.similarity - a.similarity);
    return similarityScores.slice(0, 50);
  }

  /**
   * Apply post-filtering to recommendations
   * @private
   */
  _applyPostFilters(recommendations, userBehaviors, options, weights = this.defaultSettings) {
    // Skip if no recommendations
    if (!recommendations || recommendations.length === 0) {
      return [];
    }

    let processed = [...recommendations];
    
    // Apply diversity filter if needed
    if (weights.diversityWeight > 0) {
      processed = this._ensureDiversity(processed, weights.diversityWeight);
    }
    
    // Additional filters based on user preferences can be applied here
    
    return processed;
  }

  /**
   * Ensure diversity by preventing too many similar content items
   * @private
   */
  _ensureDiversity(recommendations, diversityWeight) {
    // Group by primary category/tag
    const categoryGroups = new Map();
    
    recommendations.forEach(item => {
      if (!item.tags || item.tags.length === 0) return;
      
      const primaryTag = item.tags[0];
      if (!categoryGroups.has(primaryTag)) {
        categoryGroups.set(primaryTag, []);
      }
      categoryGroups.get(primaryTag).push(item);
    });
    
    // If a category has too many items, limit it
    const MAX_PER_CATEGORY = 3;
    const diverseRecommendations = [];
    
    // First add one item from each category
    for (const [_, items] of categoryGroups) {
      if (items.length > 0) {
        diverseRecommendations.push(items[0]);
      }
    }
    
    // Then fill in with the rest, maintaining diversity
    let nextCategoryIndex = 0;
    const categories = Array.from(categoryGroups.keys());
    
    while (diverseRecommendations.length < recommendations.length) {
      if (categories.length === 0) break;
      
      const categoryTag = categories[nextCategoryIndex];
      const items = categoryGroups.get(categoryTag);
      
      // Move to next category
      nextCategoryIndex = (nextCategoryIndex + 1) % categories.length;
      
      // Skip if we've already added all items from this category or hit the max
      if (!items || items.length === 0) {
        categories.splice(nextCategoryIndex, 1);
        if (categories.length === 0) break;
        nextCategoryIndex = nextCategoryIndex % categories.length;
        continue;
      }
      
      const categoryItemsAlreadyAdded = diverseRecommendations.filter(
        item => item.tags && item.tags[0] === categoryTag
      ).length;
      
      if (categoryItemsAlreadyAdded >= MAX_PER_CATEGORY) {
        categories.splice(nextCategoryIndex, 1);
        if (categories.length === 0) break;
        nextCategoryIndex = nextCategoryIndex % categories.length;
        continue;
      }
      
      // Add the next item from this category
      const itemsToAdd = items.slice(categoryItemsAlreadyAdded, categoryItemsAlreadyAdded + 1);
      if (itemsToAdd.length > 0) {
        diverseRecommendations.push(itemsToAdd[0]);
      } else {
        categories.splice(nextCategoryIndex, 1);
        if (categories.length === 0) break;
        nextCategoryIndex = nextCategoryIndex % categories.length;
      }
    }
    
    return diverseRecommendations;
  }

  /**
   * Calculate seasonal relevance score for a content item
   * @private
   */
  _calculateSeasonalRelevance(contentItem, currentSeason) {
    if (!contentItem.tags) return 0.5;
    
    // Season tags
    const seasonTags = {
      spring: ['春季', 'spring', '春分', '清明', '谷雨'],
      summer: ['夏季', 'summer', '夏至', '小暑', '大暑'],
      autumn: ['秋季', 'autumn', 'fall', '秋分', '寒露'],
      winter: ['冬季', 'winter', '冬至', '小寒', '大寒']
    };
    
    // Check if content has tags matching the current season
    const currentSeasonTags = seasonTags[currentSeason] || [];
    const matchingTags = contentItem.tags.filter(tag => 
      currentSeasonTags.includes(tag.toLowerCase())
    );
    
    if (matchingTags.length > 0) {
      return 1.0; // Perfect seasonal match
    }
    
    // Check for opposite season (lowest relevance)
    const oppositeSeasons = {
      spring: 'autumn',
      summer: 'winter',
      autumn: 'spring',
      winter: 'summer'
    };
    
    const oppositeSeasonTags = seasonTags[oppositeSeasons[currentSeason]] || [];
    const oppositeMatches = contentItem.tags.filter(tag => 
      oppositeSeasonTags.includes(tag.toLowerCase())
    );
    
    if (oppositeMatches.length > 0) {
      return 0.2; // Opposite season, low relevance
    }
    
    // Default moderate relevance for season-neutral content
    return 0.6;
  }

  /**
   * Calculate current season based on date
   * @private
   */
  _getCurrentSeason() {
    const now = new Date();
    const month = now.getMonth();
    
    // Simplified seasonal determination
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  /**
   * Calculate health relevance score based on user profile and content
   * @private
   */
  _calculateHealthRelevance(contentItem, userProfile) {
    if (!userProfile || !contentItem.tags) return 0.5;
    
    // Extract health tags from user profile
    const healthTags = [];
    
    // Add constitution type
    if (userProfile.constitution) {
      healthTags.push(userProfile.constitution.toLowerCase());
    }
    
    // Add health conditions if any
    if (userProfile.healthConditions && Array.isArray(userProfile.healthConditions)) {
      healthTags.push(...userProfile.healthConditions.map(c => c.toLowerCase()));
    }
    
    // Add goals if any
    if (userProfile.goals && Array.isArray(userProfile.goals)) {
      healthTags.push(...userProfile.goals.map(g => g.toLowerCase()));
    }
    
    // Count matching tags in content
    const contentTags = contentItem.tags.map(t => t.toLowerCase());
    const matchingTags = healthTags.filter(tag => contentTags.includes(tag));
    
    if (matchingTags.length === 0) {
      return 0.4; // No matches, but still might be relevant
    }
    
    // Score based on proportion of matches, with a minimum of 0.5
    return Math.max(0.5, Math.min(1.0, 0.5 + (matchingTags.length / healthTags.length) * 0.5));
  }

  /**
   * Calculate recency score for content based on publish date
   * @private
   */
  _calculateRecencyScore(publishDate) {
    if (!publishDate) return 0.5;
    
    const now = new Date();
    const published = new Date(publishDate);
    const ageInDays = (now - published) / (1000 * 60 * 60 * 24);
    
    // Exponential decay function: fresh content gets higher score
    return Math.exp(-ageInDays / 30); // 30 days half-life
  }

  /**
   * Calculate interest score based on user interest tags
   * @private
   */
  _calculateInterestScore(contentItem, interestTags) {
    if (!contentItem.tags || !interestTags || interestTags.length === 0) {
      return 0.5;
    }
    
    const contentTags = contentItem.tags.map(t => t.toLowerCase());
    const matchingTags = interestTags.filter(tag => contentTags.includes(tag.toLowerCase()));
    
    if (matchingTags.length === 0) {
      return 0.3; // No matches to user interests
    }
    
    // Score based on match ratio, with a minimum of 0.5
    return Math.max(0.5, Math.min(1.0, (matchingTags.length / Math.min(interestTags.length, 5)) * 0.9));
  }

  /**
   * Calculate time of day relevance
   * @private
   */
  _calculateTimeOfDayRelevance(contentItem, preferredTimeOfDay) {
    if (!preferredTimeOfDay || !contentItem.timeOfDayRelevance) {
      return 0;
    }
    
    // Check if content has relevance for user's preferred time of day
    return contentItem.timeOfDayRelevance[preferredTimeOfDay] || 0;
  }

  /**
   * Get A/B test variant for recommendation algorithm
   * @private
   */
  async _getRecommendationAlgorithm(userId, abTestId) {
    // If A/B test ID is provided, use that
    if (abTestId) {
      const abTest = await ABTest.findById(abTestId);
      if (abTest && abTest.isActive) {
        // Deterministically assign user to a variant
        const variantIndex = this._simpleHash(userId) % abTest.variants.length;
        return abTest.variants[variantIndex].algorithm;
      }
    }
    
    try {
      // Use FeedbackProcessor to determine the best algorithm based on historical performance
      const bestAlgorithm = await FeedbackProcessor.determineBestAlgorithm(userId);
      return bestAlgorithm;
    } catch (error) {
      console.error('Error determining best algorithm:', error);
      return 'hybrid'; // Default to hybrid on error
    }
  }

  /**
   * Simple hash function for deterministic variant assignment
   * @private
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Log a recommendation event for analytics and model improvement
   * @private
   */
  async _logRecommendationEvent(userId, contentIds, algorithm) {
    try {
      const log = new RecommendationLog({
        userId,
        contentIds,
        algorithm,
        timestamp: new Date()
      });
      
      await log.save();
    } catch (error) {
      console.error('Error logging recommendation event:', error);
    }
  }

  /**
   * Get fallback recommendations when personalization is not possible
   * @param {string} contentType - Type of content to recommend
   * @param {number} limit - Maximum number of recommendations to return
   * @param {boolean} includeInteractiveFormats - Whether to include quizzes and tutorials
   * @returns {Promise<Array>} - Array of recommended content items
   */
  async getFallbackRecommendations(contentType = 'all', limit = 20, includeInteractiveFormats = true) {
    try {
      // If we're not including interactive formats, just do regular fallback
      if (!includeInteractiveFormats) {
        const query = {
          ...(contentType !== 'all' ? { contentType } : {}),
          isActive: true,
          publishedAt: { $lte: new Date() }
        };
        
        // Get popular content based on view count
        return await Content.find(query)
          .sort({ viewCount: -1, publishedAt: -1 })
          .limit(limit)
          .lean();
      }
      
      // Otherwise, include a mix of content formats
      const standardCount = Math.floor(limit * 0.7);
      const quizCount = Math.floor(limit * 0.15);
      const tutorialCount = limit - standardCount - quizCount;
      
      // Get standard content
      const standardQuery = {
        ...(contentType !== 'all' ? { contentType } : {}),
        isActive: true,
        publishedAt: { $lte: new Date() }
      };
      
      // Get popular quizzes and tutorials in parallel with standard content
      const [standardContent, popularQuizzes, popularTutorials] = await Promise.all([
        Content.find(standardQuery)
          .sort({ viewCount: -1, publishedAt: -1 })
          .limit(standardCount)
          .lean(),
        
        InteractiveQuiz.find({ isActive: true, status: 'published' })
          .sort({ 'metrics.popularity': -1 })
          .limit(quizCount)
          .lean(),
        
        GuidedTutorial.find({ isActive: true, status: 'published' })
          .sort({ 'metrics.averageRating': -1 })
          .limit(tutorialCount)
          .lean()
      ]);
      
      // Combine results with format information
      return [
        ...standardContent.map(item => ({
          ...item,
          contentFormat: 'standard'
        })),
        ...popularQuizzes.map(quiz => ({
          ...quiz,
          contentFormat: 'quiz'
        })),
        ...popularTutorials.map(tutorial => ({
          ...tutorial,
          contentFormat: 'tutorial'
        }))
      ];
    } catch (error) {
      console.error('Error getting fallback recommendations:', error);
      return [];
    }
  }

  /**
   * Track user interaction with content for improving recommendations
   * @param {string} userId - The user ID
   * @param {string} contentId - The content ID
   * @param {string} action - The interaction type ('view', 'like', 'share', 'save', etc.)
   * @param {Object} metadata - Additional metadata about the interaction
   */
  async trackUserInteraction(userId, contentId, action, metadata = {}) {
    try {
      await UserBehavior.create({
        userId,
        contentId,
        action,
        metadata,
        timestamp: new Date()
      });
      
      // Update content view/like counts if appropriate
      if (action === 'view') {
        await Content.findByIdAndUpdate(contentId, { $inc: { viewCount: 1 } });
      } else if (action === 'like') {
        await Content.findByIdAndUpdate(contentId, { $inc: { likeCount: 1 } });
      }
      
      // If this is a positive interaction, consider it for interest tracking
      if (['like', 'save', 'share'].includes(action)) {
        await this._updateUserInterests(userId, contentId);
      }
      
      return true;
    } catch (error) {
      console.error('Error tracking user interaction:', error);
      return false;
    }
  }

  /**
   * Update user interests based on content interaction
   * @private
   */
  async _updateUserInterests(userId, contentId) {
    try {
      // Get content tags
      const content = await Content.findById(contentId).select('tags').lean();
      if (!content || !content.tags || content.tags.length === 0) return;
      
      // Update each tag's interest score
      for (const tag of content.tags) {
        // Find or create user interest for this tag
        await UserInterest.findOneAndUpdate(
          { userId, tag: tag.toLowerCase() },
          { 
            $inc: { interactionCount: 1 },
            $set: { lastInteraction: new Date() }
          },
          { upsert: true }
        );
      }
    } catch (error) {
      console.error('Error updating user interests:', error);
    }
  }

  /**
   * Create a new A/B test for recommendation algorithms
   * @param {Object} testData - The test configuration
   * @returns {Promise<Object>} - Created A/B test
   */
  async createABTest(testData) {
    try {
      const { name, description, variants, startDate, endDate, targetUserPercentage } = testData;
      
      // Validate variants
      if (!variants || !Array.isArray(variants) || variants.length < 2) {
        throw new Error('A/B test must have at least 2 variants');
      }
      
      // Create the test
      return await ABTest.create({
        name,
        description,
        variants,
        startDate: startDate || new Date(),
        endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
        targetUserPercentage: targetUserPercentage || 100,
        isActive: true,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating A/B test:', error);
      throw error;
    }
  }

  /**
   * Get A/B test results
   * @param {string} testId - The test ID
   * @returns {Promise<Object>} - Test results
   */
  async getABTestResults(testId) {
    try {
      // Find the test
      const test = await ABTest.findById(testId);
      if (!test) {
        throw new Error('A/B test not found');
      }
      
      // Get recommendations that used this test
      const logs = await RecommendationLog.find({
        abTestId: testId,
        timestamp: { 
          $gte: test.startDate,
          $lte: test.endDate || new Date()
        }
      }).lean();
      
      // Get user behaviors for recommended content
      const recommendedContentIds = new Set();
      logs.forEach(log => {
        log.contentIds.forEach(id => recommendedContentIds.add(id.toString()));
      });
      
      // Group logs by algorithm
      const algorithmLogs = {};
      logs.forEach(log => {
        if (!algorithmLogs[log.algorithm]) {
          algorithmLogs[log.algorithm] = [];
        }
        algorithmLogs[log.algorithm].push(log);
      });
      
      // Get interactions with recommended content
      const behaviors = await UserBehavior.find({
        contentId: { $in: Array.from(recommendedContentIds) },
        timestamp: { 
          $gte: test.startDate,
          $lte: test.endDate || new Date()
        }
      }).lean();
      
      // Calculate metrics for each variant
      const results = {};
      for (const [algorithm, algLogs] of Object.entries(algorithmLogs)) {
        // Find users who received recommendations with this algorithm
        const userIds = new Set(algLogs.map(log => log.userId.toString()));
        
        // Find interactions by these users with the recommended content
        const userBehaviors = behaviors.filter(b => 
          userIds.has(b.userId.toString()) && 
          recommendedContentIds.has(b.contentId.toString())
        );
        
        // Calculate metrics
        const totalUsers = userIds.size;
        const viewCount = userBehaviors.filter(b => b.action === 'view').length;
        const likeCount = userBehaviors.filter(b => b.action === 'like').length;
        const saveCount = userBehaviors.filter(b => b.action === 'save').length;
        const shareCount = userBehaviors.filter(b => b.action === 'share').length;
        
        results[algorithm] = {
          users: totalUsers,
          impressions: algLogs.length * 10, // Assuming 10 recommendations per log
          views: viewCount,
          likes: likeCount,
          saves: saveCount,
          shares: shareCount,
          ctr: totalUsers > 0 ? viewCount / (algLogs.length * 10) : 0,
          engagementRate: viewCount > 0 ? (likeCount + saveCount + shareCount) / viewCount : 0
        };
      }
      
      return {
        test,
        results,
        startDate: test.startDate,
        endDate: test.endDate || new Date(),
        isActive: test.isActive
      };
    } catch (error) {
      console.error('Error getting A/B test results:', error);
      throw error;
    }
  }

  /**
   * Get seasonal content highlights
   * @param {string} userId - The user ID
   * @param {Object} options - Additional options for fetching seasonal content highlights
   * @returns {Promise<Array>} - Array of seasonal content highlights
   */
  async getSeasonalContentHighlights(userId, options = {}) {
    try {
      // Validate user ID
      if (!userId) {
        throw new Error('User ID is required to fetch seasonal content highlights');
      }
      
      // Set default options
      const defaultOptions = {
        limit: 10
      };
      
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Get seasonal content highlights
      const seasonalHighlights = await SeasonalContentService.getSeasonalContentHighlights(
        userId, 
        mergedOptions
      );
      
      // If we got some seasonal highlights, return them
      if (seasonalHighlights && seasonalHighlights.length > 0) {
        return seasonalHighlights;
      }
      
      // If no seasonal highlights found, try to get content based on seasonal TCM tags
      const { seasonalInfo } = SeasonalContentService.getTCMSeasonalInfo();
      
      if (!seasonalInfo || !seasonalInfo.recommendedTags) {
        return [];
      }
      
      // Get content with seasonal tags
      const seasonalTagContent = await this.getContentByTags(
        seasonalInfo.recommendedTags, 
        mergedOptions.limit
      );
      
      // Mark these as seasonal suggestions even though they're not from explicit promotions
      return seasonalTagContent.map(content => ({
        ...content.toObject(),
        seasonalSuggestion: true,
        seasonTags: seasonalInfo.recommendedTags.filter(tag => 
          content.tags && content.tags.includes(tag)
        )
      }));
    } catch (error) {
      console.error('Error fetching seasonal content highlights:', error);
      throw error;
    }
  }

  /**
   * Get content by tags
   * @param {string[]} tags - Array of tag strings
   * @param {number} limit - Maximum number of content items to return
   * @returns {Promise<Array>} - Array of content items matching the tags
   */
  async getContentByTags(tags, limit = 10) {
    if (!tags || tags.length === 0) {
      return [];
    }
    
    try {
      return await Content.find({
        tags: { $in: tags },
        isActive: true
      })
      .sort({ createdAt: -1 })
      .limit(limit);
    } catch (error) {
      console.error('Error fetching content by tags:', error);
      return [];
    }
  }

  /**
   * Apply health data insights to boost recommendation relevance
   * @param {string} userId - User ID
   * @param {Array} recommendations - Current recommendations
   * @returns {Promise<Array>} - Recommendations with health boosts applied
   * @private
   */
  async _applyHealthDataBoost(userId, recommendations) {
    try {
      // Get health-enhanced relevance scores
      const enhancedItems = await HealthDataProcessor.getHealthEnhancedRelevanceScores(
        userId, 
        recommendations
      );
      
      if (!enhancedItems || enhancedItems.length === 0) {
        return recommendations;
      }
      
      // Apply health relevance to the final score
      const boostedRecommendations = enhancedItems.map(item => {
        const healthBoost = item.healthRelevance || 0.5;
        // Adjust relevance score: 70% original + 30% health relevance
        const adjustedRelevance = (item.relevance * 0.7) + (healthBoost * 0.3);
        
        return {
          ...item,
          relevance: adjustedRelevance,
          healthRelevance: healthBoost
        };
      });
      
      // Resort by new relevance scores
      return boostedRecommendations.sort((a, b) => b.relevance - a.relevance);
    } catch (error) {
      console.error(`Error applying health data boost: ${error.message}`);
      // Return original recommendations if there's an error
      return recommendations;
    }
  }

  /**
   * Get health-based content recommendations for a user
   * @param {string} userId - User ID
   * @param {Object} options - Options for recommendations
   * @param {number} options.limit - Maximum number of recommendations
   * @param {string} options.contentType - Type of content to recommend
   * @returns {Promise<Array>} - Health-optimized content recommendations
   */
  async getHealthBasedRecommendations(userId, options = {}) {
    try {
      const { limit = 10, contentType = 'all' } = options;
      
      // Get basic recommendations from the HealthDataProcessor
      const baseRecommendations = await HealthDataProcessor.getHealthBasedRecommendations(userId, limit * 2);
      
      if (!baseRecommendations || baseRecommendations.length === 0) {
        return this.getFallbackRecommendations(contentType, limit, true);
      }
      
      // Filter by content type if specified
      let filteredRecommendations = baseRecommendations;
      if (contentType !== 'all') {
        filteredRecommendations = baseRecommendations.filter(item => 
          item.contentType === contentType
        );
      }
      
      // Apply seasonal boost if available
      let finalRecommendations = filteredRecommendations;
      try {
        finalRecommendations = await SeasonalContentService.applySeasonalBoosts(
          filteredRecommendations, 
          userId
        );
      } catch (error) {
        console.error(`Error applying seasonal boosts: ${error.message}`);
        // Continue with filtered recommendations
      }
      
      // Log the recommendation event
      const contentIds = finalRecommendations.slice(0, limit).map(item => item._id);
      await this._logRecommendationEvent(userId, contentIds, 'health_based');
      
      return finalRecommendations.slice(0, limit);
    } catch (error) {
      console.error(`Error getting health-based recommendations: ${error.message}`);
      return this.getFallbackRecommendations(options.contentType, options.limit, true);
    }
  }

  /**
   * Get personalized quizzes for a user
   * @param {string} userId - User ID
   * @param {Object} options - Options for quiz recommendations
   * @returns {Promise<Array>} - Array of recommended quizzes
   */
  async getPersonalizedQuizzes(userId, options = {}) {
    try {
      const { limit = 5, difficulty = null, quizType = null } = options;
      
      // Get user profile for health data
      const userProfile = await UserProfile.findOne({ userId }).lean();
      if (!userProfile) {
        return [];
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
      
      // Get personalized quizzes
      return await PersonalizedContentService.getPersonalizedQuizzes(userId, {
        healthProfile,
        preferredTags,
        limit,
        difficulty,
        quizType
      });
    } catch (error) {
      console.error('Error getting personalized quizzes:', error);
      return [];
    }
  }

  /**
   * Get personalized tutorials for a user
   * @param {string} userId - User ID
   * @param {Object} options - Options for tutorial recommendations
   * @returns {Promise<Array>} - Array of recommended tutorials
   */
  async getPersonalizedTutorials(userId, options = {}) {
    try {
      const { limit = 5, difficulty = null, tutorialType = null } = options;
      
      // Get user profile for health data
      const userProfile = await UserProfile.findOne({ userId }).lean();
      if (!userProfile) {
        return [];
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
      
      // Get personalized tutorials
      return await PersonalizedContentService.getPersonalizedTutorials(userId, {
        healthProfile,
        preferredTags,
        limit,
        difficulty,
        tutorialType
      });
    } catch (error) {
      console.error('Error getting personalized tutorials:', error);
      return [];
    }
  }
}

module.exports = new RecommendationService(); 