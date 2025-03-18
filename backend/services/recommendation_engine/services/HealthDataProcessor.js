const mongoose = require('mongoose');
const UserProfile = require('../models/UserProfile');
const UserBehavior = require('../models/UserBehavior');
const HealthData = require('../models/HealthData');
const Content = require('../models/Content');
const logger = require('../utils/logger');

/**
 * Service for processing health data to enhance recommendation relevance
 */
class HealthDataProcessor {
  constructor() {
    // Mapping of symptoms to relevant content tags
    this.symptomToTagMap = {
      'insomnia': ['sleep', 'relaxation', 'calm'],
      'fatigue': ['energy', 'vitality', 'boost'],
      'digestive_issues': ['digestion', 'stomach', 'gut_health'],
      'stress': ['relaxation', 'calm', 'stress_relief'],
      'headache': ['pain_relief', 'head', 'relaxation'],
      'joint_pain': ['pain_relief', 'inflammation', 'mobility'],
      'skin_problems': ['skin_health', 'detox', 'beauty'],
      'bloating': ['digestion', 'gut_health', 'detox'],
      'cold_symptoms': ['immunity', 'warming', 'respiratory'],
      'allergy': ['allergy_relief', 'respiratory', 'immune_support']
    };

    // Weight mapping for health factors
    this.healthFactorWeights = {
      'symptoms': 2.0,      // Highest priority - current symptoms
      'constitution': 1.5,  // Strong influence - inherent constitution
      'goals': 1.2,         // Important - what user is trying to achieve
      'chronic': 1.0,       // Still relevant but lower than current symptoms
      'preferences': 0.8    // Least weight but still factored in
    };
  }

  /**
   * Get health-enhanced relevance scores for content
   * @param {string} userId - User ID
   * @param {Array} contentItems - Array of content items
   * @returns {Promise<Object>} - Content items with health-enhanced scores
   */
  async getHealthEnhancedRelevanceScores(userId, contentItems) {
    try {
      // Get user health data
      const [userProfile, healthData] = await Promise.all([
        UserProfile.findOne({ user: userId }),
        HealthData.find({ user: userId }).sort({ recordDate: -1 }).limit(10)
      ]);

      if (!userProfile && (!healthData || healthData.length === 0)) {
        // No health data available, return original content
        return contentItems.map(item => ({
          ...item.toObject(),
          healthRelevance: 0.5 // Neutral score
        }));
      }

      // Process latest health data
      const healthInsights = this._extractHealthInsights(userProfile, healthData);
      
      // Calculate health relevance for each content item
      return contentItems.map(item => {
        const healthRelevance = this._calculateHealthRelevance(item, healthInsights);
        return {
          ...item.toObject(),
          healthRelevance
        };
      });
    } catch (error) {
      logger.error(`Error processing health data for recommendations: ${error.message}`);
      // Return original content with neutral scores in case of error
      return contentItems.map(item => ({
        ...item.toObject(),
        healthRelevance: 0.5 // Neutral score
      }));
    }
  }

  /**
   * Extract health insights from user profile and health data
   * @param {Object} userProfile - User profile
   * @param {Array} healthData - Health data history
   * @returns {Object} - Health insights
   * @private
   */
  _extractHealthInsights(userProfile, healthData) {
    const insights = {
      constitution: userProfile?.tcmConstitution || 'balanced',
      recentSymptoms: new Map(),
      healthGoals: userProfile?.healthGoals || [],
      chronicConditions: userProfile?.chronicConditions || [],
      preferences: new Set()
    };

    // Process recent health data to identify trends and current symptoms
    if (healthData && healthData.length > 0) {
      // Count symptom occurrences and average severity
      const symptomCounts = new Map();
      const symptomSeverities = new Map();

      healthData.forEach(record => {
        if (record.symptoms && record.symptoms.length > 0) {
          record.symptoms.forEach(symptom => {
            const count = symptomCounts.get(symptom) || 0;
            symptomCounts.set(symptom, count + 1);
            
            const severity = symptomSeverities.get(symptom) || 0;
            symptomSeverities.set(symptom, severity + 1);
          });
        }

        // Extract tea consumption preferences
        if (record.teaConsumption && record.teaConsumption.length > 0) {
          record.teaConsumption.forEach(tea => {
            insights.preferences.add(tea.teaName.toLowerCase());
          });
        }
      });

      // Calculate average symptom severities and add to insights
      for (const [symptom, count] of symptomCounts.entries()) {
        const averageSeverity = symptomSeverities.get(symptom) / count;
        insights.recentSymptoms.set(symptom, averageSeverity);
      }

      // Add tracking for health metrics
      insights.metrics = {
        sleepQuality: this._calculateMetricAverage(healthData, 'sleepQuality'),
        stressLevel: this._calculateMetricAverage(healthData, 'stressLevel'),
        energyLevel: this._calculateMetricAverage(healthData, 'energyLevel'),
        digestiveHealth: this._calculateMetricAverage(healthData, 'digestiveHealth')
      };
    }

    return insights;
  }

