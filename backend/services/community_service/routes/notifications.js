const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');

// @route   GET api/notifications
// @desc    Get all notifications for the authenticated user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get notifications for the user with pagination
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name avatar')
      .populate('relatedPost', 'title')
      .populate('relatedComment', 'content');
    
    // Get total count for pagination
    const total = await Notification.countDocuments({ recipient: req.user.id });
    
    // Get unread count
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user.id,
      isRead: false
    });
    
    res.json({
      notifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/notifications/unread
// @desc    Get unread notifications count
// @access  Private
router.get('/unread', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      recipient: req.user.id,
      isRead: false
    });
    
    res.json({ count });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    // Check if notification exists
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    
    // Check user authorization
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Mark as read if not already
    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();
    }
    
    res.json({ success: true, notification });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    
    res.json({ 
      success: true, 
      count: result.modifiedCount 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    // Check if notification exists
    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    
    // Check user authorization
    if (notification.recipient.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Delete notification
    await notification.remove();
    
    res.json({ success: true, msg: 'Notification removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Notification not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/notifications
// @desc    Delete all notifications for the user
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    const result = await Notification.deleteMany({ recipient: req.user.id });
    
    res.json({ 
      success: true, 
      count: result.deletedCount,
      msg: 'All notifications deleted' 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/notifications/subscribe
// @desc    Subscribe to push notifications (placeholder for future implementation)
// @access  Private
router.post('/subscribe', auth, async (req, res) => {
  try {
    // This would normally save the user's push notification tokens
    // For example, web push subscription data or FCM tokens
    
    // Placeholder implementation
    res.json({ 
      success: true, 
      msg: 'Successfully subscribed to push notifications' 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/notifications/unsubscribe
// @desc    Unsubscribe from push notifications (placeholder for future implementation)
// @access  Private
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    // This would normally remove the user's push notification tokens
    
    // Placeholder implementation
    res.json({ 
      success: true, 
      msg: 'Successfully unsubscribed from push notifications' 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 