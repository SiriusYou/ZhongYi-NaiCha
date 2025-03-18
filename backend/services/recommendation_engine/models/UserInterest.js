const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * User Interest Schema
 * Tracks user interest in specific topics/tags for recommendation
 */
const UserInterestSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tag: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  interactionCount: {
    type: Number,
    default: 1,
    min: 0
  },
  explicitlySelected: {
    type: Boolean,
    default: false,
    description: 'Whether the user explicitly selected this interest'
  },
  score: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1,
    description: 'Normalized interest score (0-1)'
  },
  firstInteraction: {
    type: Date,
    default: Date.now
  },
  lastInteraction: {
    type: Date,
    default: Date.now,
    index: true
  },
  decayRate: {
    type: Number,
    default: 0.05,
    min: 0,
    max: 1,
    description: 'Rate at which interest decays over time'
  }
});

// Create compound index for uniqueness
UserInterestSchema.index({ userId: 1, tag: 1 }, { unique: true });

// Pre-save hook to calculate score based on interaction count
UserInterestSchema.pre('save', function(next) {
  // Score calculation: 1 - e^(-k*x) where k is a factor and x is the interaction count
  // This creates a curve that approaches 1 as interactions increase
  if (this.interactionCount > 0) {
    const k = 0.1; // Rate factor - lower means slower growth
    this.score = Math.min(1, 1 - Math.exp(-k * this.interactionCount));
    
    // If explicitly selected by user, boost the score
    if (this.explicitlySelected) {
      this.score = Math.min(1, this.score + 0.3);
    }
  }
  next();
});

// Method to decay interest over time
UserInterestSchema.methods.applyTimeDecay = function(referenceDate = new Date()) {
  if (!this.lastInteraction) return this.score;
  
  const daysSinceLastInteraction = (referenceDate - this.lastInteraction) / (1000 * 60 * 60 * 24);
  
  // No need to decay if recent interaction
  if (daysSinceLastInteraction < 1) return this.score;
  
  // Time decay formula with custom decay rate
  const timeDecayFactor = Math.exp(-this.decayRate * daysSinceLastInteraction / 30);
  const newScore = this.score * timeDecayFactor;
  
  // Apply floor to prevent interests from dropping too low
  // Explicit interests decay more slowly
  const scoreFloor = this.explicitlySelected ? 0.3 : 0.1;
  this.score = Math.max(scoreFloor, newScore);
  
  return this.score;
};

module.exports = mongoose.model('UserInterest', UserInterestSchema); 