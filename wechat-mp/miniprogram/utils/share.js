/**
 * 分享工具 - Sharing Utility
 * 用于处理微信生态的分享功能
 * For handling WeChat ecosystem sharing features
 */

/**
 * 生成分享卡片参数
 * Generate share card parameters
 * @param {Object} options - Share options
 * @returns {Object} - Share parameters for onShareAppMessage
 */
const generateShareCard = (options = {}) => {
  const defaultTitle = '中医奶茶养生';
  const defaultPath = '/pages/index/index';
  const defaultImageUrl = '/images/share/default_share.png';
  
  return {
    title: options.title || defaultTitle,
    path: options.path || defaultPath,
    imageUrl: options.imageUrl || defaultImageUrl,
    success: function(res) {
      console.log('分享成功', res);
      // Track sharing success event
      if (typeof options.success === 'function') {
        options.success(res);
      }
    },
    fail: function(res) {
      console.log('分享失败', res);
      if (typeof options.fail === 'function') {
        options.fail(res);
      }
    }
  };
};

/**
 * 生成分享到朋友圈的参数
 * Generate parameters for sharing to Moments
 * @param {Object} options - Share options
 * @returns {Object} - Share parameters for onShareTimeline
 */
const generateTimelineCard = (options = {}) => {
  const defaultTitle = '中医奶茶养生';
  const defaultQuery = '';
  const defaultImageUrl = '/images/share/default_timeline.png';
  
  return {
    title: options.title || defaultTitle,
    query: options.query || defaultQuery,
    imageUrl: options.imageUrl || defaultImageUrl,
    success: function(res) {
      console.log('分享到朋友圈成功', res);
      if (typeof options.success === 'function') {
        options.success(res);
      }
    },
    fail: function(res) {
      console.log('分享到朋友圈失败', res);
      if (typeof options.fail === 'function') {
        options.fail(res);
      }
    }
  };
};

/**
 * 根据页面数据生成动态分享内容
 * Generate dynamic share content based on page data
 * @param {string} pageType - Type of page
 * @param {Object} pageData - Data from the page
 * @returns {Object} - Customized share parameters
 */
const generateDynamicShareContent = (pageType, pageData) => {
  let shareParams = {};
  
  switch (pageType) {
    case 'recipe':
      shareParams = {
        title: `推荐一款养生茶饮：${pageData.title}`,
        path: `/pages/recipe/detail?id=${pageData.id}`,
        imageUrl: pageData.image || '/images/share/recipe_share.png'
      };
      break;
      
    case 'health':
      shareParams = {
        title: '我的健康管理小助手',
        path: '/pages/health/health',
        imageUrl: '/images/share/health_share.png'
      };
      break;
      
    case 'knowledge':
      shareParams = {
        title: `中医知识：${pageData.title}`,
        path: `/pages/knowledge/detail?id=${pageData.id}`,
        imageUrl: pageData.image || '/images/share/knowledge_share.png'
      };
      break;
      
    case 'community':
      shareParams = {
        title: pageData.title || '来和我一起讨论中医养生',
        path: `/pages/community/detail?id=${pageData.id}`,
        imageUrl: pageData.image || '/images/share/community_share.png'
      };
      break;
      
    default:
      shareParams = {
        title: '中医奶茶养生 - 传统智慧，现代体验',
        path: '/pages/index/index',
        imageUrl: '/images/share/default_share.png'
      };
  }
  
  return shareParams;
};

/**
 * 使用小程序码进行高级分享
 * Advanced sharing using WeChat mini-program QR code
 * @param {Object} options - Share options
 * @returns {Promise} - Promise resolving to QR code path
 */
const generateMiniProgramCode = (options = {}) => {
  const token = wx.getStorageSync('auth_token');
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getApp().globalData.apiBaseUrl}/share/qrcode`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        path: options.path || 'pages/index/index',
        scene: options.scene || '',
        width: options.width || 430,
        autoColor: options.autoColor || false,
        lineColor: options.lineColor || {"r":0,"g":0,"b":0},
        isHyaline: options.isHyaline || false
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.url) {
          resolve(res.data.url);
        } else {
          reject(new Error('获取小程序码失败'));
        }
      },
      fail: (err) => {
        console.error('请求小程序码失败', err);
        reject(err);
      }
    });
  });
};

module.exports = {
  generateShareCard,
  generateTimelineCard,
  generateDynamicShareContent,
  generateMiniProgramCode
}; 