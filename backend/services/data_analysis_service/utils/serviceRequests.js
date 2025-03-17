const axios = require('axios');

/**
 * Get user data from the User Service
 * @param {string} userId - User ID
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - User data
 */
async function getUserData(userId, token) {
  try {
    const response = await axios.get(
      `${process.env.USER_SERVICE_URL}/api/users/${userId}/profile`,
      {
        headers: {
          'x-auth-token': token
        }
      }
    );
    
    return response.data;
  } catch (err) {
    console.error('Error fetching user data:', err.message);
    throw new Error('Failed to fetch user data from User Service');
  }
}

/**
 * Get user health data from the User Service
 * @param {string} userId - User ID
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} - Health profile data
 */
async function getHealthData(userId, token) {
  try {
    const response = await axios.get(
      `${process.env.USER_SERVICE_URL}/api/profile`,
      {
        headers: {
          'x-auth-token': token
        }
      }
    );
    
    return response.data;
  } catch (err) {
    console.error('Error fetching health data:', err.message);
    throw new Error('Failed to fetch health data from User Service');
  }
}

/**
 * Get user health data history from the User Service
 * @param {string} userId - User ID
 * @param {string} token - Authentication token
 * @param {number} limit - Number of records to retrieve
 * @returns {Promise<Array>} - Health data history
 */
async function getHealthDataHistory(userId, token, limit = 10) {
  try {
    const response = await axios.get(
      `${process.env.USER_SERVICE_URL}/api/profile/history?limit=${limit}`,
      {
        headers: {
          'x-auth-token': token
        }
      }
    );
    
    return response.data;
  } catch (err) {
    console.error('Error fetching health data history:', err.message);
    throw new Error('Failed to fetch health data history from User Service');
  }
}

/**
 * Get user consumption data from the Order Service
 * @param {string} userId - User ID
 * @param {string} token - Authentication token
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Consumption data
 */
async function getConsumptionData(userId, token, options = {}) {
  try {
    const { startDate, endDate, limit } = options;
    
    let url = `${process.env.ORDER_SERVICE_URL}/api/orders/user/${userId}/completed`;
    
    // Add query parameters
    const queryParams = [];
    if (startDate) queryParams.push(`startDate=${startDate}`);
    if (endDate) queryParams.push(`endDate=${endDate}`);
    if (limit) queryParams.push(`limit=${limit}`);
    
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }
    
    const response = await axios.get(
      url,
      {
        headers: {
          'x-auth-token': token
        }
      }
    );
    
    return response.data;
  } catch (err) {
    console.error('Error fetching consumption data:', err.message);
    throw new Error('Failed to fetch consumption data from Order Service');
  }
}

/**
 * Get recipe details for multiple recipe IDs
 * @param {Array} recipeIds - Array of recipe IDs
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Recipe details
 */
async function getRecipeDetails(recipeIds, token) {
  try {
    // Make parallel requests for all recipe IDs
    const requests = recipeIds.map(recipeId => 
      axios.get(
        `${process.env.RECIPE_SERVICE_URL}/api/recipes/${recipeId}`,
        {
          headers: {
            'x-auth-token': token
          }
        }
      )
    );
    
    const responses = await Promise.all(requests);
    
    // Extract data from responses
    return responses.map(response => response.data);
  } catch (err) {
    console.error('Error fetching recipe details:', err.message);
    throw new Error('Failed to fetch recipe details from Recipe Service');
  }
}

/**
 * Get recommendations based on health profile
 * @param {Object} healthProfile - User's health profile
 * @param {string} token - Authentication token
 * @returns {Promise<Array>} - Recommendations
 */
async function getRecommendations(healthProfile, token) {
  try {
    const { constitution, symptoms, season } = healthProfile;
    
    let url = `${process.env.RECIPE_SERVICE_URL}/api/recipes/recommendations`;
    
    // Add query parameters
    const queryParams = [];
    if (constitution) queryParams.push(`constitution=${constitution}`);
    if (symptoms && symptoms.length > 0) queryParams.push(`symptoms=${symptoms.join(',')}`);
    if (season) queryParams.push(`season=${season}`);
    
    if (queryParams.length > 0) {
      url += `?${queryParams.join('&')}`;
    }
    
    const response = await axios.get(
      url,
      {
        headers: {
          'x-auth-token': token
        }
      }
    );
    
    return response.data;
  } catch (err) {
    console.error('Error fetching recommendations:', err.message);
    throw new Error('Failed to fetch recommendations from Recipe Service');
  }
}

module.exports = {
  getUserData,
  getHealthData,
  getHealthDataHistory,
  getConsumptionData,
  getRecipeDetails,
  getRecommendations,
}; 