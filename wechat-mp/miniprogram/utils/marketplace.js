/**
 * 中医师市场工具 - Herbalist Marketplace Utility
 * 管理认证中医师列表、预约和评价功能
 * Manages verified TCM practitioners listing, appointments, and reviews
 */

const app = getApp();

/**
 * 获取认证中医师列表
 * Get list of verified practitioners
 * @param {Object} options - Filter options
 * @returns {Promise} - Promise resolving to practitioners list
 */
const getVerifiedPractitioners = (options = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/practitioners/verified`,
      method: 'GET',
      data: {
        page: options.page || 1,
        limit: options.limit || 10,
        specialty: options.specialty || '',
        location: options.location || '',
        rating: options.rating || 0,
        sortBy: options.sortBy || 'rating'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 缓存结果用于离线访问
          // Cache results for offline access
          wx.setStorageSync('verified_practitioners', {
            data: res.data,
            timestamp: Date.now(),
            options: options
          });
          resolve(res.data);
        } else {
          reject(new Error('获取中医师列表失败'));
        }
      },
      fail: (err) => {
        console.error('请求中医师列表失败', err);
        
        // 尝试从缓存获取
        // Try to get from cache
        const cachedPractitioners = wx.getStorageSync('verified_practitioners');
        if (cachedPractitioners && cachedPractitioners.data) {
          resolve({
            ...cachedPractitioners.data,
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
 * 获取中医师详情
 * Get practitioner details
 * @param {string} practitionerId - Practitioner ID
 * @returns {Promise} - Promise resolving to practitioner details
 */
const getPractitionerDetails = (practitionerId) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/practitioners/${practitionerId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          // 缓存单个中医师信息
          // Cache individual practitioner info
          const cachedPractitioners = wx.getStorageSync('practitioners_details') || {};
          cachedPractitioners[practitionerId] = {
            data: res.data,
            timestamp: Date.now()
          };
          wx.setStorageSync('practitioners_details', cachedPractitioners);
          
          resolve(res.data);
        } else {
          reject(new Error('获取中医师详情失败'));
        }
      },
      fail: (err) => {
        console.error('请求中医师详情失败', err);
        
        // 尝试从缓存获取
        // Try to get from cache
        const cachedPractitioners = wx.getStorageSync('practitioners_details') || {};
        if (cachedPractitioners[practitionerId] && cachedPractitioners[practitionerId].data) {
          resolve({
            ...cachedPractitioners[practitionerId].data,
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
 * 创建预约
 * Create appointment
 * @param {Object} appointmentData - Appointment data
 * @returns {Promise} - Promise resolving to appointment result
 */
const createAppointment = (appointmentData) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/appointments`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        practitionerId: appointmentData.practitionerId,
        appointmentType: appointmentData.appointmentType || 'online',
        appointmentTime: appointmentData.appointmentTime,
        symptoms: appointmentData.symptoms || '',
        notes: appointmentData.notes || '',
        duration: appointmentData.duration || 30 // 分钟
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data);
        } else {
          reject(new Error('预约失败'));
        }
      },
      fail: (err) => {
        console.error('创建预约请求失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取用户预约列表
 * Get user appointments
 * @param {string} status - Optional appointment status filter
 * @returns {Promise} - Promise resolving to appointments list
 */
const getUserAppointments = (status) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/appointments/user`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        status: status || ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('获取预约列表失败'));
        }
      },
      fail: (err) => {
        console.error('请求预约列表失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 提交中医师评价
 * Submit practitioner review
 * @param {string} practitionerId - Practitioner ID
 * @param {Object} reviewData - Review data
 * @returns {Promise} - Promise resolving when review is submitted
 */
const submitPractitionerReview = (practitionerId, reviewData) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/practitioners/${practitionerId}/reviews`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        rating: reviewData.rating,
        content: reviewData.content || '',
        consultationType: reviewData.consultationType || 'online',
        tags: reviewData.tags || []
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data);
        } else {
          reject(new Error('提交评价失败'));
        }
      },
      fail: (err) => {
        console.error('提交评价请求失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取中医师评价列表
 * Get practitioner reviews
 * @param {string} practitionerId - Practitioner ID
 * @param {Object} options - Pagination options
 * @returns {Promise} - Promise resolving to reviews list
 */
const getPractitionerReviews = (practitionerId, options = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/practitioners/${practitionerId}/reviews`,
      method: 'GET',
      data: {
        page: options.page || 1,
        limit: options.limit || 10,
        sortBy: options.sortBy || 'newest'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('获取评价列表失败'));
        }
      },
      fail: (err) => {
        console.error('请求评价列表失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取中医师可用时间段
 * Get practitioner available time slots
 * @param {string} practitionerId - Practitioner ID
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {Promise} - Promise resolving to available time slots
 */
const getPractitionerAvailability = (practitionerId, date) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/practitioners/${practitionerId}/availability`,
      method: 'GET',
      data: {
        date: date
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('获取可用时间失败'));
        }
      },
      fail: (err) => {
        console.error('请求可用时间失败', err);
        reject(err);
      }
    });
  });
};

module.exports = {
  getVerifiedPractitioners,
  getPractitionerDetails,
  createAppointment,
  getUserAppointments,
  submitPractitionerReview,
  getPractitionerReviews,
  getPractitionerAvailability
}; 