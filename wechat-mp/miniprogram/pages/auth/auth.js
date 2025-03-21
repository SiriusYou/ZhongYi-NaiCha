// auth.js
const app = getApp();

Page({
  data: {
    isLoading: false,
    loginFailed: false,
    errorMessage: '',
    privacyChecked: false,
    userInfo: null
  },

  onLoad: function(options) {
    // Check if already logged in
    if (app.globalData.isAuthenticated) {
      const redirectUrl = options.redirect || '/pages/index/index';
      wx.redirectTo({
        url: redirectUrl
      });
    }
  },

  onReady: function() {
    // Check if login session is still valid
    this.checkSession();
  },

  /**
   * Check login session validity
   */
  checkSession: function() {
    wx.checkSession({
      success: () => {
        // Session still valid, check token validity with server
        this.checkTokenValidity();
      },
      fail: () => {
        // Session expired, need new login
        console.log('WeChat session expired');
        app.globalData.isAuthenticated = false;
      }
    });
  },

  /**
   * Verify token with backend
   */
  checkTokenValidity: function() {
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      console.log('No auth token found');
      return;
    }

    wx.request({
      url: `${app.globalData.apiBaseUrl}/users/validate-token`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          app.globalData.isAuthenticated = true;
          app.globalData.userInfo = wx.getStorageSync('userInfo');
          wx.redirectTo({
            url: '/pages/index/index'
          });
        } else {
          console.log('Token invalid');
          // Clear invalid token
          wx.removeStorageSync('auth_token');
          wx.removeStorageSync('userInfo');
          app.globalData.isAuthenticated = false;
        }
      },
      fail: (err) => {
        console.error('Failed to validate token:', err);
      }
    });
  },

  /**
   * Handle WeChat login
   */
  handleLogin: function() {
    if (!this.data.privacyChecked) {
      wx.showToast({
        title: '请先同意隐私政策',
        icon: 'none'
      });
      return;
    }

    this.setData({
      isLoading: true,
      loginFailed: false,
      errorMessage: ''
    });

    wx.login({
      success: (res) => {
        if (res.code) {
          // Send code to backend for authentication
          this.authenticateWithServer(res.code);
        } else {
          this.setData({
            isLoading: false,
            loginFailed: true,
            errorMessage: '微信登录失败'
          });
        }
      },
      fail: (err) => {
        console.error('Login failed:', err);
        this.setData({
          isLoading: false,
          loginFailed: true,
          errorMessage: '登录请求失败'
        });
      }
    });
  },

  /**
   * Handle server authentication
   */
  authenticateWithServer: function(code) {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/users/wechat-login`,
      method: 'POST',
      data: {
        code: code
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // Successfully authenticated
          const { token, user } = res.data;
          wx.setStorageSync('auth_token', token);
          wx.setStorageSync('userInfo', user);
          
          app.globalData.isAuthenticated = true;
          app.globalData.userInfo = user;
          
          // Check if user has health profile
          if (user.hasHealthProfile) {
            wx.redirectTo({
              url: '/pages/index/index'
            });
          } else {
            // Redirect to health profile setup
            wx.redirectTo({
              url: '/pages/health/health?setup=true'
            });
          }
        } else {
          this.setData({
            isLoading: false,
            loginFailed: true,
            errorMessage: res.data.message || '服务器认证失败'
          });
        }
      },
      fail: (err) => {
        console.error('Server authentication failed:', err);
        this.setData({
          isLoading: false,
          loginFailed: true,
          errorMessage: '服务器连接失败'
        });
      }
    });
  },

  /**
   * Get user profile info
   */
  getUserProfile: function() {
    if (!this.data.privacyChecked) {
      wx.showToast({
        title: '请先同意隐私政策',
        icon: 'none'
      });
      return;
    }

    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo
        });
        
        // Cache user profile info 
        app.globalData.userProfile = res.userInfo;
        
        // Now proceed with login
        this.handleLogin();
      },
      fail: (err) => {
        console.error('Failed to get user profile:', err);
        // Still proceed with login even if profile acquisition fails
        this.handleLogin();
      }
    });
  },

  /**
   * Toggle privacy agreement checkbox
   */
  togglePrivacyAgreement: function() {
    this.setData({
      privacyChecked: !this.data.privacyChecked
    });
  },

  /**
   * Show privacy policy
   */
  showPrivacyPolicy: function() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  }
}); 