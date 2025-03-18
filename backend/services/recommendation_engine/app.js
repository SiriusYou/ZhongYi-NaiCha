const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
const errorHandler = require('./middleware/errorHandler');
const config = require('./config');
const bodyParser = require('body-parser');

// Routes
const recommendationRoutes = require('./routes/recommendationRoutes');
const healthRoutes = require('./routes/healthRoutes');
const userInterestRoutes = require('./routes/userInterestRoutes');
const abTestRoutes = require('./routes/abTestRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const seasonalContentRoutes = require('./routes/seasonalContentRoutes');

// Initialize express app
const app = express();

// Connect to MongoDB
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false
})
.then(() => console.log('MongoDB Connected'))
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});

// Set security headers
app.use(helmet());

// CORS setup
app.use(cors());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: 'Too many requests',
    message: config.rateLimit.message
  }
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Compress responses
app.use(compression());

// Request logging
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// API Routes
app.use('/api/recommendations', recommendationRoutes);
app.use('/health', healthRoutes);
app.use('/api/interests', userInterestRoutes);
app.use('/api/abtests', abTestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/seasonal', seasonalContentRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({ 
    service: 'ZhongYi NaiCha - Recommendation Engine', 
    status: 'running',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(errorHandler);

// Unhandled route
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Not Found',
    message: 'The requested resource was not found on this server'
  });
});

// Set port and start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`Recommendation Engine running on port ${PORT} in ${config.nodeEnv} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
});

module.exports = { app, server }; 