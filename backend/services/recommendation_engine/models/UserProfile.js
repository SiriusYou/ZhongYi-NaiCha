const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * User Profile Schema
 * Stores user profile information for content recommendations
 */
const UserProfileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Basic user info
  name: {
    type: String,
    trim: true
  },
  age: {
    type: Number,
    min: 1,
    max: 120
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', null],
    default: null
  },
  location: {
    type: {
      province: String,
      city: String,
      district: String,
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    },
    default: null
  },
  // TCM-specific data
  constitution: {
    type: String,
    enum: [
      '平和质', // Balanced
      '气虚质', // Qi deficiency
      '阳虚质', // Yang deficiency
      '阴虚质', // Yin deficiency
      '痰湿质', // Phlegm-dampness
      '湿热质', // Dampness-heat
      '血瘀质', // Blood stasis
      '气郁质', // Qi depression
      '特禀质', // Allergic
      null
    ],
    default: null
  },
  // Health conditions and goals
  healthConditions: [{
    type: String,
    trim: true
  }],
  goals: [{
    type: String,
    trim: true
  }],
  dietaryPreferences: [{
    type: String,
    trim: true
  }],
  allergies: [{
    type: String,
    trim: true
  }],
  // User experience level with TCM
  experienceLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', null],
    default: 'beginner'
  },
  // Preference settings
  preferences: {
    contentFormat: {
      type: String,
      enum: ['article', 'video', 'infographic', 'all'],
      default: 'all'
    },
    contentLength: {
      type: String,
      enum: ['short', 'medium', 'long', 'all'],
      default: 'all'
    },
    emailFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'none'],
      default: 'weekly'
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      enum: ['zh-CN', 'zh-TW', 'en-US'],
      default: 'zh-CN'
    }
  },
  // Engagement metrics
  metrics: {
    contentViewed: {
      type: Number,
      default: 0
    },
    avgViewDuration: {
      type: Number,
      default: 0
    },
    totalInteractions: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    onboardingCompleted: {
      type: Boolean,
      default: false
    },
    activeDays: {
      type: Number,
      default: 0
    }
  },
  // Recommended content history
  recentRecommendations: [{
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    interacted: {
      type: Boolean,
      default: false
    }
  }],
  // When profile was created/updated
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes
UserProfileSchema.index({ userId: 1 });
UserProfileSchema.index({ constitution: 1 });
UserProfileSchema.index({ 'location.coordinates': '2dsphere' });
UserProfileSchema.index({ 'metrics.lastActive': -1 });

// Update timestamps before saving
UserProfileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to update engagement metrics
UserProfileSchema.methods.updateEngagementMetrics = function(interaction) {
  // Update view duration average
  if (interaction.duration && interaction.action === 'view') {
    const currentTotal = this.metrics.avgViewDuration * this.metrics.contentViewed;
    this.metrics.contentViewed += 1;
    this.metrics.avgViewDuration = (currentTotal + interaction.duration) / this.metrics.contentViewed;
  }
  
  // Update total interactions
  this.metrics.totalInteractions += 1;
  
  // Update last active timestamp
  this.metrics.lastActive = new Date();
  
  // Check if active on a new day
  const lastActiveDay = new Date(this.metrics.lastActive).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);
  
  if (lastActiveDay < today) {
    this.metrics.activeDays += 1;
  }
  
  return this;
};

// Method to add recent recommendation
UserProfileSchema.methods.addRecommendation = function(contentId) {
  // Add to recent recommendations, keeping only the last 50
  this.recentRecommendations.unshift({
    contentId,
    timestamp: new Date(),
    interacted: false
  });
  
  // Limit to 50 most recent
  if (this.recentRecommendations.length > 50) {
    this.recentRecommendations = this.recentRecommendations.slice(0, 50);
  }
  
  return this;
};

// Method to mark recommendation as interacted
UserProfileSchema.methods.markRecommendationInteracted = function(contentId) {
  const rec = this.recentRecommendations.find(
    r => r.contentId.toString() === contentId.toString()
  );
  
  if (rec) {
    rec.interacted = true;
  }
  
  return this;
};

// Static method to create or update user profile
UserProfileSchema.statics.createOrUpdate = async function(userId, profileData = {}) {
  return this.findOneAndUpdate(
    { userId },
    { 
      $set: {
        ...profileData,
        updatedAt: new Date()
      }
    },
    {
      upsert: true,
      new: true
    }
  );
};

module.exports = mongoose.model('UserProfile', UserProfileSchema); 