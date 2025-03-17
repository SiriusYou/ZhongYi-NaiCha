/**
 * Content Moderation Middleware
 * Automatically checks content when created or updated
 */

const contentModerationUtil = require('../utils/contentModeration');

/**
 * Middleware to automatically moderate content on creation
 * @param {string} contentType - Type of content (post, comment, discussion)
 * @returns {Function} Express middleware function
 */
const moderateContent = (contentType) => {
  return async (req, res, next) => {
    // Skip moderation if feature is disabled
    if (process.env.CONTENT_MODERATION_ENABLED !== 'true') {
      return next();
    }
    
    try {
      // Extract content based on content type
      let contentText = '';
      
      switch (contentType) {
        case 'post':
          contentText = req.body.title + ' ' + req.body.content;
          break;
        case 'comment':
          contentText = req.body.content;
          break;
        case 'discussion':
          contentText = req.body.title + ' ' + req.body.content;
          break;
        default:
          console.error(`Invalid content type: ${contentType}`);
          return next();
      }
      
      // Perform basic keyword check
      const keywordCheck = contentModerationUtil.checkProhibitedKeywords(contentText);
      
      // If prohibited keywords are found, reject the content
      if (keywordCheck.containsProhibited) {
        return res.status(400).json({
          error: 'Content Moderation Failed',
          message: 'Your content contains prohibited words or phrases',
          matches: keywordCheck.matches
        });
      }
      
      // For automatic AI moderation, we'll add a flag to the request
      // The actual review creation will happen after the content is created
      // as we need the content ID
      req.needsContentReview = true;
      req.contentType = contentType;
      req.contentText = contentText;
      
      // Continue to the next middleware
      next();
    } catch (error) {
      console.error('Content moderation middleware error:', error);
      // In case of error, continue but log the issue
      // We don't want to block content creation due to moderation errors
      next();
    }
  };
};

/**
 * Middleware to create a content review record after content creation
 * @param {string} contentType - Type of content (post, comment, discussion)
 * @returns {Function} Express middleware function
 */
const createContentReview = (contentType) => {
  return async (req, res, next) => {
    // Skip if moderation is disabled or not needed
    if (process.env.CONTENT_MODERATION_ENABLED !== 'true' || !req.needsContentReview) {
      return next();
    }
    
    try {
      // Extract the content ID from the response
      const contentId = res.locals.contentId;
      
      if (!contentId) {
        console.error('Content ID not found in response');
        return next();
      }
      
      // Create a content review record
      await contentModerationUtil.createContentReview(
        contentType,
        contentId,
        req.user.id,
        req.contentText
      );
      
      // Add isAutoModerated flag to the response if AI moderation was used
      if (process.env.AI_MODERATION_ENABLED === 'true') {
        res.locals.isAutoModerated = true;
      }
      
      next();
    } catch (error) {
      console.error('Error creating content review:', error);
      // Continue even if there's an error to not block the response
      next();
    }
  };
};

/**
 * Register content ID middleware
 * This middleware captures the content ID after creation
 * for use by the createContentReview middleware
 */
const registerContentId = (req, res, next) => {
  const oldSend = res.send;
  
  res.send = function(data) {
    // Try to extract content ID from the response
    try {
      const parsedData = JSON.parse(data);
      
      // Check if this is a successful response with an ID
      if (parsedData && parsedData._id) {
        res.locals.contentId = parsedData._id;
      }
    } catch (error) {
      // Not JSON or doesn't have the expected structure
    }
    
    // Continue with the original response
    oldSend.apply(res, arguments);
  };
  
  next();
};

/**
 * Update report statistics middleware
 * This middleware updates the content review record when content is reported
 */
const updateReportStats = async (req, res, next) => {
  try {
    // Only execute if content moderation is enabled
    if (process.env.CONTENT_MODERATION_ENABLED !== 'true') {
      return next();
    }
    
    // Extract content type based on route
    let contentType;
    if (req.baseUrl.includes('/posts')) {
      contentType = 'post';
    } else if (req.baseUrl.includes('/comments')) {
      contentType = 'comment';
    } else if (req.baseUrl.includes('/discussions')) {
      contentType = 'discussion';
    } else {
      return next();
    }
    
    // Add to content review record
    await contentModerationUtil.addReportToContentReview(
      contentType,
      req.params.id,
      req.user.id,
      req.body.reason,
      req.body.details || ''
    );
    
    // Continue with the original request
    next();
  } catch (error) {
    console.error('Error updating report stats:', error);
    // Continue even if there's an error
    next();
  }
};

module.exports = {
  moderateContent,
  createContentReview,
  registerContentId,
  updateReportStats
}; 