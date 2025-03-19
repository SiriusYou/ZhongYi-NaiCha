const { createLogger } = require('../../../src/utils/logger');
const axios = require('axios');

const logger = createLogger('inference-lambda');

// Configuration for different LLM providers
const LLM_PROVIDERS = {
  openai: {
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    headers: () => ({
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }),
    formatRequest: (prompt, model) => ({
      model: mapToProviderModel('openai', model),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    }),
    parseResponse: (response) => response.data.choices[0].message.content,
  },
  anthropic: {
    apiUrl: 'https://api.anthropic.com/v1/messages',
    headers: () => ({
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }),
    formatRequest: (prompt, model) => ({
      model: mapToProviderModel('anthropic', model),
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
    }),
    parseResponse: (response) => response.data.content[0].text,
  },
  replicate: {
    apiUrl: 'https://api.replicate.com/v1/predictions',
    headers: () => ({
      'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
      'Content-Type': 'application/json'
    }),
    formatRequest: (prompt, model) => ({
      version: mapToProviderModel('replicate', model),
      input: {
        prompt: prompt,
        max_new_tokens: 1500,
        temperature: 0.7,
      }
    }),
    parseResponse: (response) => response.data.output.join(''),
  },
  // Add configuration for specialized TCM model hosting
  tcm_specialized: {
    apiUrl: process.env.TCM_SPECIALIZED_API_URL || 'https://api.replicate.com/v1/predictions',
    headers: () => ({
      'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
      'Content-Type': 'application/json'
    }),
    formatRequest: (prompt, model) => ({
      version: mapToProviderModel('tcm_specialized', model),
      input: {
        prompt: prompt,
        max_new_tokens: 2000,
        temperature: 0.5, // Lower temperature for more deterministic outputs
        top_p: 0.9,
        system_prompt: "You are a specialized Traditional Chinese Medicine consultation assistant with extensive knowledge of TCM theory, diagnosis principles, and treatment recommendations. Provide educational information only, not medical advice."
      }
    }),
    parseResponse: (response) => response.data.output.join(''),
  },
  // Add Ollama provider for local model hosting
  ollama: {
    apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate',
    headers: () => ({
      'Content-Type': 'application/json'
    }),
    formatRequest: (prompt, model) => ({
      model: mapToProviderModel('ollama', model),
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9
      },
      system: getTcmSystemPrompt(model)
    }),
    parseResponse: (response) => response.data.response,
  }
};

/**
 * Get specialized TCM system prompt based on model and consultation type
 * 
 * @param {string} modelName - Model name or consultation type
 * @returns {string} - Specialized system prompt
 */
function getTcmSystemPrompt(modelName) {
  // Base TCM prompt for all models
  const baseTcmPrompt = "You are a Traditional Chinese Medicine expert with extensive knowledge of TCM principles, diagnosis, and herbal treatments. Provide educational information only, not medical advice.";
  
  // Specialized prompts based on model/consultation type
  const specializationPrompts = {
    'TCM-Symptom-Llama-13b': `${baseTcmPrompt} Focus on identifying patterns in symptoms according to TCM principles like Yin/Yang imbalance, Five Elements theory, and Zang-Fu organ systems. Explain how symptoms might relate to qi, blood, and fluid disharmonies.`,
    'TCM-Constitution-Llama-13b': `${baseTcmPrompt} Specialize in analyzing body constitutions such as qi deficiency, yang deficiency, yin deficiency, phlegm-dampness, damp-heat, blood stasis, qi stagnation, and balanced constitutions. Provide lifestyle and dietary recommendations appropriate for each constitution.`,
    'TCM-Herbs-Llama-13b': `${baseTcmPrompt} Offer detailed information about Chinese herbs, their properties (nature, flavor, channel tropism), traditional uses, and common formula combinations. Explain herb functions using TCM terminology like clearing heat, tonifying qi, or nourishing blood.`
  };
  
  return specializationPrompts[modelName] || baseTcmPrompt;
}

/**
 * Maps internal model names to provider-specific model identifiers
 * 
 * @param {string} provider - LLM provider name
 * @param {string} modelName - Internal model name
 * @returns {string} - Provider-specific model identifier
 */
