/**
 * 优化工具 - Optimization Utility
 * 用于小程序包体积优化和性能提升
 * For mini-program size optimization and performance improvements
 */

/**
 * 延迟加载非关键组件
 * Lazy load non-critical components
 * @param {Object} componentList - Components to lazy load
 * @returns {Object} - Object with functions to load components
 */
const setupLazyComponents = (componentList) => {
  const loadedComponents = {};
  const loadingPromises = {};
  
  return {
    /**
     * 加载组件
     * Load component
     * @param {string} name - Component name
     * @returns {Promise} - Promise resolving to component
     */
    loadComponent: (name) => {
      // 如果组件已加载，直接返回
      // If component is already loaded, return immediately
      if (loadedComponents[name]) {
        return Promise.resolve(loadedComponents[name]);
      }
      
      // 如果组件正在加载，返回现有的Promise
      // If component is loading, return existing Promise
      if (loadingPromises[name]) {
        return loadingPromises[name];
      }
      
      // 如果组件不存在于列表中，返回错误
      // If component doesn't exist in the list, return error
      if (!componentList[name]) {
        return Promise.reject(new Error(`组件 ${name} 不存在`));
      }
      
      // 加载组件
      // Load component
      loadingPromises[name] = new Promise((resolve, reject) => {
        const componentPath = componentList[name];
        
        // 模拟动态导入
        // Simulate dynamic import
        require.async(componentPath, (component) => {
          loadedComponents[name] = component;
          delete loadingPromises[name];
          resolve(component);
        }, (err) => {
          delete loadingPromises[name];
          reject(err);
        });
      });
      
      return loadingPromises[name];
    },
    
    /**
     * 检查组件是否已加载
     * Check if component is loaded
     * @param {string} name - Component name
     * @returns {boolean} - Whether component is loaded
     */
    isLoaded: (name) => {
      return !!loadedComponents[name];
    },
    
    /**
     * 获取已加载的组件
     * Get loaded component
     * @param {string} name - Component name
     * @returns {Object|null} - Component or null if not loaded
     */
    getComponent: (name) => {
      return loadedComponents[name] || null;
    }
  };
};

/**
 * 动态导入配置项
 * Dynamic import configuration options
 * @param {string} configPath - Path to configuration
 * @returns {Promise} - Promise resolving to configuration
 */
const importConfig = (configPath) => {
  return new Promise((resolve, reject) => {
    try {
      const configModule = require(configPath);
      resolve(configModule);
    } catch (err) {
      console.error('配置导入失败', err);
      reject(err);
    }
  });
};

/**
 * 创建防抖函数
 * Create debounced function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
const debounce = (func, wait = 300) => {
  let timeout = null;
  
  return function(...args) {
    const context = this;
    
    clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
};

/**
 * 优化字符串占用空间（用于传输数据时减少体积）
 * Optimize string space usage (for reducing size during data transmission)
 * @param {Object} data - Data to optimize
 * @param {Array} keys - Keys to optimize
 * @returns {Object} - Optimized data
 */
const optimizeStringData = (data, keys) => {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const result = Array.isArray(data) ? [...data] : {...data};
  
  // 如果没有指定keys，则处理所有字符串属性
  // If keys are not specified, process all string properties
  if (!keys) {
    for (const key in result) {
      if (typeof result[key] === 'string') {
        result[key] = result[key].trim();
      } else if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = optimizeStringData(result[key]);
      }
    }
  } else {
    // 处理指定的keys
    // Process specified keys
    keys.forEach(key => {
      if (key in result && typeof result[key] === 'string') {
        result[key] = result[key].trim();
      }
    });
  }
  
  return result;
};

/**
 * 创建子包加载控制器
 * Create subpackage loading controller
 */
const createSubpackageController = () => {
  const loadedPackages = {};
  const preloadQueue = [];
  let isPreloading = false;
  
  /**
   * 预加载下一个分包
   * Preload next subpackage
   */
  const preloadNext = () => {
    if (preloadQueue.length === 0 || isPreloading) {
      return;
    }
    
    isPreloading = true;
    const packageName = preloadQueue.shift();
    
    if (loadedPackages[packageName]) {
      isPreloading = false;
      preloadNext();
      return;
    }
    
    wx.loadSubpackage({
      name: packageName,
      success: (res) => {
        loadedPackages[packageName] = true;
        console.log(`预加载分包 ${packageName} 成功`, res);
      },
      fail: (err) => {
        console.error(`预加载分包 ${packageName} 失败`, err);
      },
      complete: () => {
        isPreloading = false;
        preloadNext(); // 处理队列中的下一个
      }
    });
  };
  
  return {
    /**
     * 加载分包
     * Load subpackage
     * @param {string} packageName - Subpackage name
     * @returns {Promise} - Promise resolving when package is loaded
     */
    loadPackage: (packageName) => {
      if (loadedPackages[packageName]) {
        return Promise.resolve();
      }
      
      return new Promise((resolve, reject) => {
        wx.loadSubpackage({
          name: packageName,
          success: (res) => {
            loadedPackages[packageName] = true;
            resolve(res);
          },
          fail: (err) => {
            reject(err);
          }
        });
      });
    },
    
    /**
     * 添加预加载队列
     * Add to preload queue
     * @param {Array} packages - Array of package names
     */
    preloadPackages: (packages) => {
      if (!Array.isArray(packages) || packages.length === 0) {
        return;
      }
      
      packages.forEach(pkg => {
        if (!loadedPackages[pkg] && !preloadQueue.includes(pkg)) {
          preloadQueue.push(pkg);
        }
      });
      
      preloadNext();
    },
    
    /**
     * 检查分包是否已加载
     * Check if package is loaded
     * @param {string} packageName - Package name
     * @returns {boolean} - Whether package is loaded
     */
    isPackageLoaded: (packageName) => {
      return !!loadedPackages[packageName];
    },
    
    /**
     * 获取已加载的分包列表
     * Get list of loaded packages
     * @returns {Array} - Array of loaded package names
     */
    getLoadedPackages: () => {
      return Object.keys(loadedPackages);
    }
  };
};

/**
 * 优化图片加载策略
 * Optimize image loading strategy
 * @param {string} imgUrl - Image URL
 * @param {Object} options - Options
 * @returns {string} - Optimized image URL
 */
const optimizeImageUrl = (imgUrl, options = {}) => {
  if (!imgUrl) return '';
  
  // 如果是本地资源，不处理
  // If it's a local resource, don't process
  if (imgUrl.startsWith('/')) {
    return imgUrl;
  }
  
  try {
    const url = new URL(imgUrl);
    const params = new URLSearchParams(url.search);
    
    // 设置图片质量
    // Set image quality
    if (options.quality && !params.has('q')) {
      params.set('q', options.quality);
    }
    
    // 设置图片尺寸
    // Set image size
    if (options.width && !params.has('w')) {
      params.set('w', options.width);
    }
    
    // 设置图片格式
    // Set image format
    if (options.format && !params.has('format')) {
      params.set('format', options.format);
    }
    
    // 添加WebP支持
    // Add WebP support
    if (options.webp && !params.has('webp')) {
      params.set('webp', 1);
    }
    
    url.search = params.toString();
    return url.toString();
  } catch (e) {
    console.error('优化图片URL失败', e);
    return imgUrl;
  }
};

module.exports = {
  setupLazyComponents,
  importConfig,
  debounce,
  optimizeStringData,
  createSubpackageController,
  optimizeImageUrl
}; 