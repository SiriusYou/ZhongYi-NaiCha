const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Post Schema
const PostSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
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
      },
      caption: {
        type: String
      }
    }
  ],
  tags: [
    {
      type: String,
      trim: true
    }
  ],
  category: {
    type: String,
    enum: ['general', 'question', 'recipe_sharing', 'experience', 'news'],
    default: 'general'
  },
  relatedRecipes: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Recipe'
    }
  ],
  relatedHerbs: [
    {
      type: String,
      trim: true
    }
  ],
  likes: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      date: {
        type: Date,
        default: Date.now
      }
    }
  ],
  commentsCount: {
    type: Number,
    default: 0
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  isExpertVerified: {
    type: Boolean,
    default: false
  },
  expertVerification: {
    expert: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    comment: {
      type: String
    },
    date: {
      type: Date
    }
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isReported: {
    type: Boolean,
    default: false
  },
  reports: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: {
        type: String,
        required: true
      },
      date: {
        type: Date,
        default: Date.now
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
  }
});

// Create text index for search
PostSchema.index(
  { 
    title: 'text',
    content: 'text',
    tags: 'text'
  },
  {
    weights: {
      title: 10,
      content: 5,
      tags: 3
    }
  }
);

// Update the updatedAt field before saving
PostSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Post', PostSchema); 