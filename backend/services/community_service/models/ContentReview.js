const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Content Review Schema
const ContentReviewSchema = new Schema({
  // The content type being reviewed (post, comment, discussion)
  contentType: {
    type: String,
    enum: ['post', 'comment', 'discussion'],
    required: true
  },
  
  // Reference to the content item
  contentId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  
  // Reference to the user who created the content
  contentAuthor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Current review status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged_for_review'],
    default: 'pending'
  },
  
  // Auto-moderation data from AI service
  autoModeration: {
    performed: {
      type: Boolean,
      default: false
    },
    score: {
      type: Number,
      min: 0,
      max: 1
    },
    categories: {
      harassment: { type: Number, min: 0, max: 1 },
      hate: { type: Number, min: 0, max: 1 },
      selfHarm: { type: Number, min: 0, max: 1 },
      sexual: { type: Number, min: 0, max: 1 },
      violence: { type: Number, min: 0, max: 1 },
      other: { type: Number, min: 0, max: 1 }
    },
    recommendation: {
      type: String,
      enum: ['approve', 'reject', 'flag_for_review'],
    },
    processingTime: Number
  },
  
  // Human moderator review data
  moderatorReview: {
    moderator: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    decision: {
      type: String,
      enum: ['approved', 'rejected']
    },
    reason: String,
    notes: String,
    reviewedAt: Date
  },
  
  // Further actions after review
  actions: {
    contentHidden: {
      type: Boolean,
      default: false
    },
    userWarned: {
      type: Boolean,
      default: false
    },
    warningMessage: String,
    appealable: {
      type: Boolean,
      default: true
    }
  },
  
  // Appeal information
  appeal: {
    appealed: {
      type: Boolean,
      default: false
    },
    appealDate: Date,
    appealReason: String,
    appealStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected']
    },
    appealResolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    appealResolvedAt: Date,
    appealNotes: String
  },
  
  // Reports submitted by users about this content
  reports: [
    {
      _id: false,
      reportId: {
        type: Schema.Types.ObjectId
      },
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: {
        type: String,
        required: true
      },
      details: String,
      date: {
        type: Date,
        default: Date.now
      }
    }
  ],
  
  // Metadata about the review process
  isAutoModerated: {
    type: Boolean,
    default: false
  },
  isManuallyReviewed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
ContentReviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for better performance
ContentReviewSchema.index({ contentType: 1, contentId: 1 }, { unique: true });
ContentReviewSchema.index({ status: 1 });
ContentReviewSchema.index({ priority: 1 });
ContentReviewSchema.index({ 'appeal.appealed': 1, 'appeal.appealStatus': 1 });

module.exports = mongoose.model('ContentReview', ContentReviewSchema); 