/**
 * 资源加载工具 - Resource Loading Utility
 * 用于优化小程序资源加载，提高性能
 * For optimizing mini-program resource loading and improving performance
 */

const app = getApp();

// 资源加载状态缓存
// Resource loading status cache
const resourceCache = {
  images: {},
  files: {}
};

/**
 * 预加载图片资源
 * Preload image resources
 * @param {Array} imageUrls - Array of image URLs to preload
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise} - Promise resolving when all images are loaded
 */
const preloadImages = (imageUrls, progressCallback) => {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    return Promise.resolve([]);
  }
  
  let loadedCount = 0;
  
  return Promise.all(
    imageUrls.map(url => {
      // 检查缓存中是否已存在
      // Check if already exists in cache
      if (resourceCache.images[url]) {
        loadedCount++;
        if (typeof progressCallback === 'function') {
          progressCallback(loadedCount / imageUrls.length);
        }
        return Promise.resolve(resourceCache.images[url]);
      }
      
      // 加载新图片
      // Load new image
      return new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: url,
          success: (res) => {
            resourceCache.images[url] = res;
            loadedCount++;
            if (typeof progressCallback === 'function') {
              progressCallback(loadedCount / imageUrls.length);
            }
            resolve(res);
          },
          fail: (err) => {
            console.error('图片预加载失败', url, err);
            loadedCount++;
            if (typeof progressCallback === 'function') {
              progressCallback(loadedCount / imageUrls.length);
            }
            reject(err);
          }
        });
      });
    })
  );
};

/**
 * 获取图片资源信息
 * Get image resource info
 * @param {string} url - Image URL
 * @returns {Promise} - Promise resolving to image info
 */
const getImageInfo = (url) => {
  // 检查缓存
  // Check cache
  if (resourceCache.images[url]) {
    return Promise.resolve(resourceCache.images[url]);
  }
  
  // 加载新图片
  // Load new image
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src: url,
      success: (res) => {
        resourceCache.images[url] = res;
        resolve(res);
      },
      fail: (err) => {
        console.error('获取图片信息失败', url, err);
        reject(err);
      }
    });
  });
};

/**
 * 清理图片缓存
 * Clear image cache
 * @param {Array} urls - Optional array of URLs to clear, if not provided, clears all
 */
const clearImageCache = (urls) => {
  if (Array.isArray(urls)) {
    urls.forEach(url => {
      delete resourceCache.images[url];
    });
  } else {
    resourceCache.images = {};
  }
};

/**
 * 懒加载资源管理器
 * Lazy loading resource manager
 * @param {number} visibleRange - Number of items to preload beyond visible area
 * @returns {Object} - Lazy loading manager
 */
const createLazyLoadManager = (visibleRange = 2) => {
  let itemsInfo = [];
  
  return {
    /**
     * 注册需要懒加载的项目
     * Register items for lazy loading
     * @param {Array} items - Array of items with id and url properties
     */
    registerItems: (items) => {
      itemsInfo = items.map(item => ({
        id: item.id,
        url: item.url,
        loaded: false
      }));
    },
    
    /**
     * 处理滚动事件，加载可见区域的资源
     * Handle scroll event to load resources in visible area
     * @param {number} startIndex - Start index of visible items
     * @param {number} endIndex - End index of visible items
     * @returns {Promise} - Promise resolving when visible resources are loaded
     */
    handleScroll: (startIndex, endIndex) => {
      // 计算要加载的范围
      // Calculate range to load
      const preloadStart = Math.max(0, startIndex - visibleRange);
      const preloadEnd = Math.min(itemsInfo.length - 1, endIndex + visibleRange);
      
      const itemsToLoad = [];
      
      // 找出需要加载的项目
      // Find items that need to be loaded
      for (let i = preloadStart; i <= preloadEnd; i++) {
        if (itemsInfo[i] && !itemsInfo[i].loaded) {
          itemsToLoad.push(itemsInfo[i]);
          itemsInfo[i].loaded = true;
        }
      }
      
      // 预加载图片
      // Preload images
      if (itemsToLoad.length > 0) {
        return preloadImages(itemsToLoad.map(item => item.url));
      }
      
      return Promise.resolve([]);
    },
    
    /**
     * 重置加载状态
     * Reset loading status
     */
    reset: () => {
      itemsInfo.forEach(item => {
        item.loaded = false;
      });
    },
    
    /**
     * 获取项目的加载状态
     * Get item loading status
     * @param {string} id - Item ID
     * @returns {boolean} - Whether the item is loaded
     */
    isItemLoaded: (id) => {
      const item = itemsInfo.find(item => item.id === id);
      return item ? item.loaded : false;
    }
  };
};

/**
 * 加载小程序分包
 * Load mini-program subpackage
 * @param {string} name - Subpackage name
 * @param {Function} callback - Callback after loading
 */
const loadSubpackage = (name, callback) => {
  const task = wx.loadSubpackage({
    name: name,
    success: (res) => {
      console.log(`分包 ${name} 加载成功`, res);
      if (typeof callback === 'function') {
        callback(null, res);
      }
    },
    fail: (err) => {
      console.error(`分包 ${name} 加载失败`, err);
      if (typeof callback === 'function') {
        callback(err);
      }
    }
  });
  
  // 返回加载任务以便监听进度
  // Return loading task to monitor progress
  return task;
};

/**
 * 优化加载顺序，先加载关键资源
 * Optimize loading order, load critical resources first
 * @param {Array} criticalResources - Array of critical resources to load first
 * @param {Array} nonCriticalResources - Array of non-critical resources to load later
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise} - Promise resolving when all resources are loaded
 */
const optimizeLoadingOrder = (criticalResources, nonCriticalResources, progressCallback) => {
  return new Promise((resolve) => {
    // 先加载关键资源
    // Load critical resources first
    preloadImages(criticalResources, (criticalProgress) => {
      if (typeof progressCallback === 'function') {
        progressCallback(criticalProgress * 0.7); // Critical resources account for 70% of progress
      }
    }).then(() => {
      // 再加载非关键资源
      // Then load non-critical resources
      preloadImages(nonCriticalResources, (nonCriticalProgress) => {
        if (typeof progressCallback === 'function') {
          progressCallback(0.7 + nonCriticalProgress * 0.3); // Non-critical resources account for 30%
        }
      }).then((nonCriticalResults) => {
        resolve(nonCriticalResults);
      }).catch((err) => {
        console.warn('非关键资源加载失败', err);
        resolve([]);
      });
    }).catch((err) => {
      console.error('关键资源加载失败', err);
      // 即使关键资源加载失败，也尝试加载非关键资源
      // Try to load non-critical resources even if critical resources fail
      preloadImages(nonCriticalResources).then(resolve).catch(() => resolve([]));
    });
  });
};

module.exports = {
  preloadImages,
  getImageInfo,
  clearImageCache,
  createLazyLoadManager,
  loadSubpackage,
  optimizeLoadingOrder
}; 