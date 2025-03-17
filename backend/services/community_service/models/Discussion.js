const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Discussion Schema
const DiscussionSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'tcm_theory', 'herbal_remedies', 'seasonal_wellness', 'tea_culture', 'health_concerns'],
    default: 'general'
  },
  tags: [
    {
      type: String,
      trim: true
    }
  ],
  participants: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  messages: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      content: {
        type: String,
        required: true
      },
      images: [
        {
          url: {
            type: String,
            required: true
          }
        }
      ],
      isExpertResponse: {
        type: Boolean,
        default: false
      },
      likes: [
        {
          user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
          }
        }
      ],
      createdAt: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date,
        default: Date.now
      },
      isEdited: {
        type: Boolean,
        default: false
      }
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  allowedUsers: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  isPinned: {
    type: Boolean,
    default: false
  },
  lastActivity: {
    type: Date,
    default: Date.now
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

// Create text index for search
DiscussionSchema.index(
  { 
    title: 'text',
    description: 'text',
    tags: 'text',
    'messages.content': 'text'
  },
  {
    weights: {
      title: 10,
      description: 5,
      tags: 3,
      'messages.content': 1
    }
  }
);

// Update the updatedAt and lastActivity fields before saving
DiscussionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // If messages were modified, update lastActivity
  if (this.isModified('messages')) {
    this.lastActivity = Date.now();
  }
  
  next();
});

module.exports = mongoose.model('Discussion', DiscussionSchema); 