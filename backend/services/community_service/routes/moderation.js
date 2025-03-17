const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Discussion = require('../models/Discussion');
const ContentReview = require('../models/ContentReview');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { moderateContent } = require('../utils/contentModeration');

/**
 * @route   GET /api/moderation/pending
 * @desc    Get all pending content reviews
 * @access  Admin
 */
router.get('/pending', [auth, admin], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const pendingReviews = await ContentReview.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('contentRef.post', 'title content images')
      .populate('contentRef.comment', 'content images')
      .populate('contentRef.discussion', 'title content')
      .populate('reportedBy', 'name avatar');

    const totalCount = await ContentReview.countDocuments({ status: 'pending' });

    res.json({
      reviews: pendingReviews,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        hasMore: page < Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching pending content reviews:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/moderation/history
 * @desc    Get moderation history
 * @access  Admin
 */
router.get('/history', [auth, admin], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || ['approved', 'rejected'];
    
    const filter = Array.isArray(status) 
      ? { status: { $in: status } } 
      : { status };

    const reviews = await ContentReview.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('contentRef.post', 'title content images')
      .populate('contentRef.comment', 'content images')
      .populate('contentRef.discussion', 'title content')
      .populate('reportedBy', 'name avatar')
      .populate('reviewedBy', 'name');

    const totalCount = await ContentReview.countDocuments(filter);

    res.json({
      reviews,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        hasMore: page < Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching moderation history:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   POST /api/moderation/report
 * @desc    Report content for review
 * @access  Private
 */
router.post('/report', auth, async (req, res) => {
  try {
    const { contentType, contentId, reason } = req.body;
    
    if (!contentType || !contentId || !reason) {
      return res.status(400).json({ msg: 'Missing required fields' });
    }
    
    // Verify the content exists
    let contentExists = false;
    let contentData = null;
    
    if (contentType === 'post') {
      contentData = await Post.findById(contentId);
      contentExists = !!contentData;
    } else if (contentType === 'comment') {
      contentData = await Comment.findById(contentId);
      contentExists = !!contentData;
    } else if (contentType === 'discussion') {
      contentData = await Discussion.findById(contentId);
      contentExists = !!contentData;
    } else {
      return res.status(400).json({ msg: 'Invalid content type' });
    }
    
    if (!contentExists) {
      return res.status(404).json({ msg: 'Content not found' });
    }
    
    // Check if this content is already reported and pending
    const existingReport = await ContentReview.findOne({
      [`contentRef.${contentType}`]: contentId,
      status: 'pending'
    });
    
    if (existingReport) {
      // Add this user to the reporters if not already there
      if (!existingReport.reportedBy.includes(req.user.id)) {
        existingReport.reportedBy.push(req.user.id);
        existingReport.reportCount += 1;
        await existingReport.save();
      }
      return res.json({ 
        msg: 'Content already reported and under review', 
        reportId: existingReport._id 
      });
    }
    
    // Create new content review
    const contentReview = new ContentReview({
      contentRef: {
        [contentType]: contentId
      },
      contentType,
      reportedBy: [req.user.id],
      reportCount: 1,
      reason,
      status: 'pending'
    });
    
    await contentReview.save();
    
    res.json({ 
      msg: 'Content reported successfully', 
      reportId: contentReview._id 
    });
    
  } catch (err) {
    console.error('Error reporting content:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   PUT /api/moderation/review/:id
 * @desc    Review reported content
 * @access  Admin
 */
router.put('/review/:id', [auth, admin], async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }
    
    const contentReview = await ContentReview.findById(req.params.id);
    
    if (!contentReview) {
      return res.status(404).json({ msg: 'Content review not found' });
    }
    
    if (contentReview.status !== 'pending') {
      return res.status(400).json({ msg: 'This content has already been reviewed' });
    }
    
    contentReview.status = status;
    contentReview.notes = notes || '';
    contentReview.reviewedBy = req.user.id;
    contentReview.reviewedAt = Date.now();
    
    await contentReview.save();
    
    // If content is rejected, flag the content
    if (status === 'rejected') {
      const contentType = contentReview.contentType;
      const contentId = contentReview.contentRef[contentType];
      
      if (contentType === 'post') {
        await Post.findByIdAndUpdate(contentId, { 
          isHidden: true,
          moderationStatus: 'rejected',
          moderationNotes: notes || 'Violated community guidelines'
        });
      } else if (contentType === 'comment') {
        await Comment.findByIdAndUpdate(contentId, { 
          isHidden: true,
          moderationStatus: 'rejected',
          moderationNotes: notes || 'Violated community guidelines'
        });
      } else if (contentType === 'discussion') {
        await Discussion.findByIdAndUpdate(contentId, { 
          isHidden: true,
          moderationStatus: 'rejected',
          moderationNotes: notes || 'Violated community guidelines'
        });
      }
    }
    
    res.json({ 
      msg: `Content ${status === 'approved' ? 'approved' : 'rejected'} successfully`, 
      review: contentReview 
    });
    
  } catch (err) {
    console.error('Error reviewing content:', err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/moderation/stats
 * @desc    Get moderation statistics
 * @access  Admin
 */
router.get('/stats', [auth, admin], async (req, res) => {
  try {
    const timeRange = req.query.timeRange || 'week';
    
    // Set date range based on time range
    let dateFilter = {};
    const now = new Date();
    
    if (timeRange === 'day') {
      const oneDayAgo = new Date(now);
      oneDayAgo.setDate(now.getDate() - 1);
      dateFilter = { createdAt: { $gte: oneDayAgo } };
    } else if (timeRange === 'week') {
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      dateFilter = { createdAt: { $gte: oneWeekAgo } };
    } else if (timeRange === 'month') {
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(now.getMonth() - 1);
      dateFilter = { createdAt: { $gte: oneMonthAgo } };
    }
    
    // Count total reports by status
    const totalPending = await ContentReview.countDocuments({ 
      ...dateFilter, 
      status: 'pending' 
    });
    
    const totalApproved = await ContentReview.countDocuments({ 
      ...dateFilter, 
      status: 'approved' 
    });
    
    const totalRejected = await ContentReview.countDocuments({ 
      ...dateFilter, 
      status: 'rejected' 
    });
    
    // Count by content type
    const postReports = await ContentReview.countDocuments({
      ...dateFilter,
      contentType: 'post'
    });
    
    const commentReports = await ContentReview.countDocuments({
      ...dateFilter,
      contentType: 'comment'
    });
    
    const discussionReports = await ContentReview.countDocuments({
      ...dateFilter,
      contentType: 'discussion'
    });
    
    // Average review time (in hours)
    const reviewedItems = await ContentReview.find({
      ...dateFilter,
      status: { $in: ['approved', 'rejected'] },
      reviewedAt: { $exists: true }
    });
    
    let totalReviewTime = 0;
    let reviewedCount = 0;
    
    reviewedItems.forEach(item => {
      if (item.reviewedAt && item.createdAt) {
        const reviewTime = item.reviewedAt.getTime() - item.createdAt.getTime();
        totalReviewTime += reviewTime;
        reviewedCount++;
      }
    });
    
    const avgReviewTimeMs = reviewedCount > 0 ? totalReviewTime / reviewedCount : 0;
    const avgReviewTimeHours = avgReviewTimeMs / (1000 * 60 * 60);
    
    res.json({
      timeRange,
      totalReports: totalPending + totalApproved + totalRejected,
      byStatus: {
        pending: totalPending,
        approved: totalApproved,
        rejected: totalRejected
      },
      byContentType: {
        post: postReports,
        comment: commentReports,
        discussion: discussionReports
      },
      averageReviewTimeHours: avgReviewTimeHours.toFixed(2),
      reviewedCount
    });
    
  } catch (err) {
    console.error('Error fetching moderation stats:', err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 