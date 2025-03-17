/**
 * Recommendation Engine Service
 * Provides personalized tea recipe recommendations based on health profile, season, and symptoms
 */

const express = require('express');
const router = express.Router();

// Mock tea recipe database for initial setup
const teaRecipes = [
  {
    id: 'tr001',
    name: '养生花茶',
    description: '滋阴润肺，适合干燥季节',
    ingredients: ['菊花', '枸杞', '红枣', '茉莉花', '桂花', '红茶'],
    benefits: ['滋阴润肺', '清热明目', '安神养颜'],
    suitableFor: ['yin_deficient', 'balanced'],
    bestSeason: 'autumn',
    helpsWith: ['dry_throat', 'dry_skin', 'eye_fatigue'],
    preparation: '用95°C的水冲泡3-5分钟',
    imageUrl: 'https://example.com/tea/yangsheng.jpg',
    nutritionFacts: {
      calories: 15,
      sugar: 0.5,
      antioxidants: 'high'
    },
    cautions: ['孕妇慎用'],
    taste: {
      sweet: 3,
      bitter: 1,
      sour: 0,
      floral: 4
    }
  },
  {
    id: 'tr002',
    name: '四季养生奶茶',
    description: '滋补养生，四季皆宜',
    ingredients: ['红茶', '枸杞', '红枣', '牛奶', '桂圆'],
    benefits: ['补气养血', '增强免疫力', '改善睡眠'],
    suitableFor: ['qi_deficient', 'blood_deficiency', 'balanced'],
    bestSeason: 'all',
    helpsWith: ['fatigue', 'poor_sleep', 'weak_immunity'],
    preparation: '煮沸后小火慢炖5分钟',
    imageUrl: 'https://example.com/tea/milktea.jpg',
    nutritionFacts: {
      calories: 120,
      sugar: 5,
      antioxidants: 'medium'
    },
    cautions: ['乳糖不耐受者慎用'],
    taste: {
      sweet: 4,
      bitter: 2,
      sour: 0,
      floral: 1
    }
  },
  {
    id: 'tr003',
    name: '清爽薄荷奶茶',
    description: '清热解暑，适合夏季饮用',
    ingredients: ['绿茶', '新鲜薄荷', '蜂蜜', '牛奶', '冰块'],
    benefits: ['清热解暑', '提神醒脑', '改善消化'],
    suitableFor: ['damp_heat', 'qi_stagnation', 'balanced'],
    bestSeason: 'summer',
    helpsWith: ['heat_stress', 'fatigue', 'poor_digestion'],
    preparation: '冰镇后饮用，或加冰块',
    imageUrl: 'https://example.com/tea/mint.jpg',
    nutritionFacts: {
      calories: 90,
      sugar: 10,
      antioxidants: 'medium'
    },
    cautions: ['胃寒者慎用'],
    taste: {
      sweet: 3,
      bitter: 1,
      sour: 0,
      floral: 2
    }
  },
  {
    id: 'tr004',
    name: '姜茶奶茶',
    description: '温阳驱寒，适合冬季饮用',
    ingredients: ['红茶', '新鲜姜', '红糖', '牛奶', '肉桂'],
    benefits: ['温阳驱寒', '促进血液循环', '缓解关节疼痛'],
    suitableFor: ['yang_deficient', 'qi_deficient', 'balanced'],
    bestSeason: 'winter',
    helpsWith: ['cold_hands_feet', 'poor_circulation', 'joint_pain'],
    preparation: '煮沸后加入牛奶，小火慢炖3分钟',
    imageUrl: 'https://example.com/tea/ginger.jpg',
    nutritionFacts: {
      calories: 110,
      sugar: 12,
      antioxidants: 'medium'
    },
    cautions: ['阴虚火旺者慎用'],
    taste: {
      sweet: 3,
      bitter: 1,
      sour: 0,
      spicy: 4
    }
  },
  {
    id: 'tr005',
    name: '山楂玫瑰花茶',
    description: '活血化瘀，理气解郁',
    ingredients: ['山楂', '玫瑰花', '乌龙茶', '冰糖', '少量奶'],
    benefits: ['活血化瘀', '理气解郁', '美容养颜'],
    suitableFor: ['qi_stagnation', 'blood_stagnation', 'balanced'],
    bestSeason: 'spring',
    helpsWith: ['stress', 'menstrual_discomfort', 'mood_swings'],
    preparation: '用90°C的水冲泡5分钟后加入少量奶',
    imageUrl: 'https://example.com/tea/hawthorn.jpg',
    nutritionFacts: {
      calories: 70,
      sugar: 8,
      antioxidants: 'high'
    },
    cautions: ['胃酸过多者慎用', '孕妇慎用'],
    taste: {
      sweet: 2,
      bitter: 1,
      sour: 3,
      floral: 4
    }
  }
];

