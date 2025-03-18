const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Step Schema
 * Represents a single step in a guided tutorial
 */
const StepSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  // Order of the step in the tutorial
  order: {
    type: Number,
    required: true,
    min: 1
  },
  // Duration of this step in minutes
  duration: {
    type: Number,
    min: 0,
    default: 5
  },
  // Media for this step
  media: {
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'none'],
      default: 'image'
    },
    url: String,
    thumbnailUrl: String,
    altText: String
  },
  // Additional tips for this step
  tips: [{
    text: String,
    important: Boolean
  }],
  // Interactive elements for this step
  interactive: {
    // Type of interaction required
    type: {
      type: String,
      enum: ['checkbox', 'timer', 'input', 'tap', 'none'],
      default: 'none'
    },
    // Prompt text for the interaction
    prompt: String,
    // For timer-type interactions
    timerDuration: Number,
    // For checkbox/input interactions
    validationRequired: {
      type: Boolean,
      default: false
    }
  },
  // Resources relevant to this step
  resources: [{
    title: String,
    description: String,
    url: String,
    type: {
      type: String,
      enum: ['article', 'video', 'external', 'content'],
      default: 'article'
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content'
    }
  }]
});

/**
 * Variation Schema
 * Represents a variation of the tutorial for different user profiles
 */
const VariationSchema = new Schema({
  // Name of this variation
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Description of this variation
  description: {
    type: String
  },
  // For which constitution types this variation is suitable
  suitableConstitutions: [{
    type: String,
    enum: [
      'balanced',
      'qi_deficiency',
      'yang_deficiency',
      'yin_deficiency',
      'phlegm_dampness',
      'damp_heat',
      'blood_stasis',
      'qi_stagnation',
      'special_constitution'
    ]
  }],
  // Health conditions this variation is designed for
  targetedConditions: [{
    type: String,
    trim: true
  }],
  // Modified steps for this variation
  // Only include steps that differ from the main tutorial
  modifiedSteps: [{
    stepOrder: {
      type: Number,
      required: true,
      min: 1
    },
    // Overrides for this step
    overrides: {
      title: String,
      description: String,
      duration: Number,
      media: {
        type: { type: String, enum: ['image', 'video', 'audio', 'none'] },
        url: String,
        thumbnailUrl: String,
        altText: String
      },
      tips: [{
        text: String,
        important: Boolean
      }]
    }
  }],
  // Any additional steps exclusive to this variation
  additionalSteps: [StepSchema]
});

/**
 * Material Schema
 * Represents materials needed for the tutorial
 */
const MaterialSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  // Optional link to a product
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product'
  },
  // Quantity needed
  quantity: {
    type: String
  },
  // Whether this material is optional
  isOptional: {
    type: Boolean,
    default: false
  },
  // Alternative materials that can be used instead
  alternatives: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    }
  }]
});

/**
 * Outcome Schema
 * Represents expected outcomes from completing the tutorial
 */
const OutcomeSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  // TCM-related benefits
  tcmBenefits: [{
    type: String,
    trim: true
  }],
  // Time frame for seeing results
  timeFrame: {
    type: String,
    enum: ['immediate', 'short_term', 'long_term'],
    default: 'short_term'
  }
});

/**
 * Guided Tutorial Schema
 * Represents an interactive, step-by-step guide that can be personalized
 */
