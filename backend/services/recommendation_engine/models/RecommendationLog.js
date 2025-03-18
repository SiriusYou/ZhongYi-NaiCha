const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Recommendation Log Schema
 * Logs recommendation events for analysis and improvement
 */
const RecommendationLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contentIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Content'
  }],
  algorithm: {
    type: String,
    required: true,
    enum: ['content-based', 'collaborative-filtering', 'hybrid', 'popular', 'seasonal', 'custom'],
    index: true
  },
  abTestId: {
    type: Schema.Types.ObjectId,
    ref: 'ABTest',
    index: true
  },
  abTestVariant: {
    type: String,
    default: null
  },
  context: {
    type: String,
    enum: ['home', 'profile', 'detail', 'search', 'category', null],
    default: null,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  requestParameters: {
    type: Object,
    default: {},
    description: 'Parameters used in the recommendation request'
  },
  responseMetrics: {
    type: {
      processingTimeMs: Number,
      totalCandidates: Number,
      filteredResults: Number
    },
    default: null
  },
  modelVersion: {
    type: String,
    default: '1.0.0'
  }
});

// Create compound indexes
RecommendationLogSchema.index({ userId: 1, timestamp: -1 });
RecommendationLogSchema.index({ abTestId: 1, timestamp: -1 });

// TTL index - delete logs older than 90 days for storage efficiency
RecommendationLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

// Static method to get recommendations stats for a user
RecommendationLogSchema.statics.getUserStats = async function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const pipeline = [
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$algorithm',
        count: { $sum: 1 },
        totalRecommendations: { $sum: { $size: '$contentIds' } },
        avgProcessingTime: { $avg: '$responseMetrics.processingTimeMs' }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get aggregate stats for an A/B test
RecommendationLogSchema.statics.getABTestStats = async function(abTestId) {
  const pipeline = [
    {
      $match: {
        abTestId: mongoose.Types.ObjectId(abTestId)
      }
    },
    {
      $group: {
        _id: '$abTestVariant',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        totalRecommendations: { $sum: { $size: '$contentIds' } },
        avgProcessingTime: { $avg: '$responseMetrics.processingTimeMs' }
      }
    },
    {
      $project: {
        variant: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        totalRecommendations: 1,
        avgProcessingTime: 1,
        _id: 0
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

module.exports = mongoose.model('RecommendationLog', RecommendationLogSchema); 