  /**
   * Calculate average value for a health metric
   * @param {Array} healthData - Health data records
   * @param {string} metricName - Name of the metric
   * @returns {number} - Average value
   * @private
   */
  _calculateMetricAverage(healthData, metricName) {
    const values = healthData
      .filter(record => record[metricName] !== undefined && record[metricName] !== null)
      .map(record => record[metricName]);
    
    if (values.length === 0) return null;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate health relevance for a content item
   * @param {Object} contentItem - Content item
   * @param {Object} healthInsights - Health insights
   * @returns {number} - Health relevance score
   * @private
   */
  _calculateHealthRelevance(contentItem, healthInsights) {
    let relevanceScore = 0;
    let weightSum = 0;

    // Content tags for matching
    const contentTags = contentItem.tags ? 
      contentItem.tags.map(tag => tag.toLowerCase()) : [];
    
    if (contentTags.length === 0) return 0.5; // Neutral score for content without tags

    // 1. Check relevance to symptoms (highest priority)
    if (healthInsights.recentSymptoms.size > 0) {
      let symptomRelevance = 0;
      
      for (const [symptom, severity] of healthInsights.recentSymptoms.entries()) {
        // Get relevant tags for this symptom
        const relevantTags = this.symptomToTagMap[symptom] || [symptom];
        
        // Count matches between content tags and symptom-relevant tags
        const matchCount = relevantTags.filter(tag => contentTags.includes(tag)).length;
        if (matchCount > 0) {
          // Normalize severity to 0-1 scale
          const normalizedSeverity = severity / 5;
          symptomRelevance += (matchCount / relevantTags.length) * normalizedSeverity;
        }
      }
      
      // Normalize symptom relevance based on number of symptoms
      symptomRelevance = symptomRelevance / healthInsights.recentSymptoms.size;
      
      relevanceScore += symptomRelevance * this.healthFactorWeights.symptoms;
      weightSum += this.healthFactorWeights.symptoms;
    }

    // 2. Check relevance to constitution
    if (healthInsights.constitution) {
      const constitutionTag = healthInsights.constitution.toLowerCase();
      const hasConstitutionMatch = contentTags.includes(constitutionTag);
      
      relevanceScore += (hasConstitutionMatch ? 1 : 0) * this.healthFactorWeights.constitution;
      weightSum += this.healthFactorWeights.constitution;
    }

    // 3. Check relevance to health goals
    if (healthInsights.healthGoals && healthInsights.healthGoals.length > 0) {
      const goalTags = healthInsights.healthGoals.map(goal => goal.toLowerCase());
      const matchingGoals = goalTags.filter(goal => contentTags.includes(goal));
      
      const goalRelevance = matchingGoals.length / goalTags.length;
      relevanceScore += goalRelevance * this.healthFactorWeights.goals;
      weightSum += this.healthFactorWeights.goals;
    }

    // 4. Check relevance to chronic conditions
    if (healthInsights.chronicConditions && healthInsights.chronicConditions.length > 0) {
      const conditionTags = healthInsights.chronicConditions.map(condition => condition.toLowerCase());
      const matchingConditions = conditionTags.filter(condition => contentTags.includes(condition));
      
      const conditionRelevance = matchingConditions.length / conditionTags.length;
      relevanceScore += conditionRelevance * this.healthFactorWeights.chronic;
      weightSum += this.healthFactorWeights.chronic;
    }

    // 5. Check relevance to preferences
    if (healthInsights.preferences.size > 0) {
      const preferenceArray = Array.from(healthInsights.preferences);
      const matchingPreferences = preferenceArray.filter(pref => contentTags.includes(pref));
      
      const preferenceRelevance = matchingPreferences.length / preferenceArray.length;
      relevanceScore += preferenceRelevance * this.healthFactorWeights.preferences;
      weightSum += this.healthFactorWeights.preferences;
    }

    // Normalize the final score
    const normalizedScore = weightSum > 0 ? relevanceScore / weightSum : 0.5;
    
    // Return value between 0.3 and 1.0 (ensuring even irrelevant content has some chance)
    return 0.3 + (normalizedScore * 0.7);
  }

  /**
   * Get health-based content recommendations
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of recommendations to return
   * @returns {Promise<Array>} - Health-based content recommendations
   */
  async getHealthBasedRecommendations(userId, limit = 10) {
    try {
      // Get user profile and recent health data
      const [userProfile, healthData] = await Promise.all([
        UserProfile.findOne({ user: userId }),
        HealthData.find({ user: userId }).sort({ recordDate: -1 }).limit(10)
      ]);

      if (!userProfile && (!healthData || healthData.length === 0)) {
        // No health data available, fall back to popular content
        return this._getPopularContent(limit);
      }

      // Process health data to identify relevant conditions/symptoms
      const healthInsights = this._extractHealthInsights(userProfile, healthData);
      
      // Extract relevant tags from health insights
      const relevantTags = this._extractRelevantTags(healthInsights);
      
      // Find content matching relevant tags
      const content = await Content.find({
        tags: { $in: relevantTags },
        isActive: true
      }).limit(limit * 3); // Get more than needed for filtering
      
      // Score and rank content based on health relevance
      const scoredContent = content.map(item => {
        const healthRelevance = this._calculateHealthRelevance(item, healthInsights);
        return {
          ...item.toObject(),
          healthRelevance
        };
      });
      
      // Sort by health relevance and return top results
      return scoredContent
        .sort((a, b) => b.healthRelevance - a.healthRelevance)
        .slice(0, limit);
    } catch (error) {
      logger.error(`Error getting health-based recommendations: ${error.message}`);
      // Fall back to popular content in case of error
      return this._getPopularContent(limit);
    }
  }

  /**
   * Extract relevant tags from health insights
   * @param {Object} healthInsights - Health insights
   * @returns {Array} - Relevant tags
   * @private
   */
  _extractRelevantTags(healthInsights) {
    const tags = new Set();
    
    // Add constitution tag
    if (healthInsights.constitution) {
      tags.add(healthInsights.constitution.toLowerCase());
    }
    
    // Add tags for symptoms
    for (const symptom of healthInsights.recentSymptoms.keys()) {
      tags.add(symptom.toLowerCase());
      
      // Add related tags
      const relatedTags = this.symptomToTagMap[symptom] || [];
      relatedTags.forEach(tag => tags.add(tag));
    }
    
    // Add tags for health goals
    if (healthInsights.healthGoals) {
      healthInsights.healthGoals.forEach(goal => tags.add(goal.toLowerCase()));
    }
    
    // Add tags for chronic conditions
    if (healthInsights.chronicConditions) {
      healthInsights.chronicConditions.forEach(condition => tags.add(condition.toLowerCase()));
    }
    
    return Array.from(tags);
  }

  /**
   * Get popular content as fallback
   * @param {number} limit - Maximum number of items to return
   * @returns {Promise<Array>} - Popular content
   * @private
   */
  async _getPopularContent(limit) {
    try {
      return await Content.find({ isActive: true })
        .sort({ viewCount: -1 })
        .limit(limit);
    } catch (error) {
      logger.error(`Error getting popular content: ${error.message}`);
      return [];
    }
  }
}

module.exports = new HealthDataProcessor(); 