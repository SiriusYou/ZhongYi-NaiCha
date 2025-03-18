const mongoose = require('mongoose');
const UserBehavior = require('../models/UserBehavior');
const UserInterest = require('../models/UserInterest');
const Content = require('../models/Content');
const RecommendationLog = require('../models/RecommendationLog');
const config = require('../config');

/**
 * FeedbackProcessor service
 * Analyzes user feedback to optimize recommendation algorithms
 */
class FeedbackProcessor {
  constructor() {
    this.feedbackWeights = {
      like: 1.5,      // Strong positive signal
      save: 2.0,      // Very strong positive signal - explicit intent to revisit
      share: 2.0,     // Very strong positive signal - endorsement
      view: 0.5,      // Weak positive signal - just viewing
      complete: 1.2,  // Moderate positive signal - completed viewing/reading
      click: 0.7,     // Weak-moderate positive signal
      comment: 1.3,   // Moderate positive signal - engagement
      dislike: -1.5   // Negative signal
    };
    
    this.contentTypeWeights = {
      article: { duration: 0.1, completionRate: 0.9 },
      recipe: { duration: 0.2, completionRate: 0.8 },
      video: { duration: 0.7, completionRate: 0.3 },
      podcast: { duration: 0.6, completionRate: 0.4 }
    };
    
    this.recencyFactor = 0.9; // Factor for weighing recent interactions more heavily
    this.minInteractionsForAdjustment = 20; // Minimum user interactions before making user-specific adjustments
  }
  
  /**
   * Process user feedback for a specific user to generate personalized algorithm weights
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} Personalized weights based on user feedback patterns
   */
  async generatePersonalizedWeights(userId) {
    try {
      // Retrieve user's feedback history
      const behaviors = await UserBehavior.find({ userId })
        .sort({ timestamp: -1 })
        .limit(500)
        .lean();
        
      if (behaviors.length < this.minInteractionsForAdjustment) {
        return null; // Not enough data for personalization
      }
      
      // Get content items for the behaviors to analyze content preferences
      const contentIds = [...new Set(behaviors.map(b => b.contentId))];
      const contentItems = await Content.find({ 
        _id: { $in: contentIds } 
      }).lean();
      
      // Create a map for easy lookup
      const contentMap = contentItems.reduce((map, item) => {
        map[item._id.toString()] = item;
        return map;
      }, {});
      
      // Calculate user engagement patterns
      const patterns = this._analyzeEngagementPatterns(behaviors, contentMap);
      
      // Generate personalized weights based on patterns
      const weights = this._calculatePersonalizedWeights(patterns);
      
      return weights;
    } catch (error) {
      console.error('Error generating personalized weights:', error);
      return null;
    }
  }
  
  /**
   * Analyze user engagement patterns
   * @private
   */
  _analyzeEngagementPatterns(behaviors, contentMap) {
    // Initialize pattern tracking
    const patterns = {
      contentTypePreference: {},  // Preference for different content types
      tagPreference: {},          // Preference for different tags
      timeSpent: {},              // Time spent on different content types
      completionRates: {},        // Completion rates for different content types
      actionDistribution: {},     // Distribution of different actions
      interactionTimeOfDay: [],   // When user typically interacts with content
      negativeFeedbackTags: {},   // Tags that receive negative feedback
      positiveFeedbackTags: {},   // Tags that receive positive feedback
      seasonalPreference: {}      // Preference by season
    };
    
    // Process each behavior
    behaviors.forEach(behavior => {
      const content = contentMap[behavior.contentId.toString()];
      if (!content) return; // Skip if content not found
      
      const { contentType, tags, season } = content;
      const { action, duration, completionRate, timestamp } = behavior;
      
      // Track content type preference
      patterns.contentTypePreference[contentType] = 
        (patterns.contentTypePreference[contentType] || 0) + this._getActionWeight(action);
      
      // Track tag preferences
      if (tags && tags.length) {
        tags.forEach(tag => {
          patterns.tagPreference[tag] = 
            (patterns.tagPreference[tag] || 0) + this._getActionWeight(action);
            
          // Track tags with positive/negative feedback
          if (this._getActionWeight(action) > 0) {
            patterns.positiveFeedbackTags[tag] = 
              (patterns.positiveFeedbackTags[tag] || 0) + this._getActionWeight(action);
          } else if (this._getActionWeight(action) < 0) {
            patterns.negativeFeedbackTags[tag] = 
              (patterns.negativeFeedbackTags[tag] || 0) + Math.abs(this._getActionWeight(action));
          }
        });
      }
      
      // Track time spent by content type (if available)
      if (duration && duration > 0) {
        patterns.timeSpent[contentType] = patterns.timeSpent[contentType] || { total: 0, count: 0 };
        patterns.timeSpent[contentType].total += duration;
        patterns.timeSpent[contentType].count += 1;
      }
      
      // Track completion rates by content type (if available)
      if (completionRate && completionRate > 0) {
        patterns.completionRates[contentType] = patterns.completionRates[contentType] || { total: 0, count: 0 };
        patterns.completionRates[contentType].total += completionRate;
        patterns.completionRates[contentType].count += 1;
      }
      
      // Track action distribution
      patterns.actionDistribution[action] = (patterns.actionDistribution[action] || 0) + 1;
      
      // Track interaction time of day
      if (timestamp) {
        const hour = new Date(timestamp).getHours();
        patterns.interactionTimeOfDay.push(hour);
      }
      
      // Track seasonal preference
      if (season) {
        patterns.seasonalPreference[season] = 
          (patterns.seasonalPreference[season] || 0) + this._getActionWeight(action);
      }
    });
    
    // Normalize patterns
    this._normalizePatterns(patterns);
    
    return patterns;
  }
  
