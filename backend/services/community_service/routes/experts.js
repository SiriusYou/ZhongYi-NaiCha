const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Expert = require('../models/Expert');
const Notification = require('../models/Notification');

// @route   GET api/experts
// @desc    Get all experts with pagination and filtering
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build query with filters
    const query = { isActive: true, verificationStatus: 'verified' };
    
    // Filter by specialization
    if (req.query.specialization) {
      query.specialization = req.query.specialization;
    }
    
    // Search by name or bio
    if (req.query.search) {
      // This would require a text index on the underlying User model
      // For now, we'll search by bio field
      query.bio = { $regex: req.query.search, $options: 'i' };
    }
    
    // Get experts with pagination
    const experts = await Expert.find(query)
      .sort({ featuredPosition: -1, 'rating.average': -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar');
    
    // Get total count for pagination
    const total = await Expert.countDocuments(query);
    
    res.json({
      experts,
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

// @route   GET api/experts/:id
// @desc    Get expert by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const expert = await Expert.findById(req.params.id)
      .populate('user', 'name avatar email');
    
    // Check if expert exists and is verified
    if (!expert || !expert.isActive || expert.verificationStatus !== 'verified') {
      return res.status(404).json({ msg: 'Expert not found' });
    }
    
    res.json(expert);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Expert not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/experts
// @desc    Apply to become an expert
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('specialization', 'Specialization is required').isIn([
        'traditional_chinese_medicine',
        'herbalist',
        'acupuncturist',
        'nutritionist',
        'tea_master',
        'wellness_coach',
        'other'
      ]),
      check('qualifications', 'At least one qualification is required').isArray({ min: 1 }),
      check('qualifications.*.degree', 'Degree is required for each qualification').not().isEmpty(),
      check('qualifications.*.institution', 'Institution is required for each qualification').not().isEmpty(),
      check('qualifications.*.year', 'Year is required for each qualification').isNumeric(),
      check('experience', 'Years of experience is required').isNumeric(),
      check('bio', 'Bio is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      // Check if user already has an expert profile
      let expertProfile = await Expert.findOne({ user: req.user.id });
      
      if (expertProfile) {
        return res.status(400).json({ msg: 'Expert profile already exists for this user' });
      }
      
      // Create new expert profile
      const newExpert = new Expert({
        user: req.user.id,
        specialization: req.body.specialization,
        qualifications: req.body.qualifications,
        experience: req.body.experience,
        bio: req.body.bio,
        profileImage: req.body.profileImage,
        contactInfo: req.body.contactInfo || {},
        availability: req.body.availability || {
          isAvailableForQuestions: true,
          schedule: []
        },
        verificationStatus: 'pending'
      });
      
      const expert = await newExpert.save();
      
      // Notify admins about the new expert application (in a real app)
      
      res.json({
        expert,
        message: 'Your expert application has been submitted for review'
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/experts/:id
// @desc    Update expert profile
// @access  Private
router.put(
  '/:id',
  [
    auth,
    [
      check('bio', 'Bio is required').not().isEmpty(),
      check('experience', 'Years of experience is required').isNumeric()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const expert = await Expert.findById(req.params.id);
      
      // Check if expert profile exists
      if (!expert) {
        return res.status(404).json({ msg: 'Expert profile not found' });
      }
      
      // Check user authorization
      if (expert.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }
      
      // Check which fields to update
      const updatedFields = {};
      
      if (req.body.bio) updatedFields.bio = req.body.bio;
      if (req.body.experience) updatedFields.experience = req.body.experience;
      if (req.body.profileImage) updatedFields.profileImage = req.body.profileImage;
      if (req.body.contactInfo) updatedFields.contactInfo = req.body.contactInfo;
      if (req.body.availability) updatedFields.availability = req.body.availability;
      
      // Don't allow updating verification status
      if (req.body.verificationStatus) {
        delete req.body.verificationStatus;
      }
      
      // Update expert profile
      const updatedExpert = await Expert.findByIdAndUpdate(
        req.params.id,
        { $set: updatedFields },
        { new: true }
      ).populate('user', 'name avatar');
      
      res.json(updatedExpert);
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Expert profile not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/experts/:id/verify
// @desc    Verify an expert (admin only)
// @access  Private (Admin only)
router.put(
  '/:id/verify',
  [
    auth,
    [
      check('verificationStatus', 'Verification status is required').isIn(['verified', 'rejected']),
      check('verificationNotes', 'Verification notes are required if rejecting').if((value, { req }) => req.body.verificationStatus === 'rejected').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      // TODO: Add check to verify user is an admin
      
      const expert = await Expert.findById(req.params.id);
      
      // Check if expert profile exists
      if (!expert) {
        return res.status(404).json({ msg: 'Expert profile not found' });
      }
      
      // Update verification status
      expert.verificationStatus = req.body.verificationStatus;
      expert.verificationNotes = req.body.verificationNotes || '';
      expert.verifiedBy = req.user.id;
      expert.verificationDate = Date.now();
      
      await expert.save();
      
      // Create notification for the expert
      const notification = new Notification({
        recipient: expert.user,
        sender: req.user.id,
        type: 'expert_verification_status',
        content: `Your expert application has been ${req.body.verificationStatus}`,
        // No related post or comment for this notification
      });
      
      await notification.save();
      
      // Emit socket event if user is online
      if (req.io) {
        req.io.to(`user-${expert.user.toString()}`).emit('notification', {
          type: 'expert_verification_status',
          expertId: expert._id,
          status: req.body.verificationStatus,
          senderId: req.user.id
        });
      }
      
      res.json({
        success: true,
        expert
      });
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Expert profile not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/experts/:id/rate
// @desc    Rate an expert
// @access  Private
router.post(
  '/:id/rate',
  [
    auth,
    [
      check('rating', 'Rating is required and must be between 1 and 5').isFloat({ min: 1, max: 5 })
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
      const expert = await Expert.findById(req.params.id);
      
      // Check if expert exists and is verified
      if (!expert || !expert.isActive || expert.verificationStatus !== 'verified') {
        return res.status(404).json({ msg: 'Expert not found' });
      }
      
      // Calculate new average rating
      const currentTotal = expert.rating.average * expert.rating.count;
      const newCount = expert.rating.count + 1;
      const newAverage = (currentTotal + req.body.rating) / newCount;
      
      // Update expert rating
      expert.rating.average = newAverage;
      expert.rating.count = newCount;
      
      await expert.save();
      
      res.json({
        success: true,
        rating: expert.rating
      });
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: 'Expert not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/experts/specialization/:type
// @desc    Get experts by specialization
// @access  Public
router.get('/specialization/:type', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Validate specialization type
    const validSpecializations = [
      'traditional_chinese_medicine',
      'herbalist',
      'acupuncturist',
      'nutritionist',
      'tea_master',
      'wellness_coach',
      'other'
    ];
    
    if (!validSpecializations.includes(req.params.type)) {
      return res.status(400).json({ msg: 'Invalid specialization type' });
    }
    
    // Get experts by specialization
    const experts = await Expert.find({ 
      specialization: req.params.type,
      isActive: true,
      verificationStatus: 'verified'
    })
      .sort({ featuredPosition: -1, 'rating.average': -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name avatar');
    
    // Get total count for pagination
    const total = await Expert.countDocuments({ 
      specialization: req.params.type,
      isActive: true,
      verificationStatus: 'verified'
    });
    
    res.json({
      experts,
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