const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Shop Schema
const ShopSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    unique: true
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'China'
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      index: '2dsphere'
    }
  },
  contactInfo: {
    phone: {
      type: String,
      required: true
    },
    email: {
      type: String
    },
    website: {
      type: String
    },
    wechat: {
      type: String
    }
  },
  businessHours: [
    {
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
      },
      open: {
        type: String, // Format: "HH:MM" in 24h
        required: true
      },
      close: {
        type: String, // Format: "HH:MM" in 24h
        required: true
      },
      isClosed: {
        type: Boolean,
        default: false
      }
    }
  ],
  images: {
    logo: {
      type: String
    },
    storefront: [String],
    interior: [String]
  },
  services: {
    hasDelivery: {
      type: Boolean,
      default: true
    },
    hasPickup: {
      type: Boolean,
      default: true
    },
    deliveryFee: {
      type: Number,
      default: 0
    },
    minimumOrderAmount: {
      type: Number,
      default: 0
    },
    deliveryRadius: {
      type: Number, // in kilometers
      default: 5
    },
    estimatedDeliveryTime: {
      type: Number, // in minutes
      default: 30
    }
  },
  menu: {
    availableRecipes: [
      {
        recipeId: {
          type: Schema.Types.ObjectId,
          ref: 'Recipe',
          required: true
        },
        price: {
          type: Number,
          required: true,
          min: 0
        },
        isAvailable: {
          type: Boolean,
          default: true
        },
        specialInstructions: {
          type: String
        }
      }
    ]
  },
  paymentMethods: {
    acceptsCash: {
      type: Boolean,
      default: true
    },
    acceptsOnlinePayment: {
      type: Boolean,
      default: true
    },
    acceptsWechatPay: {
      type: Boolean,
      default: true
    },
    acceptsAlipay: {
      type: Boolean,
      default: true
    }
  },
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
  status: {
    type: String,
    enum: ['active', 'temporarily_closed', 'permanently_closed'],
    default: 'active'
  },
  managedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featuredPosition: {
    type: Number,
    default: 0
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

// Create text index for search
ShopSchema.index(
  { 
    name: 'text',
    description: 'text',
    'address.city': 'text',
    'address.state': 'text'
  },
  {
    weights: {
      name: 10,
      description: 5,
      'address.city': 3,
      'address.state': 1
    }
  }
);

// Generate slug from name
ShopSchema.pre('save', function(next) {
  // Only generate slug if it doesn't exist or name has changed
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
  
  // Update the updatedAt field
  this.updatedAt = Date.now();
  
  next();
});

module.exports = mongoose.model('Shop', ShopSchema); 