# 中医奶茶养生 App 实现进度

本文档记录项目实现的进度，包括已完成的功能模块、实现思路、关键代码等，便于后续开发和维护。

## 目录
- [环境搭建](#环境搭建)
- [后端服务](#后端服务)
  - [用户服务](#用户服务)
  - [健康档案服务](#健康档案服务)
  - [知识中心服务](#知识中心服务)
  - [配方指南服务](#配方指南服务)
  - [订单服务](#订单服务)
  - [社区互动服务](#社区互动服务)
  - [数据分析服务](#数据分析服务)
- [移动应用](#移动应用)
  - [iOS应用](#ios应用)
  - [Android应用](#android应用)
- [待完成功能 (Pending Features)](#待完成功能-pending-features)

## 环境搭建

### 完成情况
- [x] 创建项目基本目录结构
- [x] 配置基础环境文件（package.json, .gitignore等）
- [x] 设置安全和日志配置
- [x] 创建Docker和AWS部署配置

### 实现思路
按照微服务架构设计，将系统分为多个独立的服务：
- API网关：统一入口，处理路由和安全
- 用户服务：处理用户认证和健康档案
- 推荐引擎：根据用户数据提供个性化茶饮推荐
- 知识中心：提供中医知识和内容
- 配方指南：提供详细的茶饮配方和制作指南
- 订单服务：处理订单和支付
- 社区服务：用户互动和专家问答
- 数据分析：健康数据分析和报告生成

每个服务采用Node.js实现，使用Express框架，通过Docker容器化部署。

## 后端服务

### 用户服务

#### 完成情况
- [x] 用户注册（手机号+验证码）
- [x] 用户登录
- [x] JWT认证
- [x] 用户信息管理

#### 实现思路
用户服务采用Express框架实现，使用MongoDB作为数据库。主要功能包括：

1. **用户注册和登录**：支持手机号+验证码的注册和登录方式。
2. **JWT认证**：使用JSON Web Token进行用户认证，确保API安全。
3. **用户信息管理**：提供用户信息的CRUD操作。

#### 关键代码
```javascript
// 用户认证中间件
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // 获取token
  const token = req.header('x-auth-token');

  // 检查是否有token
  if (!token) {
    return res.status(401).json({ msg: '无访问权限，请先登录' });
  }

  // 验证token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'yourSecretKey');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token无效' });
  }
};
```

### 健康档案服务

#### 完成情况
- [x] 健康档案创建和更新
- [x] TCM体质类型评估
- [x] 健康目标管理
- [x] 过敏原和禁忌记录

### 知识中心服务

#### 完成情况
- [x] 中医知识内容管理（文章、草药）
- [x] 内容分类和标签
- [x] 搜索功能
- [x] 离线必要内容提供

#### 实现思路
知识中心服务采用Express框架实现，使用MongoDB作为数据库。主要功能包括：

1. **内容管理**：提供文章和中药材的CRUD操作，支持富文本内容和多媒体资源。
2. **分类和标签**：支持内容的分类和标签管理，便于用户浏览和查找。
3. **搜索功能**：提供全文搜索和按条件筛选的功能，支持中药材的特性搜索（如性味、归经等）。
4. **离线内容**：提供必要内容的离线访问API，支持移动应用的离线模式。

#### 关键代码
```javascript
// 文章模型
const ArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  summary: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  }],
  // 其他字段...
});

// 中药材模型
const HerbSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  chineseName: {
    type: String,
    required: true,
    trim: true
  },
  properties: {
    nature: {
      type: String,
      enum: ['寒', '凉', '平', '温', '热'],
      required: true
    },
    taste: [{
      type: String,
      enum: ['酸', '苦', '甘', '辛', '咸', '淡'],
      required: true
    }],
    meridianAffinity: [{
      type: String,
      enum: [
        '肺经', '大肠经', '胃经', '脾经', '心经', '小肠经', 
        '膀胱经', '肾经', '心包经', '三焦经', '胆经', '肝经'
      ]
    }]
  },
  // 其他字段...
});
```

### 配方指南服务

#### 完成情况
- [x] 茶饮配方数据库
- [x] 配方详情和制作步骤
- [x] 基于用户体质的推荐
- [x] 季节性推荐

#### 实现思路
配方指南服务采用Express框架实现，使用MongoDB作为数据库。主要功能包括：

1. **配方数据管理**：提供茶饮配方的CRUD操作，包括详细的配料、步骤、营养信息等。
2. **成分数据管理**：管理所有茶饮成分的详细信息，包括中药材和其他食材。
3. **分类管理**：支持配方的分类管理，如按功效、季节、体质等分类。
4. **搜索和推荐**：提供高级搜索和基于用户体质、季节等的个性化推荐功能。

#### 关键代码
```javascript
// 配方模型
const RecipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  ingredients: [{
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ingredient',
      required: true
    },
    amount: {
      type: String,
      required: true
    },
    note: String
  }],
  steps: [{
    type: String,
    required: true
  }],
  preparationTime: {
    type: Number,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['简单', '中等', '复杂'],
    default: '中等'
  },
  healthBenefits: [{
    type: String,
    required: true
  }],
  suitableConstitutions: [{
    type: String,
    required: true
  }],
  suitableSeasons: [{
    type: String,
    enum: ['春', '夏', '秋', '冬'],
    required: true
  }],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  // 其他字段...
});

// 个性化推荐API示例
router.get('/search/recommendations', async (req, res) => {
  try {
    const constitution = req.query.constitution || '';
    const season = req.query.season || getCurrentSeason();
    const symptoms = req.query.symptoms ? req.query.symptoms.split(',') : [];
    
    // 构建查询条件
    const query = { isActive: true };
    
    if (constitution && constitution !== '') {
      query.suitableConstitutions = constitution;
    }
    
    if (season && season !== '') {
      query.suitableSeasons = season;
    }
    
    if (symptoms.length > 0) {
      const symptomRegex = symptoms.map(s => new RegExp(s, 'i'));
      query.healthBenefits = { $in: symptomRegex };
    }
    
    // 获取配方
    const recipes = await Recipe.find(query)
      .sort({ 'rating.average': -1, createdAt: -1 })
      .populate('category')
      .populate('ingredients.ingredient')
      .limit(10);
    
    res.json({
      recommendations: recipes,
      filters: { constitution, season, symptoms }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
```

### 订单服务

#### 完成情况
- [x] 购物车管理
- [x] 结算流程
- [x] 订单创建和管理
- [ ] 支付集成
- [ ] 订单状态跟踪
- [ ] 订单历史查询

#### 实现思路
订单服务采用Express框架实现，使用MongoDB作为数据库。主要功能包括：

1. **购物车管理**：提供购物车的CRUD操作，支持添加、更新、删除购物车项目。
2. **结算流程**：支持多种配送方式（自取、外送）和支付方式。
3. **订单管理**：提供订单的创建、查询、取消等功能。
4. **支付集成**：支持多种支付方式，包括现金、刷卡和移动支付。
5. **订单状态跟踪**：提供订单状态的实时更新和通知。

#### 关键代码
```javascript
// 购物车项目模型
const CartItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipe: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  options: {
    type: Map,
    of: String
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 订单模型
const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    recipe: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipe'
    },
    name: String,
    price: Number,
    quantity: Number,
    options: {
      type: Map,
      of: String
    },
    notes: String
  }],
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'completed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CARD', 'MOBILE'],
    required: true
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shop'
  },
  deliveryAddress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address'
  },
  pickupTime: Date,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
});
```

### 社区互动服务

#### 完成情况
✅ - Post publishing and management  
✅ - Comment system  
✅ - Like and favorite features  
✅ - User interaction notifications  
✅ - Real-time notifications (WebSocket)  
✅ - Expert certification and responses  
✅ - Content review  

**Implementation Overview**:  
The Community Interaction Service is built using the Express framework with MongoDB as the database and Socket.io for real-time notifications. The service provides comprehensive features for user engagement, including post management, commenting, liking, expert verification, and real-time notifications.

**Key Features**:
- Complete post management system with CRUD operations
- Hierarchical comment system with threaded replies
- Like functionality for both posts and comments
- Expert verification system for content validation
- Real-time notifications via WebSocket
- Content reporting and moderation with AI capabilities
- User following capabilities

**Key Code Snippets**:
```javascript
// Content moderation utilities
const checkProhibitedKeywords = (content, additionalKeywords = []) => {
  const keywords = [...loadProhibitedKeywords(), ...additionalKeywords];
  const lowerContent = content.toLowerCase();
  const matches = keywords.filter(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
  
  return {
    containsProhibited: matches.length > 0,
    matches,
  };
};

// AI moderation integration
const callAiModerationApi = async (content) => {
  try {
    const apiUrl = process.env.AI_MODERATION_API_URL;
    const apiKey = process.env.AI_MODERATION_API_KEY;
    
    if (!apiUrl || !apiKey) {
      throw new Error('AI moderation API configuration missing');
    }
    
    const startTime = Date.now();
    
    // Make API call to AI moderation service
    const response = await axios.post(apiUrl, {
      content,
      options: { detailed: true }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    const processingTime = Date.now() - startTime;
    
    // Process and return the moderation results
    return {
      performed: true,
      score: response.data.overall_score || 0,
      categories: {
        harassment: response.data.categories?.harassment || 0,
        hate: response.data.categories?.hate || 0,
        selfHarm: response.data.categories?.self_harm || 0,
        sexual: response.data.categories?.sexual || 0,
        violence: response.data.categories?.violence || 0,
        other: response.data.categories?.other || 0
      },
      recommendation: getRecommendationFromScore(response.data.overall_score || 0),
      processingTime
    };
  } catch (error) {
    console.error('AI moderation API error:', error.message);
    return { performed: false, error: error.message };
  }
};

// Socket.io connection for real-time notifications
io.on('connection', (socket) => {
  // Join a room based on userId
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined room user-${userId}`);
    }
  });
  
  // Join a post room for realtime comments
  socket.on('joinPost', (postId) => {
    if (postId) {
      socket.join(`post-${postId}`);
      console.log(`User joined post-${postId}`);
    }
  });
});
```

### 数据分析服务

#### 完成情况
- [x] 用户健康数据分析
- [x] 使用习惯分析
- [x] 个性化健康报告
- [x] 趋势预测

### API 网关

#### 完成情况
- [x] 路由配置
- [x] 请求转发功能
- [x] 认证中间件
- [x] 限流机制
- [x] API文档 (Swagger)
- [x] 错误处理

#### 实现思路
API网关是系统的统一入口，负责将请求转发到相应的微服务。主要功能包括：

1. **统一路由管理**：为所有微服务提供统一的路由前缀，如`/api/users`、`/api/recipes`等。
2. **认证授权**：在网关层验证JWT令牌，确保只有授权用户才能访问受保护的资源。
3. **请求转发**：将请求转发到相应的微服务，并将响应返回给客户端。
4. **限流保护**：对不同类型的API实施不同的限流策略，防止恶意请求。
5. **API文档**：集成Swagger提供API文档，方便开发和测试。
6. **错误处理**：统一处理各种错误情况，提供一致的错误响应格式。

#### 关键代码
```javascript
// 路由转发中间件
const forwardRequest = (targetServiceUrl) => {
  return async (req, res) => {
    try {
      // 构建目标URL
      const url = `${targetServiceUrl}${req.originalUrl}`;
      
      // 转发请求
      const response = await axios({
        method: req.method,
        url,
        data: req.body,
        headers: {
          'Content-Type': req.get('Content-Type') || 'application/json',
          ...(req.get('x-auth-token') ? { 'x-auth-token': req.get('x-auth-token') } : {})
        },
        params: req.query,
        timeout: 30000
      });
      
      return res.status(response.status).json(response.data);
    } catch (error) {
      // 错误处理逻辑
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      } else if (error.request) {
        return res.status(503).json({ 
          error: 'Service Unavailable',
          message: 'The requested service is currently unavailable'
        });
      } else {
        return res.status(500).json({ 
          error: 'Internal Server Error',
          message: 'Failed to process your request'
        });
      }
    }
  };
};

// 认证中间件
const auth = (req, res, next) => {
  // 获取令牌
  const token = req.header('x-auth-token');

  // 检查是否有令牌
  if (!token) {
    return res.status(401).json({ 
      error: 'Authorization Denied',
      message: 'No authentication token provided' 
    });
  }

  try {
    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ 
      error: 'Authorization Denied',
      message: 'Invalid authentication token' 
    });
  }
};
```

## 移动应用

### iOS应用

#### 完成情况
- [x] 项目基础结构搭建
- [x] 引导页和登录页面
- [x] 主标签视图（MainTabView）
- [x] 首页（HomeView）
- [x] 知识中心（KnowledgeCenterView）
- [x] 茶饮配方（RecipesView和RecipeDetailView）
- [x] 社区互动（CommunityView）
- [x] 个人中心（ProfileView）
- [x] 健康档案管理（HealthProfileView）
- [x] 离线内容缓存服务（OfflineCacheManager）

#### 实现思路
iOS应用采用SwiftUI框架开发，使用MVVM架构模式。主要组件包括：

1. **引导页和登录**：提供应用介绍和用户登录功能，支持手机号+验证码和第三方登录。
2. **主标签视图**：包含五个主要导航标签（首页、知识中心、茶饮配方、社区互动、个人中心）。
3. **首页**：显示个性化推荐的茶饮和季节性健康提示。
4. **知识中心**：提供中医知识内容，支持分类浏览和搜索。
5. **茶饮配方**：展示茶饮配方列表，支持按类型筛选，并提供详细的配方制作步骤。
6. **社区互动**：用户可以浏览和发布帖子，进行评论和点赞。
7. **个人中心**：显示用户信息和健康档案，提供设置选项。
8. **健康档案管理**：用户可以创建和更新自己的健康档案，包括体质类型、健康目标等。
9. **离线内容缓存**：支持必要内容的离线访问，提高用户体验。

#### 关键代码
```swift
// 主标签视图
struct MainTabView: View {
    @State private var selectedTab = 0
    @EnvironmentObject private var authManager: AuthManager
    @EnvironmentObject private var offlineCacheManager: OfflineCacheManager
    
    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationView {
                HomeView()
                    .navigationTitle("中医奶茶")
            }
            .tabItem {
                Label("首页", systemImage: "house")
            }
            .tag(0)
            
            NavigationView {
                KnowledgeCenterView()
                    .navigationTitle("知识库")
            }
            .tabItem {
                Label("知识", systemImage: "book")
            }
            .tag(1)
            
            NavigationView {
                RecipesView()
                    .navigationTitle("茶饮方")
            }
            .tabItem {
                Label("茶饮", systemImage: "cup.and.saucer")
            }
            .tag(2)
            
            NavigationView {
                CommunityView()
                    .navigationTitle("社区")
            }
            .tabItem {
                Label("社区", systemImage: "person.3")
            }
            .tag(3)
            
            NavigationView {
                ProfileView()
                    .navigationTitle("我的")
            }
            .tabItem {
                Label("我的", systemImage: "person.circle")
            }
            .tag(4)
        }
    }
}

// 离线内容缓存管理
class OfflineCacheManager: ObservableObject {
    @Published var isSyncing = false
    @Published var lastSyncDate: Date?
    
    private var cancellables = Set<AnyCancellable>()
    private let cacheDirectory: URL
    
    init() {
        let fileManager = FileManager.default
        let urls = fileManager.urls(for: .documentDirectory, in: .userDomainMask)
        cacheDirectory = urls[0].appendingPathComponent("cache")
        
        // Create cache directory if it doesn't exist
        if !fileManager.fileExists(atPath: cacheDirectory.path) {
            try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        }
    }
    
    func syncEssentialContent(completion: @escaping (Bool) -> Void) {
        guard !isSyncing else {
            completion(false)
            return
        }
        
        isSyncing = true
        
        // In a real app, we would call the API to get essential content
        // For now, we'll simulate the API call with a delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            // Sync recipes
            let recipes = self.syncEssentialRecipes()
            let saveRecipesResult = self.saveToCache(recipes, forKey: "essential_recipes")
            
            // Sync knowledge content
            let knowledgeContent = self.syncEssentialKnowledgeContent()
            let saveKnowledgeResult = self.saveToCache(knowledgeContent, forKey: "essential_knowledge")
            
            self.isSyncing = false
            self.lastSyncDate = Date()
            
            completion(saveRecipesResult && saveKnowledgeResult)
        }
    }
}

### Android应用

#### 完成情况
- [x] 应用基础架构搭建
- [x] 用户认证模块
- [x] 健康档案模块
- [x] 知识中心模块
- [x] 配方详情页
- [x] 收藏功能
- [x] 购物车和结算功能
- [ ] 订单历史和详情
- [ ] 社区互动模块
- [ ] 数据分析和报告

#### 实现思路
Android应用采用Kotlin语言开发，使用MVVM架构模式，主要组件包括：

1. **UI层**：使用Fragment和Activity构建用户界面，采用Material Design设计规范。
2. **ViewModel层**：处理UI相关的业务逻辑，管理UI状态。
3. **Repository层**：提供数据访问接口，协调远程数据源和本地数据源。
4. **数据源层**：包括远程API服务和本地数据库。

主要功能模块：

1. **用户认证**：支持手机号+验证码登录，使用JWT进行身份验证。
2. **健康档案**：提供用户健康信息的录入和管理。
3. **知识中心**：展示中医知识内容，支持搜索和收藏。
4. **配方指南**：展示茶饮配方，支持按分类浏览和搜索。
5. **购物车和结算**：支持添加商品到购物车，选择配送方式和支付方式进行结算。
6. **订单管理**：查看订单历史和详情，跟踪订单状态。
7. **社区互动**：用户论坛和专家问答功能。

#### 关键代码
```kotlin
// 购物车管理
@Singleton
class CartManager @Inject constructor(
    private val sharedPreferences: SharedPreferences,
    private val gson: Gson
) {
    private val CART_ITEMS_KEY = "cart_items"
    
    fun getCartItems(): List<CartItem> {
        val json = sharedPreferences.getString(CART_ITEMS_KEY, null) ?: return emptyList()
        val type = object : TypeToken<List<CartItem>>() {}.type
        return gson.fromJson(json, type)
    }
    
    fun addItem(item: CartItem): Boolean {
        val items = getCartItems().toMutableList()
        
        // Check if item already exists with same options
        val existingItemIndex = items.indexOfFirst { 
            it.recipeId == item.recipeId && it.options == item.options 
        }
        
        if (existingItemIndex >= 0) {
            // Update quantity of existing item
            val existingItem = items[existingItemIndex]
            items[existingItemIndex] = existingItem.copy(
                quantity = existingItem.quantity + item.quantity
            )
        } else {
            // Add new item
            items.add(item)
        }
        
        return saveCartItems(items)
    }
    
    // Other cart management methods...
}
```

## 待完成功能 (Pending Features)

### 已完成
- ✅ 用户认证系统
- ✅ 健康档案管理
- ✅ 知识中心基础功能
- ✅ 配方详情页
- ✅ 收藏功能
- ✅ 购物车和结算功能

### 下一步
- 订单历史和详情页面
- 社区互动功能
- 数据分析和健康报告
- 支付集成
- 推送通知
- 离线模式优化

## 下一步计划 (Next Steps)

1. **完善Android应用**
   - ✅ 实现配方详情页
   - 添加社区互动功能
   - 集成订单管理系统

2. **开发iOS应用**
   - 搭建基础架构
   - 实现核心功能

3. **后端服务优化**
   - 完善社区互动服务
   - 实现数据分析服务
   - 集成支付系统

4. **测试与部署**
   - 进行全面测试
   - 准备应用上线 