  /**
   * Normalize the calculated patterns
   * @private
   */
  _normalizePatterns(patterns) {
    // Normalize content type preferences
    this._normalizeObject(patterns.contentTypePreference);
    
    // Normalize tag preferences
    this._normalizeObject(patterns.tagPreference);
    
    // Normalize positive/negative feedback tags
    this._normalizeObject(patterns.positiveFeedbackTags);
    this._normalizeObject(patterns.negativeFeedbackTags);
    
    // Calculate average time spent by content type
    Object.keys(patterns.timeSpent).forEach(type => {
      const { total, count } = patterns.timeSpent[type];
      patterns.timeSpent[type] = count > 0 ? total / count : 0;
    });
    
    // Calculate average completion rates by content type
    Object.keys(patterns.completionRates).forEach(type => {
      const { total, count } = patterns.completionRates[type];
      patterns.completionRates[type] = count > 0 ? total / count : 0;
    });
    
    // Normalize action distribution
    const totalActions = Object.values(patterns.actionDistribution).reduce((sum, val) => sum + val, 0);
    if (totalActions > 0) {
      Object.keys(patterns.actionDistribution).forEach(action => {
        patterns.actionDistribution[action] /= totalActions;
      });
    }
    
    // Normalize seasonal preference
    this._normalizeObject(patterns.seasonalPreference);
    
    // Process interaction time of day
    if (patterns.interactionTimeOfDay.length > 0) {
      // Group hours into time slots
      const timeSlots = {
        morning: 0,    // 5-11
        afternoon: 0,  // 12-17
        evening: 0,    // 18-22
        night: 0       // 23-4
      };
      
      patterns.interactionTimeOfDay.forEach(hour => {
        if (hour >= 5 && hour <= 11) timeSlots.morning++;
        else if (hour >= 12 && hour <= 17) timeSlots.afternoon++;
        else if (hour >= 18 && hour <= 22) timeSlots.evening++;
        else timeSlots.night++;
      });
      
      // Normalize time slots
      const totalInteractions = patterns.interactionTimeOfDay.length;
      Object.keys(timeSlots).forEach(slot => {
        timeSlots[slot] /= totalInteractions;
      });
      
      patterns.interactionTimeOfDay = timeSlots;
    }
  }
  
  /**
   * Normalize an object's values to sum to 1.0
   * @private
   */
  _normalizeObject(obj) {
    const total = Object.values(obj).reduce((sum, val) => sum + Math.abs(val), 0);
    if (total > 0) {
      Object.keys(obj).forEach(key => {
        obj[key] /= total;
      });
    }
  }
  
