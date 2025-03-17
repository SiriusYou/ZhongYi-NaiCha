const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  chineseName: {
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
  imageUrl: {
    type: String,
    default: null
  },
  properties: {
    nature: {
      type: String,
      enum: ['寒', '凉', '平', '温', '热'],
      required: true
    },
    taste: [{
      type: String,
      enum: ['酸', '苦', '甘', '辛', '咸', '淡'],
      required: true
    }]
  },
  healthBenefits: [{
    type: String,
    required: true
  }],
  commonUses: [{
    type: String
  }],
  contraindications: [{
    type: String
  }],
  substitutes: [{
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient'
    },
    notes: String
  }],
  nutritionalInfo: {
    calories: Number,
    protein: Number,
    fat: Number,
    carbohydrates: Number,
    additionalInfo: String
  },
  isCommon: {
    type: Boolean,
    default: false
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
IngredientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create text index for search functionality
IngredientSchema.index({ 
  name: 'text', 
  chineseName: 'text', 
  description: 'text',
  healthBenefits: 'text'
});

module.exports = mongoose.model('Ingredient', IngredientSchema); 