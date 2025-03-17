/**
 * Community Interaction Service
 * Handles user health check-ins, content sharing, expert Q&A, and moderation
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Mock databases for initial setup
// Health check-ins database
const healthCheckIns = [];

// Posts database
const posts = [];

// Comments database
const comments = [];

// Expert Q&A database
const expertQuestions = [];

// Mock experts database
const experts = [
  {
    id: 'exp001',
    name: '王医师',
    title: '中医主任医师',
    specialties: ['体质调理', '慢性病管理', '养生保健'],
    avatar: 'https://example.com/images/expert1.jpg',
    description: '从事中医临床工作20余年，擅长体质辨识与调理，对亚健康、慢性病有丰富的诊疗经验。',
    availability: {
      monday: ['09:00-11:00', '14:00-16:00'],
      wednesday: ['09:00-11:00', '14:00-16:00'],
      friday: ['14:00-17:00'],
    }
  },
  {
    id: 'exp002',
    name: '李博士',
    title: '中医药学博士',
    specialties: ['中药调配', '食疗养生', '女性调理'],
    avatar: 'https://example.com/images/expert2.jpg',
    description: '中医药学博士，研究方向为中药现代化与食疗养生，对女性健康调理有独特见解。',
    availability: {
      tuesday: ['10:00-12:00', '15:00-17:00'],
      thursday: ['10:00-12:00', '15:00-17:00'],
      saturday: ['10:00-12:00'],
    }
  },
  {
    id: 'exp003',
    name: '张教授',
    title: '中医药大学教授',
    specialties: ['经络调理', '艾灸推拿', '睡眠障碍'],
    avatar: 'https://example.com/images/expert3.jpg',
    description: '中医药大学教授，长期从事中医基础理论研究，擅长经络调理、艾灸推拿，对睡眠障碍有特色疗法。',
    availability: {
      monday: ['15:00-18:00'],
      wednesday: ['15:00-18:00'],
      friday: ['09:00-12:00'],
    }
  }
];

// Health check in categories
const healthCategories = [
  {
    id: 'sleep',
    name: '睡眠',
    icon: '🌙',
    options: [
      { value: 'excellent', label: '非常好', score: 5 },
      { value: 'good', label: '良好', score: 4 },
      { value: 'fair', label: '一般', score: 3 },
      { value: 'poor', label: '较差', score: 2 },
      { value: 'terrible', label: '很差', score: 1 }
    ]
  },
  {
    id: 'energy',
    name: '精力',
    icon: '⚡',
    options: [
      { value: 'energetic', label: '精力充沛', score: 5 },
      { value: 'good', label: '状态良好', score: 4 },
      { value: 'normal', label: '正常水平', score: 3 },
      { value: 'tired', label: '略感疲惫', score: 2 },
      { value: 'exhausted', label: '非常疲惫', score: 1 }
    ]
  },
  {
    id: 'appetite',
    name: '饮食',
    icon: '🍲',
    options: [
      { value: 'excellent', label: '食欲旺盛', score: 5 },
      { value: 'good', label: '食欲良好', score: 4 },
      { value: 'normal', label: '正常饮食', score: 3 },
      { value: 'poor', label: '食欲不振', score: 2 },
      { value: 'none', label: '几乎无食欲', score: 1 }
    ]
  },
  {
    id: 'digestion',
    name: '消化',
    icon: '🔄',
    options: [
      { value: 'excellent', label: '消化顺畅', score: 5 },
      { value: 'good', label: '良好', score: 4 },
      { value: 'normal', label: '正常', score: 3 },
      { value: 'bloated', label: '轻度胀气', score: 2 },
      { value: 'poor', label: '消化不良', score: 1 }
    ]
  },
  {
    id: 'mood',
    name: '情绪',
    icon: '😊',
    options: [
      { value: 'excellent', label: '愉悦', score: 5 },
      { value: 'good', label: '平静', score: 4 },
      { value: 'normal', label: '一般', score: 3 },
      { value: 'irritable', label: '烦躁', score: 2 },
      { value: 'depressed', label: '低落', score: 1 }
    ]
  }
];

// Simple Mock moderation function
// In a real implementation, this would connect to an external content moderation API
function moderateContent(content) {
  // List of sensitive or inappropriate words to filter
  const forbiddenWords = ['违禁词1', '违禁词2', '敏感词1', '敏感词2'];
  
  // Check if content contains any forbidden words
  const hasForbiddenContent = forbiddenWords.some(word => 
    content.toLowerCase().includes(word.toLowerCase())
  );
  
  if (hasForbiddenContent) {
    return {
      approved: false,
      reason: 'Content contains inappropriate or sensitive terms'
    };
  }
  
  // Check for excessive promotion (many links or promotional terms)
  const promotionalPattern = /(http|https|www|\[url\]|促销|打折|优惠|免费|限时)/gi;
  const promotionalMatches = content.match(promotionalPattern) || [];
  
  if (promotionalMatches.length > 3) {
    return {
      approved: false,
      reason: 'Content contains excessive promotional material'
    };
  }
  
  return {
    approved: true
  };
}

/**
 * Get health check-in categories
 */
