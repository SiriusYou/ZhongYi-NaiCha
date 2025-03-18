const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Question Schema
 * Represents a single question in a quiz
 */
const QuestionSchema = new Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  // Question type (multiple choice, true/false, etc.)
  type: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'select_all', 'matching', 'short_answer'],
    default: 'multiple_choice'
  },
  // Options for multiple choice questions
  options: [{
    text: {
      type: String,
      required: true,
      trim: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    // Tags that are relevant when this option is selected (for personalization)
    tags: [{
      type: String,
      trim: true
    }],
    // Explanation shown when this option is selected
    explanation: {
      type: String,
      trim: true
    },
    // TCM-related tags for this option
    tcmTags: [{
      type: String,
      trim: true
    }]
  }],
  // Difficulty level of the question
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  // Points awarded for correct answer
  points: {
    type: Number,
    default: 1,
    min: 0
  },
  // Additional explanation shown after answering the question
  explanation: {
    type: String
  },
  // Media attached to the question
  media: {
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'none'],
      default: 'none'
    },
    url: String
  }
});

/**
 * Result Category Schema
 * Defines possible outcomes/categories for quiz results
 */
const ResultCategorySchema = new Schema({
  // Title of the result category
  title: {
    type: String,
    required: true,
    trim: true
  },
  // Description of what this result means
  description: {
    type: String,
    required: true
  },
  // Score range that falls into this category
  scoreRange: {
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      required: true
    }
  },
  // Recommended content for users who get this result
  recommendedContent: [{
    type: Schema.Types.ObjectId,
    ref: 'Content'
  }],
  // TCM-related tags for this result category
  tcmTags: [{
    type: String,
    trim: true
  }],
  // Health recommendations for this result
  healthRecommendations: {
    type: String
  },
  // Image shown with this result
  imageUrl: {
    type: String
  }
});

/**
 * Interactive Quiz Schema
 * Represents a personalized quiz that can be recommended to users
 */
const InteractiveQuizSchema = new Schema({
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
  // Type of quiz
  quizType: {
    type: String,
    enum: ['health_assessment', 'knowledge_test', 'personality', 'preference', 'educational'],
    default: 'educational'
  },
  // Theme or category of the quiz
  category: {
    type: String,
    required: true,
    index: true
  },
  // Cover image for the quiz
  coverImage: {
    type: String
  },
  // Questions in the quiz
  questions: [QuestionSchema],
  // Result categories for the quiz
  resultCategories: [ResultCategorySchema],
  // Tags for recommendation
  tags: [{
    type: String,
    trim: true,
    index: true
  }],
  // TCM-specific properties
  tcmProperties: {
    // Meridians associated with this quiz
    meridians: [{
      type: String,
      trim: true
    }],
    // Effects or benefits
    effects: [{
      type: String,
      trim: true
    }],
    // Constitution types this quiz is relevant for
    constitutionTypes: [{
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
    }]
  },
  // Quiz settings
  settings: {
    // Whether to randomize question order
    randomizeQuestions: {
      type: Boolean,
      default: false
    },
    // Whether to show results immediately after each question
    immediateResults: {
      type: Boolean,
      default: false
    },
    // Time limit in seconds (0 for no limit)
    timeLimit: {
      type: Number,
      default: 0,
      min: 0
    },
    // Required score to pass (percentage)
    passingScore: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    }
  },
  // Difficulty level of the quiz
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate',
    index: true
  },
  // Estimated time to complete (in minutes)
  estimatedTime: {
    type: Number,
    min: 1,
    default: 5
  },
  // Quiz status
  status: {
    type: String,
    enum: ['draft', 'review', 'published', 'archived'],
    default: 'draft',
    index: true
  },
  // Whether this quiz is currently active
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  // Quiz metrics
  metrics: {
    completions: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    averageTimeToComplete: {
      type: Number,
      default: 0
    }
  },
  // Personalization fields
  personalization: {
    // Whether this quiz adapts based on user profile
    adaptToUserProfile: {
      type: Boolean,
      default: false
    },
    // Health conditions this quiz is relevant for
    relevantHealthConditions: [{
      type: String,
      trim: true
    }],
    // Seasons when this quiz is most relevant
    seasonalRelevance: [{
      type: String,
      enum: ['spring', 'summer', 'autumn', 'winter', 'all'],
      default: ['all']
    }]
  },
  // Author information
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  authorName: {
    type: String,
    required: true
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
InteractiveQuizSchema.index({ 
  isActive: 1, 
  status: 1, 
  quizType: 1, 
  difficulty: 1 
});

InteractiveQuizSchema.index({ 
  'tcmProperties.constitutionTypes': 1, 
  'personalization.seasonalRelevance': 1 
});

// Pre-save middleware to update timestamps
InteractiveQuizSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find popular quizzes
InteractiveQuizSchema.statics.findPopular = function(limit = 10) {
  return this.find({ 
    isActive: true, 
    status: 'published' 
  })
  .sort({ 
    'metrics.completions': -1 
  })
  .limit(limit);
};

// Static method to find quizzes by health profile
InteractiveQuizSchema.statics.findByHealthProfile = function(profile, limit = 10) {
  const query = { 
    isActive: true, 
    status: 'published' 
  };
  
  // Add constitution type if available
  if (profile.constitution) {
    query['tcmProperties.constitutionTypes'] = profile.constitution;
  }
  
  // Add relevant health conditions if available
  if (profile.healthConditions && profile.healthConditions.length > 0) {
    query['personalization.relevantHealthConditions'] = { 
      $in: profile.healthConditions 
    };
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
  
  return this.find(query).limit(limit);
};

const InteractiveQuiz = mongoose.model('InteractiveQuiz', InteractiveQuizSchema);

module.exports = InteractiveQuiz; 