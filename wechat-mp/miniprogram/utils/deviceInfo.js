/**
 * 设备信息工具 - Device Information Utility
 * 用于获取和管理设备标识信息，支持跨平台数据同步
 * For retrieving and managing device identification info for cross-platform data sync
 */

const app = getApp();

/**
 * 获取设备标识信息
 * Get device identification info
 */
const getDeviceInfo = () => {
  // 尝试从缓存获取设备ID
  // Try to get device ID from cache
  let deviceId = wx.getStorageSync('device_id');
  
  // 如果没有设备ID，则生成一个
  // Generate a new device ID if none exists
  if (!deviceId) {
    deviceId = generateDeviceId();
    wx.setStorageSync('device_id', deviceId);
  }
  
  // 获取系统信息
  // Get system info
  const systemInfo = wx.getSystemInfoSync();
  
  return {
    deviceId: deviceId,
    platform: 'wechat-mp',
    model: systemInfo.model || 'unknown',
    system: systemInfo.system || 'unknown',
    brand: systemInfo.brand || 'unknown',
    version: app.globalData.version || '1.0.0',
    timestamp: Date.now()
  };
};

/**
 * 生成唯一设备ID
 * Generate unique device ID
 */
const generateDeviceId = () => {
  // 生成一个随机的设备ID
  // Generate a random device ID
  return 'wxmp_' + 
    Math.random().toString(36).substring(2, 10) + 
    Date.now().toString(36);
};

/**
 * 刷新设备信息
 * Refresh device info
 */
const refreshDeviceInfo = () => {
  const deviceInfo = getDeviceInfo();
  deviceInfo.timestamp = Date.now();
  return deviceInfo;
};

/**
 * 将用户ID与设备关联
 * Associate user ID with device
 */
const associateWithUser = (userId) => {
  if (!userId) return;
  
  // 更新设备信息中的用户ID
  // Update user ID in device info
  const deviceInfo = getDeviceInfo();
  deviceInfo.userId = userId;
  deviceInfo.timestamp = Date.now();
  
  // 保存关联信息到服务器
  // Save association info to server
  const token = wx.getStorageSync('auth_token');
  if (token) {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/users/devices`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: deviceInfo,
      success: (res) => {
        console.log('设备关联成功', res.data);
      },
      fail: (err) => {
        console.error('设备关联失败', err);
      }
    });
  }
  
  return deviceInfo;
};

module.exports = {
  getDeviceInfo,
  refreshDeviceInfo,
  associateWithUser
}; 