  /**
   * Calculate personalized weights based on analyzed patterns
   * @private
   */
  _calculatePersonalizedWeights(patterns) {
    // Default weights
    const weights = {
      contentTypeWeights: {},
      seasonalWeight: 0.2,
      recencyWeight: 0.2,
      diversityWeight: 0.3,
      popularityWeight: 0.1,
      personalizedWeight: 0.4,
      tagImportance: 0.4,
      healthRelevanceWeight: 0.3,
      preferredTimeOfDay: null,
      avoidTags: [],
      boostTags: []
    };
    
    // Adjust content type weights based on preferences
    Object.keys(patterns.contentTypePreference).forEach(type => {
      weights.contentTypeWeights[type] = patterns.contentTypePreference[type];
    });
    
    // Adjust seasonal weight based on how strongly user responds to seasonal content
    const hasSeasonalPreference = Object.keys(patterns.seasonalPreference).length > 0;
    if (hasSeasonalPreference) {
      const seasonalVariance = this._calculateVariance(Object.values(patterns.seasonalPreference));
      // If there's high variance in seasonal preferences, increase seasonal weight
      weights.seasonalWeight = 0.2 + (seasonalVariance * 0.3); // 0.2-0.5 range
    }
    
    // Identify preferred time of day (when user is most active)
    if (patterns.interactionTimeOfDay && typeof patterns.interactionTimeOfDay === 'object') {
      const timeSlots = Object.entries(patterns.interactionTimeOfDay);
      timeSlots.sort((a, b) => b[1] - a[1]); // Sort by activity level
      if (timeSlots.length > 0 && timeSlots[0][1] > 0.3) { // If clear preference (>30% in one slot)
        weights.preferredTimeOfDay = timeSlots[0][0];
      }
    }
    
    // Adjust tag importance based on how consistent user engagement is with specific tags
    if (Object.keys(patterns.tagPreference).length > 0) {
      const tagValues = Object.values(patterns.tagPreference);
      const maxTagValue = Math.max(...tagValues);
      const minTagValue = Math.min(...tagValues);
      
      // If there's a wide range of tag preferences, increase tag importance
      if (maxTagValue - minTagValue > 0.5) {
        weights.tagImportance = 0.6; // Increase tag importance
      }
    }
    
    // Identify tags to avoid based on negative feedback
    if (Object.keys(patterns.negativeFeedbackTags).length > 0) {
      const tagEntries = Object.entries(patterns.negativeFeedbackTags);
      // Only consider tags with significant negative feedback
      weights.avoidTags = tagEntries
        .filter(([_, value]) => value > 0.2) // Only tags with >20% of negative feedback
        .map(([tag]) => tag);
    }
    
    // Identify tags to boost based on positive feedback
    if (Object.keys(patterns.positiveFeedbackTags).length > 0) {
      const tagEntries = Object.entries(patterns.positiveFeedbackTags);
      // Only consider tags with significant positive feedback
      weights.boostTags = tagEntries
        .filter(([_, value]) => value > 0.2) // Only tags with >20% of positive feedback
        .map(([tag]) => tag);
    }
    
    // Adjust health relevance weight based on how much user engages with health-related content
    const healthTags = ['health', 'wellness', 'tcm', 'traditional', 'medicine', 'healing', 'remedy'];
    let healthTagEngagement = 0;
    let hasHealthTags = false;
    
    healthTags.forEach(tag => {
      if (patterns.tagPreference[tag]) {
        healthTagEngagement += patterns.tagPreference[tag];
        hasHealthTags = true;
      }
    });
    
    if (hasHealthTags) {
      // Increase health relevance weight if user engages more with health content
      weights.healthRelevanceWeight = 0.3 + (healthTagEngagement * 0.4); // 0.3-0.7 range
    }
    
    // Adjust diversity weight based on how much user explores diverse content
    const uniqueContentRatio = Object.keys(contentMap).length / behaviors.length;
    if (uniqueContentRatio > 0.7) { // User likes variety
      weights.diversityWeight = 0.5; // Increase diversity weight
    } else if (uniqueContentRatio < 0.3) { // User prefers familiarity
      weights.diversityWeight = 0.1; // Decrease diversity weight
    }
    
    // Adjust popularity weight based on how much user engages with popular vs. niche content
    // Would need additional data about content popularity to implement
    
    return weights;
  }
  
  /**
   * Calculate variance of an array of numbers
   * @private
   */
  _calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
    
