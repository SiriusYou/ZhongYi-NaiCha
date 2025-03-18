/**
 * Configuration settings for the recommendation engine
 */
module.exports = {
  // Database connection
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/tcm-app',
  
  // JWT settings
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  
  // API settings
  port: process.env.RECOMMENDATION_ENGINE_PORT || 5007,
  
  // Recommendation engine settings
  recommendations: {
    defaultLimit: 20,
    maxLimit: 100,
    
    // Algorithm weights
    weights: {
      contentBased: {
        tags: 0.4,
        categories: 0.3,
        contentVector: 0.3
      },
      hybrid: {
        contentBased: 0.5,
        collaborative: 0.5
      }
    },
    
    // Seasonal settings
    seasons: {
      spring: {
        startMonth: 2, // March
        endMonth: 4    // May
      },
      summer: {
        startMonth: 5, // June
        endMonth: 7    // August
      },
      autumn: {
        startMonth: 8, // September
        endMonth: 10   // November
      },
      winter: {
        startMonth: 11, // December
        endMonth: 1     // February
      }
    },
    
    // Interest decay settings
    interestDecay: {
      halfLifeDays: 30,
      minValue: 0.1
    },
    
    // Content diversity settings
    diversity: {
      maxPerCategory: 3,
      enforceMinimumDiversity: true,
      minDiversityScore: 0.6
    }
  },
  
  // A/B testing settings
  abTesting: {
    defaultTestDuration: 30, // days
    minVariants: 2,
    maxVariants: 5
  },
  
  // Performance monitoring
  performance: {
    logSlowRequests: true,
    slowRequestThreshold: 500, // ms
    enableMetrics: true
  }
}; 