const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Schema for seasonal content promotion settings
 */
const SeasonalContentSchema = new Schema({
  // Name of the seasonal period or event
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Description of this seasonal promotion
  description: {
    type: String,
    trim: true
  },
  
  // Start date of the seasonal period
  startDate: {
    type: Date,
    required: true
  },
  
  // End date of the seasonal period
  endDate: {
    type: Date,
    required: true
  },
  
  // Whether this seasonal period is currently active
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Priority level (higher numbers = higher priority)
  priority: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  },
  
  // Tags to boost during this seasonal period
  boostedTags: [{
    type: String,
    trim: true
  }],
  
  // Content types to boost during this seasonal period
  boostedContentTypes: [{
    type: String,
    enum: ['article', 'recipe', 'video', 'podcast', 'workshop']
  }],
  
  // Specific content IDs to be promoted
  promotedContent: [{
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      required: true
    },
    // Boost factor for this specific content (multiplier)
    boostFactor: {
      type: Number,
      default: 1.5,
      min: 1.0,
      max: 5.0
    }
  }],
  
  // User segments to target with this seasonal content
  // If empty, targets all users
  targetUserSegments: [{
    type: String,
    trim: true
  }],
  
  // Geographic regions for targeted seasonal content
  // If empty, applies to all regions
  regions: [{
    type: String,
    trim: true
  }],
  
  // Boost factor to apply to matching content (multiplier)
  globalBoostFactor: {
    type: Number,
    default: 1.3,
    min: 1.0,
    max: 3.0
  },
  
  // Flag indicating if this is a recurring seasonal period (e.g., annually)
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  // Recurrence pattern (only used if isRecurring is true)
  recurrencePattern: {
    // Type of recurrence (yearly, monthly, etc.)
    type: {
      type: String,
      enum: ['yearly', 'monthly', 'weekly'],
      default: 'yearly'
    },
    // Month for yearly recurrence (1-12)
    month: {
      type: Number,
      min: 1,
      max: 12
    },
    // Day for monthly/yearly recurrence
    day: {
      type: Number,
      min: 1,
      max: 31
    },
    // Day of week for weekly recurrence (0-6, Sunday-Saturday)
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    // Duration in days
    durationDays: {
      type: Number,
      min: 1,
      default: 7
    }
  },
  
  // Metadata for tracking and analytics
  metadata: {
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    lastUpdatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying of active promotions
SeasonalContentSchema.index({ 
  startDate: 1, 
  endDate: 1, 
  isActive: 1 
});

// Index for finding seasonal promotions by tag
SeasonalContentSchema.index({ 
  boostedTags: 1 
});

/**
 * Find all active seasonal promotions for the current date
 */
SeasonalContentSchema.statics.findActive = function() {
  const now = new Date();
  return this.find({
    startDate: { $lte: now },
    endDate: { $gte: now },
    isActive: true
  }).sort({ priority: -1 });
};

/**
 * Find active seasonal promotions that apply to specific content
 * @param {Object} content - Content object with tags and contentType
 */
SeasonalContentSchema.statics.findForContent = function(content) {
  const now = new Date();
  
  if (!content || !content.tags) {
    return Promise.resolve([]);
  }
  
  return this.find({
    startDate: { $lte: now },
    endDate: { $gte: now },
    isActive: true,
    $or: [
      { boostedTags: { $in: content.tags } },
      { boostedContentTypes: content.contentType },
      { 'promotedContent.contentId': content._id }
    ]
  }).sort({ priority: -1 });
};

/**
 * Find active seasonal promotions for a specific user
 * @param {Object} user - User object with regions and segments
 */
SeasonalContentSchema.statics.findForUser = function(user) {
  const now = new Date();
  
  if (!user) {
    return Promise.resolve([]);
  }
  
  // Build query based on user attributes
  const query = {
    startDate: { $lte: now },
    endDate: { $gte: now },
    isActive: true
  };
  
  // If user has region information
  if (user.region) {
    query.$or = [
      { regions: { $size: 0 } }, // Empty regions means all regions
      { regions: user.region }
    ];
  }
  
  // If user has segment information
  if (user.segments && user.segments.length > 0) {
    if (!query.$or) query.$or = [];
    
    query.$or.push(
      { targetUserSegments: { $size: 0 } }, // Empty segments means all users
      { targetUserSegments: { $in: user.segments } }
    );
  }
  
  return this.find(query).sort({ priority: -1 });
};

const SeasonalContent = mongoose.model('SeasonalContent', SeasonalContentSchema);
module.exports = SeasonalContent; 