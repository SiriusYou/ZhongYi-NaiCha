const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');

// @route   POST api/likes/post/:id
// @desc    Like a post
// @access  Private
router.post('/post/:id', auth, async (req, res) => {
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

// @route   DELETE api/likes/post/:id
// @desc    Unlike a post
// @access  Private
router.delete('/post/:id', auth, async (req, res) => {
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

// @route   POST api/likes/comment/:id
// @desc    Like a comment
// @access  Private
router.post('/comment/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    // Check if comment exists
    if (!comment || !comment.isActive) {
      return res.status(404).json({ msg: 'Comment not found' });
    }
    
    // Check if the comment has already been liked by this user
    if (comment.likes.some(like => like.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: 'Comment already liked' });
    }
    
    // Add like
    comment.likes.unshift({ user: req.user.id });
    await comment.save();
    
    // Create notification for comment owner if not the same as liker
    if (comment.user.toString() !== req.user.id) {
      const notification = new Notification({
        recipient: comment.user,
        sender: req.user.id,
        type: 'like_comment',
        content: 'liked your comment',
        relatedPost: comment.post,
        relatedComment: comment._id
      });
      
      await notification.save();
      
      // Emit socket event if user is online
      if (req.io) {
        req.io.to(`user-${comment.user.toString()}`).emit('notification', {
          type: 'like_comment',
          postId: comment.post,
          commentId: comment._id,
          senderId: req.user.id
        });
      }
    }
    
    res.json(comment.likes);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Comment not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/likes/comment/:id
// @desc    Unlike a comment
// @access  Private
router.delete('/comment/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    // Check if comment exists
    if (!comment || !comment.isActive) {
      return res.status(404).json({ msg: 'Comment not found' });
    }
    
    // Check if the comment has been liked by this user
    if (!comment.likes.some(like => like.user.toString() === req.user.id)) {
      return res.status(400).json({ msg: 'Comment has not yet been liked' });
    }
    
    // Remove like
    comment.likes = comment.likes.filter(like => like.user.toString() !== req.user.id);
    await comment.save();
    
    res.json(comment.likes);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Comment not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/likes/posts/user/:userId
// @desc    Get all posts liked by a user
// @access  Public
router.get('/posts/user/:userId', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Find posts that this user has liked
    const posts = await Post.find({
      'likes.user': req.params.userId,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar');
    
    // Get total count for pagination
    const total = await Post.countDocuments({
      'likes.user': req.params.userId,
      isActive: true
    });
    
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

// @route   GET api/likes/posts/me
// @desc    Get all posts liked by the authenticated user
// @access  Private
router.get('/posts/me', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Find posts that the authenticated user has liked
    const posts = await Post.find({
      'likes.user': req.user.id,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar');
    
    // Get total count for pagination
    const total = await Post.countDocuments({
      'likes.user': req.user.id,
      isActive: true
    });
    
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

module.exports = router; 