router.get('/health-checkin/categories', (req, res) => {
  res.status(200).json(healthCategories);
});

/**
 * Submit a new health check-in
 */
router.post('/health-checkin', (req, res) => {
  try {
    const { userId, teaConsumed, checkInData, notes } = req.body;
    
    // Validate request
    if (!userId || !checkInData) {
      return res.status(400).json({ 
        message: 'Missing required fields. UserId and checkInData are required.' 
      });
    }
    
    // Validate check-in data format
    for (const category of Object.keys(checkInData)) {
      const validCategory = healthCategories.find(c => c.id === category);
      if (!validCategory) {
        return res.status(400).json({ 
          message: `Invalid category: ${category}` 
        });
      }
      
      const validOption = validCategory.options.find(o => o.value === checkInData[category]);
      if (!validOption) {
        return res.status(400).json({ 
          message: `Invalid option for category ${category}: ${checkInData[category]}` 
        });
      }
    }
    
    // Calculate overall wellness score
    let totalScore = 0;
    let categoriesUsed = 0;
    
    for (const category of Object.keys(checkInData)) {
      const categoryDef = healthCategories.find(c => c.id === category);
      const optionDef = categoryDef.options.find(o => o.value === checkInData[category]);
      
      if (optionDef) {
        totalScore += optionDef.score;
        categoriesUsed++;
      }
    }
    
    const wellnessScore = categoriesUsed > 0 ? Math.round((totalScore / categoriesUsed) * 10) / 10 : 0;
    
    // Create new health check-in
    const newCheckIn = {
      id: 'checkin-' + uuidv4(),
      userId,
      teaConsumed: teaConsumed || [],
      checkInData,
      wellnessScore,
      notes: notes || '',
      createdAt: new Date()
    };
    
    // Save check-in
    healthCheckIns.push(newCheckIn);
    
    return res.status(201).json({
      message: 'Health check-in recorded successfully',
      checkIn: newCheckIn
    });
  } catch (error) {
    console.error('Health check-in error:', error);
    return res.status(500).json({ 
      message: 'Failed to record health check-in', 
      error: error.message 
    });
  }
});

/**
 * Get user's health check-in history
 */
