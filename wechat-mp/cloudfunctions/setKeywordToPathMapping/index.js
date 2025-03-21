// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    
    // 检查必要参数
    // Check necessary parameters
    if (!event.mapping || typeof event.mapping !== 'object' || Object.keys(event.mapping).length === 0) {
      return {
        success: false,
        error: '缺少必要参数 mapping 或格式不正确'
      };
    }
    
    const db = cloud.database();
    const mappingCollection = db.collection('keyword_path_mapping');
    
    // 查询现有映射
    // Query existing mappings
    const existingResult = await mappingCollection.where({
      isActive: true
    }).get();
    
    // 当前时间
    // Current time
    const now = new Date();
    
    if (existingResult.data.length > 0) {
      // 更新现有映射
      // Update existing mappings
      await mappingCollection.doc(existingResult.data[0]._id).update({
        data: {
          mapping: event.mapping,
          updateTime: now
        }
      });
    } else {
      // 创建新映射记录
      // Create new mapping record
      await mappingCollection.add({
        data: {
          mapping: event.mapping,
          isActive: true,
          createTime: now,
          updateTime: now,
          openid: wxContext.OPENID
        }
      });
    }
    
    // 调用微信官方API更新关键词映射
    // Call WeChat official API to update keyword mappings
    try {
      // 这里需要集成微信官方API，实际调用方式可能因官方SDK变化而调整
      // Here you need to integrate WeChat official API, actual call method may change due to official SDK changes
      console.log('更新微信关键词映射', event.mapping);
      
      // 模拟官方API调用
      // Simulate official API call
    } catch (apiError) {
      console.error('调用微信官方API失败', apiError);
      // 即使API调用失败，也继续执行不中断
      // Continue execution even if API call fails
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('设置关键词映射失败', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 