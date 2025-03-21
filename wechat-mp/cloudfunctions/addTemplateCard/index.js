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
    if (!event.title || !event.templateId) {
      return {
        success: false,
        error: '缺少必要参数 title 或 templateId'
      };
    }
    
    const db = cloud.database();
    const templateCardCollection = db.collection('template_cards');
    
    // 当前时间
    // Current time
    const now = new Date();
    
    // 创建新模板卡片记录
    // Create new template card record
    const result = await templateCardCollection.add({
      data: {
        title: event.title,
        templateId: event.templateId,
        pagePath: event.pagePath || '',
        thumbnailUrl: event.thumbnailUrl || '',
        data: event.data || {},
        keywords: event.keywords || [],
        launchTime: event.launchTime || now,
        expireTime: event.expireTime || null,
        status: 'pending',
        createTime: now,
        updateTime: now,
        openid: wxContext.OPENID
      }
    });
    
    // 调用微信官方API发送模板卡片
    // Call WeChat official API to send template card
    try {
      // 这里需要集成微信官方API，实际调用方式可能因官方SDK变化而调整
      // Here you need to integrate WeChat official API, actual call method may change due to official SDK changes
      console.log('发送模板卡片', {
        templateId: event.templateId,
        title: event.title
      });
      
      // 模拟官方API调用
      // Simulate official API call
      
      // 更新状态为已发送
      // Update status to sent
      await templateCardCollection.doc(result._id).update({
        data: {
          status: 'sent',
          updateTime: new Date()
        }
      });
    } catch (apiError) {
      console.error('调用微信官方API失败', apiError);
      
      // 更新状态为发送失败
      // Update status to failed
      await templateCardCollection.doc(result._id).update({
        data: {
          status: 'failed',
          errorMessage: apiError.message,
          updateTime: new Date()
        }
      });
      
      // 即使API调用失败，也继续执行不中断
      // Continue execution even if API call fails
    }
    
    return {
      success: true,
      cardId: result._id
    };
  } catch (error) {
    console.error('添加模板卡片失败', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 