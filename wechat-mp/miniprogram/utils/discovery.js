/**
 * 微信小程序发现功能集成工具 - WeChat Mini-Program Discovery Integration Utility
 * 用于优化小程序在微信生态中的曝光和发现
 * For optimizing mini-program exposure and discovery in the WeChat ecosystem
 */

const app = getApp();

/**
 * 设置小程序索引
 * Set mini-program index for search
 * @param {Object} options - Index options
 * @returns {Promise} - Promise resolving to result
 */
const setMiniProgramIndex = (options) => {
  return new Promise((resolve, reject) => {
    const data = {
      query: options.query || '',
      path: options.path || 'pages/index/index',
      tags: options.tags || [],
      title: options.title || '',
      description: options.description || '',
      thumbnail: options.thumbnail || '',
    };
    
    // 调用云函数来设置索引，因为客户端没有直接的API
    // Call cloud function to set index, as there's no direct API for the client
    wx.cloud.callFunction({
      name: 'setSearchIndex',
      data: data,
      success: (res) => {
        console.log('设置搜索索引成功', res);
        resolve(res.result);
      },
      fail: (err) => {
        console.error('设置搜索索引失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 生成"关注小程序"按钮参数
 * Generate "Add to My Mini-Programs" button parameters
 * @param {string} title - Button title
 * @returns {Object} - Button parameters
 */
const generateAddToMyMiniProgramParams = (title = '关注小程序') => {
  return {
    type: 'contact',
    text: title,
    contactType: 'miniProgram',
    extInfo: {
      username: app.globalData.originalID || ''
    }
  };
};

/**
 * 添加可被发现的内容
 * Add discoverable content
 * @param {Object} content - Content to add
 * @returns {Promise} - Promise resolving to result
 */
const addDiscoverableContent = (content) => {
  if (!content || !content.title) {
    return Promise.reject(new Error('内容必须包含标题'));
  }
  
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'addDiscoverableContent',
      data: {
        title: content.title,
        description: content.description || '',
        path: content.path || 'pages/index/index',
        category: content.category || 'uncategorized',
        tags: content.tags || [],
        images: content.images || [],
        publishTime: content.publishTime || Date.now(),
        isPublic: content.isPublic !== false
      },
      success: (res) => {
        console.log('添加可发现内容成功', res);
        resolve(res.result);
      },
      fail: (err) => {
        console.error('添加可发现内容失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 添加内容标签
 * Add content tags for discovery
 * @param {Array} tags - Tags to add
 * @returns {Promise} - Promise resolving to result
 */
const addContentTags = (tags) => {
  if (!Array.isArray(tags) || tags.length === 0) {
    return Promise.reject(new Error('标签必须是非空数组'));
  }
  
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'addContentTags',
      data: {
        tags: tags
      },
      success: (res) => {
        console.log('添加内容标签成功', res);
        resolve(res.result);
      },
      fail: (err) => {
        console.error('添加内容标签失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 更新微信搜索热词
 * Update WeChat search hot words
 * @param {Array} hotWords - Hot words to update
 * @returns {Promise} - Promise resolving to result
 */
const updateSearchHotWords = (hotWords) => {
  if (!Array.isArray(hotWords) || hotWords.length === 0) {
    return Promise.reject(new Error('热词必须是非空数组'));
  }
  
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'updateSearchHotWords',
      data: {
        hotWords: hotWords
      },
      success: (res) => {
        console.log('更新搜索热词成功', res);
        resolve(res.result);
      },
      fail: (err) => {
        console.error('更新搜索热词失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 设置小程序关键字与路径映射
 * Set mini-program keyword to path mapping
 * @param {Object} mapping - Keyword to path mapping
 * @returns {Promise} - Promise resolving to result
 */
const setKeywordToPathMapping = (mapping) => {
  if (!mapping || typeof mapping !== 'object') {
    return Promise.reject(new Error('映射必须是一个对象'));
  }
  
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'setKeywordToPathMapping',
      data: {
        mapping: mapping
      },
      success: (res) => {
        console.log('设置关键字映射成功', res);
        resolve(res.result);
      },
      fail: (err) => {
        console.error('设置关键字映射失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 添加模板消息卡片
 * Add template message card for re-engagement
 * @param {Object} options - Card options
 * @returns {Promise} - Promise resolving to result
 */
const addTemplateCard = (options) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'addTemplateCard',
      data: {
        title: options.title || '查看最新内容',
        description: options.description || '',
        path: options.path || 'pages/index/index',
        templateId: options.templateId,
        data: options.data || {}
      },
      success: (res) => {
        console.log('添加模板卡片成功', res);
        resolve(res.result);
      },
      fail: (err) => {
        console.error('添加模板卡片失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 生成短链接，方便在其他平台分享小程序
 * Generate short link for easy sharing on other platforms
 * @param {Object} options - Short link options
 * @returns {Promise} - Promise resolving to short link
 */
const generateShortLink = (options) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'generateShortLink',
      data: {
        path: options.path || 'pages/index/index',
        query: options.query || '',
        description: options.description || ''
      },
      success: (res) => {
        if (res.result && res.result.shortUrl) {
          console.log('生成短链接成功', res.result.shortUrl);
          resolve(res.result.shortUrl);
        } else {
          reject(new Error('短链接生成失败'));
        }
      },
      fail: (err) => {
        console.error('生成短链接失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 优化页面的搜索引擎收录
 * Optimize page for search engine indexing
 * @param {Object} pageInfo - Page information
 */
const optimizeForSearchEngine = (pageInfo) => {
  // 在小程序中，我们可以通过云函数向后端API发送页面信息
  // In mini-programs, we can send page info to backend API via cloud functions
  wx.cloud.callFunction({
    name: 'optimizeSearchIndex',
    data: {
      path: pageInfo.path || getCurrentPagePath(),
      title: pageInfo.title || '',
      keywords: pageInfo.keywords || [],
      description: pageInfo.description || '',
      content: pageInfo.content || '',
      updateTime: Date.now()
    },
    success: (res) => {
      console.log('优化搜索引擎收录成功', res);
    },
    fail: (err) => {
      console.error('优化搜索引擎收录失败', err);
    }
  });
};

/**
 * 获取当前页面路径
 * Get current page path
 * @returns {string} - Current page path
 */
const getCurrentPagePath = () => {
  const pages = getCurrentPages();
  if (pages.length > 0) {
    const currentPage = pages[pages.length - 1];
    return currentPage.route;
  }
  return '';
};

/**
 * 获取推荐索引的参数
 * Get parameters for recommended index
 * @param {Object} options - Options
 * @returns {Object} - Parameters for index
 */
const getRecommendedIndexParams = (options = {}) => {
  return {
    path: options.path || 'pages/index/index',
    query: options.query || '',
    appid: app.globalData.appid || '',
    title: options.title || '中医奶茶养生',
    description: options.description || '传统中医理论与现代饮品文化的完美结合，提供个性化茶饮配方，帮助您在享受美味的同时获得养生功效。',
    thumbUrl: options.thumbUrl || '/images/share/default_share.png'
  };
};

module.exports = {
  setMiniProgramIndex,
  generateAddToMyMiniProgramParams,
  addDiscoverableContent,
  addContentTags,
  updateSearchHotWords,
  setKeywordToPathMapping,
  addTemplateCard,
  generateShortLink,
  optimizeForSearchEngine,
  getRecommendedIndexParams
}; 