    return variance;
  }
  
  /**
   * Get weight for a specific action
   * @private
   */
  _getActionWeight(action) {
    return this.feedbackWeights[action] || 0;
  }
  
  /**
   * Analyze recommendation effectiveness for a specific user
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} Effectiveness metrics
   */
  async analyzeRecommendationEffectiveness(userId) {
    try {
      // Get recent recommendations for this user
      const recentLogs = await RecommendationLog.find({ userId })
        .sort({ timestamp: -1 })
        .limit(100)
        .lean();
      
      if (recentLogs.length === 0) {
        return null; // No recommendation data
      }
      
      // Get user behaviors after recommendations
      const recommendedContentIds = recentLogs.flatMap(log => log.recommendedContent);
      const behaviors = await UserBehavior.find({
        userId,
        contentId: { $in: recommendedContentIds },
        timestamp: { $gte: recentLogs[recentLogs.length - 1].timestamp }
      }).lean();
      
      // Calculate effectiveness metrics
      const metrics = {
        interactionRate: 0, // % of recommended content user interacted with
        conversionRate: {}, // % of recommendations that led to specific actions
        algorithmPerformance: {}, // Performance by algorithm type
        timeToInteraction: 0, // Average time from recommendation to interaction
        effectiveCategories: {}, // Categories that performed best
        effectiveTags: {}, // Tags that performed best
      };
      
      // Calculate interaction rate
      metrics.interactionRate = 
        behaviors.length > 0 ? 
        [...new Set(behaviors.map(b => b.contentId.toString()))].length / recommendedContentIds.length : 0;
      
      // Calculate conversion rates by action type
      const actionCounts = {};
      behaviors.forEach(b => {
        actionCounts[b.action] = (actionCounts[b.action] || 0) + 1;
      });
      
      Object.keys(actionCounts).forEach(action => {
        metrics.conversionRate[action] = actionCounts[action] / recommendedContentIds.length;
      });
      
      // Calculate algorithm performance
      const algPerformance = {};
      
      recentLogs.forEach(log => {
        const algorithm = log.algorithm;
        if (!algorithm) return;
        
        const recContentIds = log.recommendedContent.map(id => id.toString());
        
        // Find behaviors for these recommendations
        const relevantBehaviors = behaviors.filter(b => 
          recContentIds.includes(b.contentId.toString()) &&
          b.timestamp >= log.timestamp
        );
        
        // Calculate performance for this algorithm instance
        if (!algPerformance[algorithm]) {
          algPerformance[algorithm] = { 
            totalRecommendations: 0, 
            interactedRecommendations: 0,
            positiveActions: 0,
            negativeActions: 0
          };
        }
        
        algPerformance[algorithm].totalRecommendations += recContentIds.length;
        
        // Count interacted recommendations
        const interactedContentIds = [...new Set(relevantBehaviors.map(b => b.contentId.toString()))];
        algPerformance[algorithm].interactedRecommendations += interactedContentIds.length;
        
        // Count positive/negative actions
        relevantBehaviors.forEach(b => {
          const weight = this._getActionWeight(b.action);
          if (weight > 0) {
            algPerformance[algorithm].positiveActions += 1;
          } else if (weight < 0) {
            algPerformance[algorithm].negativeActions += 1;
          }
        });
      });
      
      // Calculate performance metrics for each algorithm
      Object.keys(algPerformance).forEach(alg => {
        const perf = algPerformance[alg];
        if (perf.totalRecommendations > 0) {
          metrics.algorithmPerformance[alg] = {
            interactionRate: perf.interactedRecommendations / perf.totalRecommendations,
            positiveRate: perf.positiveActions / perf.totalRecommendations,
            negativeRate: perf.negativeActions / perf.totalRecommendations,
            score: (perf.positiveActions - perf.negativeActions) / perf.totalRecommendations
          };
        }
      });
      
      // Other metrics would require additional data...
      
      return metrics;
    } catch (error) {
      console.error('Error analyzing recommendation effectiveness:', error);
      return null;
    }
  }
  
  /**
   * Determine the best recommendation algorithm for a user based on historical performance
   * @param {string} userId - The user ID
   * @returns {Promise<string>} - Best algorithm name
   */
  async determineBestAlgorithm(userId) {
    try {
      const effectiveness = await this.analyzeRecommendationEffectiveness(userId);
      
      if (!effectiveness || !effectiveness.algorithmPerformance) {
        return 'hybrid'; // Default to hybrid if no data
      }
      
      const algorithms = Object.entries(effectiveness.algorithmPerformance);
      if (algorithms.length === 0) {
        return 'hybrid';
      }
      
      // Sort algorithms by score
      algorithms.sort((a, b) => b[1].score - a[1].score);
      
      // Return the best performing algorithm
      return algorithms[0][0];
    } catch (error) {
      console.error('Error determining best algorithm:', error);
      return 'hybrid'; // Default to hybrid on error
    }
  }
}

module.exports = new FeedbackProcessor(); 