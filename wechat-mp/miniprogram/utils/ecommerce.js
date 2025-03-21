/**
 * 电子商务工具 - E-commerce Utility
 * 管理草药产品库存和电子商务功能
 * Manages herbal product inventory and e-commerce functionality
 */

const app = getApp();

/**
 * 获取产品列表
 * Get product list
 * @param {Object} options - Filter and pagination options
 * @returns {Promise} - Promise resolving to product list
 */
const getProducts = (options = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/products`,
      method: 'GET',
      data: {
        page: options.page || 1,
        limit: options.limit || 20,
        category: options.category || '',
        herbType: options.herbType || '',
        effect: options.effect || '',
        sortBy: options.sortBy || 'popularity',
        minPrice: options.minPrice || 0,
        maxPrice: options.maxPrice || 0,
        inStock: options.inStock !== false
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 缓存结果用于离线访问
          // Cache results for offline access
          wx.setStorageSync('products_list', {
            data: res.data,
            timestamp: Date.now(),
            options: options
          });
          resolve(res.data);
        } else {
          reject(new Error('获取产品列表失败'));
        }
      },
      fail: (err) => {
        console.error('请求产品列表失败', err);
        
        // 尝试从缓存获取
        // Try to get from cache
        const cachedProducts = wx.getStorageSync('products_list');
        if (cachedProducts && cachedProducts.data) {
          resolve({
            ...cachedProducts.data,
            fromCache: true
          });
        } else {
          reject(err);
        }
      }
    });
  });
};

/**
 * 获取产品详情
 * Get product details
 * @param {string} productId - Product ID
 * @returns {Promise} - Promise resolving to product details
 */
const getProductDetails = (productId) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/products/${productId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          // 缓存单个产品信息
          // Cache individual product info
          const cachedProducts = wx.getStorageSync('products_details') || {};
          cachedProducts[productId] = {
            data: res.data,
            timestamp: Date.now()
          };
          wx.setStorageSync('products_details', cachedProducts);
          
          resolve(res.data);
        } else {
          reject(new Error('获取产品详情失败'));
        }
      },
      fail: (err) => {
        console.error('请求产品详情失败', err);
        
        // 尝试从缓存获取
        // Try to get from cache
        const cachedProducts = wx.getStorageSync('products_details') || {};
        if (cachedProducts[productId] && cachedProducts[productId].data) {
          resolve({
            ...cachedProducts[productId].data,
            fromCache: true
          });
        } else {
          reject(err);
        }
      }
    });
  });
};

/**
 * 获取购物车
 * Get shopping cart
 * @returns {Promise} - Promise resolving to shopping cart
 */
const getCart = () => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      // 未登录时使用本地购物车
      // Use local cart when not logged in
      const localCart = wx.getStorageSync('local_cart') || { items: [], total: 0 };
      resolve(localCart);
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/cart`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 更新本地购物车
          // Update local cart
          wx.setStorageSync('local_cart', res.data);
          resolve(res.data);
        } else {
          reject(new Error('获取购物车失败'));
        }
      },
      fail: (err) => {
        console.error('请求购物车失败', err);
        
        // 使用本地购物车
        // Use local cart
        const localCart = wx.getStorageSync('local_cart') || { items: [], total: 0 };
        resolve(localCart);
      }
    });
  });
};

/**
 * 添加商品到购物车
 * Add product to cart
 * @param {string} productId - Product ID
 * @param {number} quantity - Quantity to add
 * @param {Object} specs - Optional product specifications
 * @returns {Promise} - Promise resolving to updated cart
 */
