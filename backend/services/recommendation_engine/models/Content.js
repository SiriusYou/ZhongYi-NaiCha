const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for ingredients used in recipes
const IngredientSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: String,
    required: true
  },
  unit: {
    type: String,
    required: true
  }
});

// Schema for TCM properties of content
const TCMPropertiesSchema = new Schema({
  taste: {
    type: [String],
    enum: ['甘', '苦', '辛', '酸', '咸', '淡'],
    default: []
  },
  nature: {
    type: [String],
    enum: ['寒', '凉', '平', '温', '热'],
    default: []
  },
  meridians: {
    type: [String],
    default: []
  },
  effects: {
    type: [String],
    default: []
  },
  contraindications: {
    type: [String],
    default: []
  }
});

// Schema for recipe-specific properties
const RecipePropertiesSchema = new Schema({
  preparationTime: {
    type: Number,
    min: 0
  },
  cookingTime: {
    type: Number,
    min: 0
  },
  servings: {
    type: Number,
    min: 1
  },
  ingredients: {
    type: [IngredientSchema],
    default: []
  }
});

/**
 * Content Schema
 * Represents all types of content that can be recommended
 */
const ContentSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  contentType: {
    type: String,
    required: true,
    enum: ['article', 'recipe', 'video', 'podcast', 'infographic'],
    index: true
  },
  body: {
    type: String,
    required: true
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  authorName: {
    type: String,
    required: true
  },
  coverImage: {
    type: String
  },
  mediaUrls: {
    type: [String],
    default: []
  },
  tags: {
    type: [String],
    default: [],
    index: true
  },
  categories: {
    type: [String],
    default: [],
    index: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate',
    index: true
  },
  // Content vector for similarity-based recommendations
  contentVector: {
    type: [Number],
    default: [],
    validate: {
      validator: function(v) {
        // Validate that vector dimensions are consistent if vector exists
        return v.length === 0 || v.length === 50; // Assuming 50-dimensional vectors
      },
      message: 'Content vector must have exactly 50 dimensions'
    }
  },
  // TCM-specific properties
  tcmProperties: {
    type: TCMPropertiesSchema,
    default: () => ({})
  },
  // Recipe-specific properties
  recipeProperties: {
    type: RecipePropertiesSchema,
    default: () => ({})
  },
  // Content engagement metrics
  viewCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  commentCount: {
    type: Number,
    default: 0
  },
  avgRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  // Content status
  status: {
    type: String,
    enum: ['draft', 'review', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  // Seasonal relevance
  seasonalRelevance: {
    type: [String],
    enum: ['spring', 'summer', 'autumn', 'winter', 'all'],
    default: ['all'],
    index: true
  },
  // Timestamps
  publishedAt: {
    type: Date,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound indexes for efficient queries
ContentSchema.index({ isActive: 1, status: 1, publishedAt: -1 });
ContentSchema.index({ isActive: 1, isFeatured: 1, publishedAt: -1 });
ContentSchema.index({ contentType: 1, categories: 1, tags: 1 });
ContentSchema.index({ 'tcmProperties.meridians': 1, 'tcmProperties.effects': 1 });
ContentSchema.index({ 'tcmProperties.taste': 1, 'tcmProperties.nature': 1 });

// Virtual for content age in days
ContentSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const published = this.publishedAt || this.createdAt;
  const diffTime = Math.abs(now - published);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Middleware to update timestamps
ContentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to update engagement metrics
ContentSchema.methods.updateEngagement = function(metrics) {
  if (metrics.views) this.viewCount += metrics.views;
  if (metrics.likes) this.likeCount += metrics.likes;
  if (metrics.shares) this.shareCount += metrics.shares;
  if (metrics.comments) this.commentCount += metrics.comments;
  
  return this.save();
};

// Static method to find trending content
ContentSchema.statics.findTrending = function(limit = 10) {
  return this.find({ 
    isActive: true, 
    status: 'published' 
  })
  .sort({ 
    viewCount: -1, 
    likeCount: -1, 
    shareCount: -1, 
    publishedAt: -1 
  })
  .limit(limit);
};

// Static method to find content by TCM properties
ContentSchema.statics.findByTCMProperties = function(properties, limit = 10) {
  const query = { isActive: true, status: 'published' };
  
  if (properties.taste && properties.taste.length > 0) {
    query['tcmProperties.taste'] = { $in: properties.taste };
  }
  
  if (properties.nature && properties.nature.length > 0) {
    query['tcmProperties.nature'] = { $in: properties.nature };
  }
  
  if (properties.meridians && properties.meridians.length > 0) {
    query['tcmProperties.meridians'] = { $in: properties.meridians };
  }
  
  if (properties.effects && properties.effects.length > 0) {
    query['tcmProperties.effects'] = { $in: properties.effects };
  }
  
  return this.find(query).limit(limit);
};

// Convert to plain JSON when sending to client
ContentSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    // Remove contentVector from client response for efficiency
    delete ret.contentVector;
    return ret;
  }
});

const Content = mongoose.model('Content', ContentSchema);

module.exports = Content; 