/**
 * Current season based on month
 * @returns {string} - Current season
 */
function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1-12
  
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/**
 * Calculate the match score between a recipe and user profile
 * @param {Object} recipe - Tea recipe
 * @param {Object} profile - User profile
 * @param {Array} symptoms - User reported symptoms
 * @param {string} season - Current season
 * @returns {number} - Match score (0-100)
 */
function calculateMatchScore(recipe, profile, symptoms, season) {
  let score = 0;
  
  // Constitution match (0-40 points)
  if (recipe.suitableFor.includes(profile.tcmConstitution)) {
    score += 40;
  } else if (recipe.suitableFor.includes('balanced')) {
    score += 20;
  }
  
  // Season match (0-20 points)
  if (recipe.bestSeason === 'all' || recipe.bestSeason === season) {
    score += 20;
  }
  
  // Symptom match (0-40 points)
  if (symptoms && symptoms.length > 0) {
    const matchingSymptoms = symptoms.filter(symptom => 
      recipe.helpsWith.includes(symptom)
    );
    
    if (matchingSymptoms.length > 0) {
      // Score based on percentage of symptoms addressed
      score += Math.min(40, (matchingSymptoms.length / symptoms.length) * 40);
    }
  } else {
    // If no symptoms provided, give partial points
    score += 20;
  }
  
  return score;
}

/**
 * Check for allergens and contraindications
 * @param {Object} recipe - Tea recipe
 * @param {Object} profile - User profile
 * @returns {boolean} - True if recipe is safe for user
 */
function isSafeForUser(recipe, profile) {
  // Check for allergies
  if (profile.allergies && profile.allergies.length > 0) {
    for (const allergen of profile.allergies) {
      if (recipe.ingredients.some(ingredient => 
        ingredient.toLowerCase().includes(allergen.toLowerCase())
      )) {
        return false;
      }
    }
  }
  
  // In a real implementation, check more contraindications based on 
  // user medical conditions and recipe cautions
  
  return true;
}

/**
 * Get personalized tea recommendations
 */
router.post('/tea', (req, res) => {
  try {
    const { healthProfile, symptoms = [] } = req.body;
    
    if (!healthProfile) {
      return res.status(400).json({ 
        message: 'Health profile is required for personalized recommendations' 
      });
    }
    
    // Get current season
    const season = req.body.season || getCurrentSeason();
    
    // Filter safe recipes
    const safeRecipes = teaRecipes.filter(recipe => 
      isSafeForUser(recipe, healthProfile)
    );
    
    // Calculate match scores for each recipe
    const scoredRecipes = safeRecipes.map(recipe => ({
      ...recipe,
      matchScore: calculateMatchScore(recipe, healthProfile, symptoms, season)
    }));
    
    // Sort by match score (descending)
    scoredRecipes.sort((a, b) => b.matchScore - a.matchScore);
    
    // Return top recommendations
    return res.status(200).json({
      season,
      recommendations: scoredRecipes.slice(0, 3),
      otherOptions: scoredRecipes.slice(3)
    });
    
  } catch (error) {
    console.error('Recommendation error:', error);
    return res.status(500).json({ 
      message: 'Failed to generate recommendations', 
      error: error.message 
    });
  }
});

/**
 * Get tea recipe by ID
 */
router.get('/tea/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const recipe = teaRecipes.find(r => r.id === id);
    
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    return res.status(200).json(recipe);
  } catch (error) {
    console.error('Get recipe error:', error);
    return res.status(500).json({ 
      message: 'Failed to retrieve recipe', 
      error: error.message 
    });
  }
});

/**
 * Submit feedback for a recommendation
 */
router.post('/feedback', (req, res) => {
  try {
    const { recipeId, rating, comments, effectivenessScore } = req.body;
    
    if (!recipeId || !rating) {
      return res.status(400).json({ 
        message: 'Recipe ID and rating are required' 
      });
    }
    
    // In a real implementation, save the feedback to improve recommendations
    
    return res.status(200).json({
      message: 'Feedback submitted successfully',
      feedbackId: `fb-${Date.now()}`
    });
  } catch (error) {
    console.error('Feedback error:', error);
    return res.status(500).json({ 
      message: 'Failed to submit feedback', 
      error: error.message 
    });
  }
});

module.exports = router; 