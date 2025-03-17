const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Sample Twilio service for SMS (in production, set up properly with environment variables)
const sendVerificationCode = async (phoneNumber, code) => {
  // In development, just log the code
  console.log(`Sending verification code ${code} to ${phoneNumber}`);
  
  // In production, use Twilio or another SMS service
  /*
  const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    body: `Your verification code is: ${code}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber
  });
  */
  
  return true;
};

// Generate a random verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role 
    },
    process.env.JWT_SECRET || 'yourSecretKey', // Use environment variable in production
    { expiresIn: '24h' }
  );
};

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post(
  '/register',
  [
    check('phoneNumber', 'Phone number is required').not().isEmpty(),
    check('phoneNumber', 'Please enter a valid phone number').isMobilePhone()
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber, email, password, authMethod } = req.body;

    try {
      // Check if user already exists
      let user = await User.findOne({ phoneNumber });
      if (user) {
        return res.status(400).json({ 
          errors: [{ msg: 'User already exists' }] 
        });
      }

      // Create verification code
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Code expires in 10 minutes

      // Create new user
      user = new User({
        phoneNumber,
        email,
        password,
        authMethod: authMethod || 'phone_verification',
        verificationCode: {
          code: verificationCode,
          expiresAt
        }
      });

      // Save user to database
      await user.save();

      // Send verification code
      await sendVerificationCode(phoneNumber, verificationCode);

      // Return success response
      res.status(201).json({ 
        message: 'Verification code sent. Please verify your phone number.' 
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/auth/verify
// @desc    Verify phone number with code
// @access  Public
router.post(
  '/verify',
  [
    check('phoneNumber', 'Phone number is required').not().isEmpty(),
    check('code', 'Verification code is required').not().isEmpty()
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber, code } = req.body;

    try {
      // Find user
      const user = await User.findOne({ phoneNumber });
      if (!user) {
        return res.status(404).json({ 
          errors: [{ msg: 'User not found' }] 
        });
      }

      // Check if verification code exists and is valid
      if (!user.verificationCode || 
          user.verificationCode.code !== code || 
          new Date() > user.verificationCode.expiresAt) {
        return res.status(400).json({ 
          errors: [{ msg: 'Invalid or expired verification code' }] 
        });
      }

      // Mark user as verified
      user.isVerified = true;
      user.verificationCode = undefined; // Clear verification code
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = generateToken(user);

      // Return token
      res.json({ token });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('phoneNumber', 'Phone number is required').not().isEmpty(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber, password } = req.body;

    try {
      // Find user
      const user = await User.findOne({ phoneNumber });
      if (!user || user.authMethod !== 'password') {
        return res.status(400).json({ 
          errors: [{ msg: 'Invalid credentials' }] 
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ 
          errors: [{ msg: 'Invalid credentials' }] 
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = generateToken(user);

      // Return token
      res.json({ token });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   POST api/auth/login/phone
// @desc    Login via phone verification
// @access  Public
router.post(
  '/login/phone',
  [
    check('phoneNumber', 'Phone number is required').not().isEmpty(),
    check('phoneNumber', 'Please enter a valid phone number').isMobilePhone()
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phoneNumber } = req.body;

    try {
      // Find user or create new one
      let user = await User.findOne({ phoneNumber });
      if (!user) {
        user = new User({
          phoneNumber,
          authMethod: 'phone_verification'
        });
      }

      // Create verification code
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Code expires in 10 minutes

      // Update user with new verification code
      user.verificationCode = {
        code: verificationCode,
        expiresAt
      };
      await user.save();

      // Send verification code
      await sendVerificationCode(phoneNumber, verificationCode);

      // Return success response
      res.json({ 
        message: 'Verification code sent. Please verify your phone number.' 
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -verificationCode');
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 