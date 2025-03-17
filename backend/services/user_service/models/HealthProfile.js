const mongoose = require('mongoose');

const HealthProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Basic information
  age: {
    type: Number,
    min: 0,
    max: 120
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  height: {
    type: Number,
    min: 0,
    max: 250 // height in cm
  },
  weight: {
    type: Number,
    min: 0,
    max: 500 // weight in kg
  },
  // TCM specific information
  tcmConstitution: {
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
  },
  // Health goals
  healthGoals: [{
    type: String,
    enum: [
      'improve_sleep',
      'boost_energy',
      'strengthen_immunity',
      'weight_management',
      'stress_reduction',
      'digestive_health',
      'skin_improvement',
      'hormonal_balance',
      'other'
    ]
  }],
  // Allergies and contraindications
  allergies: [{
    type: String
  }],
  contraindications: [{
    type: String
  }],
  // Health history
  chronicConditions: [{
    type: String
  }],
  // Current symptoms
  currentSymptoms: [{
    symptom: String,
    severity: {
      type: Number,
      min: 1,
      max: 10
    },
    startedAt: Date
  }],
  // Tracking of historical data
  dataHistory: [{
    weight: Number,
    symptoms: [{
      symptom: String,
      severity: Number
    }],
    date: {
      type: Date,
      default: Date.now
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Virtual for BMI calculation
HealthProfileSchema.virtual('bmi').get(function() {
  if (this.height && this.weight) {
    const heightInMeters = this.height / 100;
    return (this.weight / (heightInMeters * heightInMeters)).toFixed(2);
  }
  return null;
});

// Pre-save middleware to update lastUpdated timestamp
HealthProfileSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('HealthProfile', HealthProfileSchema); 