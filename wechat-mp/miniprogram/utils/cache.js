/**
 * Cache utility for managing offline data access
 * Provides functionality for storing and retrieving cached data with expiration times
 */

// Maximum size for cache in bytes (10MB)
const MAX_CACHE_SIZE = 10 * 1024 * 1024;

// Default cache expiration time in milliseconds (1 day)
const DEFAULT_EXPIRATION = 24 * 60 * 60 * 1000;

// Cache keys
const CACHE_KEYS = {
  RECIPES: 'cached_recipes',
  KNOWLEDGE_ARTICLES: 'cached_knowledge_articles',
  HEALTH_TIPS: 'cached_health_tips',
  TCM_ENCYCLOPEDIA: 'cached_tcm_encyclopedia',
  MEDIA_RESOURCES: 'cached_media_resources',
  CACHE_SIZE: 'cache_size_tracker',
  CACHE_MANIFEST: 'cache_manifest'
};

// Initialize the cache system
export function initCache() {
  // Ensure cache size tracker exists
  if (!wx.getStorageSync(CACHE_KEYS.CACHE_SIZE)) {
    wx.setStorageSync(CACHE_KEYS.CACHE_SIZE, 0);
  }
  
  // Ensure cache manifest exists
  if (!wx.getStorageSync(CACHE_KEYS.CACHE_MANIFEST)) {
    wx.setStorageSync(CACHE_KEYS.CACHE_MANIFEST, {});
  }
  
  // Clean up expired cache items
  cleanExpiredCache();
}

/**
 * Store data in cache with expiration
 * @param {string} key - Cache key
 * @param {any} data - Data to store
 * @param {number} expiration - Expiration time in milliseconds (optional)
 * @returns {boolean} - Success status
 */
export function setCache(key, data, expiration = DEFAULT_EXPIRATION) {
  try {
    // Calculate data size (approximate)
    const dataString = JSON.stringify(data);
    const dataSize = new Blob([dataString]).size;
    
    // Check if adding this data would exceed max cache size
    const currentSize = wx.getStorageSync(CACHE_KEYS.CACHE_SIZE) || 0;
    if (currentSize + dataSize > MAX_CACHE_SIZE) {
      console.warn('Cache size would exceed limit. Cleaning oldest items...');
      clearOldestCache(dataSize);
    }
    
    // Create cache item with expiration
    const cacheItem = {
      data,
      expiration: Date.now() + expiration,
      size: dataSize
    };
    
    // Store data
    wx.setStorageSync(key, cacheItem);
    
    // Update cache size tracker
    wx.setStorageSync(CACHE_KEYS.CACHE_SIZE, currentSize + dataSize);
    
    // Update cache manifest
    const manifest = wx.getStorageSync(CACHE_KEYS.CACHE_MANIFEST) || {};
    manifest[key] = {
      expiration: cacheItem.expiration,
      size: dataSize,
      timestamp: Date.now()
    };
    wx.setStorageSync(CACHE_KEYS.CACHE_MANIFEST, manifest);
    
    return true;
  } catch (error) {
    console.error('Failed to set cache:', error);
    return false;
  }
}

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {any} - Cached data or null if expired/not found
 */
export function getCache(key) {
  try {
    const cacheItem = wx.getStorageSync(key);
    
    // If no cache or expired, return null
    if (!cacheItem || Date.now() > cacheItem.expiration) {
      return null;
    }
    
    return cacheItem.data;
  } catch (error) {
    console.error('Failed to get cache:', error);
    return null;
  }
}

/**
 * Check if cache is available and not expired
 * @param {string} key - Cache key
 * @returns {boolean} - Whether valid cache exists
 */
export function hasValidCache(key) {
  try {
    const cacheItem = wx.getStorageSync(key);
    return cacheItem && Date.now() <= cacheItem.expiration;
  } catch (error) {
    console.error('Failed to check cache validity:', error);
    return false;
  }
}

/**
 * Remove a specific item from cache
 * @param {string} key - Cache key
 */
export function removeCache(key) {
  try {
    const cacheItem = wx.getStorageSync(key);
    if (cacheItem) {
      // Update cache size tracker
      const currentSize = wx.getStorageSync(CACHE_KEYS.CACHE_SIZE) || l;
      wx.setStorageSync(CACHE_KEYS.CACHE_SIZE, currentSize - (cacheItem.size || 0));
      
      // Remove from cache manifest
      const manifest = wx.getStorageSync(CACHE_KEYS.CACHE_MANIFEST) || {};
      delete manifest[key];
      wx.setStorageSync(CACHE_KEYS.CACHE_MANIFEST, manifest);
      
      // Remove data
      wx.removeStorageSync(key);
    }
  } catch (error) {
    console.error('Failed to remove cache:', error);
  }
}

/**
 * Clean all expired cache items
 */
export function cleanExpiredCache() {
  try {
    const manifest = wx.getStorageSync(CACHE_KEYS.CACHE_MANIFEST) || {};
    const now = Date.now();
    let freedSize = 0;
    
    Object.keys(manifest).forEach(key => {
      if (manifest[key].expiration < now) {
        const size = manifest[key].size || 0;
        freedSize += size;
        
        // Remove the expired item
        wx.removeStorageSync(key);
        delete manifest[key];
      }
    });
    
    // Update manifest
    wx.setStorageSync(CACHE_KEYS.CACHE_MANIFEST, manifest);
    
    // Update cache size tracker
    if (freedSize > 0) {
      const currentSize = wx.getStorageSync(CACHE_KEYS.CACHE_SIZE) || 0;
      wx.setStorageSync(CACHE_KEYS.CACHE_SIZE, Math.max(0, currentSize - freedSize));
      console.log(`Cleaned ${freedSize} bytes of expired cache`);
    }
  } catch (error) {
    console.error('Failed to clean expired cache:', error);
  }
}

/**
 * Clear oldest cache items to free up specified amount of space
 * @param {number} requiredSize - Size to free up in bytes
 */
function clearOldestCache(requiredSize) {
  try {
    const manifest = wx.getStorageSync(CACHE_KEYS.CACHE_MANIFEST) || {};
    let freedSize = 0;
    
    // Sort cache items by timestamp (oldest first)
    const sortedItems = Object.keys(manifest)
      .map(key => ({ key, ...manifest[key] }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest items until we've freed enough space
    for (const item of sortedItems) {
      if (freedSize >= requiredSize) break;
      
      // Remove this item
      wx.removeStorageSync(item.key);
      freedSize += item.size || 0;
      delete manifest[item.key];
    }
    
    // Update manifest
    wx.setStorageSync(CACHE_KEYS.CACHE_MANIFEST, manifest);
    
    // Update cache size tracker
    const currentSize = wx.getStorageSync(CACHE_KEYS.CACHE_SIZE) || 0;
    wx.setStorageSync(CACHE_KEYS.CACHE_SIZE, Math.max(0, currentSize - freedSize));
    
    console.log(`Cleared ${freedSize} bytes by removing oldest cache items`);
  } catch (error) {
    console.error('Failed to clear oldest cache:', error);
  }
}

// Export cache keys for use in other modules
export { CACHE_KEYS };