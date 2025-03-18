const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for tea consumption nested within health data
const TeaConsumptionSchema = new Schema({
  teaName: {
    type: String,
    required: true
  },
  cups: {
    type: Number,
    default: 1,
    min: 0
  },
  time: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
});

// Schema for health data entries
const HealthDataSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recordDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  weight: {
    type: Number,
    min: 0
  },
  sleepQuality: {
    type: Number,
    min: 1,
    max: 5
  },
  stressLevel: {
    type: Number,
    min: 1,
    max: 5
  },
  energyLevel: {
    type: Number,
    min: 1,
    max: 5
  },
  digestiveHealth: {
    type: Number,
    min: 1,
    max: 5
  },
  symptoms: [{
    type: String
  }],
  teaConsumption: [TeaConsumptionSchema],
  notes: {
    type: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  weather: {
    temperature: Number,
    humidity: Number,
    conditions: String
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

// Add compound index on user and date for efficient queries
HealthDataSchema.index({ user: 1, recordDate: -1 });

// Pre-save middleware to update timestamps
HealthDataSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

/**
 * Static method to get recent health data for a user
 * @param {ObjectId} userId - User ID
 * @param {Number} days - Number of days back to retrieve
 * @returns {Promise<Array>} - Array of health data entries
 */
HealthDataSchema.statics.getRecentData = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    user: userId,
    recordDate: { $gte: startDate }
  })
  .sort({ recordDate: -1 })
  .exec();
};

/**
 * Static method to get health data summary for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} - Health data summary object
 */
HealthDataSchema.statics.getSummary = async function(userId) {
  const recentData = await this.getRecentData(userId);
  
  if (!recentData || recentData.length === 0) {
    return null;
  }
  
  // Summarize metrics
  const metrics = ['sleepQuality', 'stressLevel', 'energyLevel', 'digestiveHealth'];
  const summary = {
    totalEntries: recentData.length,
    latestEntry: recentData[0],
    averages: {},
    symptoms: {},
    teaConsumption: {}
  };
  
  // Calculate metric averages
  metrics.forEach(metric => {
    const validEntries = recentData.filter(entry => entry[metric] !== undefined && entry[metric] !== null);
    if (validEntries.length > 0) {
      const sum = validEntries.reduce((acc, entry) => acc + entry[metric], 0);
      summary.averages[metric] = sum / validEntries.length;
    }
  });
  
  // Summarize symptoms
  recentData.forEach(entry => {
    if (entry.symptoms && entry.symptoms.length > 0) {
      entry.symptoms.forEach(symptom => {
        summary.symptoms[symptom] = (summary.symptoms[symptom] || 0) + 1;
      });
    }
  });
  
  // Summarize tea consumption
  recentData.forEach(entry => {
    if (entry.teaConsumption && entry.teaConsumption.length > 0) {
      entry.teaConsumption.forEach(tea => {
        const teaName = tea.teaName;
        summary.teaConsumption[teaName] = (summary.teaConsumption[teaName] || 0) + tea.cups;
      });
    }
  });
  
  return summary;
};

const HealthData = mongoose.model('HealthData', HealthDataSchema);

module.exports = HealthData; 