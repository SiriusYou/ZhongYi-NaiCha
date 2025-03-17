/**
 * Content Review Routes
 * Provides APIs for content moderation and review management
 */

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const ContentReview = require('../models/ContentReview');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Discussion = require('../models/Discussion');
const contentModerationUtil = require('../utils/contentModeration');

// @route   GET api/content-review
// @desc    Get all content reviews with pagination and filtering
// @access  Admin only
router.get('/', [auth, admin], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build query with filters
    const query = {};
    
    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by priority
    if (req.query.priority) {
      query.priority = req.query.priority;
    }
    
    // Filter by content type
    if (req.query.contentType) {
      query.contentType = req.query.contentType;
    }
    
    // Filter by auto-moderated vs. manual review needed
    if (req.query.isAutoModerated === 'true') {
      query.isAutoModerated = true;
    } else if (req.query.isAutoModerated === 'false') {
      query.isAutoModerated = false;
    }
    
    // Filter by appeal status
    if (req.query.appealed === 'true') {
      query['appeal.appealed'] = true;
      
      if (req.query.appealStatus) {
        query['appeal.appealStatus'] = req.query.appealStatus;
      }
    }
    
    // Get contentReviews with pagination
    const contentReviews = await ContentReview.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('contentAuthor', 'name avatar')
      .populate('moderatorReview.moderator', 'name avatar')
      .populate('appeal.appealResolvedBy', 'name avatar');
    
    // Get total count for pagination
    const total = await ContentReview.countDocuments(query);
    
    res.json({
      contentReviews,
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

// @route   GET api/content-review/pending
// @desc    Get pending content reviews with priority sorting
// @access  Admin only
router.get('/pending', [auth, admin], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Only get pending or flagged items
    const query = {
      status: { $in: ['pending', 'flagged_for_review'] }
    };
    
    // Get pending reviews with pagination
    const pendingReviews = await ContentReview.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('contentAuthor', 'name avatar');
    
    // Get total count for pagination
    const total = await ContentReview.countDocuments(query);
    
    res.json({
      pendingReviews,
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

// @route   GET api/content-review/:id
// @desc    Get content review by ID
// @access  Admin only
router.get('/:id', [auth, admin], async (req, res) => {
  try {
    const contentReview = await ContentReview.findById(req.params.id)
      .populate('contentAuthor', 'name avatar')
      .populate('moderatorReview.moderator', 'name avatar')
      .populate('appeal.appealResolvedBy', 'name avatar')
      .populate('reports.user', 'name avatar');
    
    if (!contentReview) {
      return res.status(404).json({ msg: 'Content review not found' });
    }
    
    // Get the actual content
    let content = null;
    
    switch (contentReview.contentType) {
      case 'post':
        content = await Post.findById(contentReview.contentId)
          .populate('user', 'name avatar');
        break;
      case 'comment':
        content = await Comment.findById(contentReview.contentId)
          .populate('user', 'name avatar');
        break;
      case 'discussion':
        content = await Discussion.findById(contentReview.contentId)
          .populate('user', 'name avatar');
        break;
    }
    
    res.json({ contentReview, content });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Content review not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/content-review/:id/review
// @desc    Submit moderator review decision
// @access  Admin only
router.put(
  '/:id/review',
  [
    auth,
    admin,
    [
      check('decision', 'Decision is required').isIn(['approved', 'rejected']),
      check('reason', 'Reason is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { decision, reason, notes, actions } = req.body;
      
      // Perform moderator review
      const updatedReview = await contentModerationUtil.moderatorReview(
        req.params.id,
        req.user.id,
        decision,
        reason,
        notes,
        actions
      );
      
      res.json(updatedReview);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Content review not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/content-review/:id/appeal
// @desc    Submit an appeal for rejected content
// @access  Private (content owner only)
router.put(
  '/:id/appeal',
  [
    auth,
    [
      check('appealReason', 'Appeal reason is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const contentReview = await ContentReview.findById(req.params.id);
      
      if (!contentReview) {
        return res.status(404).json({ msg: 'Content review not found' });
      }
      
      // Check if the user is the content author
      if (contentReview.contentAuthor.toString() !== req.user.id) {
        return res.status(403).json({ 
          msg: 'You can only appeal your own content'
        });
      }
      
      // Submit appeal
      const updatedReview = await contentModerationUtil.submitAppeal(
        req.params.id,
        req.body.appealReason
      );
      
      res.json(updatedReview);
    } catch (err) {
      console.error(err.message);
      if (err.message.includes('cannot be appealed') || 
          err.message.includes('already been appealed')) {
        return res.status(400).json({ msg: err.message });
      }
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Content review not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/content-review/:id/resolve-appeal
// @desc    Resolve an appeal
// @access  Admin only
router.put(
  '/:id/resolve-appeal',
  [
    auth,
    admin,
    [
      check('decision', 'Decision is required').isIn(['approved', 'rejected']),
      check('notes', 'Notes are required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const { decision, notes } = req.body;
      
      // Resolve appeal
      const updatedReview = await contentModerationUtil.resolveAppeal(
        req.params.id,
        req.user.id,
        decision,
        notes
      );
      
      res.json(updatedReview);
    } catch (err) {
      console.error(err.message);
      if (err.message.includes('No pending appeal')) {
        return res.status(400).json({ msg: err.message });
      }
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Content review not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/content-review/stats/dashboard
// @desc    Get content moderation statistics for dashboard
// @access  Admin only
router.get('/stats/dashboard', [auth, admin], async (req, res) => {
  try {
    // Get counts for different statuses
    const pendingCount = await ContentReview.countDocuments({ 
      status: 'pending'
    });
    
    const flaggedCount = await ContentReview.countDocuments({ 
      status: 'flagged_for_review'
    });
    
    const approvedCount = await ContentReview.countDocuments({ 
      status: 'approved'
    });
    
    const rejectedCount = await ContentReview.countDocuments({ 
      status: 'rejected'
    });
    
    // Get counts by priority
    const urgentCount = await ContentReview.countDocuments({ 
      priority: 'urgent',
      status: { $in: ['pending', 'flagged_for_review'] }
    });
    
    const highCount = await ContentReview.countDocuments({ 
      priority: 'high',
      status: { $in: ['pending', 'flagged_for_review'] }
    });
    
    // Get counts for appeals
    const pendingAppeals = await ContentReview.countDocuments({ 
      'appeal.appealed': true,
      'appeal.appealStatus': 'pending'
    });
    
    // Get counts by content type
    const postCount = await ContentReview.countDocuments({ 
      contentType: 'post'
    });
    
    const commentCount = await ContentReview.countDocuments({ 
      contentType: 'comment'
    });
    
    const discussionCount = await ContentReview.countDocuments({ 
      contentType: 'discussion'
    });
    
    // Get recent activity - most recent 5 reviews
    const recentActivity = await ContentReview.find({
      isManuallyReviewed: true
    })
      .sort({ 'moderatorReview.reviewedAt': -1 })
      .limit(5)
      .populate('contentAuthor', 'name')
      .populate('moderatorReview.moderator', 'name');
    
    res.json({
      counts: {
        pending: pendingCount,
        flagged: flaggedCount,
        approved: approvedCount,
        rejected: rejectedCount,
        total: pendingCount + flaggedCount + approvedCount + rejectedCount
      },
      priority: {
        urgent: urgentCount,
        high: highCount
      },
      appeals: {
        pending: pendingAppeals
      },
      contentTypes: {
        post: postCount,
        comment: commentCount,
        discussion: discussionCount
      },
      recentActivity
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 