function mapToProviderModel(provider, modelName) {
  // Map of internal model names to provider-specific identifiers
  const modelMappings = {
    'openai': {
      'Llama3-70b': 'gpt-4o',
      'Mistral-7b': 'gpt-3.5-turbo',
      'TCM-Llama2-13b': 'gpt-4o',
      'default': 'gpt-3.5-turbo'
    },
    'anthropic': {
      'Llama3-70b': 'claude-3-opus-20240229',
      'Mistral-7b': 'claude-3-haiku-20240307',
      'TCM-Llama2-13b': 'claude-3-sonnet-20240229',
      'default': 'claude-3-haiku-20240307'
    },
    'replicate': {
      'Llama3-70b': 'meta/llama-3-70b-instruct:2a1dab590f8d6713393906699af66af0ffca3132e79891eb9e76af4a8845612a',
      'Mistral-7b': 'mistralai/mistral-7b-instruct-v0.2:7e5e8c4a4a34ed4c2c2efe70ddcca0513858d4c09c01a392dddf764ace8196d2',
      'TCM-Llama2-13b': 'replicate/llama-2-13b-chat:f4e2de70d66816a838a89eeeb621910adffb0dd0baba3976c96980970978018d',
      'default': 'meta/llama-3-8b-instruct:dd2c4695a7bb6cb2833f142fd077f54f33f6081.fc08ca4e96456c93ab95a11900e3d1fbb99d8492'
    },
    'tcm_specialized': {
      'TCM-Symptom-Llama-13b': process.env.TCM_SYMPTOM_MODEL_ID || 'replicate/tcm-symptom-llama:7bb8f8b74b9f1ebf3c164dfdee91138e33def55b1eaa8b7106e2ed602e628a1d',
      'TCM-Constitution-Llama-13b': process.env.TCM_CONSTITUTION_MODEL_ID || 'replicate/tcm-constitution-llama:9e1a8ac160413e2b75aef38e84da887f6d76d47deca654ca8395f48d57014738',
      'TCM-Herbs-Llama-13b': process.env.TCM_HERBS_MODEL_ID || 'replicate/tcm-herbs-llama:f23c6b526a6fcb8d7ee49689bd8d74a96bb1b08dd57f5a6abb0ba275ad7dccb4',
      'default': 'replicate/llama-2-13b-chat:f4e2de70d66816a838a89eeeb621910adffb0dd0baba3976c96980970978018d'
    },
    'ollama': {
      'TCM-Symptom-Llama-13b': process.env.OLLAMA_MODEL || 'OussamaELALLAM/MedExpert',
      'TCM-Constitution-Llama-13b': process.env.OLLAMA_MODEL || 'OussamaELALLAM/MedExpert',
      'TCM-Herbs-Llama-13b': process.env.OLLAMA_MODEL || 'OussamaELALLAM/MedExpert',
      'default': process.env.OLLAMA_MODEL || 'OussamaELALLAM/MedExpert'
    }
  };

  // Get provider-specific mappings or use defaults
  const providerMappings = modelMappings[provider] || modelMappings.openai;
  return providerMappings[modelName] || providerMappings.default;
}

/**
 * Handles the inference request to the LLM provider
 * 
 * @param {Object} event - Lambda event object
 * @param {Object} context - Lambda context object
 * @returns {Object} - LLM response
 */
