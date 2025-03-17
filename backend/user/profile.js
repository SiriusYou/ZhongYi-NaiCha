/**
 * User Profile Service
 * Handles creating and updating user health profiles
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');

// Mock health profile database for initial setup
const healthProfiles = [];

/**
 * TCM constitutions types
 */
const tcmConstitutionTypes = [
  'balanced', 
  'qi_deficient', 
  'yang_deficient', 
  'yin_deficient', 
  'phlegm_damp', 
  'damp_heat', 
  'qi_stagnation', 
  'blood_stagnation', 
  'blood_deficiency'
];

/**
 * Create or update health profile
 */
router.post('/health-profile', verifyToken, (req, res) => {
  try {
    const { 
      age, 
      gender, 
      height, 
      weight, 
      tcmConstitution, 
      healthGoals,
      allergies,
      medicalConditions
    } = req.body;
    
    // Basic validation
    if (!age || !gender || !height || !weight) {
      return res.status(400).json({ 
        message: 'Missing required fields. Please provide age, gender, height, and weight.' 
      });
    }
    
    // Validate TCM constitution if provided
    if (tcmConstitution && !tcmConstitutionTypes.includes(tcmConstitution)) {
      return res.status(400).json({ 
        message: 'Invalid TCM constitution type.',
        validTypes: tcmConstitutionTypes
      });
    }
    
    // Check if profile already exists
    const existingProfileIndex = healthProfiles.findIndex(
      profile => profile.userId === req.user.userId
    );
    
    const healthProfile = {
      userId: req.user.userId,
      age,
      gender,
      height,
      weight,
      tcmConstitution: tcmConstitution || 'balanced',
      healthGoals: healthGoals || [],
      allergies: allergies || [],
      medicalConditions: medicalConditions || [],
      bmi: calculateBMI(height, weight),
      updatedAt: new Date()
    };
    
    // Update existing or create new
    if (existingProfileIndex >= 0) {
      healthProfiles[existingProfileIndex] = healthProfile;
      return res.status(200).json({
        message: 'Health profile updated successfully',
        profile: healthProfile
      });
    } else {
      healthProfile.createdAt = new Date();
      healthProfiles.push(healthProfile);
      return res.status(201).json({
        message: 'Health profile created successfully',
        profile: healthProfile
      });
    }
  } catch (error) {
    console.error('Health profile error:', error);
    return res.status(500).json({ 
      message: 'Failed to save health profile', 
      error: error.message 
    });
  }
});

/**
 * Get user health profile
 */
router.get('/health-profile', verifyToken, (req, res) => {
  try {
    const healthProfile = healthProfiles.find(
      profile => profile.userId === req.user.userId
    );
    
    if (!healthProfile) {
      return res.status(404).json({ message: 'Health profile not found' });
    }
    
    return res.status(200).json(healthProfile);
  } catch (error) {
    console.error('Get health profile error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve health profile', 
      error: error.message 
    });
  }
});

/**
 * Calculate BMI helper function
 * @param {number} heightCm - Height in centimeters
 * @param {number} weightKg - Weight in kilograms
 * @returns {number} - BMI value
 */
function calculateBMI(heightCm, weightKg) {
  // Convert height from cm to m
  const heightM = heightCm / 100;
  
  // BMI formula: weight(kg) / height(m)²
  const bmi = weightKg / (heightM * heightM);
  
  // Round to 1 decimal place
  return Math.round(bmi * 10) / 10;
}

module.exports = router; 