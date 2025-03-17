const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Expert Schema
const ExpertSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  specialization: {
    type: String,
    required: true,
    enum: [
      'traditional_chinese_medicine',
      'herbalist',
      'acupuncturist',
      'nutritionist',
      'tea_master',
      'wellness_coach',
      'other'
    ]
  },
  qualifications: [
    {
      degree: {
        type: String,
        required: true
      },
      institution: {
        type: String,
        required: true
      },
      year: {
        type: Number,
        required: true
      },
      certificateUrl: {
        type: String
      }
    }
  ],
  experience: {
    type: Number, // Years of experience
    required: true,
    min: 0
  },
  bio: {
    type: String,
    required: true
  },
  profileImage: {
    type: String
  },
  contactInfo: {
    email: {
      type: String
    },
    phone: {
      type: String
    },
    website: {
      type: String
    },
    wechat: {
      type: String
    }
  },
  availability: {
    isAvailableForQuestions: {
      type: Boolean,
      default: true
    },
    schedule: [
      {
        day: {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        },
        startTime: {
          type: String // Format: "HH:MM" in 24h
        },
        endTime: {
          type: String // Format: "HH:MM" in 24h
        }
      }
    ]
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
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationNotes: {
    type: String
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationDate: {
    type: Date
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

// Update the updatedAt field before saving
ExpertSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Expert', ExpertSchema); 