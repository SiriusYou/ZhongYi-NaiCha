const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'CNY'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'wechat_pay', 'alipay', 'cash'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  gateway: {
    type: String,
    required: true,
    enum: ['wechat', 'alipay', 'stripe', 'manual']
  },
  gatewayTransactionId: {
    type: String,
    sparse: true
  },
  gatewayResponse: {
    type: Object
  },
  refundInfo: {
    amount: {
      type: Number
    },
    reason: {
      type: String
    },
    refundedAt: {
      type: Date
    },
    gatewayRefundId: {
      type: String
    }
  },
  paymentUrl: {
    type: String
  },
  paymentQrCode: {
    type: String
  },
  notes: {
    type: String
  },
  statusHistory: [
    {
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded']
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      details: String
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

// Create indexes
PaymentSchema.index({ order: 1 });
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ gatewayTransactionId: 1 });

// Update the updatedAt field and maintain status history
PaymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Add status change to history if status changed
  const currentStatus = this.status;
  const lastStatusRecord = this.statusHistory && this.statusHistory.length > 0 
    ? this.statusHistory[this.statusHistory.length - 1] 
    : null;
    
  if (!lastStatusRecord || lastStatusRecord.status !== currentStatus) {
    this.statusHistory.push({
      status: currentStatus,
      timestamp: new Date(),
      details: `Payment status changed to ${currentStatus}`
    });
  }
  
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema); 