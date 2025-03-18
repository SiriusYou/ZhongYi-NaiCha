const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema for tracking analytics data for seasonal content promotions
 */
const SeasonalContentAnalyticsSchema = new Schema({
  // Reference to the associated seasonal content promotion
  promotionId: {
    type: Schema.Types.ObjectId,
    ref: 'SeasonalContent',
    required: true,
    index: true
  },
  
  // Promotion impact metrics
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  clickThroughRate: {
    type: Number,
    default: 0
  },
  
  // Content engagement metrics related to the promotion
  contentViewed: {
    type: Number,
    default: 0
  },
  contentCompleted: {
    type: Number,
    default: 0
  },
  averageTimeSpent: {
    type: Number,
    default: 0
  },
  
  // User engagement metrics
  uniqueUsers: {
    type: Number,
    default: 0
  },
  returningUsers: {
    type: Number,
    default: 0
  },
  
  // User action metrics
  saves: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  ratings: {
    type: Number,
    default: 0
  },
  avgRatingValue: {
    type: Number,
    default: 0
  },
  
  // Conversion metrics (if applicable)
  conversions: {
    type: Number,
    default: 0
  },
  conversionRate: {
    type: Number,
    default: 0
  },
  
  // Time-based segmentation
  dailyStats: [{
    date: {
      type: Date,
      required: true
    },
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    uniqueUsers: {
      type: Number,
      default: 0
    }
  }],
  
  // Device-based segmentation
  deviceStats: {
    mobile: {
      type: Number,
      default: 0
    },
    tablet: {
      type: Number,
      default: 0
    },
    desktop: {
      type: Number,
      default: 0
    }
  },
  
  // Additional metadata
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  
  // Timestamps
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate click-through rate before saving
SeasonalContentAnalyticsSchema.pre('save', function(next) {
  if (this.impressions > 0) {
    this.clickThroughRate = (this.clicks / this.impressions) * 100;
  }
  
  if (this.conversions > 0 && this.clicks > 0) {
    this.conversionRate = (this.conversions / this.clicks) * 100;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Virtual property for engagement score
SeasonalContentAnalyticsSchema.virtual('engagementScore').get(function() {
  let score = 0;
  
  // Weight factors
  const weightClickRate = 0.3;
  const weightCompletionRate = 0.25;
  const weightTimeSpent = 0.15;
  const weightSocialEngagement = 0.3;
  
  // Click-through rate component (normalized to 0-1)
  const clickRateScore = Math.min(this.clickThroughRate / 20, 1); // 20% CTR is considered maximum
  
  // Content completion rate
  const completionRate = this.contentViewed > 0 ? this.contentCompleted / this.contentViewed : 0;
  
  // Average time spent (normalized, assuming 5 minutes is max engagement)
  const timeSpentScore = Math.min(this.averageTimeSpent / 300, 1);
  
  // Social engagement (saves, shares, comments, ratings)
  const totalSocialActions = this.saves + this.shares + this.comments + this.ratings;
  const socialEngagementScore = this.uniqueUsers > 0 ? 
    Math.min(totalSocialActions / this.uniqueUsers, 1) : 0;
  
  // Calculate weighted score
  score = (clickRateScore * weightClickRate) +
          (completionRate * weightCompletionRate) +
          (timeSpentScore * weightTimeSpent) +
          (socialEngagementScore * weightSocialEngagement);
  
  // Return as percentage
  return Math.round(score * 100);
});

// Static method to update metrics for a promotion
SeasonalContentAnalyticsSchema.statics.updateMetrics = async function(promotionId, metrics) {
  try {
    const analyticsRecord = await this.findOne({ promotionId });
    
    if (!analyticsRecord) {
      // Create new record if it doesn't exist
      return await this.create({
        promotionId,
        ...metrics
      });
    }
    
    // Update daily stats if date is provided
    if (metrics.date) {
      const today = new Date(metrics.date);
      today.setHours(0, 0, 0, 0);
      
      const dailyRecord = analyticsRecord.dailyStats.find(
        stat => new Date(stat.date).toDateString() === today.toDateString()
      );
      
      if (dailyRecord) {
        // Update existing daily record
        if (metrics.impressions) dailyRecord.impressions += metrics.impressions;
        if (metrics.clicks) dailyRecord.clicks += metrics.clicks;
        if (metrics.uniqueUsers) dailyRecord.uniqueUsers += metrics.uniqueUsers;
      } else {
        // Add new daily record
        analyticsRecord.dailyStats.push({
          date: today,
          impressions: metrics.impressions || 0,
          clicks: metrics.clicks || 0,
          uniqueUsers: metrics.uniqueUsers || 0
        });
      }
      
      // Remove date to avoid confusing the update below
      delete metrics.date;
    }
    
    // Update device stats if provided
    if (metrics.device) {
      const device = metrics.device.toLowerCase();
      if (['mobile', 'tablet', 'desktop'].includes(device)) {
        analyticsRecord.deviceStats[device]++;
      }
      
      // Remove device to avoid confusing the update below
      delete metrics.device;
    }
    
    // Update remaining metrics
    Object.keys(metrics).forEach(key => {
      if (analyticsRecord[key] !== undefined && typeof metrics[key] === 'number') {
        analyticsRecord[key] += metrics[key];
      }
    });
    
    return await analyticsRecord.save();
  } catch (error) {
    console.error('Error updating seasonal content analytics:', error);
    throw error;
  }
};

const SeasonalContentAnalytics = mongoose.model('SeasonalContentAnalytics', SeasonalContentAnalyticsSchema);

module.exports = SeasonalContentAnalytics; 