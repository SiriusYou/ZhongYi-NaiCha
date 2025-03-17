const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Discussion = require('../models/Discussion');
const Notification = require('../models/Notification');
const contentModeration = require('../middleware/contentModeration');

// @route   GET api/discussions
// @desc    Get all discussions with pagination and filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build query with filters
    const query = { isActive: true, isPrivate: false };
    
    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Search by title or description
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Filter by tag
    if (req.query.tag) {
      query.tags = req.query.tag;
    }
    
    // Get discussions with pagination
    const discussions = await Discussion.find(query)
      .sort({ isPinned: -1, lastActivity: -1 })
      .skip(skip)
      .limit(limit)
      .populate('creator', 'name avatar')
      .populate('participants.user', 'name avatar');
    
    // Get total count for pagination
    const total = await Discussion.countDocuments(query);
    
    res.json({
      discussions,
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

// @route   GET api/discussions/my
// @desc    Get discussions created by or participated in by the user
// @access  Private
router.get('/my', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Find discussions where user is creator or participant
    const query = {
      isActive: true,
      $or: [
        { creator: req.user.id },
        { 'participants.user': req.user.id }
      ]
    };
    
    // Get discussions with pagination
    const discussions = await Discussion.find(query)
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit)
      .populate('creator', 'name avatar')
      .populate('participants.user', 'name avatar');
    
    // Get total count for pagination
    const total = await Discussion.countDocuments(query);
    
    res.json({
      discussions,
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

// @route   GET api/discussions/:id
// @desc    Get discussion by ID
// @access  Mixed (Public for non-private, Private for private)
router.get('/:id', async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('creator', 'name avatar')
      .populate('participants.user', 'name avatar')
      .populate('messages.user', 'name avatar');
    
    // Check if discussion exists
    if (!discussion || !discussion.isActive) {
      return res.status(404).json({ msg: 'Discussion not found' });
    }
    
    // If discussion is private, check authorization
    if (discussion.isPrivate) {
      // Get token from header
      const token = req.header('x-auth-token');
      
      // No token means unauthorized for private discussions
      if (!token) {
        return res.status(401).json({ msg: 'Authorization required for this discussion' });
      }
      
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user.id;
        
        // Check if user is creator or allowed
        const isAuthorized = 
          discussion.creator.equals(userId) || 
          discussion.allowedUsers.some(user => user.equals(userId));
        
        if (!isAuthorized) {
          return res.status(403).json({ msg: 'You do not have permission to view this discussion' });
        }
      } catch (err) {
        return res.status(401).json({ msg: 'Token is not valid' });
      }
    }
    
    res.json(discussion);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Discussion not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/discussions
// @desc    Create a new discussion
// @access  Private
router.post(
  '/',
  [
    auth,
    contentModeration.moderateContent('discussion'),
    contentModeration.registerContentId,
    [
      check('title', 'Title is required').not().isEmpty().trim(),
      check('content', 'Content is required').not().isEmpty(),
      check('type', 'Discussion type is required').isIn(['general', 'expert_qa', 'recipe_advice', 'health_advice', 'community_event'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      // Create new discussion
      const newDiscussion = new Discussion({
        user: req.user.id,
        title: req.body.title,
        content: req.body.content,
        type: req.body.type,
        tags: req.body.tags || [],
        images: req.body.images || [],
        expertiseRequired: req.body.expertiseRequired || []
      });
      
      const discussion = await newDiscussion.save();
      
      // Return the discussion with populated user data
      await discussion.populate('user', 'name avatar');
      
      res.json(discussion);
      
      // Apply content review middleware
      contentModeration.createContentReview('discussion')(req, res, () => {});
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/discussions/:id
// @desc    Update a discussion
// @access  Private
router.put(
  '/:id',
  [
    auth,
    contentModeration.moderateContent('discussion'),
    [
      check('title', 'Title is required').not().isEmpty().trim(),
      check('content', 'Content is required').not().isEmpty(),
      check('type', 'Discussion type is required').isIn(['general', 'expert_qa', 'recipe_advice', 'health_advice', 'community_event'])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const discussion = await Discussion.findById(req.params.id);
      
      if (!discussion) {
        return res.status(404).json({ msg: 'Discussion not found' });
      }
      
      // Check user authorization
      if (discussion.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized to update this discussion' });
      }
      
      // Check if discussion is active
      if (!discussion.isActive) {
        return res.status(400).json({ msg: 'This discussion has been deleted or deactivated' });
      }
      
      // Update discussion fields
      discussion.title = req.body.title;
      discussion.content = req.body.content;
      discussion.type = req.body.type;
      discussion.tags = req.body.tags || discussion.tags;
      discussion.images = req.body.images || discussion.images;
      discussion.expertiseRequired = req.body.expertiseRequired || discussion.expertiseRequired;
      discussion.updatedAt = Date.now();
      
      const updatedDiscussion = await discussion.save();
      
      res.json(updatedDiscussion);
      
      // Create new content review for the updated content
      req.contentId = discussion._id;
      contentModeration.createContentReview('discussion')(req, res, () => {});
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Discussion not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/discussions/:id
// @desc    Delete a discussion (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    
    // Check if discussion exists
    if (!discussion) {
      return res.status(404).json({ msg: 'Discussion not found' });
    }
    
    // Check user authorization
    if (discussion.creator.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }
    
    // Soft delete by setting isActive to false
    discussion.isActive = false;
    await discussion.save();
    
    res.json({ msg: 'Discussion removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Discussion not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/discussions/:id/message
// @desc    Add a message to a discussion
// @access  Private
router.post(
  '/:id/message',
  [
    auth,
    [
      check('content', 'Message content is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const discussion = await Discussion.findById(req.params.id);
      
      // Check if discussion exists
      if (!discussion || !discussion.isActive) {
        return res.status(404).json({ msg: 'Discussion not found' });
      }
      
      // Check if discussion is private and user is authorized
      if (discussion.isPrivate) {
        const isAuthorized = 
          discussion.creator.equals(req.user.id) || 
          discussion.allowedUsers.some(user => user.equals(req.user.id));
        
        if (!isAuthorized) {
          return res.status(403).json({ msg: 'You do not have permission to post in this discussion' });
        }
      }
      
      // Check if user is already a participant
      const isParticipant = discussion.participants.some(
        participant => participant.user.equals(req.user.id)
      );
      
      // Add user as participant if not already
      if (!isParticipant) {
        discussion.participants.push({
          user: req.user.id,
          joinedAt: Date.now()
        });
      }
      
      // Create new message
      const newMessage = {
        user: req.user.id,
        content: req.body.content,
        images: req.body.images || [],
        isExpertResponse: req.body.isExpertResponse || false // TODO: Verify if user is expert
      };
      
      // Add message to discussion
      discussion.messages.push(newMessage);
      discussion.lastActivity = Date.now();
      
      await discussion.save();
      
      // Get the newly added message
      const message = discussion.messages[discussion.messages.length - 1];
      
      // Populate user data for the message
      await discussion.populate('messages.user', 'name avatar');
      
      // Notify all participants except the sender
      const participantsToNotify = discussion.participants
        .filter(participant => !participant.user.equals(req.user.id))
        .map(participant => participant.user);
      
      // Create notifications and emit socket events
      for (const recipient of participantsToNotify) {
        const notification = new Notification({
          recipient,
          sender: req.user.id,
          type: 'comment_on_post', // Using same type as post comments for simplicity
          content: `replied in discussion "${discussion.title.substring(0, 30)}${discussion.title.length > 30 ? '...' : ''}"`,
          // No direct relatedPost field for discussions
        });
        
        await notification.save();
        
        // Emit socket event if user is online
        if (req.io) {
          req.io.to(`user-${recipient.toString()}`).emit('notification', {
            type: 'discussion_message',
            discussionId: discussion._id,
            messageId: message._id,
            senderId: req.user.id
          });
        }
      }
      
      // Emit to discussion room for real-time updates
      if (req.io) {
        req.io.to(`discussion-${discussion._id}`).emit('new_message', {
          discussionId: discussion._id,
          message: {
            ...message.toObject(),
            user: discussion.messages[discussion.messages.length - 1].user
          }
        });
      }
      
      res.json(message);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Discussion not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/discussions/:id/message/:messageId
// @desc    Update a message
// @access  Private
router.put(
  '/:id/message/:messageId',
  [
    auth,
    [
      check('content', 'Message content is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const discussion = await Discussion.findById(req.params.id);
      
      // Check if discussion exists
      if (!discussion || !discussion.isActive) {
        return res.status(404).json({ msg: 'Discussion not found' });
      }
      
      // Find the message
      const message = discussion.messages.id(req.params.messageId);
      if (!message) {
        return res.status(404).json({ msg: 'Message not found' });
      }
      
      // Check user authorization
      if (message.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }
      
      // Update the message
      message.content = req.body.content;
      message.images = req.body.images || message.images;
      message.updatedAt = Date.now();
      message.isEdited = true;
      
      await discussion.save();
      
      // Emit to discussion room for real-time updates
      if (req.io) {
        req.io.to(`discussion-${discussion._id}`).emit('message_updated', {
          discussionId: discussion._id,
          messageId: message._id,
          message
        });
      }
      
      res.json(message);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Discussion or message not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/discussions/:id/pin
// @desc    Pin or unpin a discussion (admin only)
// @access  Private (Admin only)
router.put('/:id/pin', auth, async (req, res) => {
  try {
    // TODO: Add check to verify user is an admin
    
    const discussion = await Discussion.findById(req.params.id);
    
    // Check if discussion exists
    if (!discussion || !discussion.isActive) {
      return res.status(404).json({ msg: 'Discussion not found' });
    }
    
    // Toggle pin status
    discussion.isPinned = !discussion.isPinned;
    await discussion.save();
    
    res.json({
      success: true,
      isPinned: discussion.isPinned
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Discussion not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/discussions/:id/join
// @desc    Join a discussion
// @access  Private
router.put('/:id/join', auth, async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    
    // Check if discussion exists
    if (!discussion || !discussion.isActive) {
      return res.status(404).json({ msg: 'Discussion not found' });
    }
    
    // Check if discussion is private and user is allowed
    if (discussion.isPrivate) {
      const isAllowed = discussion.allowedUsers.some(user => user.equals(req.user.id));
      
      if (!isAllowed && !discussion.creator.equals(req.user.id)) {
        return res.status(403).json({ msg: 'You do not have permission to join this discussion' });
      }
    }
    
    // Check if user is already a participant
    const isParticipant = discussion.participants.some(
      participant => participant.user.equals(req.user.id)
    );
    
    if (isParticipant) {
      return res.status(400).json({ msg: 'User is already a participant in this discussion' });
    }
    
    // Add user as participant
    discussion.participants.push({
      user: req.user.id,
      joinedAt: Date.now()
    });
    
    await discussion.save();
    
    // Populate user data for the new participant
    await discussion.populate('participants.user', 'name avatar');
    
    res.json({
      success: true,
      participants: discussion.participants
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Discussion not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/discussions/:id/leave
// @desc    Leave a discussion
// @access  Private
router.put('/:id/leave', auth, async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id);
    
    // Check if discussion exists
    if (!discussion || !discussion.isActive) {
      return res.status(404).json({ msg: 'Discussion not found' });
    }
    
    // Creator cannot leave the discussion
    if (discussion.creator.equals(req.user.id)) {
      return res.status(400).json({ msg: 'Creator cannot leave the discussion' });
    }
    
    // Check if user is a participant
    const isParticipant = discussion.participants.some(
      participant => participant.user.equals(req.user.id)
    );
    
    if (!isParticipant) {
      return res.status(400).json({ msg: 'User is not a participant in this discussion' });
    }
    
    // Remove user from participants
    discussion.participants = discussion.participants.filter(
      participant => !participant.user.equals(req.user.id)
    );
    
    await discussion.save();
    
    res.json({
      success: true,
      message: 'Successfully left the discussion'
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Discussion not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router; 