const mongoose = require('mongoose');

const HerbSchema = new mongoose.Schema({
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
  latinName: {
    type: String,
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
    }],
    meridianAffinity: [{
      type: String,
      enum: [
        '肺经', '大肠经', '胃经', '脾经', '心经', '小肠经', 
        '膀胱经', '肾经', '心包经', '三焦经', '胆经', '肝经'
      ]
    }]
  },
  functions: [{
    type: String,
    required: true
  }],
  indications: [{
    type: String,
    required: true
  }],
  contraindications: [{
    type: String
  }],
  dosage: {
    type: String
  },
  preparation: {
    type: String
  },
  imageUrl: {
    type: String,
    default: null
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  relatedHerbs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Herb'
  }],
  commonCombinations: [{
    herbs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Herb'
    }],
    purpose: String
  }],
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
HerbSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create text index for search functionality
HerbSchema.index({ 
  name: 'text', 
  chineseName: 'text', 
  latinName: 'text',
  description: 'text',
  functions: 'text',
  indications: 'text'
});

module.exports = mongoose.model('Herb', HerbSchema); 