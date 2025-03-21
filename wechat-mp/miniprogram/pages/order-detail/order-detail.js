// order-detail.js
const app = getApp();

Page({
  data: {
    isLoading: true,
    loadError: false,
    
    // Order data
    orderId: '',
    order: null,
    
    // Network status
    isNetworkAvailable: true
  },
  
  onLoad: function(options) {
    // Check network status
    this.checkNetworkStatus();
    
    if (options.id) {
      this.setData({
        orderId: options.id
      });
      
      // Get order details
      this.getOrderDetails();
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
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
        }
      }
    });
  },
  
  // Get order details
  getOrderDetails: function() {
    if (!this.data.isNetworkAvailable) {
      // Try to get from storage
      const cachedOrder = wx.getStorageSync('order_' + this.data.orderId);
      
      if (cachedOrder) {
        this.setData({
          order: cachedOrder,
          isLoading: false
        });
      } else {
        this.setData({
          loadError: true,
          isLoading: false
        });
        
        wx.showToast({
          title: '离线模式无法加载订单',
          icon: 'none'
        });
      }
      
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/orders/${this.data.orderId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const order = res.data;
          
          this.setData({
            order,
            isLoading: false
          });
          
          // Cache order data
          wx.setStorageSync('order_' + this.data.orderId, order);
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
      }
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
  
  // Continue payment if not paid
  continuePayment: function() {
    if (this.data.order && this.data.order.paymentStatus === 'pending') {
      this.initiatePayment(this.data.orderId, this.data.order.total);
    }
  },
  
  // Initiate WeChat Pay
  initiatePayment: function(orderId, amount) {
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '离线模式无法支付',
        icon: 'none'
      });
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/payments/wx-pay`,
      method: 'POST',
      data: {
        orderId,
        amount
      },
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const paymentData = res.data;
          
          // Call WeChat Pay
          wx.requestPayment({
            timeStamp: paymentData.timeStamp,
            nonceStr: paymentData.nonceStr,
            package: paymentData.package,
            signType: paymentData.signType,
            paySign: paymentData.paySign,
            success: (result) => {
              // Update order payment status
              this.updatePaymentStatus(orderId, 'paid');
              
              // Refresh order details
              setTimeout(() => {
                this.getOrderDetails();
              }, 1000);
            },
            fail: (error) => {
              if (error.errMsg === 'requestPayment:fail cancel') {
                wx.showToast({
                  title: '支付已取消',
                  icon: 'none'
                });
              } else {
                wx.showToast({
                  title: '支付失败',
                  icon: 'none'
                });
              }
            }
          });
        } else {
          wx.showToast({
            title: res.data.message || '支付初始化失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },
  
  // Update payment status after WeChat Pay
  updatePaymentStatus: function(orderId, status) {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/orders/${orderId}/payment-status`,
      method: 'PUT',
      data: {
        status
      },
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      }
    });
  },
  
  // Cancel order
  cancelOrder: function() {
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '离线模式无法取消订单',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认取消',
      content: '确定要取消此订单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: `${app.globalData.apiBaseUrl}/orders/${this.data.orderId}/cancel`,
            method: 'PUT',
            header: {
              'Authorization': `Bearer ${wx.getStorageSync('token')}`
            },
            success: (result) => {
              if (result.statusCode === 200) {
                wx.showToast({
                  title: '订单已取消',
                  icon: 'success'
                });
                
                // Refresh order details
                setTimeout(() => {
                  this.getOrderDetails();
                }, 1000);
              } else {
                wx.showToast({
                  title: result.data.message || '取消失败',
                  icon: 'none'
                });
              }
            },
            fail: () => {
              wx.showToast({
                title: '网络请求失败',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },
  
  // Navigate to continue shopping
  navigateToShopping: function() {
    wx.switchTab({
      url: '/pages/tea/tea'
    });
  },
  
  // Share order
  onShareAppMessage: function() {
    if (this.data.order) {
      return {
        title: `我在中医奶茶下了一个订单，赶快来看看吧！`,
        path: '/pages/index/index'
      };
    }
    
    return {
      title: '中医奶茶养生',
      path: '/pages/index/index'
    };
  },
  
  // Format currency
  formatCurrency: function(value) {
    return parseFloat(value).toFixed(2);
  }
}); 