const { createLogger } = require('../../../../../src/utils/logger');
const axios = require('axios');

const logger = createLogger('herbal-recommendation-endpoint');

/**
 * Specialized endpoint for TCM herbal tea recommendations
 * This endpoint orchestrates the full consultation flow for herbal tea recommendations:
 * 1. Preprocessing with herb-specific context building
 * 2. Inference with specialized prompt engineering for herbal formulations
 * 3. Postprocessing with structured herb data extraction
 * 
 * @param {Object} event - Lambda event object
 * @param {Object} context - Lambda context object
 * @returns {Object} - Consultation response
 */
exports.handler = async (event, context) => {
  try {
    logger.info('Processing herbal recommendation request');
    
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
    
    // Add herbal recommendation specific metadata
    const enhancedMetadata = {
      ...metadata,
      consultationType: 'herbal_recommendation',
      specializedEndpoint: true,
      currentStep: metadata.currentStep || 'initial',
      enhancedHerbalProcessing: true
    };
    
    // Enhanced health data processing specific to herbal recommendations
    const enhancedHealthData = {
      ...healthData,
      allergies: healthData.allergies || [],
      constitution: healthData.constitution || null,
      previousTeaEffects: healthData.previousTeaEffects || {},
      herbPreferences: healthData.herbPreferences || []
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
        consultationType: 'herbal_recommendation',
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
    
    // Apply herbal-specific processing to the preprocessed data
    preprocessedData.preprocessedData.prompt = enhancePromptForHerbs(
      preprocessedData.preprocessedData.prompt,
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
        consultationType: 'herbal_recommendation',
        provider: process.env.MODEL_PROVIDER || 'tcm_specialized',
        modelOverride: process.env.MODEL_TYPE || 'TCM-Herbs-Llama-13b'
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (inferenceResponse.status !== 200) {
      throw new Error(`Inference failed: ${inferenceResponse.data.error}`);
    }
    
    // Apply additional herbal-specific processing to the inference result
    const enhancedInferenceResult = await enhanceInferenceResultForHerbs(
      inferenceResponse.data.inferenceResult,
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
          herbalRecommendation: true
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (postprocessingResponse.status !== 200) {
      throw new Error(`Postprocessing failed: ${postprocessingResponse.data.error}`);
    }
    
    // Add herbal-specific information to the final response
    const finalResponse = postprocessingResponse.data;
    
    // Extract structured herbal data
    const extractedHerbalData = extractHerbalData(enhancedInferenceResult);
    finalResponse.herbalRecommendation = {
      formulaName: extractedHerbalData.formulaName,
      primaryHerbs: extractedHerbalData.primaryHerbs,
      supportingHerbs: extractedHerbalData.supportingHerbs,
      preparationMethod: extractedHerbalData.preparationMethod,
      benefitsDescription: extractedHerbalData.benefitsDescription,
      cautions: extractedHerbalData.cautions,
      relatedFormulas: extractedHerbalData.relatedFormulas
    };
    
    // Add product recommendations if any
    const productRecommendations = await getRelatedProducts(extractedHerbalData.primaryHerbs);
    if (productRecommendations.length > 0) {
      finalResponse.productRecommendations = productRecommendations;
    }
    
    logger.info('Herbal recommendation completed successfully');
    return formatResponse(200, finalResponse);
  } catch (error) {
    logger.error(`Error in herbal recommendation: ${error.message}`);
    logger.error(error.stack);
    
    return formatResponse(500, { 
      error: 'Herbal recommendation error', 
      message: error.message 
    });
  }
};

/**
 * Enhances the prompt with herb-specific guidance for the LLM
 * 
 * @param {string} prompt - Original preprocessed prompt
 * @param {Object} healthData - Health data
 * @returns {string} - Enhanced prompt
 */
function enhancePromptForHerbs(prompt, healthData) {
  // Add specialized instructions for herbal recommendations
  const enhancementText = `
Additional TCM Herbal Recommendation Instructions:
1. Focus on educational information about traditional TCM herbal teas and formulations
2. Prioritize common, accessible herbs for home tea preparation
3. Explain the traditional properties and functions of suggested herbs according to TCM theory
4. Include information on appropriate preparation methods (water temperature, steeping time)
5. Mention any traditional cautions or contraindications for suggested herbs
6. Structure your response with clear sections for herb lists, preparation, and educational context
7. Remember to maintain an educational focus rather than prescriptive recommendations
8. When possible, suggest herbs that align with the user's constitution: ${healthData.constitution || 'Unknown'}

AVOID recommending herbs in the user's allergy list: ${healthData.allergies.join(', ') || 'No known allergies'}
`;

  // Add the enhancement at an appropriate place in the prompt
  if (prompt.includes('USER RESPONSE:')) {
    return prompt.replace(
      'USER RESPONSE:',
      `${enhancementText}\n\nUSER RESPONSE:`
    );
  } else if (prompt.includes('USER QUESTION:')) {
    return prompt.replace(
      'USER QUESTION:',
      `${enhancementText}\n\nUSER QUESTION:`
    );
  } else {
    return `${prompt}\n\n${enhancementText}`;
  }
}

/**
 * Enhances the inference result with additional herbal information
 * 
 * @param {string} inferenceResult - Original inference result
 * @param {Object} healthData - Health data
 * @returns {string} - Enhanced inference result
 */
async function enhanceInferenceResultForHerbs(inferenceResult, healthData) {
  // In a production environment, this would use a specialized model or knowledge base
  // to enhance the response with additional TCM-specific information
  
  let enhancedResult = inferenceResult;
  
  // Check if the response already has structured sections
  const hasHerbListSection = /Herbal Ingredients:|Primary Herbs:|Recommended Herbs:/i.test(inferenceResult);
  const hasPreparationSection = /Preparation:|Brewing Instructions:|Tea Preparation:/i.test(inferenceResult);
  const hasCautionSection = /Cautions:|Contraindications:|Precautions:/i.test(inferenceResult);
  
  // If the herb list section is missing, try to extract herb information
  if (!hasHerbListSection) {
    const extractedHerbs = extractHerbalData(inferenceResult);
    if (extractedHerbs.primaryHerbs.length > 0) {
      enhancedResult += `\n\nHerbal Ingredients:\n- Primary: ${extractedHerbs.primaryHerbs.join(', ')}\n`;
      
      if (extractedHerbs.supportingHerbs.length > 0) {
        enhancedResult += `- Supporting: ${extractedHerbs.supportingHerbs.join(', ')}\n`;
      }
    }
  }
  
  // If the preparation section is missing, add general preparation guidelines
  if (!hasPreparationSection) {
    enhancedResult += `\n\nPreparation Guidelines:\nGeneral brewing instructions for most herbal teas include using fresh, filtered water heated to just below boiling (around 195°F/90°C). Add the herbs to a teapot or infuser, pour hot water over them, cover, and allow to steep for 5-10 minutes. The specific steeping time may vary depending on the herbs used and desired strength.`;
  }
  
  // If the caution section is missing, add general cautions
  if (!hasCautionSection) {
    enhancedResult += `\n\nCautions and Considerations:\nThis information is provided for educational purposes only and is not medical advice. Herbal teas may interact with medications or have effects on certain health conditions. It's always advisable to consult with a qualified healthcare practitioner before incorporating new herbs into your wellness routine, especially if you have existing health conditions, are pregnant or nursing, or are taking medications.`;
  }
  
  // Add disclaimer if not already present
  if (!inferenceResult.includes('educational purposes only') && !inferenceResult.includes('not medical advice')) {
    enhancedResult += `\n\nRemember: This information is shared for educational purposes only and is not intended as medical advice or to replace consultation with qualified TCM practitioners.`;
  }
  
  return enhancedResult;
}

/**
 * Extracts structured herbal data from the inference result
 * 
 * @param {string} inferenceResult - Inference result text
 * @returns {Object} - Extracted herbal data
 */
function extractHerbalData(inferenceResult) {
  // In a production environment, this would use more sophisticated NLP
  // to extract structured data from the response
  
  // Initialize result object
  const result = {
    formulaName: null,
    primaryHerbs: [],
    supportingHerbs: [],
    preparationMethod: null,
    benefitsDescription: null,
    cautions: [],
    relatedFormulas: []
  };
  
  // Extract formula name (if present)
  const formulaNameMatch = inferenceResult.match(/formula(?:\s+name)?:?\s+([^\n.]+)/i) ||
                          inferenceResult.match(/tea(?:\s+blend)?:?\s+([^\n.]+)/i);
  if (formulaNameMatch && formulaNameMatch[1]) {
    result.formulaName = formulaNameMatch[1].trim();
  }
  
  // Extract herbs
  const commonHerbs = [
    'ginger', 'ginseng', 'licorice', 'cinnamon', 'chrysanthemum', 'jujube', 'longan',
    'goji berry', 'astragalus', 'angelica', 'peony', 'rehmannia', 'codonopsis',
    'schisandra', 'lotus', 'hawthorn', 'bupleurum', 'poria', 'atractylodes',
    'honeysuckle', 'forsythia', 'mint', 'rhubarb', 'cassia', 'eucommia',
    'siler', 'magnolia bark', 'citrus peel', 'mulberry', 'lycium', 'ophiopogon'
  ];
  
  // Look for herbal ingredients sections
  const herbSectionMatch = inferenceResult.match(/(?:Herbal Ingredients|Primary Herbs|Recommended Herbs|Ingredients):([^#]+?)(?:(?:Preparation|Supporting Herbs|Benefits|Cautions|$))/is);
  
  if (herbSectionMatch && herbSectionMatch[1]) {
    const herbSection = herbSectionMatch[1].trim();
    
    // Check for bullet points or numbered lists
    const herbItems = herbSection.split(/\n-|\n•|\n\d+\./).map(item => item.trim()).filter(Boolean);
    
    if (herbItems.length > 0) {
      // Process each herb item
      herbItems.forEach(item => {
        // Check for known herbs
        commonHerbs.forEach(herb => {
          if (item.toLowerCase().includes(herb)) {
            // Determine if primary or supporting
            const isPrimary = !/supporting|secondary|complementary|assistant|adjunct/i.test(item);
            if (isPrimary) {
              if (!result.primaryHerbs.includes(herb)) {
                result.primaryHerbs.push(herb);
              }
            } else {
              if (!result.supportingHerbs.includes(herb)) {
                result.supportingHerbs.push(herb);
              }
            }
          }
        });
      });
    } else {
      // Try simple text matching if no list structure
      commonHerbs.forEach(herb => {
        if (herbSection.toLowerCase().includes(herb)) {
          result.primaryHerbs.push(herb);
        }
      });
    }
  } else {
    // If no herb section, scan the whole text
    commonHerbs.forEach(herb => {
      if (inferenceResult.toLowerCase().includes(herb)) {
        result.primaryHerbs.push(herb);
      }
    });
  }
  
  // Extract preparation method
  const prepSectionMatch = inferenceResult.match(/(?:Preparation|Brewing Instructions|Tea Preparation):([^#]+?)(?:(?:Benefits|Cautions|Notes|$))/is);
  if (prepSectionMatch && prepSectionMatch[1]) {
    result.preparationMethod = prepSectionMatch[1].trim();
  }
  
  // Extract benefits
  const benefitsSectionMatch = inferenceResult.match(/(?:Benefits|TCM Functions|Traditional Uses):([^#]+?)(?:(?:Cautions|Notes|Preparation|$))/is);
  if (benefitsSectionMatch && benefitsSectionMatch[1]) {
    result.benefitsDescription = benefitsSectionMatch[1].trim();
  }
  
  // Extract cautions
  const cautionSectionMatch = inferenceResult.match(/(?:Cautions|Contraindications|Precautions):([^#]+?)(?:(?:Notes|$))/is);
  if (cautionSectionMatch && cautionSectionMatch[1]) {
    const cautionsText = cautionSectionMatch[1].trim();
    
    // Split by lines or bullet points
    const cautionItems = cautionsText
      .split(/\n-|\n•|\n\d+\./)
      .map(item => item.trim())
      .filter(item => item.length > 10); // Filter out short items
    
    if (cautionItems.length > 0) {
      result.cautions = cautionItems;
    } else {
      result.cautions = [cautionsText];
    }
  }
  
  // Extract related formulas (if present)
  const relatedMatch = inferenceResult.match(/(?:Related Formulas|Similar Blends|Alternative Teas):([^#]+?)(?:$)/is);
  if (relatedMatch && relatedMatch[1]) {
    const relatedText = relatedMatch[1].trim();
    
    // Split by commas or bullet points
    const relatedItems = relatedText
      .split(/,|\n-|\n•|\n\d+\./)
      .map(item => item.trim())
      .filter(Boolean);
    
    if (relatedItems.length > 0) {
      result.relatedFormulas = relatedItems;
    }
  }
  
  return result;
}

/**
 * Gets product recommendations based on herbs
 * 
 * @param {Array} herbs - List of herbs
 * @returns {Promise<Array>} - List of product recommendations
 */
async function getRelatedProducts(herbs) {
  // In a production environment, this would query a product database
  // For now, we'll return mock recommendations
  
  // Mock product data (in production, this would come from a database)
  const mockProducts = [
    {
      id: 'prod001',
      name: 'Calm Spirit Tea',
      description: 'A soothing blend featuring chrysanthemum and mint',
      herbs: ['chrysanthemum', 'mint', 'licorice'],
      price: 12.99,
      imageUrl: 'https://example.com/images/calm-spirit.jpg'
    },
    {
      id: 'prod002',
      name: 'Digestive Harmony Blend',
      description: 'Traditional blend with ginger and citrus peel to support digestion',
      herbs: ['ginger', 'citrus peel', 'licorice'],
      price: 14.99,
      imageUrl: 'https://example.com/images/digestive-harmony.jpg'
    },
    {
      id: 'prod003',
      name: 'Energy Boost Tea',
      description: 'Revitalizing blend with ginseng and astragalus',
      herbs: ['ginseng', 'astragalus', 'jujube'],
      price: 16.99,
      imageUrl: 'https://example.com/images/energy-boost.jpg'
    },
    {
      id: 'prod004',
      name: 'Longevity Treasure Tea',
      description: 'Premium blend with goji berry and schisandra',
      herbs: ['goji berry', 'schisandra', 'astragalus'],
      price: 18.99,
      imageUrl: 'https://example.com/images/longevity-treasure.jpg'
    }
  ];
  
  // Find products that contain at least one of the recommended herbs
  const recommendations = mockProducts.filter(product => {
    return herbs.some(herb => product.herbs.includes(herb));
  });
  
  // Sort by relevance (number of matching herbs)
  recommendations.sort((a, b) => {
    const aMatches = herbs.filter(herb => a.herbs.includes(herb)).length;
    const bMatches = herbs.filter(herb => b.herbs.includes(herb)).length;
    return bMatches - aMatches;
  });
  
  return recommendations.slice(0, 3); // Return top 3 matches
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