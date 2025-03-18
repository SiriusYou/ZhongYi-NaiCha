/**
 * Utility functions for recommendation algorithms
 */

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vec1 - First vector
 * @param {Array<number>} vec2 - Second vector
 * @returns {number} Cosine similarity (between -1 and 1)
 */
function calculateCosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length || vec1.length === 0) {
    return 0;
  }
  
  // Calculate dot product
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    normA += vec1[i] ** 2;
    normB += vec2[i] ** 2;
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate Jaccard similarity between two sets
 * @param {Set|Array} set1 - First set
 * @param {Set|Array} set2 - Second set
 * @returns {number} Jaccard similarity (between 0 and 1)
 */
function calculateJaccardSimilarity(set1, set2) {
  if (!set1 || !set2 || set1.length === 0 || set2.length === 0) {
    return 0;
  }
  
  // Convert to Sets if Arrays
  const setA = set1 instanceof Set ? set1 : new Set(set1);
  const setB = set2 instanceof Set ? set2 : new Set(set2);
  
  // Calculate intersection size
  const intersection = new Set();
  for (const item of setA) {
    if (setB.has(item)) {
      intersection.add(item);
    }
  }
  
  // Calculate union size
  const union = new Set([...setA, ...setB]);
  
  // Return Jaccard similarity
  return intersection.size / union.size;
}

/**
 * Calculate exponential decay value for time-based relevance
 * @param {Date|number} timestamp - Date or timestamp to calculate decay from
 * @param {Object} options - Options for decay calculation
 * @param {number} options.halfLife - Half-life in milliseconds
 * @param {Date|number} options.referenceTime - Reference time (defaults to now)
 * @param {number} options.minValue - Minimum value after decay (defaults to 0)
 * @returns {number} Decay factor (between minValue and 1)
 */
function exponentialDecay(timestamp, options = {}) {
  const {
    halfLife = 30 * 24 * 60 * 60 * 1000, // 30 days default
    referenceTime = Date.now(),
    minValue = 0
  } = options;
  
  const timestampValue = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const referenceValue = referenceTime instanceof Date ? referenceTime.getTime() : referenceTime;
  
  // Calculate time difference in milliseconds
  const timeDiff = Math.max(0, referenceValue - timestampValue);
  
  // Apply exponential decay formula: value = e^(-lambda * t)
  // where lambda = ln(2) / halfLife
  const lambda = Math.log(2) / halfLife;
  const decayFactor = Math.exp(-lambda * timeDiff);
  
  // Apply minimum value
  return Math.max(minValue, decayFactor);
}

/**
 * Calculate similarity between two items based on multiple factors
 * @param {Object} item1 - First item
 * @param {Object} item2 - Second item
 * @param {Object} options - Comparison options
 * @returns {number} Similarity score (between 0 and 1)
 */
function calculateSimilarity(item1, item2, options = {}) {
  const {
    // Weight factors for each similarity component
    weights = {
      tags: 0.4,
      categories: 0.3,
      contentVector: 0.3
    },
    // Fields to compare
    tagField = 'tags',
    categoryField = 'categories',
    vectorField = 'contentVector'
  } = options;
  
  let totalScore = 0;
  let totalWeight = 0;
  
  // Compare tags using Jaccard similarity
  if (item1[tagField] && item2[tagField] && weights.tags > 0) {
    const tagSimilarity = calculateJaccardSimilarity(item1[tagField], item2[tagField]);
    totalScore += tagSimilarity * weights.tags;
    totalWeight += weights.tags;
  }
  
  // Compare categories using Jaccard similarity
  if (item1[categoryField] && item2[categoryField] && weights.categories > 0) {
    const categorySimilarity = calculateJaccardSimilarity(item1[categoryField], item2[categoryField]);
    totalScore += categorySimilarity * weights.categories;
    totalWeight += weights.categories;
  }
  
  // Compare content vectors using cosine similarity
  if (item1[vectorField] && item2[vectorField] && weights.contentVector > 0) {
    const vectorSimilarity = calculateCosineSimilarity(item1[vectorField], item2[vectorField]);
    // Convert from -1:1 range to 0:1 range
    const normalizedVectorSimilarity = (vectorSimilarity + 1) / 2;
    totalScore += normalizedVectorSimilarity * weights.contentVector;
    totalWeight += weights.contentVector;
  }
  
  // Return normalized score
  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Generate content vectors from text using simple TF-IDF approach
 * This is a simplified implementation for demonstration
 * In production, use a proper NLP library or vector embedding service
 * @param {Object} item - Content item
 * @param {Object} options - Options for vector generation
 * @returns {Array<number>} Content vector
 */
function generateSimpleContentVector(item, options = {}) {
  const {
    textFields = ['title', 'description', 'body'],
    vectorSize = 100,
    vocabulary = null // Pre-defined vocabulary for consistent vectors
  } = options;
  
  // Extract text from item
  let text = '';
  for (const field of textFields) {
    if (item[field]) {
      text += ' ' + item[field];
    }
  }
  
  // Tokenize text (simple implementation)
  const tokens = text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)             // Split by whitespace
    .filter(token => token.length > 2); // Filter out short tokens
  
  // Count term frequencies
  const termFrequencies = {};
  for (const token of tokens) {
    termFrequencies[token] = (termFrequencies[token] || 0) + 1;
  }
  
  // Use provided vocabulary or create from tokens
  const vocab = vocabulary || Object.keys(termFrequencies).sort();
  
  // Limit vocabulary to vectorSize
  const limitedVocab = vocab.slice(0, vectorSize);
  
  // Create vector based on term frequencies
  const vector = new Array(limitedVocab.length).fill(0);
  for (let i = 0; i < limitedVocab.length; i++) {
    const term = limitedVocab[i];
    vector[i] = termFrequencies[term] || 0;
  }
  
  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] = vector[i] / magnitude;
    }
  }
  
  return vector;
}

/**
 * Calculate diversity score for a set of recommendations
 * Higher score means more diverse recommendations
 * @param {Array} recommendations - List of recommended items
 * @param {string} tagField - Field containing tags for diversity calculation
 * @returns {number} Diversity score (between 0 and 1)
 */
function calculateDiversityScore(recommendations, tagField = 'tags') {
  if (!recommendations || recommendations.length <= 1) {
    return 1; // Trivially diverse
  }
  
  // Count occurrences of each tag
  const tagCounts = {};
  let totalTags = 0;
  
  for (const item of recommendations) {
    if (item[tagField] && Array.isArray(item[tagField])) {
      for (const tag of item[tagField]) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        totalTags++;
      }
    }
  }
  
  // No tags found
  if (totalTags === 0) {
    return 0.5; // Neutral diversity
  }
  
  // Calculate entropy as diversity measure
  // Higher entropy = more diverse
  let entropy = 0;
  for (const tag in tagCounts) {
    const probability = tagCounts[tag] / totalTags;
    entropy -= probability * Math.log2(probability);
  }
  
  // Normalize entropy to 0-1 range
  // Max entropy is log2(uniqueTags)
  const uniqueTags = Object.keys(tagCounts).length;
  const maxEntropy = Math.log2(uniqueTags);
  
  return maxEntropy > 0 ? Math.min(1, entropy / maxEntropy) : 0;
}

module.exports = {
  calculateCosineSimilarity,
  calculateJaccardSimilarity,
  exponentialDecay,
  calculateSimilarity,
  generateSimpleContentVector,
  calculateDiversityScore
}; 