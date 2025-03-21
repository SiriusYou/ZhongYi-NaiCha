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
    if (!event.title) {
      return {
        success: false,
        error: '缺少必要参数 title'
      };
    }
    
    // 存储可发现内容到数据库
    // Store discoverable content in database
    const db = cloud.database();
    const discoverableContentCollection = db.collection('discoverable_content');
    
    // 创建新内容
    // Create new content
    const result = await discoverableContentCollection.add({
      data: {
        title: event.title,
        description: event.description || '',
        path: event.path || 'pages/index/index',
        category: event.category || 'uncategorized',
        tags: event.tags || [],
        images: event.images || [],
        publishTime: new Date(event.publishTime) || new Date(),
        isPublic: event.isPublic !== false,
        createTime: new Date(),
        updateTime: new Date(),
        openid: wxContext.OPENID
      }
    });
    
    // 同时更新索引
    // Also update index
    const searchIndexCollection = db.collection('search_index');
    await searchIndexCollection.add({
      data: {
        query: '',
        path: event.path || 'pages/index/index',
        tags: event.tags || [],
        title: event.title,
        description: event.description || '',
        thumbnail: event.images && event.images.length > 0 ? event.images[0] : '',
        createTime: new Date(),
        updateTime: new Date(),
        openid: wxContext.OPENID,
        contentId: result._id
      }
    });
    
    // 调用小程序云开发API增加索引 (仅管理员可用)
    // Call mini-program cloud API to add index (admin only)
    try {
      // 这部分代码在实际环境中需要对接微信官方API
      // This part of code needs to connect to WeChat official API in real environment
      console.log('调用微信索引API (模拟)');
    } catch (apiError) {
      console.error('API调用失败', apiError);
      // 继续执行，不影响返回结果
      // Continue execution, don't affect return result
    }
    
    return {
      success: true,
      contentId: result._id
    };
  } catch (error) {
    console.error('添加可发现内容失败', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 