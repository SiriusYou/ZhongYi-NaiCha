/**
 * Get seasonal content highlights
 * @param {number} limit - Maximum number of items to fetch
 * @returns {Promise} - API response with seasonal content
 */
export const getSeasonalHighlights = async (limit = 10) => {
  try {
    const response = await axios.get(`/api/seasonal/highlights?limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching seasonal highlights:', error);
    throw error;
  }
};

/**
 * Get current TCM seasonal information
 * @returns {Promise} - API response with seasonal TCM info
 */
export const getSeasonalInfo = async () => {
  try {
    const response = await axios.get('/api/seasonal/info');
    return response.data;
  } catch (error) {
    console.error('Error fetching seasonal TCM info:', error);
    throw error;
  }
};

/**
 * Track a click on a seasonal promotion
 * @param {string} promotionId - ID of the promotion
 * @returns {Promise} - API response
 */
export const trackPromotionClick = async (promotionId) => {
  try {
    const response = await axios.post(`/api/seasonal/track-click/${promotionId}`);
    return response.data;
  } catch (error) {
    console.error('Error tracking promotion click:', error);
    // Don't rethrow to avoid disrupting the UX
    return { success: false };
  }
};

/**
 * Admin: Get all seasonal promotions
 * @param {boolean} activeOnly - Get only active promotions if true
 * @returns {Promise} - API response with promotions
 */
export const getSeasonalPromotions = async (activeOnly = false) => {
  try {
    const response = await axios.get(`/api/seasonal/promotions?active=${activeOnly}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching seasonal promotions:', error);
    throw error;
  }
};

/**
 * Admin: Create a new seasonal promotion
 * @param {Object} promotionData - Promotion data
 * @returns {Promise} - API response with created promotion
 */
export const createSeasonalPromotion = async (promotionData) => {
  try {
    const response = await axios.post('/api/seasonal/promotions', promotionData);
    return response.data;
  } catch (error) {
    console.error('Error creating seasonal promotion:', error);
    throw error;
  }
};

/**
 * Admin: Update an existing seasonal promotion
 * @param {string} promotionId - Promotion ID
 * @param {Object} updateData - Updated promotion data
 * @returns {Promise} - API response with updated promotion
 */
export const updateSeasonalPromotion = async (promotionId, updateData) => {
  try {
    const response = await axios.put(`/api/seasonal/promotions/${promotionId}`, updateData);
    return response.data;
  } catch (error) {
    console.error('Error updating seasonal promotion:', error);
    throw error;
  }
};

/**
 * Admin: Delete a seasonal promotion
 * @param {string} promotionId - Promotion ID
 * @returns {Promise} - API response
 */
export const deleteSeasonalPromotion = async (promotionId) => {
  try {
    const response = await axios.delete(`/api/seasonal/promotions/${promotionId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting seasonal promotion:', error);
    throw error;
  }
};

/**
 * Admin: Generate an automatic seasonal promotion
 * @returns {Promise} - API response with created promotion
 */
export const generateAutomaticSeasonalPromotion = async () => {
  try {
    const response = await axios.post('/api/seasonal/auto-generate');
    return response.data;
  } catch (error) {
    console.error('Error generating automatic seasonal promotion:', error);
    throw error;
  }
};

/**
 * Admin: Get effectiveness metrics for seasonal promotions
 * @returns {Promise} - API response with promotion effectiveness data
 */
export const getPromotionEffectiveness = async () => {
  try {
    const response = await axios.get('/api/seasonal/effectiveness');
    return response.data;
  } catch (error) {
    console.error('Error fetching promotion effectiveness:', error);
    throw error;
  }
}; 