/**
 * Configuration for the recommendation engine service
 * Environment variables should be set in the .env file or via system environment
 */
module.exports = {
  // Server configuration
  port: process.env.RECOMMENDATION_ENGINE_PORT || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB connection
  mongoURI: process.env.RECOMMENDATION_ENGINE_MONGO_URI || 'mongodb://localhost:27017/zhongyi-recommendation',
  
  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'zhongyi-recommendation-secret-key',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  
  // Recommendation engine settings
  defaultRecommendationLimit: 20,
  
  // Algorithm weights
  weights: {
    contentBased: 0.6,
    collaborative: 0.3,
    popularity: 0.1,
    recency: 0.2,
    seasonal: 0.3,
    diversity: 0.3
  },
  
  // A/B testing configuration
  abTesting: {
    enabled: process.env.ENABLE_AB_TESTING === 'true' || false,
    defaultUserPercentage: 50
  },
  
  // User interest settings
  userInterests: {
    interactionWeights: {
      view: 1,
      like: 3,
      share: 5,
      save: 4,
      comment: 2,
      click: 0.5
    },
    decayRate: 0.05, // 5% decay per day
    maxInterests: 50
  },
  
  // Content vector settings
  contentVectors: {
    defaultVectorSize: 50,
    similarityThreshold: 0.6
  },
  
  // Caching settings
  cache: {
    enabled: process.env.ENABLE_CACHE === 'true' || true,
    ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour in seconds
    checkPeriod: 600 // 10 minutes
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    saveRecommendations: process.env.SAVE_RECOMMENDATIONS === 'true' || true,
    saveUserBehavior: process.env.SAVE_USER_BEHAVIOR === 'true' || true
  },
  
  // API rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
  },
  
  // External content service URLs
  contentServiceUrl: process.env.CONTENT_SERVICE_URL || 'http://localhost:3001/api',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3002/api',
  
  // Service health check
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 60000, // 1 minute
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000 // 5 seconds
  }
}; 