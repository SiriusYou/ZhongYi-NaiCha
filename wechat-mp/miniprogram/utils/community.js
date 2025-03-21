/**
 * 社区功能工具 - Community Features Utility
 * 管理社区帖子、健康分享和用户互动功能
 * Manages community posts, health sharing, and user interaction functions
 */

const app = getApp();

/**
 * 获取社区帖子列表
 * Get community post list
 * @param {Object} options - Filter and pagination options
 * @returns {Promise} - Promise resolving to post list
 */
const getPosts = (options = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/community/posts`,
      method: 'GET',
      data: {
        page: options.page || 1,
        limit: options.limit || 20,
        category: options.category || '',
        tag: options.tag || '',
        sortBy: options.sortBy || 'latest'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 缓存结果用于离线访问
          // Cache results for offline access
          wx.setStorageSync('community_posts', {
            data: res.data,
            timestamp: Date.now(),
            options: options
          });
          resolve(res.data);
        } else {
          reject(new Error('获取社区帖子失败'));
        }
      },
      fail: (err) => {
        console.error('请求社区帖子失败', err);
        
        // 尝试从缓存获取
        // Try to get from cache
        const cachedPosts = wx.getStorageSync('community_posts');
        if (cachedPosts && cachedPosts.data) {
          resolve({
            ...cachedPosts.data,
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
 * 获取帖子详情
 * Get post details
 * @param {string} postId - Post ID
 * @returns {Promise} - Promise resolving to post details
 */
const getPostDetails = (postId) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/community/posts/${postId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          // 缓存单个帖子信息
          // Cache individual post info
          const cachedPosts = wx.getStorageSync('post_details') || {};
          cachedPosts[postId] = {
            data: res.data,
            timestamp: Date.now()
          };
          wx.setStorageSync('post_details', cachedPosts);
          
          resolve(res.data);
        } else {
          reject(new Error('获取帖子详情失败'));
        }
      },
      fail: (err) => {
        console.error('请求帖子详情失败', err);
        
        // 尝试从缓存获取
        // Try to get from cache
        const cachedPosts = wx.getStorageSync('post_details') || {};
        if (cachedPosts[postId] && cachedPosts[postId].data) {
          resolve({
            ...cachedPosts[postId].data,
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
 * 创建社区帖子
 * Create community post
 * @param {Object} postData - Post data
 * @returns {Promise} - Promise resolving to created post
 */
const createPost = (postData) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    // 如果有图片，先上传图片
    // If there are images, upload them first
    if (postData.images && postData.images.length > 0) {
      uploadPostImages(postData.images)
        .then(imageUrls => {
          // 替换临时路径为上传后的URL
          // Replace temp paths with uploaded URLs
          const finalPostData = {
            ...postData,
            images: imageUrls
          };
          submitPost(finalPostData, token, resolve, reject);
        })
        .catch(err => {
          reject(err);
        });
    } else {
      submitPost(postData, token, resolve, reject);
    }
  });
};

/**
 * 上传帖子图片
 * Upload post images
 * @param {Array} images - Array of image paths
 * @returns {Promise} - Promise resolving to array of image URLs
 */
const uploadPostImages = (images) => {
  const promises = images.map(imagePath => {
    return new Promise((resolve, reject) => {
      const token = wx.getStorageSync('auth_token');
      
      wx.uploadFile({
        url: `${app.globalData.apiBaseUrl}/api/upload/image`,
        filePath: imagePath,
        name: 'image',
        header: {
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.url) {
              resolve(data.url);
            } else {
              reject(new Error('上传图片失败'));
            }
          } catch (e) {
            reject(new Error('解析上传结果失败'));
          }
        },
        fail: (err) => {
          console.error('上传图片请求失败', err);
          reject(err);
        }
      });
    });
  });
  
  return Promise.all(promises);
};

/**
 * 提交帖子数据
 * Submit post data
 * @param {Object} postData - Post data
 * @param {string} token - Auth token
 * @param {Function} resolve - Promise resolve function
 * @param {Function} reject - Promise reject function
 */
const submitPost = (postData, token, resolve, reject) => {
  wx.request({
    url: `${app.globalData.apiBaseUrl}/api/community/posts`,
    method: 'POST',
    header: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    data: {
      title: postData.title,
      content: postData.content,
      category: postData.category || 'general',
      tags: postData.tags || [],
      images: postData.images || [],
      location: postData.location || null,
      isPublic: postData.isPublic !== false
    },
    success: (res) => {
      if (res.statusCode === 200 || res.statusCode === 201) {
        resolve(res.data);
      } else {
        reject(new Error('创建帖子失败'));
      }
    },
    fail: (err) => {
      console.error('创建帖子请求失败', err);
      reject(err);
    }
  });
};

/**
 * 提交帖子评论
 * Submit post comment
 * @param {string} postId - Post ID
 * @param {Object} commentData - Comment data
 * @returns {Promise} - Promise resolving to created comment
 */
const createComment = (postId, commentData) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/community/posts/${postId}/comments`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        content: commentData.content,
        replyTo: commentData.replyTo || null,
        images: commentData.images || []
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data);
        } else {
          reject(new Error('提交评论失败'));
        }
      },
      fail: (err) => {
        console.error('提交评论请求失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取帖子评论
 * Get post comments
 * @param {string} postId - Post ID
 * @param {Object} options - Pagination options
 * @returns {Promise} - Promise resolving to comments list
 */
const getComments = (postId, options = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/community/posts/${postId}/comments`,
      method: 'GET',
      data: {
        page: options.page || 1,
        limit: options.limit || 20,
        sortBy: options.sortBy || 'newest'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('获取评论失败'));
        }
      },
      fail: (err) => {
        console.error('请求评论失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 点赞/取消点赞帖子
 * Like/unlike post
 * @param {string} postId - Post ID
 * @param {boolean} isLike - Whether like or unlike
 * @returns {Promise} - Promise resolving to like result
 */
const likePost = (postId, isLike = true) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/community/posts/${postId}/like`,
      method: isLike ? 'POST' : 'DELETE',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(isLike ? '点赞失败' : '取消点赞失败'));
        }
      },
      fail: (err) => {
        console.error(isLike ? '点赞请求失败' : '取消点赞请求失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 收藏/取消收藏帖子
 * Favorite/unfavorite post
 * @param {string} postId - Post ID
 * @param {boolean} isFavorite - Whether favorite or unfavorite
 * @returns {Promise} - Promise resolving to favorite result
 */
const favoritePost = (postId, isFavorite = true) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/community/posts/${postId}/favorite`,
      method: isFavorite ? 'POST' : 'DELETE',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(isFavorite ? '收藏失败' : '取消收藏失败'));
        }
      },
      fail: (err) => {
        console.error(isFavorite ? '收藏请求失败' : '取消收藏请求失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取用户健康日志
 * Get user health logs
 * @param {string} userId - Optional user ID (if not provided, gets current user's logs)
 * @param {Object} options - Pagination options
 * @returns {Promise} - Promise resolving to health logs
 */
const getHealthLogs = (userId, options = {}) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    const url = userId 
      ? `${app.globalData.apiBaseUrl}/api/community/health-logs/user/${userId}`
      : `${app.globalData.apiBaseUrl}/api/community/health-logs/me`;
    
    wx.request({
      url: url,
      method: 'GET',
      header: userId ? {} : { 'Authorization': `Bearer ${token}` },
      data: {
        page: options.page || 1,
        limit: options.limit || 20,
        type: options.type || '',
        startDate: options.startDate || '',
        endDate: options.endDate || ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('获取健康日志失败'));
        }
      },
      fail: (err) => {
        console.error('请求健康日志失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 创建健康日志
 * Create health log
 * @param {Object} logData - Health log data
 * @returns {Promise} - Promise resolving to created health log
 */
const createHealthLog = (logData) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/community/health-logs`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        type: logData.type || 'general',
        content: logData.content,
        metrics: logData.metrics || {},
        mood: logData.mood || '',
        images: logData.images || [],
        isPublic: logData.isPublic !== false
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data);
        } else {
          reject(new Error('创建健康日志失败'));
        }
      },
      fail: (err) => {
        console.error('创建健康日志请求失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取专家问答列表
 * Get expert Q&A list
 * @param {Object} options - Filter and pagination options
 * @returns {Promise} - Promise resolving to Q&A list
 */
const getExpertQA = (options = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/community/expert-qa`,
      method: 'GET',
      data: {
        page: options.page || 1,
        limit: options.limit || 20,
        category: options.category || '',
        status: options.status || '',
        sortBy: options.sortBy || 'latest'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('获取专家问答失败'));
        }
      },
      fail: (err) => {
        console.error('请求专家问答失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 提交专家问题
 * Submit expert question
 * @param {Object} questionData - Question data
 * @returns {Promise} - Promise resolving to submitted question
 */
const submitQuestion = (questionData) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/community/expert-qa/questions`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: questionData.title,
        content: questionData.content,
        category: questionData.category || 'general',
        tags: questionData.tags || [],
        images: questionData.images || [],
        isAnonymous: questionData.isAnonymous === true,
        isPublic: questionData.isPublic !== false
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data);
        } else {
          reject(new Error('提交问题失败'));
        }
      },
      fail: (err) => {
        console.error('提交问题请求失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取社区话题列表
 * Get community topics list
 * @returns {Promise} - Promise resolving to topics list
 */
const getTopics = () => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/community/topics`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          // 缓存话题列表
          // Cache topics list
          wx.setStorageSync('community_topics', {
            data: res.data,
            timestamp: Date.now()
          });
          resolve(res.data);
        } else {
          reject(new Error('获取话题列表失败'));
        }
      },
      fail: (err) => {
        console.error('请求话题列表失败', err);
        
        // 尝试从缓存获取
        // Try to get from cache
        const cachedTopics = wx.getStorageSync('community_topics');
        if (cachedTopics && cachedTopics.data) {
          resolve({
            ...cachedTopics.data,
            fromCache: true
          });
        } else {
          reject(err);
        }
      }
    });
  });
};

module.exports = {
  getPosts,
  getPostDetails,
  createPost,
  createComment,
  getComments,
  likePost,
  favoritePost,
  getHealthLogs,
  createHealthLog,
  getExpertQA,
  submitQuestion,
  getTopics
}; 