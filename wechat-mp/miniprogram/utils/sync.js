/**
 * 数据同步工具 - Data Synchronization Utility
 * 用于在不同平台间同步用户数据
 * For synchronizing user data across different platforms
 */

const app = getApp();
const deviceInfo = require('./deviceInfo.js');

/**
 * 同步个人资料数据到服务器
 * Sync profile data to server
 */
const syncProfileData = (profileData) => {
  const token = wx.getStorageSync('auth_token');
  if (!token) {
    return Promise.reject(new Error('未登录'));
  }
  
  // 添加时间戳和设备信息
  // Add timestamp and device info
  const dataToSync = {
    ...profileData,
    timestamp: Date.now(),
    device: deviceInfo.getDeviceInfo()
  };
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/sync/profile`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: dataToSync,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(`同步失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

/**
 * 同步健康追踪数据到服务器
 * Sync health tracking data to server
 */
const syncHealthData = (healthData) => {
  const token = wx.getStorageSync('auth_token');
  if (!token) {
    return Promise.reject(new Error('未登录'));
  }
  
  // 添加时间戳和设备信息
  // Add timestamp and device info
  const dataToSync = {
    ...healthData,
    timestamp: Date.now(),
    device: deviceInfo.getDeviceInfo()
  };
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/sync/health`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: dataToSync,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(`同步失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

/**
 * 从服务器拉取最新数据
 * Pull latest data from server
 */
const pullLatestData = () => {
  const token = wx.getStorageSync('auth_token');
  if (!token) {
    return Promise.reject(new Error('未登录'));
  }
  
  // 获取设备信息用于同步
  // Get device info for sync
  const device = deviceInfo.refreshDeviceInfo();
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/sync/pull`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`,
        'X-Device-ID': device.deviceId,
        'X-Platform': device.platform
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 处理服务器数据
          // Process server data
          const result = processServerData(res.data);
          resolve(result);
        } else {
          reject(new Error(`拉取数据失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

/**
 * 处理从服务器接收的数据
 * Process data received from server
 */
const processServerData = (data) => {
  let updates = 0;
  
  // 处理用户个人资料
  // Process user profile
  if (data.profile) {
    const localProfile = wx.getStorageSync('user_profile');
    const localTimestamp = wx.getStorageSync('profile_timestamp') || 0;
    
    // 如果服务器数据更新，则更新本地数据
    // Update local data if server data is newer
    if (!localProfile || data.profile.timestamp > localTimestamp) {
      wx.setStorageSync('user_profile', data.profile);
      wx.setStorageSync('profile_timestamp', data.profile.timestamp);
      updates++;
    }
  }
  
  // 处理健康追踪数据
  // Process health tracking data
  if (data.healthData && data.healthData.length > 0) {
    const localHealthData = wx.getStorageSync('health_tracking_data') || [];
    
    // 合并和处理健康数据
    // Merge and process health data
    const mergedData = mergeHealthData(localHealthData, data.healthData);
    wx.setStorageSync('health_tracking_data', mergedData);
    updates++;
  }
  
  // 处理健康洞察数据
  // Process health insights data
  if (data.insights) {
    const localInsights = wx.getStorageSync('health_insights') || {};
    const localInsightsTimestamp = wx.getStorageSync('insights_timestamp') || 0;
    
    // 如果服务器数据更新，则更新本地数据
    // Update local data if server data is newer
    if (!localInsights || data.insights.timestamp > localInsightsTimestamp) {
      wx.setStorageSync('health_insights', data.insights);
      wx.setStorageSync('insights_timestamp', data.insights.timestamp);
      updates++;
    }
  }
  
  return {
    success: true,
    updates: updates,
    timestamp: Date.now()
  };
};

/**
 * 合并健康数据，解决冲突
 * Merge health data and resolve conflicts
 */
const mergeHealthData = (localData, serverData) => {
  // 将本地和服务器数据合并
  // Merge local and server data
  const mergedData = [...localData];
  const localDataMap = new Map(localData.map(item => [item.date, item]));
  
  // 处理每个服务器项目
  // Process each server item
  serverData.forEach(serverItem => {
    const localItem = localDataMap.get(serverItem.date);
    
    // 如果本地没有此项或服务器项目更新，则更新本地数据
    // Update local data if local doesn't have this item or server item is newer
    if (!localItem || serverItem.timestamp > localItem.timestamp) {
      // 如果本地有此项，从合并数据中删除旧版本
      // If local has this item, remove old version from merged data
      if (localItem) {
        const index = mergedData.findIndex(item => item.date === serverItem.date);
        if (index !== -1) {
          mergedData.splice(index, 1);
        }
      }
      
      // 添加服务器项目到合并数据
      // Add server item to merged data
      mergedData.push(serverItem);
    }
  });
  
  // 按日期排序
  // Sort by date
  return mergedData.sort((a, b) => new Date(b.date) - new Date(a.date));
};

/**
 * 检查是否需要同步
 * Check if sync is needed
 */
const shouldSync = (threshold = 3600000) => { // 默认1小时 (Default 1 hour)
  const lastSync = wx.getStorageSync('last_sync_time') || 0;
  const now = Date.now();
  
  // 如果自上次同步以来的时间超过阈值，则需要同步
  // Need to sync if time since last sync exceeds threshold
  return (now - lastSync) > threshold;
};

/**
 * 执行自动同步
 * Perform auto sync
 */
const autoSync = (threshold = 3600000) => {
  // 如果需要同步，则拉取最新数据
  // Pull latest data if sync is needed
  if (shouldSync(threshold)) {
    return pullLatestData()
      .then(result => {
        // 更新上次同步时间
        // Update last sync time
        wx.setStorageSync('last_sync_time', Date.now());
        return {
          synced: true,
          ...result
        };
      });
  } else {
    // 如果不需要同步，返回未同步状态
    // Return not synced status if sync not needed
    return Promise.resolve({
      synced: false,
      reason: '同步时间间隔未到'
    });
  }
};

/**
 * 解决冲突数据
 * Resolve conflicting data
 */
const resolveConflicts = (localData, serverData) => {
  // 使用last-write-wins策略
  // Use last-write-wins strategy
  if (serverData.timestamp > localData.timestamp) {
    return serverData;
  }
  return localData;
};

module.exports = {
  syncProfileData,
  syncHealthData,
  pullLatestData,
  autoSync,
  shouldSync,
  resolveConflicts
}; 