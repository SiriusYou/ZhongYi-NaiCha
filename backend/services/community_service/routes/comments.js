const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const contentModeration = require('../middleware/contentModeration');

// @route   POST api/comments
// @desc    Create a comment
// @access  Private
router.post(
  '/',
  [
    auth,
    contentModeration.moderateContent('comment'),
    contentModeration.registerContentId,
    [
      check('post', 'Post ID is required').not().isEmpty(),
      check('content', 'Content is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const post = await Post.findById(req.body.post);
      
      // Check if post exists and is active
      if (!post || !post.isActive) {
        return res.status(404).json({ msg: 'Post not found' });
      }
      
      // Create new comment
      const newComment = new Comment({
        post: req.body.post,
        user: req.user.id,
        content: req.body.content,
        images: req.body.images || [],
        parentComment: req.body.parentComment || null,
        isExpertResponse: req.body.isExpertResponse || false // TODO: Verify if user is expert
      });
      
      // Save comment
      const comment = await newComment.save();
      
      // Increment post comment count
      post.commentsCount += 1;
      await post.save();
      
      // If this is a reply to another comment, update parent comment
      if (req.body.parentComment) {
        const parentComment = await Comment.findById(req.body.parentComment);
        if (parentComment && parentComment.isActive) {
          // Create notification for parent comment author if not the same as the commenter
          if (parentComment.user.toString() !== req.user.id) {
            const notification = new Notification({
              recipient: parentComment.user,
              sender: req.user.id,
              type: 'reply_to_comment',
              content: 'replied to your comment',
              relatedPost: post._id,
              relatedComment: comment._id
            });
            
            await notification.save();
            
            // Emit socket event if user is online
            if (req.io) {
              req.io.to(`user-${parentComment.user.toString()}`).emit('notification', {
                type: 'reply_to_comment',
                postId: post._id,
                commentId: comment._id,
                parentCommentId: parentComment._id,
                senderId: req.user.id
              });
            }
          }
        }
      }
      
      // Create notification for post owner if not the same as commenter
      if (post.user.toString() !== req.user.id) {
        const notification = new Notification({
          recipient: post.user,
          sender: req.user.id,
          type: 'comment_on_post',
          content: 'commented on your post',
          relatedPost: post._id,
          relatedComment: comment._id
        });
        
        await notification.save();
        
        // Emit socket event if user is online
        if (req.io) {
          req.io.to(`user-${post.user.toString()}`).emit('notification', {
            type: 'comment_on_post',
            postId: post._id,
            commentId: comment._id,
            senderId: req.user.id
          });
        }
      }
      
      // Emit comment event to post room
      if (req.io) {
        req.io.to(`post-${post._id.toString()}`).emit('new_comment', {
          comment,
          postId: post._id
        });
      }
      
      await comment.populate('user', 'name avatar');
      
      res.json(comment);
      
      // Apply content review middleware
      contentModeration.createContentReview('comment')(req, res, () => {});
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Post not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/comments/:id
// @desc    Get comment by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
      .populate('user', 'name avatar')
      .populate('parentComment');
    
    // Check if comment exists
    if (!comment || !comment.isActive) {
      return res.status(404).json({ msg: 'Comment not found' });
    }
    
    res.json(comment);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Comment not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/comments/:id
// @desc    Update a comment
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('content', 'Content is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const comment = await Comment.findById(req.params.id);
      
      // Check if comment exists
      if (!comment || !comment.isActive) {
        return res.status(404).json({ msg: 'Comment not found' });
      }
      
      // Check user authorization
      if (comment.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }
      
      // Update comment
      comment.content = req.body.content;
      comment.images = req.body.images || comment.images;
      comment.updatedAt = Date.now();
      
      await comment.save();
      
      res.json(comment);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Comment not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/comments/:id
// @desc    Delete a comment
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    // Check if comment exists
    if (!comment) {
      return res.status(404).json({ msg: 'Comment not found' });
    }
    
    // Check user authorization
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Soft delete by setting isActive to false
    comment.isActive = false;
    await comment.save();
    
    // Update post's comment count
    const post = await Post.findById(comment.post);
    if (post) {
      post.commentsCount = Math.max(0, post.commentsCount - 1);
      await post.save();
    }
    
    res.json({ msg: 'Comment removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Comment not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET api/comments/:id/replies
// @desc    Get replies to a comment
// @access  Public
router.get('/:id/replies', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const comment = await Comment.findById(req.params.id);
    
    // Check if comment exists
    if (!comment || !comment.isActive) {
      return res.status(404).json({ msg: 'Comment not found' });
    }
    
    // Get replies for the comment
    const replies = await Comment.find({ 
      parentComment: req.params.id,
      isActive: true
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar');
    
    // Get total count for pagination
    const total = await Comment.countDocuments({ 
      parentComment: req.params.id,
      isActive: true
    });
    
    res.json({
      replies,
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
      return res.status(404).json({ msg: 'Comment not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/comments/:id/like
// @desc    Like a comment
// @access  Private
router.put('/:id/like', auth, async (req, res) => {
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

// @route   PUT api/comments/:id/unlike
// @desc    Unlike a comment
// @access  Private
router.put('/:id/unlike', auth, async (req, res) => {
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

// @route   PUT api/comments/:id/report
// @desc    Report a comment
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
      const comment = await Comment.findById(req.params.id);
      
      // Check if comment exists
      if (!comment || !comment.isActive) {
        return res.status(404).json({ msg: 'Comment not found' });
      }
      
      // Check if already reported by this user
      if (comment.reports.some(report => report.user.toString() === req.user.id)) {
        return res.status(400).json({ msg: 'Comment already reported by this user' });
      }
      
      // Add report
      comment.reports.push({
        user: req.user.id,
        reason: req.body.reason
      });
      
      // Update isReported flag if this is the first report
      if (!comment.isReported) {
        comment.isReported = true;
      }
      
      await comment.save();
      
      res.json({ msg: 'Comment reported successfully' });
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Comment not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router; 