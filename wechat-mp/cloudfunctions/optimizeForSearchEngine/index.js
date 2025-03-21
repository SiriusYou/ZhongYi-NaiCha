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
    if (!event.path || !event.title) {
      return {
        success: false,
        error: '缺少必要参数 path 或 title'
      };
    }
    
    const db = cloud.database();
    const seoCollection = db.collection('seo_index');
    
    // 查询是否已存在该路径的SEO信息
    // Check if SEO information for this path already exists
    const existingRecord = await seoCollection.where({
      path: event.path
    }).get();
    
    // 当前时间
    // Current time
    const now = new Date();
    
    if (existingRecord.data.length > 0) {
      // 更新现有记录
      // Update existing record
      await seoCollection.doc(existingRecord.data[0]._id).update({
        data: {
          title: event.title,
          description: event.description || '',
          keywords: event.keywords || [],
          content: event.content || '',
          author: event.author || '',
          category: event.category || '',
          tags: event.tags || [],
          thumbnail: event.thumbnail || '',
          updateTime: now
        }
      });
    } else {
      // 创建新记录
      // Create new record
      await seoCollection.add({
        data: {
          path: event.path,
          title: event.title,
          description: event.description || '',
          keywords: event.keywords || [],
          content: event.content || '',
          author: event.author || '',
          category: event.category || '',
          tags: event.tags || [],
          thumbnail: event.thumbnail || '',
          createTime: now,
          updateTime: now,
          openid: wxContext.OPENID
        }
      });
    }
    
    // 调用微信官方API更新搜索索引
    // Call WeChat official API to update search index
    try {
      // 这里需要集成微信官方API，实际调用方式可能因官方SDK变化而调整
      // Here you need to integrate WeChat official API, actual call method may change due to official SDK changes
      console.log('更新微信搜索索引', event.path);
      
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
    console.error('优化搜索引擎索引失败', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 