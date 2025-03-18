const SeasonalContent = require('../models/SeasonalContent');
const SeasonalContentAnalytics = require('../models/SeasonalContentAnalytics');
const Content = require('../models/Content');
const User = require('../models/User');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Service to manage seasonal content promotions
 */
class SeasonalContentService {
  /**
   * Get all active seasonal promotions
   * @returns {Promise<Array>} - List of active promotions
   */
  static async getActivePromotions() {
    try {
      const promotions = await SeasonalContent.findActivePromotions();
      return promotions;
    } catch (error) {
      logger.error('Error fetching active promotions:', error);
      throw error;
    }
  }

  /**
   * Get promotions applicable to a specific user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - List of applicable promotions
   */
  static async getPromotionsForUser(userId) {
    try {
      // Validate userId
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      // Get user profile for targeting
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get active promotions
      const activePromotions = await this.getActivePromotions();

      // Filter promotions based on user attributes
      const userRegion = user.region || 'global';
      const applicablePromotions = activePromotions.filter(promo => {
        // Check if promotion targets specific user segments
        if (promo.targetUserSegments && promo.targetUserSegments.length > 0) {
          // Implement logic to check if user belongs to any targeted segment
          // For simplicity, we're assuming user.segments exists
          const userSegments = user.segments || [];
          if (!promo.targetUserSegments.some(segment => userSegments.includes(segment))) {
            return false;
          }
        }

        // Check if promotion is region-specific
        if (promo.regions && promo.regions.length > 0) {
          if (!promo.regions.includes(userRegion) && !promo.regions.includes('global')) {
            return false;
          }
        }

        return true;
      });

      return applicablePromotions;
    } catch (error) {
      logger.error(`Error fetching promotions for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Apply seasonal boosts to a list of content recommendations
   * @param {Array} contentList - List of content to apply boosts to
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Content list with seasonal boosts applied
   */
  static async applySeasonalBoosts(contentList, userId) {
    try {
      if (!contentList || !Array.isArray(contentList) || contentList.length === 0) {
        return contentList;
      }

      // Get applicable promotions for the user
      const promotions = await this.getPromotionsForUser(userId);
      
      if (!promotions || promotions.length === 0) {
        return contentList;
      }

      // Map content IDs for efficient lookup
      const contentMap = new Map(contentList.map(content => [content._id.toString(), content]));
      
      // Apply boosts based on promotions
      promotions.forEach(promotion => {
        // Boost explicitly promoted content
        if (promotion.promotedContent && promotion.promotedContent.length > 0) {
          promotion.promotedContent.forEach(contentId => {
            const contentIdStr = contentId.toString();
            if (contentMap.has(contentIdStr)) {
              const content = contentMap.get(contentIdStr);
              // Apply global boost factor
              content.relevanceScore = (content.relevanceScore || 1) * (promotion.globalBoostFactor || 1.5);
              content.promotion = {
                id: promotion._id,
                name: promotion.name,
                boost: promotion.globalBoostFactor || 1.5
              };
            }
          });
        }

        // Boost content with matching tags
        if (promotion.boostedTags && promotion.boostedTags.length > 0) {
          contentList.forEach(content => {
            const contentTags = content.tags || [];
            const matchingTags = contentTags.filter(tag => 
              promotion.boostedTags.includes(tag)
            );
            
            if (matchingTags.length > 0) {
              // Apply boost proportional to number of matching tags
              const tagBoostFactor = 1 + ((matchingTags.length / promotion.boostedTags.length) * 
                                         (promotion.globalBoostFactor - 1 || 0.5));
              
              content.relevanceScore = (content.relevanceScore || 1) * tagBoostFactor;
              
              // Track promotion if not already tracked
              if (!content.promotion || content.promotion.boost < tagBoostFactor) {
                content.promotion = {
                  id: promotion._id,
                  name: promotion.name,
                  boost: tagBoostFactor,
                  matchedTags: matchingTags
                };
              }
            }
          });
        }

        // Boost content with matching content types
        if (promotion.boostedContentTypes && promotion.boostedContentTypes.length > 0) {
          contentList.forEach(content => {
            if (promotion.boostedContentTypes.includes(content.contentType)) {
              const typeBoostFactor = promotion.globalBoostFactor || 1.3;
              
              content.relevanceScore = (content.relevanceScore || 1) * typeBoostFactor;
              
              // Track promotion if not already tracked or if boost is higher
              if (!content.promotion || content.promotion.boost < typeBoostFactor) {
                content.promotion = {
                  id: promotion._id,
                  name: promotion.name,
                  boost: typeBoostFactor,
                  matchedType: content.contentType
                };
              }
            }
          });
        }
      });

      // Sort the content list based on boosted relevance scores
      contentList.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      return contentList;
    } catch (error) {
      logger.error(`Error applying seasonal boosts:`, error);
      // Return original content list in case of error
      return contentList;
    }
  }

  /**
   * Get seasonal content highlights for a user
   * @param {string} userId - User ID
   * @param {Object} options - Options for highlights
   * @returns {Promise<Array>} - List of seasonal highlights
   */
  static async getSeasonalContentHighlights(userId, options = {}) {
    try {
      // Default options
      const limit = options.limit || 10;
      
      // Get applicable promotions
      const promotions = await this.getPromotionsForUser(userId);
      
      if (!promotions || promotions.length === 0) {
        // If no promotions, fall back to TCM seasonal recommendations
        const seasonalInfo = this.getTCMSeasonalInfo();
        return await Content.find({
          tags: { $in: seasonalInfo.recommendedTags },
          isActive: true
        })
        .sort({ createdAt: -1 })
        .limit(limit);
      }
      
      // Sort promotions by priority (highest first)
      promotions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      
      // Get explicitly promoted content from high-priority promotions
      let highlightedContent = [];
      
      // Track promotions used for analytics
      const usedPromotions = new Set();
      
      for (const promotion of promotions) {
        if (promotion.promotedContent && promotion.promotedContent.length > 0) {
          const promotedItems = await Content.find({
            _id: { $in: promotion.promotedContent },
            isActive: true
          });
          
          if (promotedItems.length > 0) {
            // Add promotion ID to content for tracking
            promotedItems.forEach(item => {
              item = item.toObject();
              item.promotionId = promotion._id;
              highlightedContent.push(item);
              usedPromotions.add(promotion._id.toString());
            });
          }
          
          // If we have enough items, stop searching
          if (highlightedContent.length >= limit) {
            break;
          }
        }
      }
      
      // If we still need more content, search by boosted tags
      if (highlightedContent.length < limit) {
        const remainingLimit = limit - highlightedContent.length;
        
        // Collect all boosted tags from promotions
        const boostedTags = [];
        promotions.forEach(promotion => {
          if (promotion.boostedTags && promotion.boostedTags.length > 0) {
            boostedTags.push(...promotion.boostedTags);
            usedPromotions.add(promotion._id.toString());
          }
        });
        
        if (boostedTags.length > 0) {
          // Find content with these tags, excluding already highlighted content
          const highlightedIds = highlightedContent.map(c => c._id);
          
          const taggedContent = await Content.find({
            _id: { $nin: highlightedIds },
            tags: { $in: boostedTags },
            isActive: true
          })
          .sort({ createdAt: -1 })
          .limit(remainingLimit);
          
          if (taggedContent.length > 0) {
            // Find which promotion boosted this content
            taggedContent.forEach(item => {
              item = item.toObject();
              const matchingPromotion = promotions.find(p => 
                p.boostedTags && p.boostedTags.some(tag => (item.tags || []).includes(tag))
              );
              
              if (matchingPromotion) {
                item.promotionId = matchingPromotion._id;
              }
              
              highlightedContent.push(item);
            });
          }
        }
      }
      
      // Update impression analytics for used promotions
      usedPromotions.forEach(async (promotionId) => {
        try {
          await SeasonalContentAnalytics.updateMetrics(promotionId, { 
            impressions: 1,
            date: new Date(),
            uniqueUsers: 1
          });
        } catch (error) {
          logger.error(`Error updating analytics for promotion ${promotionId}:`, error);
        }
      });
      
      return highlightedContent;
    } catch (error) {
      logger.error(`Error getting seasonal highlights for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Track an impression for a seasonal promotion
   * @param {string} promotionId - Promotion ID
   * @returns {Promise<boolean>} - Success indicator
   */
  static async trackImpression(promotionId) {
    try {
      if (!promotionId || !mongoose.Types.ObjectId.isValid(promotionId)) {
        throw new Error('Invalid promotion ID');
      }
      
      await SeasonalContentAnalytics.updateMetrics(promotionId, {
        impressions: 1,
        date: new Date()
      });
      
      return true;
    } catch (error) {
      logger.error(`Error tracking impression for promotion ${promotionId}:`, error);
      throw error;
    }
  }

  /**
   * Track a click on a seasonal promotion
   * @param {string} promotionId - Promotion ID
   * @returns {Promise<boolean>} - Success indicator
   */
  static async trackClick(promotionId) {
    try {
      if (!promotionId || !mongoose.Types.ObjectId.isValid(promotionId)) {
        throw new Error('Invalid promotion ID');
      }
      
      await SeasonalContentAnalytics.updateMetrics(promotionId, {
        clicks: 1,
        date: new Date()
      });
      
      return true;
    } catch (error) {
      logger.error(`Error tracking click for promotion ${promotionId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new seasonal promotion
   * @param {Object} promotionData - Promotion data
   * @returns {Promise<Object>} - Created promotion
   */
  static async createPromotion(promotionData) {
    try {
      const promotion = new SeasonalContent(promotionData);
      await promotion.save();
      
      // Initialize analytics record
      await SeasonalContentAnalytics.create({
        promotionId: promotion._id
      });
      
      return promotion;
    } catch (error) {
      logger.error('Error creating seasonal promotion:', error);
      throw error;
    }
  }

  /**
   * Update an existing seasonal promotion
   * @param {string} promotionId - Promotion ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object>} - Updated promotion
   */
  static async updatePromotion(promotionId, updateData) {
    try {
      if (!promotionId || !mongoose.Types.ObjectId.isValid(promotionId)) {
        throw new Error('Invalid promotion ID');
      }
      
      const promotion = await SeasonalContent.findByIdAndUpdate(
        promotionId,
        { $set: updateData },
        { new: true, runValidators: true }
      );
      
      return promotion;
    } catch (error) {
      logger.error(`Error updating promotion ${promotionId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a seasonal promotion
   * @param {string} promotionId - Promotion ID
   * @returns {Promise<boolean>} - Success indicator
   */
  static async deletePromotion(promotionId) {
    try {
      if (!promotionId || !mongoose.Types.ObjectId.isValid(promotionId)) {
        throw new Error('Invalid promotion ID');
      }
      
      const result = await SeasonalContent.findByIdAndDelete(promotionId);
      
      if (!result) {
        return false;
      }
      
      // Also delete analytics
      await SeasonalContentAnalytics.deleteOne({ promotionId });
      
      return true;
    } catch (error) {
      logger.error(`Error deleting promotion ${promotionId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate effectiveness metrics for seasonal promotions
   * @returns {Promise<Array>} - Promotion effectiveness metrics
   */
  static async calculatePromotionEffectiveness() {
    try {
      const analytics = await SeasonalContentAnalytics.find()
        .populate('promotionId', 'name startDate endDate isActive')
        .lean();
      
      // Transform data for response
      return analytics.map(record => {
        const promotion = record.promotionId || {};
        const effectiveness = {};
        
        // Calculate engagement score
        effectiveness.engagementScore = record.engagementScore;
        
        // Calculate click-through rate
        effectiveness.clickThroughRate = record.clickThroughRate;
        
        // Calculate conversion rate if applicable
        effectiveness.conversionRate = record.conversionRate;
        
        // Extract daily performance
        effectiveness.dailyPerformance = record.dailyStats || [];
        
        // Get device distribution
        effectiveness.deviceDistribution = record.deviceStats;
        
        return {
          promotionId: record.promotionId?._id,
          promotionName: promotion.name || 'Unknown Promotion',
          isActive: promotion.isActive || false,
          startDate: promotion.startDate,
          endDate: promotion.endDate,
          metrics: {
            impressions: record.impressions,
            clicks: record.clicks,
            uniqueUsers: record.uniqueUsers,
            returningUsers: record.returningUsers,
            saves: record.saves,
            shares: record.shares,
            comments: record.comments
          },
          effectiveness
        };
      });
    } catch (error) {
      logger.error('Error calculating promotion effectiveness:', error);
      throw error;
    }
  }

  /**
   * Get TCM-related seasonal information
   * @returns {Object} - Seasonal TCM information
   */
  static getTCMSeasonalInfo() {
    // Get current date
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    
    // Define seasons in TCM
    const seasons = {
      spring: {
        months: [2, 3, 4], // Feb, Mar, Apr
        element: 'Wood',
        organ: 'Liver',
        taste: 'Sour',
        emotion: 'Anger',
        color: 'Green',
        recommendedTags: [
          'spring', 'detox', 'cleansing', 'liver', 'gallbladder',
          'wood element', 'green tea', 'sour foods', 'sprouts',
          'growth', 'renewal', 'mint', 'leafy greens'
        ],
        avoidTags: [
          'heavy foods', 'excess alcohol', 'greasy foods'
        ],
        seasonalFoods: [
          'leafy greens', 'sprouts', 'green tea', 'vinegar',
          'wheat', 'plums', 'lemons', 'limes', 'goji berries'
        ]
      },
      summer: {
        months: [5, 6, 7], // May, Jun, Jul
        element: 'Fire',
        organ: 'Heart',
        taste: 'Bitter',
        emotion: 'Joy',
        color: 'Red',
        recommendedTags: [
          'summer', 'heart', 'small intestine', 'circulation',
          'fire element', 'cooling foods', 'bitter foods', 'hydration',
          'maturity', 'joy', 'red foods', 'cooling teas'
        ],
        avoidTags: [
          'excessive heat', 'spicy foods', 'dehydration', 'heavy exercise'
        ],
        seasonalFoods: [
          'watermelon', 'cucumber', 'bitter greens', 'celery',
          'corn', 'lemon water', 'mung beans', 'chrysanthemum tea'
        ]
      },
      lateSum: {
        months: [8], // Aug
        element: 'Earth',
        organ: 'Spleen',
        taste: 'Sweet',
        emotion: 'Pensiveness',
        color: 'Yellow',
        recommendedTags: [
          'late summer', 'spleen', 'stomach', 'digestion',
          'earth element', 'sweet foods', 'centered', 'grounding',
          'stability', 'nourishment', 'yellow foods'
        ],
        avoidTags: [
          'raw foods', 'excessive sweets', 'cold foods', 'iced drinks'
        ],
        seasonalFoods: [
          'millet', 'sweet potatoes', 'squash', 'carrots', 'ginger',
          'honey', 'dates', 'rice', 'oats', 'chicken'
        ]
      },
      autumn: {
        months: [9, 10, 11], // Sep, Oct, Nov
        element: 'Metal',
        organ: 'Lung',
        taste: 'Pungent',
        emotion: 'Grief',
        color: 'White',
        recommendedTags: [
          'autumn', 'fall', 'lung', 'large intestine', 'respiratory',
          'metal element', 'pungent foods', 'immune support', 'white foods',
          'letting go', 'breath', 'air', 'spicy foods'
        ],
        avoidTags: [
          'cold foods', 'phlegm producing foods', 'dairy excess'
        ],
        seasonalFoods: [
          'ginger', 'onions', 'garlic', 'white rice', 'almonds',
          'radish', 'daikon', 'cabbage', 'pears', 'white mushrooms'
        ]
      },
      winter: {
        months: [12, 1], // Dec, Jan
        element: 'Water',
        organ: 'Kidney',
        taste: 'Salty',
        emotion: 'Fear',
        color: 'Black/Blue',
        recommendedTags: [
          'winter', 'kidney', 'bladder', 'adrenals', 'bones',
          'water element', 'salty foods', 'warming foods', 'longevity',
          'rest', 'restoration', 'black foods', 'blue foods'
        ],
        avoidTags: [
          'cold foods', 'raw foods', 'excess salt', 'stimulants'
        ],
        seasonalFoods: [
          'bone broth', 'black beans', 'kidney beans', 'seaweed',
          'walnuts', 'black sesame', 'dark leafy greens', 'lamb'
        ]
      }
    };
    
    // Determine current season
    let currentSeason;
    
    if (month >= 2 && month <= 4) {
      currentSeason = seasons.spring;
      currentSeason.name = 'Spring';
    } else if (month >= 5 && month <= 7) {
      currentSeason = seasons.summer;
      currentSeason.name = 'Summer';
    } else if (month === 8) {
      currentSeason = seasons.lateSum;
      currentSeason.name = 'Late Summer';
    } else if (month >= 9 && month <= 11) {
      currentSeason = seasons.autumn;
      currentSeason.name = 'Autumn';
    } else {
      currentSeason = seasons.winter;
      currentSeason.name = 'Winter';
    }
    
    // Add general TCM seasonal guidance
    currentSeason.guidance = `In ${currentSeason.name}, focus on supporting your ${currentSeason.organ} system through ${currentSeason.element} element balancing. Incorporate ${currentSeason.taste} flavors and ${currentSeason.color}-colored foods into your diet.`;
    
    return currentSeason;
  }

  /**
   * Create an automatic seasonal promotion based on TCM principles
   * @returns {Promise<Object>} - Created promotion
   */
  static async createAutomaticSeasonalPromotion() {
    try {
      const seasonalInfo = this.getTCMSeasonalInfo();
      
      // Create promotion start and end dates based on current month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Set start date to first day of current month
      const startDate = new Date(currentYear, currentMonth, 1);
      
      // Set end date to last day of next month
      const endDate = new Date(currentYear, currentMonth + 2, 0);
      
      // Create promotion data
      const promotionData = {
        name: `${seasonalInfo.name} ${currentYear} - TCM ${seasonalInfo.element} Element Focus`,
        description: seasonalInfo.guidance,
        startDate,
        endDate,
        isActive: true,
        priority: 100, // High priority for automatic seasonal promotions
        boostedTags: seasonalInfo.recommendedTags,
        globalBoostFactor: 1.5,
        isRecurring: true,
        recurrencePattern: 'yearly',
        metadata: {
          tcmElement: seasonalInfo.element,
          tcmOrgan: seasonalInfo.organ,
          tcmTaste: seasonalInfo.taste,
          tcmColor: seasonalInfo.color,
          tcmEmotion: seasonalInfo.emotion,
          seasonalFoods: seasonalInfo.seasonalFoods,
          avoidTags: seasonalInfo.avoidTags,
          autoGenerated: true
        }
      };
      
      // Create the promotion
      return await this.createPromotion(promotionData);
    } catch (error) {
      logger.error('Error creating automatic seasonal promotion:', error);
      throw error;
    }
  }
}

module.exports = SeasonalContentService; 