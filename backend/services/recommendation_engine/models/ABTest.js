const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * A/B Test Variant Schema
 * Individual variants for A/B tests
 */
const VariantSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  parameters: {
    type: Object,
    default: {}
  }
}, { _id: false });

/**
 * A/B Test Schema
 * For testing different recommendation algorithms and parameters
 */
const ABTestSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  variants: {
    type: [VariantSchema],
    validate: [
      {
        validator: function(variants) {
          return variants && variants.length >= 2;
        },
        message: 'A/B test must have at least 2 variants'
      },
      {
        validator: function(variants) {
          // Check for duplicate variant names
          const names = variants.map(v => v.name);
          return new Set(names).size === names.length;
        },
        message: 'Variant names must be unique within a test'
      }
    ]
  },
  targetUserPercentage: {
    type: Number,
    default: 100,
    min: 1,
    max: 100,
    description: 'Percentage of users to include in test (1-100)'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: function() {
      // Default to 30 days after start date
      const date = new Date(this.startDate);
      date.setDate(date.getDate() + 30);
      return date;
    },
    validate: {
      validator: function(endDate) {
        return endDate > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  segmentationFilters: {
    type: Object,
    default: {},
    description: 'Optional filters to segment users for the test'
  },
  goals: {
    type: [{
      type: String,
      enum: ['click_through_rate', 'engagement', 'conversion', 'retention', 'time_spent', 'custom'],
      required: true
    }],
    default: ['click_through_rate', 'engagement'],
    description: 'Metrics to optimize for in this test'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
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

// Update the updatedAt timestamp before saving
ABTestSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if test is currently running
ABTestSchema.methods.isRunning = function() {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
};

// Method to get the variant for a specific user
ABTestSchema.methods.getVariantForUser = function(userId) {
  if (!this.isRunning()) {
    return null;
  }
  
  // Simple deterministic variant assignment based on userId hash
  const hash = this._hashString(userId);
  
  // First check if user is in the target percentage
  if (this.targetUserPercentage < 100) {
    const inTest = (hash % 100) < this.targetUserPercentage;
    if (!inTest) {
      return null;
    }
  }
  
  // Assign to a variant
  const variantIndex = hash % this.variants.length;
  return this.variants[variantIndex];
};

// Helper method to hash a string (userId) deterministically
ABTestSchema.methods._hashString = function(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Static method to find active test for a given test type
ABTestSchema.statics.findActiveTest = async function(testType) {
  const now = new Date();
  return this.findOne({
    'variants.name': { $in: [testType] },
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now }
  });
};

module.exports = mongoose.model('ABTest', ABTestSchema); 