const addToCart = (productId, quantity = 1, specs = {}) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      // 未登录时添加到本地购物车
      // Add to local cart when not logged in
      const localCart = wx.getStorageSync('local_cart') || { items: [], total: 0 };
      
      // 查找是否已存在相同商品
      // Check if same product already exists
      const existingItemIndex = localCart.items.findIndex(item => 
        item.productId === productId && 
        JSON.stringify(item.specs) === JSON.stringify(specs)
      );
      
      if (existingItemIndex !== -1) {
        // 更新数量
        // Update quantity
        localCart.items[existingItemIndex].quantity += quantity;
      } else {
        // 添加新项目
        // Add new item
        localCart.items.push({
          productId,
          quantity,
          specs,
          addTime: Date.now()
        });
      }
      
      // 更新本地购物车
      // Update local cart
      wx.setStorageSync('local_cart', localCart);
      resolve(localCart);
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/cart/items`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        productId,
        quantity,
        specs
      },
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          // 更新本地购物车
          // Update local cart
          wx.setStorageSync('local_cart', res.data);
          resolve(res.data);
        } else {
          reject(new Error('添加到购物车失败'));
        }
      },
      fail: (err) => {
        console.error('添加到购物车请求失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 更新购物车项目
 * Update cart item
 * @param {string} itemId - Cart item ID
 * @param {number} quantity - New quantity
 * @returns {Promise} - Promise resolving to updated cart
 */
const updateCartItem = (itemId, quantity) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      // 未登录时更新本地购物车
      // Update local cart when not logged in
      const localCart = wx.getStorageSync('local_cart') || { items: [], total: 0 };
      
      const existingItemIndex = localCart.items.findIndex(item => item.id === itemId);
      
      if (existingItemIndex !== -1) {
        if (quantity <= 0) {
          // 删除项目
          // Remove item
          localCart.items.splice(existingItemIndex, 1);
        } else {
          // 更新数量
          // Update quantity
          localCart.items[existingItemIndex].quantity = quantity;
        }
        
        // 更新本地购物车
        // Update local cart
        wx.setStorageSync('local_cart', localCart);
        resolve(localCart);
      } else {
        reject(new Error('购物车中不存在该商品'));
      }
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/cart/items/${itemId}`,
      method: 'PUT',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        quantity
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 更新本地购物车
          // Update local cart
          wx.setStorageSync('local_cart', res.data);
          resolve(res.data);
        } else {
          reject(new Error('更新购物车失败'));
        }
      },
      fail: (err) => {
        console.error('更新购物车请求失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 创建订单
 * Create order
 * @param {Object} orderData - Order data
 * @returns {Promise} - Promise resolving to created order
 */
const createOrder = (orderData) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/orders`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: orderData,
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(res.data);
        } else {
          reject(new Error('创建订单失败'));
        }
      },
      fail: (err) => {
        console.error('创建订单请求失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取订单列表
 * Get order list
 * @param {string} status - Optional status filter
 * @returns {Promise} - Promise resolving to order list
 */
const getOrders = (status) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/orders`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        status: status || ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('获取订单列表失败'));
        }
      },
      fail: (err) => {
        console.error('请求订单列表失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取订单详情
 * Get order details
 * @param {string} orderId - Order ID
 * @returns {Promise} - Promise resolving to order details
 */
const getOrderDetails = (orderId) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/orders/${orderId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('获取订单详情失败'));
        }
      },
      fail: (err) => {
        console.error('请求订单详情失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 检查库存
 * Check inventory
 * @param {string} productId - Product ID
 * @param {number} quantity - Quantity to check
 * @returns {Promise} - Promise resolving to inventory status
 */
const checkInventory = (productId, quantity = 1) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/products/${productId}/inventory`,
      method: 'GET',
      data: {
        quantity
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('检查库存失败'));
        }
      },
      fail: (err) => {
        console.error('检查库存请求失败', err);
        reject(err);
      }
    });
  });
};

/**
 * 获取支付参数，跳转到微信支付
 * Get payment parameters, redirect to WeChat Pay
 * @param {string} orderId - Order ID
 * @returns {Promise} - Promise resolving to payment result
 */
const initiatePayment = (orderId) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('auth_token');
    
    if (!token) {
      reject(new Error('请先登录'));
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/api/payments/wechat`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        orderId
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.paymentParams) {
          // 调用微信支付API
          // Call WeChat Pay API
          wx.requestPayment({
            ...res.data.paymentParams,
            success: (payRes) => {
              resolve(payRes);
            },
            fail: (payErr) => {
              console.error('支付失败', payErr);
              reject(payErr);
            }
          });
        } else {
          reject(new Error('获取支付参数失败'));
        }
      },
      fail: (err) => {
        console.error('请求支付参数失败', err);
        reject(err);
      }
    });
  });
};

module.exports = {
  getProducts,
  getProductDetails,
  getCart,
  addToCart,
  updateCartItem,
  createOrder,
  getOrders,
  getOrderDetails,
  checkInventory,
  initiatePayment
}; 