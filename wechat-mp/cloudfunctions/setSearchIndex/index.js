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
    if (!event.path) {
      return {
        success: false,
        error: '缺少必要参数 path'
      };
    }
    
    // 存储索引数据到数据库
    // Store index data in database
    const db = cloud.database();
    const searchIndexCollection = db.collection('search_index');
    
    // 查找是否已有此路径的索引
    // Check if index for this path already exists
    const existingIndex = await searchIndexCollection.where({
      path: event.path
    }).get();
    
    let result;
    
    if (existingIndex.data.length > 0) {
      // 更新现有索引
      // Update existing index
      result = await searchIndexCollection.doc(existingIndex.data[0]._id).update({
        data: {
          query: event.query || '',
          path: event.path,
          tags: event.tags || [],
          title: event.title || '',
          description: event.description || '',
          thumbnail: event.thumbnail || '',
          updateTime: new Date(),
          openid: wxContext.OPENID
        }
      });
      
      return {
        success: true,
        updated: true,
        result: result
      };
    } else {
      // 创建新索引
      // Create new index
      result = await searchIndexCollection.add({
        data: {
          query: event.query || '',
          path: event.path,
          tags: event.tags || [],
          title: event.title || '',
          description: event.description || '',
          thumbnail: event.thumbnail || '',
          createTime: new Date(),
          updateTime: new Date(),
          openid: wxContext.OPENID
        }
      });
      
      return {
        success: true,
        created: true,
        result: result
      };
    }
  } catch (error) {
    console.error('设置搜索索引失败', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 