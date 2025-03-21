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
    if (!event.hotWords || !Array.isArray(event.hotWords) || event.hotWords.length === 0) {
      return {
        success: false,
        error: '缺少必要参数 hotWords 或格式不正确'
      };
    }
    
    const db = cloud.database();
    const hotWordsCollection = db.collection('search_hot_words');
    
    // 查询当前热词
    // Query current hot words
    const existingResult = await hotWordsCollection.where({
      isActive: true
    }).get();
    
    // 当前时间
    // Current time
    const now = new Date();
    
    if (existingResult.data.length > 0) {
      // 更新现有热词
      // Update existing hot words
      await hotWordsCollection.doc(existingResult.data[0]._id).update({
        data: {
          hotWords: event.hotWords,
          startTime: event.startTime || now,
          endTime: event.endTime || null,
          updateTime: now
        }
      });
    } else {
      // 创建新热词记录
      // Create new hot words record
      await hotWordsCollection.add({
        data: {
          hotWords: event.hotWords,
          isActive: true,
          startTime: event.startTime || now,
          endTime: event.endTime || null,
          createTime: now,
          updateTime: now,
          openid: wxContext.OPENID
        }
      });
    }
    
    // 调用微信官方API更新热词
    // Call WeChat official API to update hot words
    try {
      // 这里需要集成微信官方API，实际调用方式可能因官方SDK变化而调整
      // Here you need to integrate WeChat official API, actual call method may change due to official SDK changes
      console.log('更新微信搜索热词', event.hotWords);
      
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
    console.error('更新搜索热词失败', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 