router.get('/health-checkin/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, limit = 10, offset = 0 } = req.query;
    
    let userCheckIns = healthCheckIns.filter(c => c.userId === userId);
    
    // Filter by date range if provided
    if (startDate) {
      const start = new Date(startDate);
      userCheckIns = userCheckIns.filter(c => new Date(c.createdAt) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of the day
      userCheckIns = userCheckIns.filter(c => new Date(c.createdAt) <= end);
    }
    
    // Sort by creation date (newest first)
    userCheckIns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Calculate wellness trend if enough data
    let wellnessTrend = null;
    if (userCheckIns.length >= 3) {
      const recentScores = userCheckIns.slice(0, 3).map(c => c.wellnessScore);
      const avgRecent = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
      
      const olderScores = userCheckIns.slice(3, 6).map(c => c.wellnessScore);
      if (olderScores.length > 0) {
        const avgOlder = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;
        
        if (avgRecent > avgOlder + 0.3) {
          wellnessTrend = 'improving';
        } else if (avgRecent < avgOlder - 0.3) {
          wellnessTrend = 'declining';
        } else {
          wellnessTrend = 'stable';
        }
      }
    }
    
    // Paginate results
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    const paginatedCheckIns = userCheckIns.slice(offsetNum, offsetNum + limitNum);
    
    return res.status(200).json({
      count: userCheckIns.length,
      wellnessTrend,
      checkIns: paginatedCheckIns
    });
  } catch (error) {
    console.error('Get health check-in history error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve health check-in history', 
      error: error.message 
    });
  }
});

/**
 * Create a new community post
 */
router.post('/posts', (req, res) => {
  try {
    const { userId, content, title, mediaUrls, tags } = req.body;
    
    // Validate request
    if (!userId || !content) {
      return res.status(400).json({ 
        message: 'Missing required fields. UserId and content are required.' 
      });
    }
    
    // Content moderation check
    const moderationResult = moderateContent(content);
    
    if (!moderationResult.approved) {
      return res.status(400).json({ 
        message: 'Content moderation failed',
        reason: moderationResult.reason 
      });
    }
    
    // Create new post
    const newPost = {
      id: 'post-' + uuidv4(),
      userId,
      title: title || '',
      content,
      mediaUrls: mediaUrls || [],
      tags: tags || [],
      likes: 0,
      views: 0,
      commentCount: 0,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save post
    posts.push(newPost);
    
    return res.status(201).json({
      message: 'Post created successfully',
      post: newPost
    });
  } catch (error) {
    console.error('Create post error:', error);
    return res.status(500).json({ 
      message: 'Failed to create post', 
      error: error.message 
    });
  }
});

/**
 * Get community posts with filtering and pagination
 */
router.get('/posts', (req, res) => {
  try {
    const { userId, tag, search, limit = 10, offset = 0, sort = 'latest' } = req.query;
    
    let filteredPosts = [...posts].filter(post => post.status === 'published');
    
    // Filter by userId if provided
    if (userId) {
      filteredPosts = filteredPosts.filter(post => post.userId === userId);
    }
    
    // Filter by tag if provided
    if (tag) {
      filteredPosts = filteredPosts.filter(post => 
        post.tags.includes(tag)
      );
    }
    
    // Search in content and title
    if (search) {
      const searchLower = search.toLowerCase();
      filteredPosts = filteredPosts.filter(post => 
        (post.title && post.title.toLowerCase().includes(searchLower)) || 
        post.content.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort results
    switch (sort) {
      case 'latest':
        filteredPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filteredPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'popular':
        filteredPosts.sort((a, b) => b.likes - a.likes);
        break;
      case 'views':
        filteredPosts.sort((a, b) => b.views - a.views);
        break;
      default:
        filteredPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    // Count total matches before pagination
    const totalCount = filteredPosts.length;
    
    // Paginate results
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    const paginatedPosts = filteredPosts.slice(offsetNum, offsetNum + limitNum);
    
    return res.status(200).json({
      count: totalCount,
      posts: paginatedPosts
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve posts', 
      error: error.message 
    });
  }
});

/**
 * Get a specific post by ID
 */
router.get('/posts/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const post = posts.find(p => p.id === id && p.status === 'published');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Increment view count
    post.views += 1;
    
    // Get comments for this post
    const postComments = comments
      .filter(c => c.postId === id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    return res.status(200).json({
      post,
      comments: postComments
    });
  } catch (error) {
    console.error('Get post error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve post', 
      error: error.message 
    });
  }
});

/**
 * Like a post
 */
router.post('/posts/:id/like', (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    // Validate request
    if (!userId) {
      return res.status(400).json({ 
        message: 'Missing required fields. UserId is required.' 
      });
    }
    
    const postIndex = posts.findIndex(p => p.id === id && p.status === 'published');
    
    if (postIndex === -1) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Increment like count
    posts[postIndex].likes += 1;
    
    return res.status(200).json({
      message: 'Post liked successfully',
      post: posts[postIndex]
    });
  } catch (error) {
    console.error('Like post error:', error);
    return res.status(500).json({ 
      message: 'Failed to like post', 
      error: error.message 
    });
  }
});

/**
 * Comment on a post
 */
router.post('/posts/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const { userId, content } = req.body;
    
    // Validate request
    if (!userId || !content) {
      return res.status(400).json({ 
        message: 'Missing required fields. UserId and content are required.' 
      });
    }
    
    const post = posts.find(p => p.id === id && p.status === 'published');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Content moderation check
    const moderationResult = moderateContent(content);
    
    if (!moderationResult.approved) {
      return res.status(400).json({ 
        message: 'Content moderation failed',
        reason: moderationResult.reason 
      });
    }
    
    // Create new comment
    const newComment = {
      id: 'comment-' + uuidv4(),
      postId: id,
      userId,
      content,
      createdAt: new Date()
    };
    
    // Save comment
    comments.push(newComment);
    
    // Update comment count on post
    post.commentCount += 1;
    
    return res.status(201).json({
      message: 'Comment added successfully',
      comment: newComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    return res.status(500).json({ 
      message: 'Failed to add comment', 
      error: error.message 
    });
  }
});

/**
 * Get all available experts
 */
router.get('/experts', (req, res) => {
  try {
    return res.status(200).json({
      count: experts.length,
      experts
    });
  } catch (error) {
    console.error('Get experts error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve experts', 
      error: error.message 
    });
  }
});