const GuidedTutorialSchema = new Schema({
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
  // Type of tutorial
  tutorialType: {
    type: String,
    enum: [
      'health_practice',   // Health practices like breathing exercises
      'preparation',       // Preparation guides for herbal teas, etc.
      'therapeutic',       // Therapeutic techniques like acupressure
      'lifestyle',         // Lifestyle guidance
      'exercise',          // Physical exercises
      'meditation',        // Meditation guides
      'educational'        // Educational walkthroughs
    ],
    required: true,
    index: true
  },
  // Category or theme
  category: {
    type: String,
    required: true,
    index: true
  },
  // Cover image
  coverImage: {
    type: String
  },
  // Introduction video URL
  introVideo: {
    type: String
  },
  // Tutorial steps
  steps: [StepSchema],
  // Alternative variations of the tutorial for different user profiles
  variations: [VariationSchema],
  // Materials or ingredients needed
  materials: [MaterialSchema],
  // Expected outcomes/benefits
  outcomes: [OutcomeSchema],
  // Difficulty level
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate',
    index: true
  },
  // Estimated completion time in minutes
  estimatedTime: {
    type: Number,
    min: 1,
    default: 15
  },
  // Tags for recommendation
  tags: [{
    type: String,
    trim: true,
    index: true
  }],
  // TCM-specific properties
  tcmProperties: {
    // Meridians addressed by this tutorial
    meridians: [{
      type: String,
      trim: true
    }],
    // Effects or benefits
    effects: [{
      type: String,
      trim: true
    }],
    // Nature of the practice (e.g., warming, cooling)
    nature: {
      type: String,
      enum: ['warming', 'cooling', 'neutral', 'balanced'],
      default: 'neutral'
    }
  },
  // Status of the tutorial
  status: {
    type: String,
    enum: ['draft', 'review', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  // Whether this tutorial is currently active
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  // Prerequisites for this tutorial
  prerequisites: [{
    tutorialId: {
      type: Schema.Types.ObjectId,
      ref: 'GuidedTutorial'
    },
    title: String,
    description: String,
    isRequired: {
      type: Boolean,
      default: false
    }
  }],
  // Tutorial metrics
  metrics: {
    completions: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    averageTimeToComplete: {
      type: Number,
      default: 0
    },
    engagementRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  // Personalization fields
  personalization: {
    // Whether this tutorial adapts based on user profile
    adaptToUserProfile: {
      type: Boolean,
      default: false
    },
    // Conditions this tutorial is particularly helpful for
    helpfulForConditions: [{
      type: String,
      trim: true
    }],
    // Conditions for which this tutorial should be avoided
    contraindicatedForConditions: [{
      type: String,
      trim: true
    }],
    // Seasons when this tutorial is most relevant
    seasonalRelevance: [{
      type: String,
      enum: ['spring', 'summer', 'autumn', 'winter', 'all'],
      default: ['all']
    }],
    // Times of day when this tutorial is most beneficial
    timeOfDayRelevance: [{
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night', 'anytime'],
      default: ['anytime']
    }]
  },
  // Related content
  relatedContent: [{
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content'
    },
    relationship: {
      type: String,
      enum: ['prerequisite', 'follow_up', 'complementary', 'alternative'],
      default: 'complementary'
    }
  }],
  // Author information
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  authorName: {
    type: String,
    required: true
  },
  // Expert review
  expertReview: {
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewerName: String,
    reviewDate: Date,
    approved: Boolean,
    comments: String
  },
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  publishedAt: {
    type: Date
  }
}, { timestamps: true });

// Create indexes for efficient querying
GuidedTutorialSchema.index({ 
  isActive: 1, 
  status: 1, 
  tutorialType: 1, 
  difficulty: 1 
});

GuidedTutorialSchema.index({ 
  'tcmProperties.meridians': 1, 
  'tcmProperties.effects': 1, 
  'tcmProperties.nature': 1 
});

GuidedTutorialSchema.index({ 
  'personalization.seasonalRelevance': 1, 
  'personalization.timeOfDayRelevance': 1 
});

// Pre-save middleware to update timestamps
GuidedTutorialSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find popular tutorials
GuidedTutorialSchema.statics.findPopular = function(limit = 10) {
  return this.find({ 
    isActive: true, 
    status: 'published' 
  })
  .sort({ 
    'metrics.completions': -1, 
    'metrics.averageRating': -1 
  })
  .limit(limit);
};

// Static method to find tutorials by health profile
GuidedTutorialSchema.statics.findByHealthProfile = function(profile, limit = 10) {
  const query = { 
    isActive: true, 
    status: 'published',
    // Exclude tutorials contraindicated for the user's conditions
    'personalization.contraindicatedForConditions': { 
      $nin: profile.healthConditions || [] 
    }
  };
  
  // If user has health conditions, find tutorials helpful for those conditions
  if (profile.healthConditions && profile.healthConditions.length > 0) {
    query['personalization.helpfulForConditions'] = { 
      $in: profile.healthConditions 
    };
  }
  
  // Match constitution type if available
  if (profile.constitution) {
    query.$or = [
      { 'variations.suitableConstitutions': profile.constitution },
      { 'tcmProperties.nature': this._getPreferredNatureForConstitution(profile.constitution) }
    ];
  }
  
  // Add seasonal relevance based on current season
  const now = new Date();
  const month = now.getMonth() + 1;
  let currentSeason = 'all';
  
  if (month >= 3 && month <= 5) currentSeason = 'spring';
  else if (month >= 6 && month <= 8) currentSeason = 'summer';
  else if (month >= 9 && month <= 11) currentSeason = 'autumn';
  else currentSeason = 'winter';
  
  query['personalization.seasonalRelevance'] = { 
    $in: [currentSeason, 'all'] 
  };
  
  // Add time of day relevance based on current time
  const hour = now.getHours();
  let timeOfDay = 'anytime';
  
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';
  
  query['personalization.timeOfDayRelevance'] = { 
    $in: [timeOfDay, 'anytime'] 
  };
  
  return this.find(query)
    .sort({ 'metrics.averageRating': -1 })
    .limit(limit);
};

// Helper method to determine preferred nature based on constitution
GuidedTutorialSchema.statics._getPreferredNatureForConstitution = function(constitution) {
  const natureMapping = {
    'yang_deficiency': 'warming',
    'yin_deficiency': 'cooling',
    'qi_deficiency': 'neutral',
    'blood_stasis': 'warming',
    'phlegm_dampness': 'warming',
    'damp_heat': 'cooling',
    'qi_stagnation': 'balanced',
    'balanced': 'neutral',
    'special_constitution': 'neutral'
  };
  
  return natureMapping[constitution] || 'neutral';
};

const GuidedTutorial = mongoose.model('GuidedTutorial', GuidedTutorialSchema);

module.exports = GuidedTutorial; 