/**
 * Unified User Profile service for cross-platform consistency
 * Handles user profile data management and synchronization
 */

const app = getApp();
const syncUtils = require('./sync.js');

/**
 * Get unified user profile data
 * @returns {Promise} - Promise resolving to unified profile
 */
const getUnifiedProfile = () => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      reject(new Error('未登录，无法获取个人资料'));
      return;
    }

    // First, try to get latest from server
    wx.request({
      url: `${app.globalData.apiBaseUrl}/users/unified-profile`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`,
        'X-Platform': 'wechat-mini'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const serverProfile = res.data;
          
          // Get local profile
          const localProfile = wx.getStorageSync('user_profile');
          const localTimestamp = wx.getStorageSync('profile_timestamp') || 0;
          
          // Compare timestamps to use the most recent data
          let profile;
          if (serverProfile.timestamp > localTimestamp) {
            profile = serverProfile;
            // Update local storage
            wx.setStorageSync('user_profile', profile);
            wx.setStorageSync('profile_timestamp', profile.timestamp);
          } else if (localProfile) {
            profile = localProfile;
            // Local is newer, sync to server
            syncUtils.syncProfileData(localProfile)
              .then(result => console.log('已将本地资料同步到服务器', result))
              .catch(err => console.error('同步本地资料失败', err));
          } else {
            profile = serverProfile;
            // No local profile, use server
            wx.setStorageSync('user_profile', profile);
            wx.setStorageSync('profile_timestamp', profile.timestamp);
          }
          
          resolve(profile);
        } else {
          // If server request fails, fall back to local data
          const localProfile = wx.getStorageSync('user_profile');
          if (localProfile) {
            resolve(localProfile);
          } else {
            reject(new Error('无法获取个人资料'));
          }
        }
      },
      fail: (err) => {
        console.error('获取统一个人资料失败:', err);
        // Fall back to local data
        const localProfile = wx.getStorageSync('user_profile');
        if (localProfile) {
          resolve(localProfile);
        } else {
          reject(err);
        }
      }
    });
  });
};

/**
 * Update unified user profile data
 * @param {Object} profileData - Profile data to update
 * @returns {Promise} - Promise resolving to update result
 */
const updateUnifiedProfile = (profileData) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      reject(new Error('未登录，无法更新个人资料'));
      return;
    }

    // Add timestamp to track changes
    const profile = {
      ...profileData,
      timestamp: Date.now()
    };

    wx.request({
      url: `${app.globalData.apiBaseUrl}/users/unified-profile`,
      method: 'PUT',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Platform': 'wechat-mini'
      },
      data: profile,
      success: (res) => {
        if (res.statusCode === 200) {
          // Update local storage
          wx.setStorageSync('user_profile', profile);
          wx.setStorageSync('profile_timestamp', profile.timestamp);
          
          // Sync to other platforms
          syncUtils.syncProfileData(profile)
            .then(syncResult => {
              console.log('同步个人资料到其他平台成功', syncResult);
            })
            .catch(syncErr => {
              console.error('同步个人资料到其他平台失败', syncErr);
            });
            
          resolve(res.data);
        } else {
          reject(new Error(res.data.message || '更新个人资料失败'));
        }
      },
      fail: (err) => {
        console.error('更新统一个人资料失败:', err);
        reject(err);
      }
    });
  });
};

/**
 * Merge profile data from different platforms
 * @param {Object} localProfile - Local profile data
 * @param {Object} serverProfile - Server profile data
 * @returns {Object} - Merged profile data
 */
const mergeProfiles = (localProfile, serverProfile) => {
  if (!localProfile) return serverProfile;
  if (!serverProfile) return localProfile;
  
  // Use the most recent data based on timestamp
  if (serverProfile.timestamp > localProfile.timestamp) {
    return serverProfile;
  }
  
  return localProfile;
};

/**
 * Get profile field value from unified profile
 * @param {string} field - Field name to get
 * @param {*} defaultValue - Default value if field doesn't exist
 * @returns {Promise} - Promise resolving to field value
 */
const getProfileField = (field, defaultValue) => {
  return new Promise((resolve, reject) => {
    getUnifiedProfile()
      .then(profile => {
        resolve(profile[field] !== undefined ? profile[field] : defaultValue);
      })
      .catch(err => {
        console.error(`获取配置文件字段 ${field} 失败:`, err);
        resolve(defaultValue);
      });
  });
};

module.exports = {
  getUnifiedProfile,
  updateUnifiedProfile,
  mergeProfiles,
  getProfileField
}; 