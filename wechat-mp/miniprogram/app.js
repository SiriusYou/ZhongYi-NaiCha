// app.js
import { initCache } from './utils/cache';
import { initNetworkStatus } from './utils/network';
import { checkSession, getUserInfo } from './services/auth';

App({
  globalData: {
    userInfo: null,
    hasUserInfo: false,
    isAuthenticated: false,
    healthProfile: null,
    apiBaseUrl: 'https://api.zhongyi-naicha.com/v1',
    theme: 'light',
    networkStatus: 'unknown',
    // Constants for TCM constitutions
    tcmConstitutions: [
      { id: 1, name: '平和质' },
      { id: 2, name: '气虚质' },
      { id: 3, name: '阳虚质' },
      { id: 4, name: '阴虚质' },
      { id: 5, name: '痰湿质' },
      { id: 6, name: '湿热质' },
      { id: 7, name: '血瘀质' },
      { id: 8, name: '气郁质' },
      { id: 9, name: '特禀质' }
    ]
  },

  onLaunch: function () {
    // Initialize cache system
    initCache();
    
    // Initialize network status monitoring
    initNetworkStatus((status) => {
      this.globalData.networkStatus = status;
      console.log('Network status changed:', status);
      
      // If network is available, sync pending data
      if (status === 'wifi' || status === 'cellular') {
        this.syncPendingData();
      }
    });

    // Check login status
    this.checkLoginStatus();
    
    // Initialize theme based on system settings
    this.initTheme();
  },
  
  // Check if user is logged in
  checkLoginStatus: function() {
    checkSession().then(isValid => {
      if (isValid) {
        // Session is valid, get user info
        return getUserInfo().then(userInfo => {
          this.globalData.userInfo = userInfo;
          this.globalData.hasUserInfo = true;
          this.globalData.isAuthenticated = true;
          
          // Fetch health profile data
          return this.fetchHealthProfile();
        });
      } else {
        // Session is invalid or expired
        console.log('Session invalid or expired');
        this.globalData.isAuthenticated = false;
      }
    }).catch(err => {
      console.error('Failed to check login status:', err);
      this.globalData.isAuthenticated = false;
    });
  },
  
  // Fetch user's health profile data
  fetchHealthProfile: function() {
    if (!this.globalData.isAuthenticated) {
      return Promise.reject(new Error('User not logged in'));
    }
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.globalData.apiBaseUrl}/api/users/profile`,
        method: 'GET',
        header: {
          'content-type': 'application/json',
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
        success: (res) => {
          if (res.statusCode === 200) {
            this.globalData.healthProfile = res.data;
            resolve(res.data);
          } else {
            reject(new Error(`Failed to fetch health profile: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },
  
  // Sync data that was saved during offline mode
  syncPendingData: function() {
    const pendingData = wx.getStorageSync('pendingSync') || [];
    if (pendingData.length === 0) return;
    
    console.log('Syncing pending data:', pendingData.length, 'items');
    
    // Process each pending item
    pendingData.forEach((item, index) => {
      wx.request({
        url: item.url,
        method: item.method,
        data: item.data,
        header: {
          'content-type': 'application/json',
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
        success: () => {
          // Remove synced item
          pendingData.splice(index, 1);
          wx.setStorageSync('pendingSync', pendingData);
          console.log('Synced item:', item.url);
        },
        fail: (err) => {
          console.error('Failed to sync item:', item.url, err);
        }
      });
    });
  },
  
  // Initialize theme based on system settings
  initTheme: function() {
    wx.getSystemInfo({
      success: (res) => {
        const isSystemDarkMode = res.theme === 'dark';
        this.globalData.theme = isSystemDarkMode ? 'dark' : 'light';
      }
    });
    
    // Listen for system theme changes
    wx.onThemeChange((res) => {
      this.globalData.theme = res.theme;
    });
  }
}); 