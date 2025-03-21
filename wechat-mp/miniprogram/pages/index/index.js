// index.js
// Home page controller

import { request } from '../../utils/network';
import { CACHE_KEYS, getCache, setCache, hasValidCache } from '../../utils/cache';

const app = getApp();

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    recommendations: [],
    loading: true,
    healthTips: [],
    seasonalMessage: '',
    weatherData: null,
    currentConstitution: null,
    networkStatus: 'unknown'
  },

  onLoad: function (options) {
    // Check network status
    this.setData({
      networkStatus: app.globalData.networkStatus
    });
    
    // Get user info from global data if available
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      });
      
      // Get user's TCM constitution
      if (app.globalData.healthProfile && app.globalData.healthProfile.tcmConstitution) {
        this.setData({
          currentConstitution: app.globalData.healthProfile.tcmConstitution
        });
      }
    }
    
    // Load recommendations, either from cache or network
    this.loadRecommendations();
    
    // Load health tips
    this.loadHealthTips();
    
    // Get seasonal message based on current date
    this.getSeasonalMessage();
    
    // Get weather data for location-based recommendations
    this.getWeatherData();
  },

  onShow: function () {
    // Check if user info or health profile has been updated
    if (app.globalData.userInfo && (!this.data.userInfo || this.data.userInfo.id !== app.globalData.userInfo.id)) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      });
    }
    
    if (app.globalData.healthProfile && app.globalData.healthProfile.tcmConstitution) {
      this.setData({
        currentConstitution: app.globalData.healthProfile.tcmConstitution
      });
      
      // Reload recommendations if constitution has changed
      if (!this.data.currentConstitution || 
          this.data.currentConstitution.id !== app.globalData.healthProfile.tcmConstitution.id) {
        this.loadRecommendations();
      }
    }
  },

  /**
   * Load personalized tea recommendations
   */
  loadRecommendations: function () {
    this.setData({ loading: true });
    
    // Check cache first
    if (hasValidCache(CACHE_KEYS.RECIPES)) {
      const cachedRecommendations = getCache(CACHE_KEYS.RECIPES);
      if (cachedRecommendations && cachedRecommendations.length > 0) {
        this.setData({
          recommendations: cachedRecommendations,
          loading: false
        });
        
        // Still try to fetch fresh data in background if online
        if (app.globalData.networkStatus === 'wifi' || app.globalData.networkStatus === 'cellular') {
          this.fetchRecommendationsFromServer(true);
        }
        return;
      }
    }
    
    // No valid cache, fetch from server
    this.fetchRecommendationsFromServer();
  },

  /**
   * Fetch recommendations from server
   * @param {boolean} background - Whether this is a background refresh
   */
  fetchRecommendationsFromServer: function (background = false) {
    if (!background) {
      this.setData({ loading: true });
    }
    
    // Prepare request parameters
    const params = {};
    
    // Add constitution ID if available
    if (this.data.currentConstitution) {
      params.constitutionId = this.data.currentConstitution.id;
    }
    
    // Add weather data if available
    if (this.data.weatherData) {
      params.temperature = this.data.weatherData.temperature;
      params.humidity = this.data.weatherData.humidity;
      params.weatherCondition = this.data.weatherData.condition;
    }
    
    request({
      url: `${app.globalData.apiBaseUrl}/api/recommendations/tea`,
      method: 'GET',
      data: params,
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      }
    }).then(res => {
      if (res.statusCode === 200) {
        const recommendations = res.data;
        
        // Update UI
        this.setData({
          recommendations,
          loading: false
        });
        
        // Cache recommendations for 4 hours
        setCache(CACHE_KEYS.RECIPES, recommendations, 4 * 60 * 60 * 1000);
      } else {
        // Show error only if not a background refresh
        if (!background) {
          wx.showToast({
            title: '加载推荐失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      }
    }).catch(err => {
      console.error('Failed to fetch recommendations:', err);
      
      // Show error only if not a background refresh
      if (!background) {
        wx.showToast({
          title: '加载推荐失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },

  /**
   * Load health tips
   */
  loadHealthTips: function () {
    // Check cache first
    if (hasValidCache(CACHE_KEYS.HEALTH_TIPS)) {
      const cachedTips = getCache(CACHE_KEYS.HEALTH_TIPS);
      if (cachedTips && cachedTips.length > 0) {
        this.setData({ healthTips: cachedTips });
        return;
      }
    }
    
    // No valid cache, fetch from server
    request({
      url: `${app.globalData.apiBaseUrl}/api/knowledge/health-tips`,
      method: 'GET'
    }).then(res => {
      if (res.statusCode === 200) {
        this.setData({ healthTips: res.data });
        
        // Cache health tips for 1 day
        setCache(CACHE_KEYS.HEALTH_TIPS, res.data, 24 * 60 * 60 * 1000);
      }
    }).catch(err => {
      console.error('Failed to fetch health tips:', err);
    });
  },

  /**
   * Get seasonal message based on current date
   */
  getSeasonalMessage: function () {
    const now = new Date();
    const month = now.getMonth();
    
    let message = '';
    if (month >= 2 && month <= 4) {
      message = '春季养生，宜养肝';
    } else if (month >= 5 && month <= 7) {
      message = '夏季养生，宜养心';
    } else if (month >= 8 && month <= 10) {
      message = '秋季养生，宜养肺';
    } else {
      message = '冬季养生，宜养肾';
    }
    
    this.setData({ seasonalMessage: message });
  },

  /**
   * Get weather data for location-based recommendations
   */
  getWeatherData: function () {
    wx.getLocation({
      type: 'wgs84',
      success: res => {
        const latitude = res.latitude;
        const longitude = res.longitude;
        
        // Fetch weather data based on location
        request({
          url: `${app.globalData.apiBaseUrl}/api/weather`,
          method: 'GET',
          data: {
            lat: latitude,
            lon: longitude
          }
        }).then(res => {
          if (res.statusCode === 200) {
            this.setData({ weatherData: res.data });
            
            // Refresh recommendations with weather data
            this.fetchRecommendationsFromServer(true);
          }
        }).catch(err => {
          console.error('Failed to fetch weather data:', err);
        });
      }
    });
  },

  /**
   * Navigate to recipe detail page
   */
  navigateToRecipe: function (e) {
    const recipeId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/recipe-detail/recipe-detail?id=${recipeId}`
    });
  },

  /**
   * Navigate to health profile page
   */
  navigateToHealth: function () {
    wx.switchTab({
      url: '/pages/health/health'
    });
  },

  /**
   * Pull to refresh
   */
  onPullDownRefresh: function () {
    // Reload recommendations
    this.fetchRecommendationsFromServer();
    
    // Reload health tips
    this.loadHealthTips();
    
    // Get weather data
    this.getWeatherData();
    
    wx.stopPullDownRefresh();
  },

  /**
   * Share page
   */
  onShareAppMessage: function () {
    return {
      title: '中医奶茶养生 - 定制你的健康茶饮',
      path: '/pages/index/index'
    };
  }
}); 