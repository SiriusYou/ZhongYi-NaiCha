/**
 * 个性化健康推荐工具 - Personalized Health Recommendations Utility
 * 基于用户健康数据、体质分析和中医理论提供个性化推荐
 * Provides personalized recommendations based on user health data, constitution analysis and TCM theories
 */

const app = getApp();

/**
 * 获取个性化茶饮推荐
 * Get personalized tea recommendations
 * @param {Object} userProfile - User health profile data
 * @param {Array} symptoms - Optional array of symptoms
 * @returns {Promise} - Promise resolving to recommendations
 */
const getTeaRecommendations = (userProfile, symptoms = []) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/recommendations/tea`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        profile: userProfile,
        symptoms: symptoms,
        season: getCurrentSeason(),
        location: wx.getStorageSync('userLocation') || {}
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 在本地缓存推荐结果以支持离线访问
          // Cache recommendation results for offline access
          wx.setStorageSync('tea_recommendations', {
            data: res.data,
            timestamp: Date.now()
          });
          resolve(res.data);
        } else {
          reject(new Error('获取推荐失败'));
        }
      },
      fail: (err) => {
        console.error('请求推荐API失败', err);
        
        // 尝试从缓存获取
        // Try to get from cache
        const cachedRecommendations = wx.getStorageSync('tea_recommendations');
        if (cachedRecommendations && cachedRecommendations.data) {
          resolve({
            ...cachedRecommendations.data,
            fromCache: true
          });
        } else {
          reject(err);
        }
      }
    });
  });
};

/**
 * 获取个性化养生建议
 * Get personalized wellness advice
 * @param {Object} userProfile - User health profile data
 * @returns {Promise} - Promise resolving to wellness advice
 */
const getWellnessAdvice = (userProfile) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/recommendations/wellness`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        profile: userProfile,
        season: getCurrentSeason()
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 缓存结果
          // Cache results
          wx.setStorageSync('wellness_advice', {
            data: res.data,
            timestamp: Date.now()
          });
          resolve(res.data);
        } else {
          reject(new Error('获取养生建议失败'));
        }
      },
      fail: (err) => {
        console.error('请求养生建议API失败', err);
        
        // 尝试从缓存获取
        // Try to get from cache
        const cachedAdvice = wx.getStorageSync('wellness_advice');
        if (cachedAdvice && cachedAdvice.data) {
          resolve({
            ...cachedAdvice.data,
            fromCache: true
          });
        } else {
          reject(err);
        }
      }
    });
  });
};

/**
 * 获取季节性健康提示
 * Get seasonal health tips
 * @returns {Promise} - Promise resolving to seasonal health tips
 */
const getSeasonalHealthTips = () => {
  return new Promise((resolve, reject) => {
    const season = getCurrentSeason();
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/recommendations/seasonal`,
      method: 'GET',
      data: {
        season: season
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 缓存结果
          // Cache results
          wx.setStorageSync('seasonal_tips', {
            data: res.data,
            season: season,
            timestamp: Date.now()
          });
          resolve(res.data);
        } else {
          reject(new Error('获取季节健康提示失败'));
        }
      },
      fail: (err) => {
        console.error('请求季节健康提示失败', err);
        
        // 尝试从缓存获取
        // Try to get from cache
        const cachedTips = wx.getStorageSync('seasonal_tips');
        if (cachedTips && cachedTips.data && cachedTips.season === season) {
          resolve({
            ...cachedTips.data,
            fromCache: true
          });
        } else {
          reject(err);
        }
      }
    });
  });
};

/**
 * 获取健康计划和目标
 * Get health plan and goals
 * @param {Object} userProfile - User health profile data
 * @returns {Promise} - Promise resolving to health plan
 */
const getHealthPlan = (userProfile) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/recommendations/plan`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        profile: userProfile
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 缓存结果
          // Cache results
          wx.setStorageSync('health_plan', {
            data: res.data,
            timestamp: Date.now()
          });
          resolve(res.data);
        } else {
          reject(new Error('获取健康计划失败'));
        }
      },
      fail: (err) => {
        console.error('请求健康计划API失败', err);
        
        // 尝试从缓存获取
        // Try to get from cache
        const cachedPlan = wx.getStorageSync('health_plan');
        if (cachedPlan && cachedPlan.data) {
          resolve({
            ...cachedPlan.data,
            fromCache: true
          });
        } else {
          reject(err);
        }
      }
    });
  });
};

/**
 * 获取当前季节
 * Get current season
 * @returns {string} - Current season (spring, summer, autumn, winter)
 */
const getCurrentSeason = () => {
  const now = new Date();
  const month = now.getMonth() + 1; // getMonth returns 0-11
  
  if (month >= 3 && month <= 5) {
    return 'spring';
  } else if (month >= 6 && month <= 8) {
    return 'summer';
  } else if (month >= 9 && month <= 11) {
    return 'autumn';
  } else {
    return 'winter';
  }
};

/**
 * 提交用户反馈
 * Submit user feedback on recommendations
 * @param {string} recommendationId - Recommendation ID
 * @param {Object} feedback - Feedback data
 * @returns {Promise} - Promise resolving when feedback is submitted
 */
const submitRecommendationFeedback = (recommendationId, feedback) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/recommendations/feedback`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        recommendationId: recommendationId,
        rating: feedback.rating,
        comments: feedback.comments,
        effectivenessScore: feedback.effectivenessScore,
        tasteScore: feedback.tasteScore,
        timestamp: Date.now()
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data);
        } else {
          reject(new Error('提交反馈失败'));
        }
      },
      fail: (err) => {
        console.error('请求反馈API失败', err);
        reject(err);
      }
    });
  });
};

module.exports = {
  getTeaRecommendations,
  getWellnessAdvice,
  getSeasonalHealthTips,
  getHealthPlan,
  submitRecommendationFeedback
}; 