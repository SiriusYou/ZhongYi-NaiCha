const mongoose = require('mongoose');

const ConsumptionStatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    period: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      index: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    totalItems: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    recipes: [{
      recipeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe',
        required: true
      },
      name: {
        type: String,
        required: true
      },
      count: {
        type: Number,
        required: true,
        default: 1
      },
      totalAmount: {
        type: Number,
        required: true,
        default: 0
      }
    }],
    ingredients: [{
      name: {
        type: String,
        required: true
      },
      count: {
        type: Number,
        required: true,
        default: 1
      }
    }],
    tcmProperties: {
      nature: {
        type: Map,
        of: Number,
        default: {}
      },
      taste: {
        type: Map,
        of: Number,
        default: {}
      },
      functions: {
        type: Map,
        of: Number,
        default: {}
      }
    },
    metadata: {
      lastUpdated: {
        type: Date,
        default: Date.now
      },
      orderIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      }]
    }
  },
  { timestamps: true }
);

// Create compound indexes for efficient querying
ConsumptionStatSchema.index({ userId: 1, period: 1, date: -1 });
ConsumptionStatSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('ConsumptionStat', ConsumptionStatSchema); 