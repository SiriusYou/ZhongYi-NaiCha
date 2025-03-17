const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const contentModeration = require('../middleware/contentModeration');

// @route   GET api/posts
// @desc    Get all posts with pagination and filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build query with filters
    const query = { isActive: true };
    
    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Filter by tag
    if (req.query.tag) {
      query.tags = req.query.tag;
    }
    
    // Filter by user
    if (req.query.user) {
      query.user = req.query.user;
    }
    
    // Search by title, content, or tags
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }
    
    // Get posts with pagination
    const posts = await Post.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar');
    
    // Get total count for pagination
    const total = await Post.countDocuments(query);
    
    res.json({
      posts,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/posts/:id
// @desc    Get post by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name avatar')
      .populate('expertVerification.expert', 'name avatar');
    
    // Check if post exists
    if (!post || !post.isActive) {
      return res.status(404).json({ msg: 'Post not found' });
    }
    
    // Increment view count
    post.viewsCount += 1;
    await post.save();
    
    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/posts
// @desc    Create a post
// @access  Private
router.post(
  '/',
  [
    auth,
    contentModeration.moderateContent('post'),
    contentModeration.registerContentId,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('content', 'Content is required').not().isEmpty(),
      check('category', 'Category is required').isIn([
        'general', 'question', 'recipe_sharing', 'experience', 'news'
      ])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { 
        title, 
        content, 
        images, 
        tags, 
        category, 
        relatedRecipes, 
        relatedHerbs 
      } = req.body;
      
      // Create new post
      const newPost = new Post({
        user: req.user.id,
        title,
        content,
        category,
        images: images || [],
        tags: tags || [],
        relatedRecipes: relatedRecipes || [],
        relatedHerbs: relatedHerbs || []
      });
      
      const post = await newPost.save();
      
      // Create content review after response is sent
      res.json(post);
      
      // Apply content review middleware
      contentModeration.createContentReview('post')(req, res, () => {});
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/posts/:id
// @desc    Update a post
// @access  Private
router.put(
  '/:id',
  [
    auth,
    contentModeration.moderateContent('post'),
    [
      check('title', 'Title is required').not().isEmpty(),
      check('content', 'Content is required').not().isEmpty(),
      check('category', 'Category is required').isIn([
        'general', 'question', 'recipe_sharing', 'experience', 'news'
      ])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const post = await Post.findById(req.params.id);
      
      // Check if post exists
      if (!post) {
        return res.status(404).json({ msg: 'Post not found' });
      }
      
      // Check if user owns the post
      if (post.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized to update this post' });
      }
      
      // Check if post is active
      if (!post.isActive) {
        return res.status(400).json({ msg: 'This post has been deleted or deactivated' });
      }
      
      const {
        title,
        content,
        images,
        tags,
        category,
        relatedRecipes,
        relatedHerbs
      } = req.body;
      
      // Update post fields
      post.title = title;
      post.content = content;
      post.category = category;
      post.images = images || post.images;
      post.tags = tags || post.tags;
      post.relatedRecipes = relatedRecipes || post.relatedRecipes;
      post.relatedHerbs = relatedHerbs || post.relatedHerbs;
      post.updatedAt = Date.now();
      
      const updatedPost = await post.save();
      
      res.json(updatedPost);
      
      // Create new content review for the updated content
      req.contentId = post._id;
      contentModeration.createContentReview('post')(req, res, () => {});
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Post not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/posts/:id
// @desc    Delete a post (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    // Check if post exists
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }
    
    // Check user authorization
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Soft delete by setting isActive to false
    post.isActive = false;
    await post.save();
    
    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/posts/:id/like
// @desc    Like a post
// @access  Private
router.put('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    // Check if post exists
    if (!post || !post.isActive) {
      return res.status(404).json({ msg: 'Post not found' });
    }
    
    // Check if the post has already been liked by this user
    if (post.likes.some(like => like.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: 'Post already liked' });
    }
    
    // Add like
    post.likes.unshift({ user: req.user.id });
    await post.save();
    
    // Create notification for post owner if not the same as liker
    if (post.user.toString() !== req.user.id) {
      const notification = new Notification({
        recipient: post.user,
        sender: req.user.id,
        type: 'like_post',
        content: 'liked your post',
        relatedPost: post._id
      });
      
      await notification.save();
      
      // Emit socket event if user is online
      if (req.io) {
        req.io.to(`user-${post.user.toString()}`).emit('notification', {
          type: 'like_post',
          postId: post._id,
          senderId: req.user.id
        });
      }
    }
    
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/posts/:id/unlike
// @desc    Unlike a post
// @access  Private
router.put('/:id/unlike', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    // Check if post exists
    if (!post || !post.isActive) {
      return res.status(404).json({ msg: 'Post not found' });
    }
    
    // Check if the post has been liked by this user
    if (!post.likes.some(like => like.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: 'Post has not yet been liked' });
    }
    
    // Remove like
    post.likes = post.likes.filter(like => like.user.toString() !== req.user.id);
    await post.save();
    
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/posts/:id/verify
// @desc    Verify a post (expert only)
// @access  Private (Expert only)
router.put(
  '/:id/verify',
  [
    auth,
    [
      check('comment', 'Expert comment is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const post = await Post.findById(req.params.id);
      
      // Check if post exists
      if (!post || !post.isActive) {
        return res.status(404).json({ msg: 'Post not found' });
      }
      
      // TODO: Add check to verify user is an expert
      
      // Update post verification
      post.isExpertVerified = true;
      post.expertVerification = {
        expert: req.user.id,
        comment: req.body.comment,
        date: Date.now()
      };
      
      await post.save();
      
      // Create notification for post owner
      const notification = new Notification({
        recipient: post.user,
        sender: req.user.id,
        type: 'expert_verified_post',
        content: 'verified your post',
        relatedPost: post._id
      });
      
      await notification.save();
      
      // Emit socket event if user is online
      if (req.io) {
        req.io.to(`user-${post.user.toString()}`).emit('notification', {
          type: 'expert_verified_post',
          postId: post._id,
          senderId: req.user.id
        });
      }
      
      res.json({
        success: true,
        verification: post.expertVerification
      });
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Post not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/posts/:id/report
// @desc    Report a post
// @access  Private
router.put(
  '/:id/report',
  [
    auth,
    contentModeration.updateReportStats,
    [
      check('reason', 'Reason is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const post = await Post.findById(req.params.id);
      
      // Check if post exists
      if (!post || !post.isActive) {
        return res.status(404).json({ msg: 'Post not found' });
      }
      
      // Check if already reported by this user
      if (post.reports.some(report => report.user.toString() === req.user.id)) {
        return res.status(400).json({ msg: 'Post already reported by this user' });
      }
      
      // Add report
      post.reports.push({
        user: req.user.id,
        reason: req.body.reason
      });
      
      // Update isReported flag if this is the first report
      if (!post.isReported) {
        post.isReported = true;
      }
      
      await post.save();
      
      res.json({ msg: 'Post reported successfully' });
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Post not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/posts/:id/comments
// @desc    Get comments for a post
// @access  Public
router.get('/:id/comments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Get comments for the post with pagination
    const comments = await Comment.find({ 
      post: req.params.id,
      parentComment: null,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar');
    
    // Get total count for pagination
    const total = await Comment.countDocuments({ 
      post: req.params.id,
      parentComment: null,
      isActive: true
    });
    
    res.json({
      comments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Post not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 