/**
 * Get a specific expert by ID
 */
router.get('/experts/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const expert = experts.find(e => e.id === id);
    
    if (!expert) {
      return res.status(404).json({ message: 'Expert not found' });
    }
    
    // Get upcoming availability
    const now = new Date();
    const upcomingSlots = [];
    
    // Get day of week
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[now.getDay()];
    
    // Add 7 days of upcoming availability
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      
      const dayOfWeek = days[date.getDay()];
      
      if (expert.availability[dayOfWeek]) {
        const daySlots = expert.availability[dayOfWeek].map(timeSlot => {
          const [start, end] = timeSlot.split('-');
          return {
            date: date.toISOString().split('T')[0],
            dayOfWeek,
            start,
            end,
            available: Math.random() > 0.3 // Simulate 70% availability
          };
        });
        
        upcomingSlots.push(...daySlots);
      }
    }
    
    return res.status(200).json({
      expert,
      availability: upcomingSlots
    });
  } catch (error) {
    console.error('Get expert error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve expert', 
      error: error.message 
    });
  }
});

/**
 * Submit a question to an expert
 */
router.post('/experts/:id/questions', (req, res) => {
  try {
    const { id } = req.params;
    const { userId, question, appointmentTime, appointmentDate } = req.body;
    
    // Validate request
    if (!userId || !question) {
      return res.status(400).json({ 
        message: 'Missing required fields. UserId and question are required.' 
      });
    }
    
    const expert = experts.find(e => e.id === id);
    
    if (!expert) {
      return res.status(404).json({ message: 'Expert not found' });
    }
    
    // Content moderation check
    const moderationResult = moderateContent(question);
    
    if (!moderationResult.approved) {
      return res.status(400).json({ 
        message: 'Content moderation failed',
        reason: moderationResult.reason 
      });
    }
    
    // Create new expert question
    const newQuestion = {
      id: 'qa-' + uuidv4(),
      expertId: id,
      expertName: expert.name,
      userId,
      question,
      answer: null,
      status: appointmentTime && appointmentDate ? 'scheduled' : 'pending',
      appointmentTime,
      appointmentDate,
      createdAt: new Date(),
      updatedAt: new Date(),
      answeredAt: null
    };
    
    // Save question
    expertQuestions.push(newQuestion);
    
    return res.status(201).json({
      message: 'Question submitted successfully',
      question: newQuestion
    });
  } catch (error) {
    console.error('Submit question error:', error);
    return res.status(500).json({ 
      message: 'Failed to submit question', 
      error: error.message 
    });
  }
});

