// 云函数入口文件
const cloud = require('wx-server-sdk');
const crypto = require('crypto');

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
    
    // 生成短码
    // Generate short code
    const uniqueId = generateShortCode(event.path + event.query + Date.now());
    
    // 存储短链接数据到数据库
    // Store short link data in database
    const db = cloud.database();
    const shortLinksCollection = db.collection('short_links');
    
    // 创建新短链接记录
    // Create new short link record
    const result = await shortLinksCollection.add({
      data: {
        shortCode: uniqueId,
        path: event.path,
        query: event.query || '',
        description: event.description || '',
        createTime: new Date(),
        updateTime: new Date(),
        openid: wxContext.OPENID,
        accessCount: 0
      }
    });
    
    // 构建短链接URL
    // Build short link URL
    const shortUrl = `https://your-domain.com/s/${uniqueId}`;
    
    // 实际应用中，你需要设置一个域名进行重定向
    // In real application, you need to set up a domain for redirection
    
    return {
      success: true,
      shortCode: uniqueId,
      shortUrl: shortUrl,
      result: result._id
    };
  } catch (error) {
    console.error('生成短链接失败', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 生成6位短码
// Generate 6-character short code
function generateShortCode(input) {
  const hash = crypto.createHash('md5').update(input).digest('hex');
  // 取前6位，生成一个短码
  // Take first 6 characters to generate a short code
  return hash.substring(0, 6);
} 