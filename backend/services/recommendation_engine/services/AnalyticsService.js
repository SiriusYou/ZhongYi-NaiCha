const mongoose = require('mongoose');
const UserBehavior = require('../models/UserBehavior');
const Content = require('../models/Content');
const RecommendationLog = require('../models/RecommendationLog');
const UserInterest = require('../models/UserInterest');
const UserProfile = require('../models/UserProfile');
const FeedbackProcessor = require('./FeedbackProcessor');
const config = require('../config');

/**
 * AnalyticsService provides aggregated data and insights about the recommendation system
 * for use in dashboards and monitoring tools.
 */
class AnalyticsService {
  /**
   * Get overview metrics for the recommendation system
   * @param {Object} options - Options for filtering the data
   * @param {Date} options.startDate - Start date for the analysis period
   * @param {Date} options.endDate - End date for the analysis period
   * @returns {Promise<Object>} Overview metrics
   */
  async getOverviewMetrics(options = {}) {
    const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = options;
    
    try {
      // Get recommendation logs for the period
      const logs = await RecommendationLog.find({
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Get all content IDs from recommendations
      const recommendedContentIds = new Set();
      logs.forEach(log => {
        if (log.recommendedContent) {
          log.recommendedContent.forEach(id => recommendedContentIds.add(id.toString()));
        }
      });
      
      // Get user behaviors for the period
      const behaviors = await UserBehavior.find({
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Calculate metrics
      const totalRecommendations = logs.length;
      const uniqueUsers = new Set(logs.map(log => log.userId.toString())).size;
      
      // Calculate interaction metrics
      const interactionCounts = {};
      behaviors.forEach(behavior => {
        if (recommendedContentIds.has(behavior.contentId.toString())) {
          interactionCounts[behavior.action] = (interactionCounts[behavior.action] || 0) + 1;
        }
      });
      
      // Total interactions with recommended content
      const totalInteractions = Object.values(interactionCounts).reduce((sum, count) => sum + count, 0);
      
      // Calculate algorithm usage
      const algorithmUsage = {};
      logs.forEach(log => {
        if (log.algorithm) {
          algorithmUsage[log.algorithm] = (algorithmUsage[log.algorithm] || 0) + 1;
        }
      });
      
      // Format algorithm usage as percentage
      const algorithmPercentages = {};
      for (const [algorithm, count] of Object.entries(algorithmUsage)) {
        algorithmPercentages[algorithm] = (count / totalRecommendations) * 100;
      }
      
      return {
        period: {
          startDate,
          endDate
        },
        overview: {
          totalRecommendations,
          uniqueUsers,
          totalInteractions,
          recommendationPerUser: uniqueUsers > 0 ? totalRecommendations / uniqueUsers : 0,
          interactionPerRecommendation: totalRecommendations > 0 ? totalInteractions / totalRecommendations : 0
        },
        interactionBreakdown: interactionCounts,
        algorithmUsage: algorithmPercentages
      };
    } catch (error) {
      console.error('Error generating overview metrics:', error);
      throw error;
    }
  }
  
  /**
   * Get algorithm performance metrics
   * @param {Object} options - Options for filtering the data
   * @returns {Promise<Object>} Algorithm performance metrics
   */
  async getAlgorithmPerformance(options = {}) {
    const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = options;
    
    try {
      // Get recommendation logs grouped by algorithm
      const logs = await RecommendationLog.find({
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Group by algorithm
      const algorithmLogs = {};
      logs.forEach(log => {
        if (!log.algorithm) return;
        
        if (!algorithmLogs[log.algorithm]) {
          algorithmLogs[log.algorithm] = [];
        }
        algorithmLogs[log.algorithm].push(log);
      });
      
      // Get all content IDs from recommendations
      const allRecommendedIds = new Set();
      logs.forEach(log => {
        if (log.recommendedContent) {
          log.recommendedContent.forEach(id => allRecommendedIds.add(id.toString()));
        }
      });
      
      // Get behaviors for recommended content
      const behaviors = await UserBehavior.find({
        contentId: { $in: Array.from(allRecommendedIds) },
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Calculate metrics for each algorithm
      const results = {};
      
      for (const [algorithm, algLogs] of Object.entries(algorithmLogs)) {
        // Get all content IDs recommended by this algorithm
        const recommendedIds = new Set();
        algLogs.forEach(log => {
          if (log.recommendedContent) {
            log.recommendedContent.forEach(id => recommendedIds.add(id.toString()));
          }
        });
        
        // Filter behaviors for content recommended by this algorithm
        const algBehaviors = behaviors.filter(behavior => 
          recommendedIds.has(behavior.contentId.toString())
        );
        
        // Count behaviors by type
        const actionCounts = {};
        algBehaviors.forEach(behavior => {
          actionCounts[behavior.action] = (actionCounts[behavior.action] || 0) + 1;
        });
        
        // Calculate metrics
        const totalRecommendations = algLogs.length;
        const viewCount = actionCounts['view'] || 0;
        const likeCount = actionCounts['like'] || 0;
        const saveCount = actionCounts['save'] || 0;
        const shareCount = actionCounts['share'] || 0;
        const positiveInteractions = likeCount + saveCount + shareCount;
        
        results[algorithm] = {
          totalRecommendations,
          actionCounts,
          metrics: {
            ctr: totalRecommendations > 0 ? viewCount / totalRecommendations : 0,
            engagementRate: viewCount > 0 ? positiveInteractions / viewCount : 0,
            likeRate: viewCount > 0 ? likeCount / viewCount : 0,
            saveRate: viewCount > 0 ? saveCount / viewCount : 0,
            shareRate: viewCount > 0 ? shareCount / viewCount : 0
          }
        };
      }
      
      return {
        period: {
          startDate,
          endDate
        },
        algorithmPerformance: results
      };
    } catch (error) {
      console.error('Error generating algorithm performance metrics:', error);
      throw error;
    }
  }
  
  /**
   * Get content performance metrics
   * @param {Object} options - Options for filtering the data
   * @returns {Promise<Object>} Content performance metrics
   */
  async getContentPerformance(options = {}) {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      endDate = new Date(),
      contentType = null,
      limit = 20
    } = options;
    
    try {
      // Get recommendation logs for the period
      const logs = await RecommendationLog.find({
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Count recommendations per content
      const contentRecommendationCounts = {};
      logs.forEach(log => {
        if (log.recommendedContent) {
          log.recommendedContent.forEach(id => {
            const contentId = id.toString();
            contentRecommendationCounts[contentId] = (contentRecommendationCounts[contentId] || 0) + 1;
          });
        }
      });
      
      // Get behaviors for the recommended content
      const contentIds = Object.keys(contentRecommendationCounts);
      if (contentIds.length === 0) {
        return {
          period: { startDate, endDate },
          contentPerformance: []
        };
      }
      
      const behaviors = await UserBehavior.find({
        contentId: { $in: contentIds.map(id => mongoose.Types.ObjectId(id)) },
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Get content details
      const contentItems = await Content.find({
        _id: { $in: contentIds.map(id => mongoose.Types.ObjectId(id)) },
        ...(contentType ? { contentType } : {})
      }).lean();
      
      // Map content details for quick lookup
      const contentMap = contentItems.reduce((map, item) => {
        map[item._id.toString()] = item;
        return map;
      }, {});
      
      // Calculate metrics for each content item
      const contentMetrics = [];
      
      for (const contentId of contentIds) {
        const content = contentMap[contentId];
        if (!content) continue; // Skip if content details not found or filtered out by contentType
        
        // Filter behaviors for this content
        const contentBehaviors = behaviors.filter(behavior => 
          behavior.contentId.toString() === contentId
        );
        
        // Count behaviors by type
        const actionCounts = {};
        contentBehaviors.forEach(behavior => {
          actionCounts[behavior.action] = (actionCounts[behavior.action] || 0) + 1;
        });
        
        // Calculate metrics
        const recommendCount = contentRecommendationCounts[contentId] || 0;
        const viewCount = actionCounts['view'] || 0;
        const likeCount = actionCounts['like'] || 0;
        const saveCount = actionCounts['save'] || 0;
        const shareCount = actionCounts['share'] || 0;
        const positiveInteractions = likeCount + saveCount + shareCount;
        
        contentMetrics.push({
          contentId,
          title: content.title,
          contentType: content.contentType,
          metrics: {
            recommendCount,
            viewCount,
            likeCount,
            saveCount,
            shareCount,
            ctr: recommendCount > 0 ? viewCount / recommendCount : 0,
            engagementRate: viewCount > 0 ? positiveInteractions / viewCount : 0,
            engagementScore: recommendCount > 0 ? positiveInteractions / recommendCount : 0
          }
        });
      }
      
      // Sort by engagement score and limit
      contentMetrics.sort((a, b) => b.metrics.engagementScore - a.metrics.engagementScore);
      
      return {
        period: {
          startDate,
          endDate
        },
        contentPerformance: contentMetrics.slice(0, limit)
      };
    } catch (error) {
      console.error('Error generating content performance metrics:', error);
      throw error;
    }
  }
  
  /**
   * Get user engagement metrics
   * @param {Object} options - Options for filtering the data
   * @returns {Promise<Object>} User engagement metrics
   */
  async getUserEngagementMetrics(options = {}) {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      endDate = new Date(),
      limit = 20
    } = options;
    
    try {
      // Get all users who received recommendations in the period
      const logs = await RecommendationLog.find({
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean();
      
      const userIds = [...new Set(logs.map(log => log.userId.toString()))];
      
      // Get user behaviors for the period
      const behaviors = await UserBehavior.find({
        userId: { $in: userIds.map(id => mongoose.Types.ObjectId(id)) },
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Group behaviors by user
      const userBehaviors = {};
      behaviors.forEach(behavior => {
        const userId = behavior.userId.toString();
        if (!userBehaviors[userId]) {
          userBehaviors[userId] = [];
        }
        userBehaviors[userId].push(behavior);
      });
      
      // Calculate metrics for each user
      const userMetrics = [];
      
      for (const userId of userIds) {
        const userLog = logs.filter(log => log.userId.toString() === userId);
        const userBehavior = userBehaviors[userId] || [];
        
        // Count behaviors by type
        const actionCounts = {};
        userBehavior.forEach(behavior => {
          actionCounts[behavior.action] = (actionCounts[behavior.action] || 0) + 1;
        });
        
        // Calculate metrics
        const recommendCount = userLog.length;
        const viewCount = actionCounts['view'] || 0;
        const likeCount = actionCounts['like'] || 0;
        const saveCount = actionCounts['save'] || 0;
        const shareCount = actionCounts['share'] || 0;
        const positiveInteractions = likeCount + saveCount + shareCount;
        
        userMetrics.push({
          userId,
          metrics: {
            recommendCount,
            viewCount,
            likeCount,
            saveCount,
            shareCount,
            ctr: recommendCount > 0 ? viewCount / recommendCount : 0,
            engagementRate: viewCount > 0 ? positiveInteractions / viewCount : 0,
            engagementScore: recommendCount > 0 ? positiveInteractions / recommendCount : 0
          }
        });
      }
      
      // Sort by engagement score and limit
      userMetrics.sort((a, b) => b.metrics.engagementScore - a.metrics.engagementScore);
      
      return {
        period: {
          startDate,
          endDate
        },
        totalUsers: userIds.length,
        userEngagement: userMetrics.slice(0, limit)
      };
    } catch (error) {
      console.error('Error generating user engagement metrics:', error);
      throw error;
    }
  }
  
  /**
   * Get category performance metrics
   * @param {Object} options - Options for filtering the data
   * @returns {Promise<Object>} Category performance metrics
   */
  async getCategoryPerformance(options = {}) {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      endDate = new Date()
    } = options;
    
    try {
      // Get recommendation logs for the period
      const logs = await RecommendationLog.find({
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Get all content IDs from recommendations
      const contentIds = new Set();
      logs.forEach(log => {
        if (log.recommendedContent) {
          log.recommendedContent.forEach(id => contentIds.add(id.toString()));
        }
      });
      
      if (contentIds.size === 0) {
        return {
          period: { startDate, endDate },
          categoryPerformance: {}
        };
      }
      
      // Get content details to determine categories
      const contentItems = await Content.find({
        _id: { $in: Array.from(contentIds).map(id => mongoose.Types.ObjectId(id)) }
      }).select('_id contentType tags').lean();
      
      // Map content to categories
      const contentTypeMap = {};
      const tagMap = {};
      
      contentItems.forEach(item => {
        // Map by content type
        contentTypeMap[item._id.toString()] = item.contentType;
        
        // Map primary tags (assuming first tag is primary)
        if (item.tags && item.tags.length > 0) {
          tagMap[item._id.toString()] = item.tags[0];
        }
      });
      
      // Get behaviors for the content
      const behaviors = await UserBehavior.find({
        contentId: { $in: Array.from(contentIds).map(id => mongoose.Types.ObjectId(id)) },
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Calculate metrics by content type
      const contentTypeMetrics = {};
      const tagMetrics = {};
      
      behaviors.forEach(behavior => {
        const contentId = behavior.contentId.toString();
        const contentType = contentTypeMap[contentId];
        const tag = tagMap[contentId];
        
        // Skip if we don't have category info
        if (!contentType && !tag) return;
        
        // Track by content type
        if (contentType) {
          if (!contentTypeMetrics[contentType]) {
            contentTypeMetrics[contentType] = {
              view: 0,
              like: 0,
              save: 0,
              share: 0,
              totalInteractions: 0
            };
          }
          
          contentTypeMetrics[contentType][behavior.action] = 
            (contentTypeMetrics[contentType][behavior.action] || 0) + 1;
          contentTypeMetrics[contentType].totalInteractions += 1;
        }
        
        // Track by tag
        if (tag) {
          if (!tagMetrics[tag]) {
            tagMetrics[tag] = {
              view: 0,
              like: 0,
              save: 0,
              share: 0,
              totalInteractions: 0
            };
          }
          
          tagMetrics[tag][behavior.action] = 
            (tagMetrics[tag][behavior.action] || 0) + 1;
          tagMetrics[tag].totalInteractions += 1;
        }
      });
      
      // Calculate engagement rates
      for (const type in contentTypeMetrics) {
        const metrics = contentTypeMetrics[type];
        contentTypeMetrics[type].engagementRate = 
          metrics.view > 0 ? (metrics.like + metrics.save + metrics.share) / metrics.view : 0;
      }
      
      for (const tag in tagMetrics) {
        const metrics = tagMetrics[tag];
        tagMetrics[tag].engagementRate = 
          metrics.view > 0 ? (metrics.like + metrics.save + metrics.share) / metrics.view : 0;
      }
      
      // Sort tags by total interactions and get top 20
      const topTags = Object.entries(tagMetrics)
        .sort((a, b) => b[1].totalInteractions - a[1].totalInteractions)
        .slice(0, 20)
        .reduce((obj, [tag, metrics]) => {
          obj[tag] = metrics;
          return obj;
        }, {});
      
      return {
        period: {
          startDate,
          endDate
        },
        categoryPerformance: {
          byContentType: contentTypeMetrics,
          byTag: topTags
        }
      };
    } catch (error) {
      console.error('Error generating category performance metrics:', error);
      throw error;
    }
  }
  
  /**
   * Get time-based user activity metrics
   * @param {Object} options - Options for filtering the data
   * @returns {Promise<Object>} Time-based metrics
   */
  async getTimeBasedMetrics(options = {}) {
    const { 
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      endDate = new Date(),
      interval = 'day' // 'hour', 'day', 'week', 'month'
    } = options;
    
    try {
      // Get behaviors for the period
      const behaviors = await UserBehavior.find({
        timestamp: { $gte: startDate, $lte: endDate }
      }).lean();
      
      // Group by time interval
      const timeMetrics = {};
      
      behaviors.forEach(behavior => {
        const timestamp = new Date(behavior.timestamp);
        let timeKey;
        
        switch (interval) {
          case 'hour':
            timeKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')} ${String(timestamp.getHours()).padStart(2, '0')}:00`;
            break;
          case 'day':
            timeKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
            break;
          case 'week':
            // Get the first day of the week (Sunday)
            const firstDayOfWeek = new Date(timestamp);
            const day = timestamp.getDay();
            firstDayOfWeek.setDate(timestamp.getDate() - day);
            timeKey = `${firstDayOfWeek.getFullYear()}-${String(firstDayOfWeek.getMonth() + 1).padStart(2, '0')}-${String(firstDayOfWeek.getDate()).padStart(2, '0')}`;
            break;
          case 'month':
            timeKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            timeKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`;
        }
        
        // Initialize metrics for this time period if needed
        if (!timeMetrics[timeKey]) {
          timeMetrics[timeKey] = {
            timestamp: new Date(timestamp),
            view: 0,
            like: 0,
            save: 0,
            share: 0,
            totalInteractions: 0,
            uniqueUsers: new Set()
          };
        }
        
        // Update metrics
        timeMetrics[timeKey][behavior.action] = (timeMetrics[timeKey][behavior.action] || 0) + 1;
        timeMetrics[timeKey].totalInteractions += 1;
        timeMetrics[timeKey].uniqueUsers.add(behavior.userId.toString());
      });
      
      // Convert to array and format unique users count
      const timeSeriesData = Object.entries(timeMetrics)
        .map(([timeKey, metrics]) => ({
          timeKey,
          timestamp: metrics.timestamp,
          view: metrics.view,
          like: metrics.like,
          save: metrics.save,
          share: metrics.share,
          totalInteractions: metrics.totalInteractions,
          uniqueUsers: metrics.uniqueUsers.size
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
      
      return {
        period: {
          startDate,
          endDate,
          interval
        },
        timeSeriesData
      };
    } catch (error) {
      console.error('Error generating time-based metrics:', error);
      throw error;
    }
  }
  
  /**
   * Get recommendation effectiveness metrics for a specific user
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} User-specific recommendation effectiveness
   */
  async getUserRecommendationEffectiveness(userId) {
    try {
      return await FeedbackProcessor.analyzeRecommendationEffectiveness(userId);
    } catch (error) {
      console.error('Error getting user recommendation effectiveness:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService(); 