exports.handler = async (event, context) => {
  try {
    logger.info('Processing inference request');
    
    // Parse the request body
    const requestBody = JSON.parse(event.body || '{}');
    
    // Extract the necessary information
    const { 
      preprocessedData, 
      userId, 
      sessionId, 
      consultationType,
      provider: requestedProvider,
      modelOverride
    } = requestBody;
    
    // Input validation
    if (!preprocessedData || !preprocessedData.prompt) {
      logger.warn('Missing preprocessed data or prompt');
      return formatResponse(400, { 
        error: 'Missing required fields', 
        details: 'Preprocessed data with prompt is required' 
      });
    }
    
    // Extract the prompt, model selection and other metadata
    const { 
      prompt, 
      modelSelection = process.env.PRIMARY_LLM_MODEL || 'Llama3-70b',
      tokenEstimate,
      metadata 
    } = preprocessedData;
    
    // Use model override if provided (from specialized endpoints)
    const modelToUse = modelOverride || modelSelection;
    
    // If provider is explicitly requested (from specialized endpoints), use that
    // Otherwise determine based on the model selection
    const providerName = requestedProvider || determineProvider(modelToUse, consultationType);
    const provider = LLM_PROVIDERS[providerName];
    
    if (!provider) {
      logger.error(`Unknown provider for model: ${modelToUse}`);
      return formatResponse(500, { 
        error: 'Configuration error', 
        details: 'Unknown LLM provider' 
      });
    }
    
    // Make the API call to the LLM provider
    logger.debug(`Making API call to ${providerName} for model ${modelToUse}`);
    
    const startTime = new Date();
    let response;
    
    try {
      response = await axios.post(
        provider.apiUrl,
        provider.formatRequest(prompt, modelToUse),
        { headers: provider.headers() }
      );
    } catch (error) {
      logger.error(`LLM API error: ${error.message}`);
      
      // Try fallback if main provider fails
      if (providerName !== 'openai') {
        logger.info('Attempting fallback to OpenAI');
        const fallbackProvider = LLM_PROVIDERS.openai;
        response = await axios.post(
          fallbackProvider.apiUrl,
          fallbackProvider.formatRequest(prompt, 'Llama3-70b'), // Use best available fallback
          { headers: fallbackProvider.headers() }
        );
      } else {
        throw error; // Re-throw if already using the fallback
      }
    }
    
    const endTime = new Date();
    const latency = endTime - startTime;
    
    // Parse the LLM response
    const inferenceResult = provider.parseResponse(response);
    
    // Log performance metrics
    logger.info(`Inference completed in ${latency}ms for model ${modelToUse}`);
    
    // Return the inference result
    return formatResponse(200, {
      inferenceResult,
      sessionId,
      userId,
      consultationType,
      model: modelToUse,
      provider: providerName,
      metrics: {
        latency,
        tokenEstimate,
        timestamp: endTime.toISOString()
      },
      metadata: {
        ...metadata,
        inferenceTimestamp: endTime.toISOString()
      }
    });
  } catch (error) {
    logger.error(`Error in inference: ${error.message}`);
    logger.error(error.stack);
    
    return formatResponse(500, { 
      error: 'Inference error', 
      message: error.message 
    });
  }
};

/**
 * Determines the appropriate LLM provider based on the model and consultation type
 * 
 * @param {string} modelSelection - Selected model
 * @param {string} consultationType - Type of consultation
 * @returns {string} - Provider name
 */
function determineProvider(modelSelection, consultationType) {
  // In a production setting, this would be more sophisticated,
  // potentially considering cost, latency, and availability
  
  // Use environment variable if set, otherwise default to the model-based selection
  const forcedProvider = process.env.FORCE_LLM_PROVIDER;
  if (forcedProvider && LLM_PROVIDERS[forcedProvider]) {
    return forcedProvider;
  }

  // Check if we should use Ollama
  if (process.env.USE_OLLAMA === 'true') {
    return 'ollama';
  }

  // If the consultation type is specified, use specialized model when appropriate
  if (consultationType) {
    // Map consultation types to specialized models
    const typeToModel = {
      'symptom_assessment': 'TCM-Symptom-Llama-13b',
      'constitution_analysis': 'TCM-Constitution-Llama-13b',
      'herbal_recommendation': 'TCM-Herbs-Llama-13b'
    };

    // Use specialized model if available for this consultation type
    const specializedModel = typeToModel[consultationType];
    if (specializedModel && modelSelection === 'SPECIALIZED_LLM_MODEL') {
      return 'tcm_specialized';
    }
  }
  
  // Default model-to-provider mapping
  const modelProviderMap = {
    'Llama3-70b': process.env.LLAMA3_PROVIDER || 'replicate',
    'Mistral-7b': process.env.MISTRAL_PROVIDER || 'replicate',
    'TCM-Llama2-13b': process.env.TCM_LLAMA_PROVIDER || 'replicate',
    'TCM-Symptom-Llama-13b': 'tcm_specialized',
    'TCM-Constitution-Llama-13b': 'tcm_specialized',
    'TCM-Herbs-Llama-13b': 'tcm_specialized'
  };
  
  return modelProviderMap[modelSelection] || 'openai';
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