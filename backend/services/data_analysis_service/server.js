const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config();

// Initialize Express App
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
})
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// Create storage directories if they don't exist
const pdfStoragePath = process.env.PDF_STORAGE_PATH || './storage/pdfs';
const chartStoragePath = process.env.CHART_STORAGE_PATH || './storage/charts';

if (!fs.existsSync(pdfStoragePath)) {
  fs.mkdirSync(pdfStoragePath, { recursive: true });
  console.log(`Created PDF storage directory: ${pdfStoragePath}`);
}

if (!fs.existsSync(chartStoragePath)) {
  fs.mkdirSync(chartStoragePath, { recursive: true });
  console.log(`Created chart storage directory: ${chartStoragePath}`);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Static file serving
app.use('/storage/pdfs', express.static(pdfStoragePath));
app.use('/storage/charts', express.static(chartStoragePath));

// Define Routes
app.use('/api/reports', require('./routes/reports'));
app.use('/api/consumption', require('./routes/consumption'));
app.use('/api/trends', require('./routes/trends'));
app.use('/api/insights', require('./routes/insights'));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'data-analysis-service' });
});

// Base route
app.get('/', (req, res) => {
  res.json({
    service: 'Data Analysis Service',
    version: '1.0.0',
    status: 'operational',
    endpoints: [
      '/api/reports',
      '/api/consumption',
      '/api/trends',
      '/api/insights',
      '/health'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Start server
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app; // For testing 