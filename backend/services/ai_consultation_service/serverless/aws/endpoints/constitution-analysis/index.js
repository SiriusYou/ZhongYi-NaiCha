const { createLogger } = require('../../../../../src/utils/logger');
const axios = require('axios');

const logger = createLogger('constitution-analysis-endpoint');

/**
 * Specialized endpoint for TCM constitution analysis
 * This endpoint orchestrates the full consultation flow for constitution analysis:
 * 1. Preprocessing with constitution-specific context building
 * 2. Inference with specialized prompt engineering for constitution determination
 * 3. Postprocessing with structured constitution data extraction
 * 
 * @param {Object} event - Lambda event object
 * @param {Object} context - Lambda context object
 * @returns {Object} - Consultation response
 */
exports.handler = async (event, context) => {
  try {
    logger.info('Processing constitution analysis request');
    
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
    
    // Add constitution analysis specific metadata
    const enhancedMetadata = {
      ...metadata,
      consultationType: 'constitution_analysis',
      specializedEndpoint: true,
      currentStep: metadata.currentStep || 'initial',
      constitutionWorkflow: true
    };
    
    // Enhanced health data processing specific to constitution analysis
    const enhancedHealthData = {
      ...healthData,
      preferences: healthData.preferences || {},
      characteristics: healthData.characteristics || {},
      previousAssessments: healthData.previousAssessments || []
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
        consultationType: 'constitution_analysis',
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
    
    // Apply constitution-specific processing to the preprocessed data
    preprocessedData.preprocessedData.prompt = enhancePromptForConstitution(
      preprocessedData.preprocessedData.prompt,
      enhancedMetadata.currentStep,
      enhancedHealthData
    );
    
    // Step 2: Call inference service
    logger.debug('Calling inference service');
    const inferenceResponse = await axios.post(
      inferenceUrl,
      {
        preprocessedData: preprocessedData.preprocessedData,
        userId,
        sessionId,
        consultationType: 'constitution_analysis',
        // Conditionally use Ollama if enabled, otherwise use the configured provider
        provider: process.env.USE_OLLAMA === 'true' ? 'ollama' : (process.env.MODEL_PROVIDER || 'tcm_specialized'),
        modelOverride: process.env.USE_OLLAMA === 'true' ? 
          process.env.OLLAMA_MODEL : 
          (process.env.MODEL_TYPE || 'TCM-Constitution-Llama-13b')
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (inferenceResponse.status !== 200) {
      throw new Error(`Inference failed: ${inferenceResponse.data.error}`);
    }
    
    // Apply additional constitution-specific processing to the inference result
    const enhancedInferenceResult = await enhanceInferenceResultForConstitution(
      inferenceResponse.data.inferenceResult,
      enhancedMetadata.currentStep,
      enhancedHealthData
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
          constitutionAnalysis: true
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (postprocessingResponse.status !== 200) {
      throw new Error(`Postprocessing failed: ${postprocessingResponse.data.error}`);
    }
    
    // Add constitution-specific information to the final response
    const finalResponse = postprocessingResponse.data;
    
    // Extract structured constitution data if this is a final assessment step
    if (enhancedMetadata.currentStep === 'final' || enhancedMetadata.currentStep === 'assessment') {
      const extractedData = extractConstitutionData(enhancedInferenceResult);
      finalResponse.constitutionAnalysis = {
        primaryConstitution: extractedData.primaryConstitution,
        secondaryConstitution: extractedData.secondaryConstitution,
        constitutionScores: extractedData.constitutionScores,
        recommendations: extractedData.recommendations,
        confidence: extractedData.confidence
      };
    }
    
    // Determine the next step in the constitution assessment workflow
    const nextStep = determineNextConstitutionStep(
      enhancedMetadata.currentStep,
      enhancedInferenceResult
    );
    
    finalResponse.workflow = {
      currentStep: enhancedMetadata.currentStep,
      nextStep: nextStep,
      isComplete: nextStep === 'complete'
    };
    
    logger.info('Constitution analysis completed successfully');
    return formatResponse(200, finalResponse);
  } catch (error) {
    logger.error(`Error in constitution analysis: ${error.message}`);
    logger.error(error.stack);
    
    return formatResponse(500, { 
      error: 'Constitution analysis error', 
      message: error.message 
    });
  }
};

/**
 * Enhances the prompt with constitution-specific guidance for the LLM
 * 
 * @param {string} prompt - Original preprocessed prompt
 * @param {string} currentStep - Current step in the constitution assessment workflow
 * @param {Object} healthData - Health data
 * @returns {string} - Enhanced prompt
 */
function enhancePromptForConstitution(prompt, currentStep, healthData) {
  // Add specialized instructions based on the current step in the workflow
  let enhancementText = '';
  
  switch (currentStep) {
    case 'initial':
      enhancementText = `
Additional TCM Constitution Analysis Instructions:
1. This is the initial step of constitution assessment
2. Ask questions about the user's general characteristics (sleep patterns, digestion, temperature preference, etc.)
3. Focus on gathering baseline information without making constitutional determinations yet
4. Ask one question at a time in a conversational manner
5. Explain the concept of TCM constitution types briefly if the user seems unfamiliar
6. Remember this is just the beginning of the assessment process
`;
      break;
      
    case 'physical':
      enhancementText = `
Additional TCM Constitution Analysis Instructions:
1. This step focuses on physical characteristics and tendencies
2. Ask about body build, complexion, skin texture, sweat patterns, and physical sensitivities
3. Inquire about energy levels throughout the day
4. Ask about digestion, bowel movements, and appetite patterns
5. Inquire about sleep quality and patterns
6. Be conversational and ask questions one at a time
7. Do not make constitutional determinations yet
`;
      break;
      
    case 'emotional':
      enhancementText = `
Additional TCM Constitution Analysis Instructions:
1. This step focuses on emotional and mental characteristics
2. Ask about emotional tendencies (anger, joy, worry, grief, fear)
3. Inquire about stress response and resilience
4. Ask about cognitive patterns (focus, memory, creativity)
5. Consider the connection between emotions and physical symptoms
6. Be sensitive and non-judgmental in your questioning
7. Ask questions one at a time in a conversational manner
`;
      break;
      
    case 'assessment':
    case 'final':
      enhancementText = `
Additional TCM Constitution Analysis Instructions:
1. This is the final assessment step for determining constitution
2. Review all the information gathered in previous steps
3. Identify the primary and possibly secondary constitution types
4. For each identified constitution type, explain:
   - Key characteristics that led to this assessment
   - Common strengths and challenges of this constitution
   - General recommendations for maintaining balance
5. Structure your response with clear sections:
   - Constitution Assessment
   - Constitutional Characteristics
   - Balancing Recommendations
   - Lifestyle Considerations
6. Remember to frame this as educational information rather than medical diagnosis
7. Include appropriate disclaimers about consulting qualified practitioners
8. Be specific about which constitution type appears primary and which might be secondary
`;
      break;
      
    default:
      enhancementText = `
Additional TCM Constitution Analysis Instructions:
1. Focus on determining the user's TCM constitution type(s)
2. Consider all nine constitution types: Balanced, Qi Deficiency, Yang Deficiency, Yin Deficiency, Phlegm-Dampness, Damp-Heat, Blood Stasis, Qi Stagnation, and Special Constitution
3. Remember that most people show characteristics of multiple constitution types
4. Ask relevant questions to distinguish between similar constitution types
5. Be conversational and educational in your approach
`;
  }
  
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
 * Enhances the inference result with additional constitution analysis
 * 
 * @param {string} inferenceResult - Original inference result
 * @param {string} currentStep - Current step in the constitution assessment workflow
 * @param {Object} healthData - Health data
 * @returns {string} - Enhanced inference result
 */
async function enhanceInferenceResultForConstitution(inferenceResult, currentStep, healthData) {
  // In a production environment, this would use a specialized model
  // to enhance the response with additional TCM-specific information
  
  let enhancedResult = inferenceResult;
  
  // Add structured content based on the current step
  if (currentStep === 'assessment' || currentStep === 'final') {
    // Check if the response already has structured sections
    const hasConstitutionSection = /Constitution Assessment:|Primary Constitution:|TCM Constitution Type:/i.test(inferenceResult);
    const hasRecommendationSection = /Recommendations:|Balancing Suggestions:|Lifestyle Considerations:/i.test(inferenceResult);
    
    // If the constitution section is missing, try to extract constitution information
    if (!hasConstitutionSection) {
      const extractedData = extractConstitutionData(inferenceResult);
      if (extractedData.primaryConstitution) {
        enhancedResult += `\n\nConstitution Assessment:\nBased on the information shared, your TCM constitution appears to primarily align with ${extractedData.primaryConstitution}`;
        
        if (extractedData.secondaryConstitution) {
          enhancedResult += ` with some characteristics of ${extractedData.secondaryConstitution}`;
        }
        
        enhancedResult += `. This is for educational purposes only and not a medical diagnosis.`;
      }
    }
    
    // If the recommendation section is missing, add general recommendations
    if (!hasRecommendationSection) {
      enhancedResult += `\n\nBalancing Recommendations:\nUnderstanding your constitutional tendencies can help you make informed lifestyle choices. Generally, TCM wisdom suggests bringing awareness to your habits around diet, rest, exercise, and emotional well-being to maintain balance. A qualified TCM practitioner can provide personalized guidance based on your specific constitution.`;
    }
  } else if (currentStep === 'initial' && !inferenceResult.includes('?')) {
    // Ensure there's a question to continue the conversation if this is the initial step
    enhancedResult += `\n\nCould you tell me a bit about your general energy levels throughout the day, and do you tend to feel warmer or cooler than others around you?`;
  }
  
  return enhancedResult;
}

/**
 * Extracts constitution data from the inference result
 * 
 * @param {string} inferenceResult - Inference result text
 * @returns {Object} - Extracted constitution data
 */
function extractConstitutionData(inferenceResult) {
  // In a production environment, this would use more sophisticated NLP
  // to extract structured data from the response
  
  const constitutionTypes = [
    'Balanced (Pinghe)',
    'Qi Deficiency (Qi Xu)',
    'Yang Deficiency (Yang Xu)',
    'Yin Deficiency (Yin Xu)',
    'Phlegm-Dampness (Tan Shi)',
    'Damp-Heat (Shi Re)',
    'Blood Stasis (Xue Yu)',
    'Qi Stagnation (Qi Zhi)',
    'Special Constitution'
  ];
  
  // Initialize result object
  const result = {
    primaryConstitution: null,
    secondaryConstitution: null,
    constitutionScores: {},
    recommendations: [],
    confidence: 'medium'
  };
  
  // Look for constitution names in the text
  let foundConstitutions = [];
  constitutionTypes.forEach(type => {
    // Extract the short name without parentheses for flexible matching
    const shortName = type.split(' (')[0];
    const chineseName = type.match(/\((.*?)\)/)?.[1] || '';
    
    // Check for matches with different formats
    if (inferenceResult.includes(type) || 
        inferenceResult.includes(shortName) || 
        inferenceResult.includes(chineseName)) {
      
      // Try to determine if this is described as primary or secondary
      const context = getTextContext(inferenceResult, shortName);
      const isPrimary = /primary|main|predominant|primarily|mainly/i.test(context);
      const isSecondary = /secondary|tendency toward|elements of|some characteristics|minor/i.test(context);
      
      foundConstitutions.push({
        type: shortName,
        isPrimary,
        isSecondary,
        // Simple score based on text position (earlier mentions may be more important)
        position: inferenceResult.indexOf(shortName)
      });
      
      // Add to constitution scores (simplified scoring)
      result.constitutionScores[shortName] = isPrimary ? 0.8 : (isSecondary ? 0.4 : 0.6);
    }
  });
  
  // Sort found constitutions
  foundConstitutions.sort((a, b) => {
    // Primary constitutions take precedence
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    
    // Then secondary constitutions
    if (a.isSecondary && !b.isSecondary) return -1;
    if (!a.isSecondary && b.isSecondary) return 1;
    
    // Then by position in text
    return a.position - b.position;
  });
  
  // Assign primary and secondary constitutions
  if (foundConstitutions.length > 0) {
    result.primaryConstitution = foundConstitutions[0].type;
    
    if (foundConstitutions.length > 1) {
      result.secondaryConstitution = foundConstitutions[1].type;
    }
  }
  
  // Extract recommendations
  const recommendationMatch = inferenceResult.match(/Recommendations?:([^#]+)/i) || 
                             inferenceResult.match(/Balancing Suggestions?:([^#]+)/i) ||
                             inferenceResult.match(/Lifestyle Considerations?:([^#]+)/i);
  
  if (recommendationMatch && recommendationMatch[1]) {
    // Split by lines or bullet points and clean up
    const recommendationsText = recommendationMatch[1].trim();
    const recommendations = recommendationsText
      .split(/\n|•|-)/)
      .map(item => item.trim())
      .filter(item => item.length > 10); // Filter out short or empty items
    
    result.recommendations = recommendations;
  }
  
  // Determine confidence level
  if (result.primaryConstitution && result.recommendations.length > 0) {
    result.confidence = 'high';
  } else if (result.primaryConstitution) {
    result.confidence = 'medium';
  } else {
    result.confidence = 'low';
  }
  
  return result;
}

/**
 * Gets the surrounding text context for a term
 * 
 * @param {string} text - Full text to search in
 * @param {string} term - Term to find context for
 * @param {number} contextSize - Number of characters to include in context
 * @returns {string} - Text context
 */
function getTextContext(text, term, contextSize = 100) {
  const index = text.indexOf(term);
  if (index === -1) return '';
  
  const start = Math.max(0, index - contextSize);
  const end = Math.min(text.length, index + term.length + contextSize);
  
  return text.substring(start, end);
}

/**
 * Determines the next step in the constitution assessment workflow
 * 
 * @param {string} currentStep - Current step
 * @param {string} inferenceResult - Inference result text
 * @returns {string} - Next step
 */
function determineNextConstitutionStep(currentStep, inferenceResult) {
  // Define the workflow sequence
  const workflowSequence = {
    'initial': 'physical',
    'physical': 'emotional',
    'emotional': 'assessment',
    'assessment': 'complete',
    'final': 'complete'
  };
  
  // Check if this step is complete based on the response content
  const hasQuestion = inferenceResult.includes('?');
  const isResponseComplete = inferenceResult.length > 200;
  
  // If the current step isn't complete (response too short or ended with a question),
  // stay on the current step unless it's the final assessment
  if ((hasQuestion || !isResponseComplete) && currentStep !== 'assessment' && currentStep !== 'final') {
    return currentStep;
  }
  
  // Otherwise, proceed to next step
  return workflowSequence[currentStep] || 'initial';
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