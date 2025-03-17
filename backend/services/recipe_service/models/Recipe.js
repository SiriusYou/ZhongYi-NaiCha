const mongoose = require('mongoose');

const RecipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  ingredients: [{
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: true
    },
    amount: {
      type: String,
      required: true
    },
    isOptional: {
      type: Boolean,
      default: false
    }
  }],
  steps: [{
    step: {
      type: String,
      required: true
    },
    imageUrl: String,
    videoUrl: String
  }],
  preparationTime: {
    type: Number, // in minutes
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  imageUrl: {
    type: String,
    default: null
  },
  videoUrl: {
    type: String,
    default: null
  },
  nutritionalInfo: {
    calories: Number,
    sugar: Number,
    caffeine: Number,
    additionalInfo: String
  },
  healthBenefits: [{
    type: String,
    required: true
  }],
  contraindications: [{
    type: String
  }],
  suitableConstitutions: [{
    type: String,
    enum: [
      'balanced', // 平和质
      'qi_deficiency', // 气虚质
      'yang_deficiency', // 阳虚质
      'yin_deficiency', // 阴虚质
      'phlegm_dampness', // 痰湿质
      'damp_heat', // 湿热质
      'blood_stasis', // 血瘀质
      'qi_stagnation', // 气郁质
      'special_constitution' // 特禀质
    ]
  }],
  suitableSeasons: [{
    type: String,
    enum: ['spring', 'summer', 'autumn', 'winter', 'all']
  }],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: String,
    default: '中医奶茶团队'
  },
  isActive: {
    type: Boolean,
    default: true
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
RecipeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create text index for search functionality
RecipeSchema.index({ 
  name: 'text', 
  description: 'text', 
  healthBenefits: 'text',
  tags: 'text'
});

module.exports = mongoose.model('Recipe', RecipeSchema); 