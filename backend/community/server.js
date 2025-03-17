/**
 * Community Interaction Service
 * Handles user health check-ins, content sharing, expert Q&A, and moderation
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const interactionRouter = require('./interaction');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3006;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '5mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Routes
app.use('/community', interactionRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Community Service running on port ${PORT}`);
  });
}

module.exports = app; 