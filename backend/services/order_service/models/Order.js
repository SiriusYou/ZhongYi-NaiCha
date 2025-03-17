const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: {
    userId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    }
  },
  items: [
    {
      recipe: {
        recipeId: {
          type: String,
          required: true
        },
        name: {
          type: String,
          required: true
        },
        slug: {
          type: String,
          required: true
        },
        imageUrl: String
      },
      customizations: {
        sweetness: {
          type: String,
          enum: ['no_sugar', 'less_sugar', 'half_sugar', 'normal_sugar', 'extra_sugar'],
          default: 'normal_sugar'
        },
        temperature: {
          type: String,
          enum: ['hot', 'warm', 'room_temperature', 'cold', 'iced'],
          default: 'hot'
        },
        size: {
          type: String,
          enum: ['small', 'medium', 'large'],
          default: 'medium'
        },
        additionalNotes: String
      },
      price: {
        type: Number,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        default: 1
      }
    }
  ],
  shop: {
    shopId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    phone: String
  },
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    default: 0
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'wechat_pay', 'alipay', 'cash'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: String,
    transactionTime: Date,
    gatewayResponse: Object
  },
  deliveryType: {
    type: String,
    enum: ['pickup', 'delivery'],
    required: true
  },
  deliveryAddress: {
    address: String,
    city: String,
    zipCode: String,
    notes: String
  },
  pickupTime: {
    type: Date
  },
  deliveryTime: {
    type: Date
  },
  orderStatus: {
    type: String,
    enum: ['created', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'],
    default: 'created'
  },
  statusHistory: [
    {
      status: {
        type: String,
        enum: ['created', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled']
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      note: String
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

// Update the updatedAt field before saving
OrderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Add status change to history if status changed
  const currentStatus = this.orderStatus;
  const lastStatusRecord = this.statusHistory && this.statusHistory.length > 0 
    ? this.statusHistory[this.statusHistory.length - 1] 
    : null;
    
  if (!lastStatusRecord || lastStatusRecord.status !== currentStatus) {
    this.statusHistory.push({
      status: currentStatus,
      timestamp: new Date(),
      note: `Order status changed to ${currentStatus}`
    });
  }
  
  next();
});

module.exports = mongoose.model('Order', OrderSchema); 