/**
 * Get questions for a user
 */
router.get('/questions/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    let userQuestions = expertQuestions.filter(q => q.userId === userId);
    
    // Filter by status if provided
    if (status) {
      userQuestions = userQuestions.filter(q => q.status === status);
    }
    
    // Sort by creation date (newest first)
    userQuestions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return res.status(200).json({
      count: userQuestions.length,
      questions: userQuestions
    });
  } catch (error) {
    console.error('Get user questions error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve user questions', 
      error: error.message 
    });
  }
});

/**
 * Mock expert answer submission
 * In a real system, this would be authenticated for experts only
 */
router.post('/questions/:id/answer', (req, res) => {
  try {
    const { id } = req.params;
    const { expertId, answer } = req.body;
    
    // Validate request
    if (!expertId || !answer) {
      return res.status(400).json({ 
        message: 'Missing required fields. ExpertId and answer are required.' 
      });
    }
    
    const questionIndex = expertQuestions.findIndex(q => q.id === id);
    
    if (questionIndex === -1) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    if (expertQuestions[questionIndex].expertId !== expertId) {
      return res.status(403).json({ message: 'Not authorized to answer this question' });
    }
    
    // Update question with answer
    expertQuestions[questionIndex].answer = answer;
    expertQuestions[questionIndex].status = 'answered';
    expertQuestions[questionIndex].updatedAt = new Date();
    expertQuestions[questionIndex].answeredAt = new Date();
    
    return res.status(200).json({
      message: 'Answer submitted successfully',
      question: expertQuestions[questionIndex]
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    return res.status(500).json({ 
      message: 'Failed to submit answer', 
      error: error.message 
    });
  }
});

/**
 * Get public answered questions for knowledge sharing
 */
router.get('/questions/public', (req, res) => {
  try {
    const { expertId, search, limit = 10, offset = 0 } = req.query;
    
    // Only include answered questions for public viewing
    let publicQuestions = expertQuestions.filter(q => q.status === 'answered' && q.answer);
    
    // Filter by expertId if provided
    if (expertId) {
      publicQuestions = publicQuestions.filter(q => q.expertId === expertId);
    }
    
    // Search in question and answer text
    if (search) {
      const searchLower = search.toLowerCase();
      publicQuestions = publicQuestions.filter(q => 
        q.question.toLowerCase().includes(searchLower) || 
        (q.answer && q.answer.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort by answered date (newest first)
    publicQuestions.sort((a, b) => {
      if (!a.answeredAt) return 1;
      if (!b.answeredAt) return -1;
      return new Date(b.answeredAt) - new Date(a.answeredAt);
    });
    
    // Count total matches before pagination
    const totalCount = publicQuestions.length;
    
    // Paginate results
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    const paginatedQuestions = publicQuestions.slice(offsetNum, offsetNum + limitNum);
    
    return res.status(200).json({
      count: totalCount,
      questions: paginatedQuestions
    });
  } catch (error) {
    console.error('Get public questions error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve public questions', 
      error: error.message 
    });
  }
});

module.exports = router; 