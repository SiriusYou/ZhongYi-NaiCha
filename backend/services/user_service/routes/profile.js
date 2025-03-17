const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const HealthProfile = require('../models/HealthProfile');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/profile
// @desc    Create or update user health profile
// @access  Private
router.post(
  '/',
  [
    auth,
    [
      check('age', 'Age must be between 0 and 120')
        .optional()
        .isInt({ min: 0, max: 120 }),
      check('gender', 'Gender must be male, female, or other')
        .optional()
        .isIn(['male', 'female', 'other']),
      check('height', 'Height must be between 0 and 250 cm')
        .optional()
        .isFloat({ min: 0, max: 250 }),
      check('weight', 'Weight must be between 0 and 500 kg')
        .optional()
        .isFloat({ min: 0, max: 500 }),
      check('tcmConstitution', 'Invalid TCM constitution type')
        .optional()
        .isIn([
          'balanced',
          'qi_deficiency',
          'yang_deficiency',
          'yin_deficiency',
          'phlegm_dampness',
          'damp_heat',
          'blood_stasis',
          'qi_stagnation',
          'special_constitution'
        ])
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract profile fields from request
    const {
      age,
      gender,
      height,
      weight,
      tcmConstitution,
      healthGoals,
      allergies,
      contraindications,
      chronicConditions,
      currentSymptoms
    } = req.body;

    // Build profile object
    const profileFields = {};
    profileFields.user = req.user.id;
    
    if (age !== undefined) profileFields.age = age;
    if (gender) profileFields.gender = gender;
    if (height !== undefined) profileFields.height = height;
    if (weight !== undefined) profileFields.weight = weight;
    if (tcmConstitution) profileFields.tcmConstitution = tcmConstitution;
    if (healthGoals) profileFields.healthGoals = healthGoals;
    if (allergies) profileFields.allergies = allergies;
    if (contraindications) profileFields.contraindications = contraindications;
    if (chronicConditions) profileFields.chronicConditions = chronicConditions;
    if (currentSymptoms) profileFields.currentSymptoms = currentSymptoms;

    try {
      // Check if user exists
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }

      // Check if profile exists
      let profile = await HealthProfile.findOne({ user: req.user.id });

      if (profile) {
        // Update existing profile
        profile = await HealthProfile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );

        return res.json(profile);
      }

      // Create new profile
      profile = new HealthProfile(profileFields);
      await profile.save();

      return res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/profile
// @desc    Get current user's health profile
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ user: req.user.id });

    if (!profile) {
      return res.status(404).json({ msg: 'Health profile not found' });
    }

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/profile/symptoms
// @desc    Update user's current symptoms
// @access  Private
router.put(
  '/symptoms',
  [
    auth,
    [
      check('symptoms', 'Symptoms are required').isArray(),
      check('symptoms.*.symptom', 'Symptom name is required').not().isEmpty(),
      check('symptoms.*.severity', 'Severity must be between 1 and 10')
        .isInt({ min: 1, max: 10 })
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { symptoms } = req.body;

    try {
      const profile = await HealthProfile.findOne({ user: req.user.id });

      if (!profile) {
        return res.status(404).json({ msg: 'Health profile not found' });
      }

      // Add current date to each symptom if not provided
      const formattedSymptoms = symptoms.map(symptom => ({
        ...symptom,
        startedAt: symptom.startedAt || new Date()
      }));

      // Update symptoms
      profile.currentSymptoms = formattedSymptoms;
      
      // Add to data history
      profile.dataHistory.push({
        symptoms: formattedSymptoms,
        date: new Date()
      });

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   GET api/profile/history
// @desc    Get user's health data history
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ user: req.user.id });

    if (!profile) {
      return res.status(404).json({ msg: 'Health profile not found' });
    }

    res.json(profile.dataHistory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 