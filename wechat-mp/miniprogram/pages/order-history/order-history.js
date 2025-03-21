// order-history.js
const app = getApp();

Page({
  data: {
    isLoading: true,
    loadError: false,
    
    // Orders data
    orders: [],
    hasMore: false,
    currentPage: 1,
    pageSize: 10,
    
    // Filter
    activeTab: 'all', // all, unpaid, processing, completed, cancelled
    
    // Network status
    isNetworkAvailable: true
  },
  
  onLoad: function() {
    // Check network status
    this.checkNetworkStatus();
    
    // Get order history
    this.getOrderHistory();
  },
  
  // On pull down refresh
  onPullDownRefresh: function() {
    this.setData({
      currentPage: 1,
      orders: []
    });
    
    this.getOrderHistory(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  // On reach bottom (pagination)
  onReachBottom: function() {
    if (this.data.hasMore) {
      this.loadMoreOrders();
    }
  },
  
  // Check network status
  checkNetworkStatus: function() {
    wx.getNetworkType({
      success: (res) => {
        const networkType = res.networkType;
        const isNetworkAvailable = networkType !== 'none';
        
        this.setData({
          isNetworkAvailable
        });
        
        if (!isNetworkAvailable) {
          wx.showToast({
            title: '当前处于离线模式，部分功能可能不可用',
            icon: 'none',
            duration: 2000
          });
          
          // Try to get from cache
          const cachedOrders = wx.getStorageSync('order_history');
          if (cachedOrders) {
            this.setData({
              orders: cachedOrders,
              isLoading: false
            });
          } else {
            this.setData({
              loadError: true,
              isLoading: false
            });
          }
        }
      }
    });
  },
  
  // Get order history
  getOrderHistory: function(callback) {
    if (!this.data.isNetworkAvailable) {
      if (callback) callback();
      return;
    }
    
    this.setData({
      isLoading: true,
      loadError: false
    });
    
    // Prepare filter params
    const params = {
      page: this.data.currentPage,
      limit: this.data.pageSize
    };
    
    // Add status filter if not 'all'
    if (this.data.activeTab === 'unpaid') {
      params.paymentStatus = 'pending';
    } else if (this.data.activeTab === 'processing') {
      params.status = ['pending', 'confirmed', 'preparing', 'ready', 'delivering'].join(',');
      params.paymentStatus = 'paid';
    } else if (this.data.activeTab === 'completed') {
      params.status = 'completed';
    } else if (this.data.activeTab === 'cancelled') {
      params.status = 'cancelled';
    }
    
    // Build query string
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/orders/history?${queryString}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const { orders, totalCount } = res.data;
          const hasMore = this.data.currentPage * this.data.pageSize < totalCount;
          
          // If it's the first page, replace orders array
          // Otherwise, append to existing orders
          const updatedOrders = this.data.currentPage === 1 
            ? orders 
            : [...this.data.orders, ...orders];
          
          this.setData({
            orders: updatedOrders,
            hasMore,
            isLoading: false
          });
          
          // Cache order history for offline access
          wx.setStorageSync('order_history', updatedOrders);
        } else {
          this.setData({
            loadError: true,
            isLoading: false
          });
        }
      },
      fail: () => {
        this.setData({
          loadError: true,
          isLoading: false
        });
        
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      },
      complete: () => {
        if (callback) callback();
      }
    });
  },
  
  // Load more orders (pagination)
  loadMoreOrders: function() {
    this.setData({
      currentPage: this.data.currentPage + 1
    });
    
    this.getOrderHistory();
  },
  
  // Change filter tab
  changeTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    
    this.setData({
      activeTab: tab,
      currentPage: 1,
      orders: []
    });
    
    this.getOrderHistory();
  },
  
  // Navigate to order detail
  navigateToOrderDetail: function(e) {
    const orderId = e.currentTarget.dataset.id;
    
    wx.navigateTo({
      url: `/pages/order-detail/order-detail?id=${orderId}`
    });
  },
  
  // Format order status
  formatOrderStatus: function(status) {
    const statusMap = {
      'pending': '待处理',
      'confirmed': '已确认',
      'preparing': '准备中',
      'ready': '待取/配送',
      'delivering': '配送中',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    
    return statusMap[status] || status;
  },
  
  // Format payment status
  formatPaymentStatus: function(status) {
    const statusMap = {
      'pending': '待支付',
      'paid': '已支付',
      'refunded': '已退款',
      'failed': '支付失败'
    };
    
    return statusMap[status] || status;
  },
  
  // Format date
  formatDate: function(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  },
  
  // Format currency
  formatCurrency: function(value) {
    return parseFloat(value).toFixed(2);
  }
}); 