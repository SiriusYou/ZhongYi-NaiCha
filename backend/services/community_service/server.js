const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'development' 
      ? ['http://localhost:3000', 'http://localhost:8080'] 
      : process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to Database
connectDB();

// Middlewares
app.use(cors());
app.use(express.json({ extended: false }));
app.use(morgan('dev'));

// Set Socket.io middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Define Routes
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/experts', require('./routes/experts'));
app.use('/api/discussions', require('./routes/discussions'));
app.use('/api/likes', require('./routes/likes'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/content-review', require('./routes/contentReview'));
app.use('/api/moderation', require('./routes/moderation'));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Community Service',
    features: {
      contentModeration: process.env.CONTENT_MODERATION_ENABLED === 'true',
      aiModeration: process.env.AI_MODERATION_ENABLED === 'true'
    }
  });
});

// Default route
app.get('/', (req, res) => {
  res.status(200).json({ 
    msg: 'Welcome to the Community Service API',
    endpoints: [
      '/api/posts',
      '/api/comments',
      '/api/experts',
      '/api/discussions',
      '/api/likes',
      '/api/notifications',
      '/api/content-review'
    ]
  });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Join a room based on userId
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined room user-${userId}`);
    }
  });
  
  // Join a post room for realtime comments
  socket.on('joinPost', (postId) => {
    if (postId) {
      socket.join(`post-${postId}`);
      console.log(`User joined post-${postId}`);
    }
  });
  
  // Leave a post room
  socket.on('leavePost', (postId) => {
    if (postId) {
      socket.leave(`post-${postId}`);
      console.log(`User left post-${postId}`);
    }
  });
  
  // Disconnect event
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Set port and start server
const PORT = process.env.PORT || 5004;
server.listen(PORT, () => {
  console.log(`Community Service running on port ${PORT}`);
  console.log(`Content Moderation: ${process.env.CONTENT_MODERATION_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  console.log(`AI Moderation: ${process.env.AI_MODERATION_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
});

module.exports = app; 