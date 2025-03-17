/**
 * Content Moderation Utilities
 * Provides functions for automated content moderation and review
 */

const axios = require('axios');
const ContentReview = require('../models/ContentReview');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Discussion = require('../models/Discussion');

// Default keywords for basic text filtering
const DEFAULT_PROHIBITED_KEYWORDS = [
  // Default prohibited keywords
];

// Load prohibited keywords from environment variable
const loadProhibitedKeywords = () => {
  const envKeywords = process.env.PROHIBITED_KEYWORDS;
  if (envKeywords) {
    return envKeywords.split(',').map(keyword => keyword.trim());
  }
  return DEFAULT_PROHIBITED_KEYWORDS;
};

/**
 * Check if content contains prohibited keywords
 * @param {string} content - Content to check
 * @param {Array} additionalKeywords - Additional keywords to check against
 * @returns {Object} Result of check with matched keywords if any
 */
const checkProhibitedKeywords = (content, additionalKeywords = []) => {
  const keywords = [...loadProhibitedKeywords(), ...additionalKeywords];
  const lowerContent = content.toLowerCase();
  const matches = keywords.filter(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
  
  return {
    containsProhibited: matches.length > 0,
    matches,
  };
};

/**
 * Call external AI moderation API to analyze content
 * @param {string} content - Content to analyze
 * @returns {Object} Moderation results from API
 */
const callAiModerationApi = async (content) => {
  try {
    // Get the API URL and key from environment variables
    const apiUrl = process.env.AI_MODERATION_API_URL;
    const apiKey = process.env.AI_MODERATION_API_KEY;
    
    if (!apiUrl || !apiKey) {
      throw new Error('AI moderation API configuration missing');
    }
    
    const startTime = Date.now();
    
    // Make API call to AI moderation service
    const response = await axios.post(apiUrl, {
      content,
      options: {
        detailed: true
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const processingTime = Date.now() - startTime;
    
    // Format the response for our database structure
    const result = {
      performed: true,
      score: response.data.overall_score || 0,
      categories: {
        harassment: response.data.categories?.harassment || 0,
        hate: response.data.categories?.hate || 0,
        selfHarm: response.data.categories?.self_harm || 0,
        sexual: response.data.categories?.sexual || 0,
        violence: response.data.categories?.violence || 0,
        other: response.data.categories?.other || 0
      },
      recommendation: getRecommendationFromScore(response.data.overall_score || 0),
      processingTime
    };
    
    return result;
  } catch (error) {
    console.error('AI moderation API error:', error.message);
    // Return a default response for fallback
    return {
      performed: false,
      error: error.message
    };
  }
};

/**
 * Determine recommendation based on moderation score
 * @param {number} score - Overall moderation score (0-1)
 * @returns {string} Recommendation action
 */
const getRecommendationFromScore = (score) => {
  // These thresholds can be adjusted based on requirements
  if (score < 0.3) return 'approve';
  if (score < 0.7) return 'flag_for_review';
  return 'reject';
};

/**
 * Create a new content review entry
 * @param {string} contentType - Type of content (post, comment, discussion)
 * @param {string} contentId - ID of the content
 * @param {string} contentAuthor - ID of the content author
 * @param {string} contentText - The text content to moderate
 * @returns {Object} Created content review object
 */
const createContentReview = async (contentType, contentId, contentAuthor, contentText) => {
  try {
    // Check if a review already exists
    let review = await ContentReview.findOne({ 
      contentType, 
      contentId 
    });
    
    if (review) {
      return review; // Return existing review
    }
    
    // Perform keyword check
    const keywordCheck = checkProhibitedKeywords(contentText);
    
    // Set initial priority based on keyword check
    let priority = 'medium';
    if (keywordCheck.containsProhibited) {
      priority = 'high';
    }
    
    // Create new review entry
    review = new ContentReview({
      contentType,
      contentId,
      contentAuthor,
      priority
    });
    
    // If AI moderation is configured, perform automated check
    if (process.env.AI_MODERATION_ENABLED === 'true') {
      const moderationResult = await callAiModerationApi(contentText);
      
      // Update review with moderation results
      review.autoModeration = moderationResult;
      review.isAutoModerated = moderationResult.performed;
      
      // Update status based on recommendation
      if (moderationResult.performed) {
        switch (moderationResult.recommendation) {
          case 'approve':
            review.status = 'approved';
            break;
          case 'reject':
            review.status = 'rejected';
            review.actions.contentHidden = true;
            break;
          case 'flag_for_review':
            review.status = 'flagged_for_review';
            break;
        }
      }
    }
    
    await review.save();
    return review;
  } catch (error) {
    console.error('Error creating content review:', error);
    throw error;
  }
};

/**
 * Update content status based on review decision
 * @param {string} contentType - Type of content
 * @param {string} contentId - ID of the content
 * @param {boolean} isHidden - Whether content should be hidden
 */
const updateContentStatus = async (contentType, contentId, isHidden) => {
  try {
    let model;
    switch (contentType) {
      case 'post':
        model = Post;
        break;
      case 'comment':
        model = Comment;
        break;
      case 'discussion':
        model = Discussion;
        break;
      default:
        throw new Error(`Invalid content type: ${contentType}`);
    }
    
    const content = await model.findById(contentId);
    if (!content) {
      throw new Error(`${contentType} with ID ${contentId} not found`);
    }
    
    // Update content status based on review
    if (isHidden) {
      content.isActive = false;
    }
    
    await content.save();
    return content;
  } catch (error) {
    console.error('Error updating content status:', error);
    throw error;
  }
};

/**
 * Add user report to content review
 * @param {string} contentType - Type of content
 * @param {string} contentId - ID of the content
 * @param {string} userId - ID of user making the report
 * @param {string} reason - Reason for the report
 * @param {string} details - Additional details
 */
const addReportToContentReview = async (contentType, contentId, userId, reason, details = '') => {
  try {
    // Find or create content review
    let review = await ContentReview.findOne({ contentType, contentId });
    
    // If no review exists yet, create one with basic info
    if (!review) {
      let contentAuthor;
      let contentText = '';
      
      // Get content author and text based on content type
      switch (contentType) {
        case 'post':
          const post = await Post.findById(contentId);
          if (!post) throw new Error('Post not found');
          contentAuthor = post.user;
          contentText = post.title + ' ' + post.content;
          break;
        case 'comment':
          const comment = await Comment.findById(contentId);
          if (!comment) throw new Error('Comment not found');
          contentAuthor = comment.user;
          contentText = comment.content;
          break;
        case 'discussion':
          const discussion = await Discussion.findById(contentId);
          if (!discussion) throw new Error('Discussion not found');
          contentAuthor = discussion.user;
          contentText = discussion.title + ' ' + discussion.content;
          break;
        default:
          throw new Error(`Invalid content type: ${contentType}`);
      }
      
      // Create the review
      review = await createContentReview(contentType, contentId, contentAuthor, contentText);
    }
    
    // Add report to the review
    review.reports.push({
      user: userId,
      reason,
      details,
      date: Date.now()
    });
    
    // Increase priority based on number of reports
    if (review.reports.length >= 5) {
      review.priority = 'urgent';
    } else if (review.reports.length >= 3) {
      review.priority = 'high';
    }
    
    // Update status if needed
    if (review.status === 'approved' && review.reports.length >= 3) {
      review.status = 'flagged_for_review';
    }
    
    await review.save();
    return review;
  } catch (error) {
    console.error('Error adding report to content review:', error);
    throw error;
  }
};

/**
 * Perform moderator review on content
 * @param {string} reviewId - ID of the content review
 * @param {string} moderatorId - ID of the moderator
 * @param {string} decision - Decision (approved/rejected)
 * @param {string} reason - Reason for decision
 * @param {string} notes - Additional notes
 * @param {Object} actions - Actions to take (hide content, warn user)
 */
const moderatorReview = async (reviewId, moderatorId, decision, reason, notes = '', actions = {}) => {
  try {
    const review = await ContentReview.findById(reviewId);
    if (!review) {
      throw new Error('Content review not found');
    }
    
    // Update moderator review data
    review.moderatorReview = {
      moderator: moderatorId,
      decision,
      reason,
      notes,
      reviewedAt: Date.now()
    };
    
    // Update status based on decision
    review.status = decision === 'approved' ? 'approved' : 'rejected';
    review.isManuallyReviewed = true;
    
    // Update actions
    if (actions.contentHidden !== undefined) {
      review.actions.contentHidden = actions.contentHidden;
    } else {
      // Default to hiding content on rejection
      review.actions.contentHidden = decision === 'rejected';
    }
    
    review.actions.userWarned = actions.userWarned || false;
    review.actions.warningMessage = actions.warningMessage || '';
    review.actions.appealable = actions.appealable !== undefined ? actions.appealable : true;
    
    await review.save();
    
    // Update the content status
    await updateContentStatus(
      review.contentType, 
      review.contentId, 
      review.actions.contentHidden
    );
    
    return review;
  } catch (error) {
    console.error('Error performing moderator review:', error);
    throw error;
  }
};

/**
 * Submit an appeal for a rejected content
 * @param {string} reviewId - ID of the content review
 * @param {string} appealReason - Reason for the appeal
 */
const submitAppeal = async (reviewId, appealReason) => {
  try {
    const review = await ContentReview.findById(reviewId);
    if (!review) {
      throw new Error('Content review not found');
    }
    
    // Check if appeal is allowed
    if (!review.actions.appealable) {
      throw new Error('This content cannot be appealed');
    }
    
    // Check if already appealed
    if (review.appeal.appealed) {
      throw new Error('This content has already been appealed');
    }
    
    // Update appeal information
    review.appeal = {
      appealed: true,
      appealDate: Date.now(),
      appealReason,
      appealStatus: 'pending'
    };
    
    await review.save();
    return review;
  } catch (error) {
    console.error('Error submitting appeal:', error);
    throw error;
  }
};

/**
 * Resolve an appeal
 * @param {string} reviewId - ID of the content review
 * @param {string} moderatorId - ID of the moderator resolving the appeal
 * @param {string} decision - Appeal decision (approved/rejected)
 * @param {string} notes - Additional notes
 */
const resolveAppeal = async (reviewId, moderatorId, decision, notes = '') => {
  try {
    const review = await ContentReview.findById(reviewId);
    if (!review) {
      throw new Error('Content review not found');
    }
    
    // Check if appeal exists and is pending
    if (!review.appeal.appealed || review.appeal.appealStatus !== 'pending') {
      throw new Error('No pending appeal found for this content');
    }
    
    // Update appeal information
    review.appeal.appealStatus = decision;
    review.appeal.appealResolvedBy = moderatorId;
    review.appeal.appealResolvedAt = Date.now();
    review.appeal.appealNotes = notes;
    
    // If appeal is approved, update the content status and review status
    if (decision === 'approved') {
      review.status = 'approved';
      review.actions.contentHidden = false;
      
      // Update the content status
      await updateContentStatus(
        review.contentType, 
        review.contentId, 
        false
      );
    }
    
    await review.save();
    return review;
  } catch (error) {
    console.error('Error resolving appeal:', error);
    throw error;
  }
};

module.exports = {
  checkProhibitedKeywords,
  callAiModerationApi,
  createContentReview,
  updateContentStatus,
  addReportToContentReview,
  moderatorReview,
  submitAppeal,
  resolveAppeal
}; 