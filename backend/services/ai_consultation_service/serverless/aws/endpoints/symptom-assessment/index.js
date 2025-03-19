const { createLogger } = require('../../../../../src/utils/logger');
const axios = require('axios');

const logger = createLogger('symptom-assessment-endpoint');

/**
 * Specialized endpoint for TCM symptom assessment
 * This endpoint orchestrates the full consultation flow for symptom assessment:
 * 1. Preprocessing with symptom-specific context building
 * 2. Inference with specialized prompt engineering for symptom analysis
 * 3. Postprocessing with TCM pattern recognition
 * 
 * @param {Object} event - Lambda event object
 * @param {Object} context - Lambda context object
 * @returns {Object} - Consultation response
 */
exports.handler = async (event, context) => {
  try {
    logger.info('Processing symptom assessment request');
    
    // Parse the request body
    const requestBody = JSON.parse(event.body || '{}');
    
    // Extract the necessary information
    const { 
      userId, 
      message, 
      healthData = {}, 
      sessionId,
      metadata = {} 
    } = requestBody;
    
    // Add symptom assessment specific metadata
    const enhancedMetadata = {
      ...metadata,
      consultationType: 'symptom_assessment',
      specializedEndpoint: true,
      currentStep: metadata.currentStep || 'initial',
      enhancedSymptomProcessing: true
    };
    
    // Enhanced health data processing specific to symptom assessment
    const enhancedHealthData = {
      ...healthData,
      symptoms: healthData.symptoms || [],
      symptomDetails: healthData.symptomDetails || {},
      patternMapping: true
    };
    
    // Endpoint URLs for the processing chain
    const apiBase = process.env.NODE_ENV === 'production' 
      ? process.env.API_GATEWAY_URL 
      : 'http://localhost:4010';
    
    const preprocessingUrl = `${apiBase}/api/consultation/preprocessing`;
    const inferenceUrl = `${apiBase}/api/consultation/inference`;
    const postprocessingUrl = `${apiBase}/api/consultation/postprocessing`;
    
    // Step 1: Call preprocessing with enhanced parameters
    logger.debug('Calling preprocessing service');
    const preprocessingResponse = await axios.post(
      preprocessingUrl,
      {
        userId,
        consultationType: 'symptom_assessment',
        message,
        healthData: enhancedHealthData,
        sessionId,
        metadata: enhancedMetadata
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (preprocessingResponse.status !== 200) {
      throw new Error(`Preprocessing failed: ${preprocessingResponse.data.error}`);
    }
    
    const preprocessedData = preprocessingResponse.data;
    
    // Apply symptom-specific processing to the preprocessed data
    preprocessedData.preprocessedData.prompt = enhancePromptForSymptoms(
      preprocessedData.preprocessedData.prompt,
      enhancedHealthData.symptoms
    );
    
    // Step 2: Call inference service
    logger.debug('Calling inference service');
    const inferenceResponse = await axios.post(
      inferenceUrl,
      {
        preprocessedData: preprocessedData.preprocessedData,
        userId,
        sessionId,
        consultationType: 'symptom_assessment',
        provider: process.env.MODEL_PROVIDER || 'tcm_specialized',
        modelOverride: process.env.MODEL_TYPE || 'TCM-Symptom-Llama-13b'
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (inferenceResponse.status !== 200) {
      throw new Error(`Inference failed: ${inferenceResponse.data.error}`);
    }
    
    // Apply additional symptom-specific processing to the inference result
    const enhancedInferenceResult = await enhanceInferenceResultForSymptoms(
      inferenceResponse.data.inferenceResult,
      enhancedHealthData.symptoms
    );
    
    // Step 3: Call postprocessing service with enhanced inference result
    logger.debug('Calling postprocessing service');
    const postprocessingResponse = await axios.post(
      postprocessingUrl,
      {
        ...inferenceResponse.data,
        inferenceResult: enhancedInferenceResult,
        metadata: {
          ...inferenceResponse.data.metadata,
          specializedEndpoint: true,
          symptomPatternRecognition: true
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (postprocessingResponse.status !== 200) {
      throw new Error(`Postprocessing failed: ${postprocessingResponse.data.error}`);
    }
    
    // Add symptom-specific information to the final response
    const finalResponse = postprocessingResponse.data;
    finalResponse.specializedProcessing = {
      endpointType: 'symptom_assessment',
      patternsIdentified: extractTCMPatterns(enhancedInferenceResult),
      recommendedFollowUp: determineFollowUpType(enhancedInferenceResult)
    };
    
    logger.info('Symptom assessment completed successfully');
    return formatResponse(200, finalResponse);
  } catch (error) {
    logger.error(`Error in symptom assessment: ${error.message}`);
    logger.error(error.stack);
    
    return formatResponse(500, { 
      error: 'Symptom assessment error', 
      message: error.message 
    });
  }
};

/**
 * Enhances the prompt with symptom-specific guidance for the LLM
 * 
 * @param {string} prompt - Original preprocessed prompt
 * @param {Array} symptoms - List of reported symptoms
 * @returns {string} - Enhanced prompt
 */
function enhancePromptForSymptoms(prompt, symptoms) {
  // Add specialized instructions for symptom assessment
  const enhancementText = `
Additional TCM Symptom Analysis Instructions:
1. Pay special attention to the following reported symptoms: ${symptoms.join(', ')}
2. Analyze these symptoms through TCM diagnostic principles (inspection, auscultation, inquiry, palpation)
3. Consider possible relationships between symptoms based on the Five Element theory
4. Look for signs of excesses and deficiencies in the Five Zang organs
5. Assess symptoms in relation to the Eight Principles (cold/heat, interior/exterior, deficiency/excess, yin/yang)
6. Maintain focus on educational information rather than conclusive diagnosis
7. If you identify a potential TCM pattern, explain its general characteristics, associated symptoms, and traditional understanding
`;

  // Add the enhancement at an appropriate place in the prompt
  if (prompt.includes('CURRENT ASSESSMENT STEP:')) {
    return prompt.replace(
      'CURRENT ASSESSMENT STEP:',
      `${enhancementText}\n\nCURRENT ASSESSMENT STEP:`
    );
  } else {
    return `${prompt}\n\n${enhancementText}`;
  }
}

/**
 * Enhances the inference result with additional symptom analysis
 * 
 * @param {string} inferenceResult - Original inference result
 * @param {Array} symptoms - List of reported symptoms
 * @returns {string} - Enhanced inference result
 */
async function enhanceInferenceResultForSymptoms(inferenceResult, symptoms) {
  // In a production environment, this would use a specialized model or knowledge base
  // to enhance the response with additional TCM-specific information
  
  // For now, we'll add structured sections if they're missing
  let enhancedResult = inferenceResult;
  
  // Check if the response already has structured sections
  const hasPatternSection = /TCM Pattern Analysis:/i.test(inferenceResult);
  const hasRecommendationSection = /Recommendations:/i.test(inferenceResult);
  
  // If the pattern section is missing, try to extract pattern information
  if (!hasPatternSection) {
    const patterns = extractTCMPatterns(inferenceResult);
    if (patterns.length > 0) {
      enhancedResult += `\n\nTCM Pattern Analysis:\nBased on your described symptoms, these patterns may be relevant from a TCM educational perspective: ${patterns.join(', ')}. Remember that this is for informational purposes only.`;
    }
  }
  
  // If the recommendation section is missing, add a general one
  if (!hasRecommendationSection && symptoms.length > 0) {
    enhancedResult += `\n\nRecommendations:\nFor educational purposes, the principles of TCM suggest that symptoms like yours may benefit from learning about lifestyle adjustments, dietary considerations, and traditional herbal knowledge. A qualified TCM practitioner can provide personalized guidance.`;
  }
  
  return enhancedResult;
}

/**
 * Extracts TCM patterns mentioned in the inference result
 * 
 * @param {string} inferenceResult - Inference result text
 * @returns {Array} - Extracted TCM patterns
 */
function extractTCMPatterns(inferenceResult) {
  // In a production environment, this would use NLP or regex pattern matching
  // to extract TCM patterns mentioned in the response
  
  // Common TCM patterns to look for
  const commonPatterns = [
    'Liver Qi Stagnation',
    'Spleen Qi Deficiency',
    'Kidney Yang Deficiency',
    'Kidney Yin Deficiency',
    'Liver Yang Rising',
    'Damp-Heat',
    'Phlegm-Dampness',
    'Blood Stasis',
    'Heart Blood Deficiency',
    'Lung Qi Deficiency'
  ];
  
  // Simple pattern matching
  const foundPatterns = [];
  commonPatterns.forEach(pattern => {
    if (inferenceResult.includes(pattern) || 
        inferenceResult.toLowerCase().includes(pattern.toLowerCase())) {
      foundPatterns.push(pattern);
    }
  });
  
  return foundPatterns;
}

/**
 * Determines the recommended follow-up consultation type
 * 
 * @param {string} inferenceResult - Inference result text
 * @returns {string} - Recommended follow-up type
 */
function determineFollowUpType(inferenceResult) {
  // Look for clues in the response to recommend the appropriate next step
  
  if (/constitution|body type|temperament/i.test(inferenceResult)) {
    return 'constitution_analysis';
  } else if (/herb|tea|formula|decoction/i.test(inferenceResult)) {
    return 'herbal_recommendation';
  } else {
    return 'follow_up';
  }
}

/**
 * Formats the Lambda response
 * 
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} - Formatted response
 */
const formatResponse = (statusCode, body) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body)
  };
}; 