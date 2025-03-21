/**
 * Authentication service for WeChat mini-program
 * Handles user login, session management and profile retrieval
 */

import { request } from '../utils/network';

// Base API URL
const API_BASE_URL = 'https://api.zhongyi-naicha.com';
const TOKEN_KEY = 'token';
const USER_INFO_KEY = 'userInfo';

/**
 * Check if current session is valid
 * @returns {Promise<boolean>} - Promise resolving to session validity
 */
export function checkSession() {
  return new Promise((resolve) => {
    // First check if we have a token
    const token = wx.getStorageSync(TOKEN_KEY);
    if (!token) {
      return resolve(false);
    }
    
    // Then check if WeChat session is valid
    wx.checkSession({
      success: () => {
        // Session still valid, now check if our token is valid with backend
        verifyTokenWithBackend(token)
          .then(isValid => resolve(isValid))
          .catch(() => resolve(false));
      },
      fail: () => {
        // Session expired
        resolve(false);
      }
    });
  });
}

/**
 * Login using WeChat authentication
 * @returns {Promise<Object>} - Promise resolving to user info
 */
export function login() {
  return new Promise((resolve, reject) => {
    // Get WeChat code for login
    wx.login({
      success: loginRes => {
        if (loginRes.code) {
          // Send code to backend to get token
          request({
            url: `${API_BASE_URL}/api/auth/wechat`,
            method: 'POST',
            data: {
              code: loginRes.code
            }
          }).then(res => {
            if (res.statusCode === 200 && res.data.token) {
              // Store token and user info
              wx.setStorageSync(TOKEN_KEY, res.data.token);
              
              // If user info exists, store it too
              if (res.data.userInfo) {
                wx.setStorageSync(USER_INFO_KEY, res.data.userInfo);
              }
              
              resolve(res.data.userInfo);
            } else {
              reject(new Error('Failed to authenticate with server'));
            }
          }).catch(err => {
            reject(err);
          });
        } else {
          reject(new Error('WeChat login failed'));
        }
      },
      fail: err => {
        reject(err);
      }
    });
  });
}

/**
 * Get user profile using WeChat getUserProfile API
 * This requests user's permission to access their profile info
 * @returns {Promise<Object>} - Promise resolving to user profile data
 */
export function getUserProfile() {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: profileRes => {
        // Get user's WeChat profile
        const userInfo = profileRes.userInfo;
        
        // Update user profile on backend
        const token = wx.getStorageSync(TOKEN_KEY);
        if (!token) {
          return reject(new Error('Not authenticated'));
        }
        
        request({
          url: `${API_BASE_URL}/api/users/profile/wechat`,
          method: 'POST',
          data: {
            nickname: userInfo.nickName,
            avatarUrl: userInfo.avatarUrl,
            gender: userInfo.gender
          },
          header: {
            'Authorization': `Bearer ${token}`
          }
        }).then(res => {
          if (res.statusCode === 200) {
            // Store updated user info
            wx.setStorageSync(USER_INFO_KEY, res.data);
            resolve(res.data);
          } else {
            reject(new Error('Failed to update profile'));
          }
        }).catch(err => {
          reject(err);
        });
      },
      fail: err => {
        reject(err);
      }
    });
  });
}

/**
 * Get current user info from storage
 * @returns {Promise<Object>} - Promise resolving to user info
 */
export function getUserInfo() {
  return new Promise((resolve, reject) => {
    const userInfo = wx.getStorageSync(USER_INFO_KEY);
    if (userInfo) {
      resolve(userInfo);
    } else {
      const token = wx.getStorageSync(TOKEN_KEY);
      if (!token) {
        return reject(new Error('Not authenticated'));
      }
      
      // Fetch user info from server
      request({
        url: `${API_BASE_URL}/api/users/profile`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`
        }
      }).then(res => {
        if (res.statusCode === 200) {
          // Store user info
          wx.setStorageSync(USER_INFO_KEY, res.data);
          resolve(res.data);
        } else {
          reject(new Error('Failed to get user info'));
        }
      }).catch(err => {
        reject(err);
      });
    }
  });
}

/**
 * Logout user
 * @returns {Promise<void>}
 */
export function logout() {
  return new Promise((resolve) => {
    // Clear token and user info
    wx.removeStorageSync(TOKEN_KEY);
    wx.removeStorageSync(USER_INFO_KEY);
    resolve();
  });
}

/**
 * Verify if token is valid with backend
 * @param {string} token - Token to verify
 * @returns {Promise<boolean>} - Promise resolving to token validity
 */
function verifyTokenWithBackend(token) {
  return new Promise((resolve) => {
    request({
      url: `${API_BASE_URL}/api/auth/verify`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      }
    }).then(res => {
      resolve(res.statusCode === 200);
    }).catch(() => {
      resolve(false);
    });
  });
} 