/**
 * Network utility for monitoring connection status and handling offline requests
 */

// Network status types
export const NETWORK_STATUS = {
  WIFI: 'wifi',
  CELLULAR: 'cellular',
  NONE: 'none',
  UNKNOWN: 'unknown'
};

// Store the current network status
let currentNetworkStatus = NETWORK_STATUS.UNKNOWN;
let networkStatusCallbacks = [];

/**
 * Initialize network status monitoring
 * @param {Function} callback - Function to call when network status changes
 */
export function initNetworkStatus(callback) {
  // Add to callbacks list if provided
  if (typeof callback === 'function') {
    networkStatusCallbacks.push(callback);
  }
  
  // Get initial network status
  checkNetworkStatus();
  
  // Set up network status change listener
  wx.onNetworkStatusChange(res => {
    const newStatus = getNetworkTypeFromWx(res.networkType);
    const oldStatus = currentNetworkStatus;
    
    // Update current status
    currentNetworkStatus = newStatus;
    
    // Only notify if status actually changed
    if (oldStatus !== newStatus) {
      // Notify all callbacks
      networkStatusCallbacks.forEach(cb => {
        try {
          cb(newStatus, oldStatus);
        } catch (error) {
          console.error('Error in network status callback:', error);
        }
      });
    }
  });
}

/**
 * Get current network status
 * @returns {string} - Current network status
 */
export function getCurrentNetworkStatus() {
  return currentNetworkStatus;
}

/**
 * Register a callback for network status changes
 * @param {Function} callback - Function to call when network status changes
 */
export function onNetworkStatusChange(callback) {
  if (typeof callback === 'function') {
    networkStatusCallbacks.push(callback);
  }
}

/**
 * Unregister a network status callback
 * @param {Function} callback - Callback to remove
 */
export function offNetworkStatusChange(callback) {
  const index = networkStatusCallbacks.indexOf(callback);
  if (index !== -1) {
    networkStatusCallbacks.splice(index, 1);
  }
}

/**
 * Check current network status
 */
export function checkNetworkStatus() {
  wx.getNetworkType({
    success: res => {
      const newStatus = getNetworkTypeFromWx(res.networkType);
      const oldStatus = currentNetworkStatus;
      
      // Update current status
      currentNetworkStatus = newStatus;
      
      // Only notify if status actually changed
      if (oldStatus !== newStatus) {
        // Notify all callbacks
        networkStatusCallbacks.forEach(cb => {
          try {
            cb(newStatus, oldStatus);
          } catch (error) {
            console.error('Error in network status callback:', error);
          }
        });
      }
    }
  });
}

/**
 * Check if device is online
 * @returns {boolean} - Whether device has network connectivity
 */
export function isOnline() {
  return currentNetworkStatus === NETWORK_STATUS.WIFI || 
         currentNetworkStatus === NETWORK_STATUS.CELLULAR;
}

/**
 * Make a network request with offline support
 * If offline, the request is stored for later processing
 * @param {Object} options - Request options
 * @returns {Promise} - Promise that resolves with response or rejects with error
 */
export function request(options) {
  // Check if device is online
  if (isOnline()) {
    // Device is online, make normal request
    return new Promise((resolve, reject) => {
      wx.request({
        ...options,
        success: res => resolve(res),
        fail: err => reject(err)
      });
    });
  } else {
    // Device is offline, save request for later
    return new Promise((resolve, reject) => {
      // Get pending sync requests
      const pendingSync = wx.getStorageSync('pendingSync') || [];
      
      // Only queue POST, PUT, DELETE requests
      const method = (options.method || 'GET').toUpperCase();
      if (method === 'GET') {
        // For GET requests, reject immediately in offline mode
        reject(new Error('Network unavailable for GET request'));
      } else {
        // Add to pending sync queue
        pendingSync.push({
          url: options.url,
          method: method,
          data: options.data,
          timestamp: Date.now()
        });
        
        // Save updated pending sync queue
        wx.setStorageSync('pendingSync', pendingSync);
        
        // Resolve with "fake" success response
        resolve({
          statusCode: 200,
          data: {
            success: true,
            message: 'Request queued for sync when online',
            offlineQueued: true
          }
        });
        
        // Show offline notification to user
        wx.showToast({
          title: '网络不可用，数据将在恢复连接后同步',
          icon: 'none',
          duration: 2000
        });
      }
    });
  }
}

/**
 * Convert WeChat network type to our network status
 * @param {string} wxNetworkType - WeChat network type
 * @returns {string} - Our network status
 */
function getNetworkTypeFromWx(wxNetworkType) {
  switch (wxNetworkType) {
    case 'wifi':
      return NETWORK_STATUS.WIFI;
    case '2g':
    case '3g':
    case '4g':
    case '5g':
      return NETWORK_STATUS.CELLULAR;
    case 'none':
    case 'unknown':
      return NETWORK_STATUS.NONE;
    default:
      return NETWORK_STATUS.UNKNOWN;
  }
} 