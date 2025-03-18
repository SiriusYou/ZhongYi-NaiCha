const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * User Behavior Schema
 * Tracks user interactions with content for recommendation purposes
 */
const UserBehaviorSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contentId: {
    type: Schema.Types.ObjectId,
    ref: 'Content',
    required: true,
    index: true
  },
  action: {
    type: String,
    enum: ['view', 'like', 'dislike', 'share', 'save', 'click', 'complete', 'comment'],
    required: true,
    index: true
  },
  duration: {
    type: Number,
    default: null,
    description: 'Time spent in seconds (for view actions)'
  },
  completionRate: {
    type: Number,
    default: null,
    min: 0,
    max: 1,
    description: 'Content completion percentage (0-1)'
  },
  metadata: {
    type: Object,
    default: {}
  },
  contextType: {
    type: String,
    enum: ['home', 'search', 'recommendation', 'profile', 'category', 'related', null],
    default: null,
    description: 'Context where the interaction happened'
  },
  contextId: {
    type: String,
    default: null,
    description: 'ID of the context (e.g., search query ID, recommendation batch ID)'
  },
  deviceInfo: {
    type: {
      deviceType: String,
      platform: String,
      browser: String
    },
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Create compound indexes for common queries
UserBehaviorSchema.index({ userId: 1, action: 1, timestamp: -1 });
UserBehaviorSchema.index({ contentId: 1, action: 1, timestamp: -1 });
UserBehaviorSchema.index({ userId: 1, contentId: 1, action: 1 });

// TTL index - delete records older than 180 days
UserBehaviorSchema.index({ timestamp: 1 }, { expireAfterSeconds: 15552000 });

module.exports = mongoose.model('UserBehavior', UserBehaviorSchema); 