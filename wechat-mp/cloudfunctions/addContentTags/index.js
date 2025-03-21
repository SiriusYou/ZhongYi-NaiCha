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
    if (!event.tags || !Array.isArray(event.tags) || event.tags.length === 0) {
      return {
        success: false,
        error: '缺少必要参数 tags 或格式不正确'
      };
    }
    
    const db = cloud.database();
    const _ = db.command;
    const tagsCollection = db.collection('content_tags');
    
    // 获取当前所有标签
    // Get all current tags
    const existingTagsResult = await tagsCollection.where({
      isSystem: true
    }).get();
    
    const existingTags = existingTagsResult.data.length > 0 
      ? existingTagsResult.data[0].tags || []
      : [];
    
    // 合并新标签，去重
    // Merge new tags, remove duplicates
    const uniqueTags = Array.from(new Set([...existingTags, ...event.tags]));
    
    // 更新或创建标签
    // Update or create tags
    if (existingTagsResult.data.length > 0) {
      // 更新现有记录
      // Update existing record
      await tagsCollection.doc(existingTagsResult.data[0]._id).update({
        data: {
          tags: uniqueTags,
          updateTime: new Date()
        }
      });
    } else {
      // 创建新记录
      // Create new record
      await tagsCollection.add({
        data: {
          tags: uniqueTags,
          isSystem: true,
          createTime: new Date(),
          updateTime: new Date(),
          openid: wxContext.OPENID
        }
      });
    }
    
    // 发送给微信云开发平台的标签统计API
    // Send to WeChat cloud development platform's tag statistics API
    try {
      // 这里需要集成微信官方API，实际调用方式可能因官方SDK变化而调整
      // Here you need to integrate WeChat official API, actual call method may change due to official SDK changes
      console.log('更新内容标签', uniqueTags);
      
      // 模拟官方API调用
      // Simulate official API call
    } catch (apiError) {
      console.error('调用微信官方API失败', apiError);
      // 即使API调用失败，也继续执行不中断
      // Continue execution even if API call fails
    }
    
    return {
      success: true,
      tags: uniqueTags
    };
  } catch (error) {
    console.error('添加内容标签失败', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 