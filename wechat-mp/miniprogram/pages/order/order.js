// order.js
const app = getApp();

Page({
  data: {
    isLoading: true,
    loadError: false,
    
    // Order type selection
    orderType: 'delivery', // 'delivery' or 'pickup'
    
    // User information
    userInfo: null,
    address: null,
    
    // Cart items
    cartItems: [],
    
    // Shop selection for pickup
    shops: [],
    selectedShopId: '',
    
    // Payment information
    subtotal: 0,
    deliveryFee: 0,
    discount: 0,
    total: 0,
    
    // Coupon
    couponCode: '',
    appliedCoupon: null,
    showCouponInput: false,
    
    // Order notes
    orderNotes: '',
    
    // Order status
    orderCreated: false,
    orderId: '',
    orderStatus: '',
    paymentStatus: '',
    
    // Network status
    isNetworkAvailable: true
  },
  
  onLoad: function() {
    // Check network status
    this.checkNetworkStatus();
    
    // Get user info
    this.getUserInfo();
    
    // Get user address
    this.getUserAddress();
    
    // Get cart items
    this.getCartItems();
    
    // Get shop list for pickup options
    this.getShopList();
  },
  
  onShow: function() {
    // Refresh cart items when returning to this page
    this.getCartItems();
    
    // Check if coming back from address selection
    const pages = getCurrentPages();
    const currPage = pages[pages.length - 1];
    if (currPage.data.selectedAddress) {
      this.setData({
        address: currPage.data.selectedAddress
      });
      delete currPage.data.selectedAddress;
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
  
  // Get user information
  getUserInfo: function() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo
      });
    } else {
      wx.navigateTo({
        url: '/pages/auth/auth'
      });
    }
  },
  
  // Get user address
  getUserAddress: function() {
    // First try to get from storage
    const defaultAddress = wx.getStorageSync('defaultAddress');
    if (defaultAddress) {
      this.setData({
        address: defaultAddress
      });
      return;
    }
    
    // If no address in storage and online, try to fetch from server
    if (this.data.isNetworkAvailable) {
      wx.request({
        url: `${app.globalData.apiBaseUrl}/user/addresses/default`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data) {
            const address = res.data;
            
            this.setData({
              address
            });
            
            // Save to storage
            wx.setStorageSync('defaultAddress', address);
          }
        },
        complete: () => {
          this.setData({
            isLoading: false
          });
        }
      });
    } else {
      this.setData({
        isLoading: false
      });
    }
  },
  
  // Get cart items
  getCartItems: function() {
    // Get cart items from storage
    const cartItems = wx.getStorageSync('cartItems') || [];
    
    // Calculate prices
    let subtotal = 0;
    cartItems.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    
    // Calculate delivery fee based on subtotal
    const deliveryFee = this.calculateDeliveryFee(subtotal);
    
    // Calculate total
    const total = subtotal + deliveryFee - this.data.discount;
    
    this.setData({
      cartItems,
      subtotal,
      deliveryFee,
      total,
      isLoading: false
    });
  },
  
  // Calculate delivery fee based on order subtotal
  calculateDeliveryFee: function(subtotal) {
    if (this.data.orderType === 'pickup') {
      return 0;
    }
    
    // Free delivery for orders over 100 yuan
    if (subtotal >= 100) {
      return 0;
    }
    
    // Otherwise 10 yuan delivery fee
    return 10;
  },
  
  // Get shop list for pickup
  getShopList: function() {
    if (!this.data.isNetworkAvailable) {
      // Try to get from storage
      const shops = wx.getStorageSync('shops');
      
      if (shops && shops.length > 0) {
        this.setData({
          shops,
          selectedShopId: shops[0].id
        });
      }
      
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/shops`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const shops = res.data;
          
          this.setData({
            shops,
            selectedShopId: shops.length > 0 ? shops[0].id : ''
          });
          
          // Save to storage
          wx.setStorageSync('shops', shops);
        }
      }
    });
  },
  
  // Switch order type
  switchOrderType: function(e) {
    const type = e.currentTarget.dataset.type;
    
    this.setData({
      orderType: type
    });
    
    // Recalculate delivery fee
    const deliveryFee = this.calculateDeliveryFee(this.data.subtotal);
    const total = this.data.subtotal + deliveryFee - this.data.discount;
    
    this.setData({
      deliveryFee,
      total
    });
  },
  
  // Navigate to address selection
  navigateToAddress: function() {
    wx.navigateTo({
      url: '/pages/address/address-list'
    });
  },
  
  // Select shop for pickup
  selectShop: function(e) {
    const shopId = e.detail.value;
    
    this.setData({
      selectedShopId: shopId
    });
  },
  
  // Update item quantity in cart
  updateItemQuantity: function(e) {
    const { index, action } = e.currentTarget.dataset;
    const cartItems = [...this.data.cartItems];
    
    if (action === 'increase') {
      cartItems[index].quantity += 1;
    } else if (action === 'decrease') {
      if (cartItems[index].quantity > 1) {
        cartItems[index].quantity -= 1;
      } else {
        cartItems.splice(index, 1);
      }
    }
    
    // Update storage
    wx.setStorageSync('cartItems', cartItems);
    
    // Recalculate prices
    let subtotal = 0;
    cartItems.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    
    const deliveryFee = this.calculateDeliveryFee(subtotal);
    const total = subtotal + deliveryFee - this.data.discount;
    
    this.setData({
      cartItems,
      subtotal,
      deliveryFee,
      total
    });
  },
  
  // Remove item from cart
  removeItem: function(e) {
    const { index } = e.currentTarget.dataset;
    const cartItems = [...this.data.cartItems];
    
    cartItems.splice(index, 1);
    
    // Update storage
    wx.setStorageSync('cartItems', cartItems);
    
    // Recalculate prices
    let subtotal = 0;
    cartItems.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    
    const deliveryFee = this.calculateDeliveryFee(subtotal);
    const total = subtotal + deliveryFee - this.data.discount;
    
    this.setData({
      cartItems,
      subtotal,
      deliveryFee,
      total
    });
  },
  
  // Toggle coupon input
  toggleCouponInput: function() {
    this.setData({
      showCouponInput: !this.data.showCouponInput
    });
  },
  
  // Handle coupon code input
  onCouponInput: function(e) {
    this.setData({
      couponCode: e.detail.value
    });
  },
  
  // Apply coupon
  applyCoupon: function() {
    if (!this.data.couponCode) {
      wx.showToast({
        title: '请输入优惠码',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '离线模式无法使用优惠券',
        icon: 'none'
      });
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/coupons/validate`,
      method: 'POST',
      data: {
        code: this.data.couponCode,
        subtotal: this.data.subtotal
      },
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const coupon = res.data;
          const discount = coupon.type === 'percentage' 
            ? (this.data.subtotal * coupon.value / 100) 
            : coupon.value;
          
          const total = this.data.subtotal + this.data.deliveryFee - discount;
          
          this.setData({
            appliedCoupon: coupon,
            discount,
            total,
            showCouponInput: false
          });
          
          wx.showToast({
            title: '优惠券应用成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.data.message || '无效的优惠码',
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
  
  // Remove applied coupon
  removeCoupon: function() {
    this.setData({
      appliedCoupon: null,
      couponCode: '',
      discount: 0,
      total: this.data.subtotal + this.data.deliveryFee
    });
  },
  
  // Handle order notes input
  onNotesInput: function(e) {
    this.setData({
      orderNotes: e.detail.value
    });
  },
  
  // Validate order before submission
  validateOrder: function() {
    if (this.data.cartItems.length === 0) {
      wx.showToast({
        title: '购物车为空',
        icon: 'none'
      });
      return false;
    }
    
    if (this.data.orderType === 'delivery' && !this.data.address) {
      wx.showToast({
        title: '请选择配送地址',
        icon: 'none'
      });
      return false;
    }
    
    if (this.data.orderType === 'pickup' && !this.data.selectedShopId) {
      wx.showToast({
        title: '请选择自取门店',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },
  
  // Create order
  createOrder: function() {
    if (!this.validateOrder()) {
      return;
    }
    
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '离线模式无法创建订单',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    // Prepare order data
    const orderData = {
      orderType: this.data.orderType,
      items: this.data.cartItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price
      })),
      subtotal: this.data.subtotal,
      deliveryFee: this.data.deliveryFee,
      discount: this.data.discount,
      total: this.data.total,
      notes: this.data.orderNotes,
      coupon: this.data.appliedCoupon ? this.data.appliedCoupon.code : null
    };
    
    // Add address or shop information
    if (this.data.orderType === 'delivery') {
      orderData.address = this.data.address;
    } else {
      orderData.shopId = this.data.selectedShopId;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/orders`,
      method: 'POST',
      data: orderData,
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 201) {
          const order = res.data;
          
          this.setData({
            orderCreated: true,
            orderId: order.id,
            orderStatus: order.status,
            paymentStatus: order.paymentStatus,
            isLoading: false
          });
          
          // Clear cart after successful order
          wx.setStorageSync('cartItems', []);
          
          // Proceed to payment
          this.initiatePayment(order.id, this.data.total);
        } else {
          wx.showToast({
            title: res.data.message || '订单创建失败',
            icon: 'none'
          });
          
          this.setData({
            isLoading: false
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        
        this.setData({
          isLoading: false
        });
      }
    });
  },
  
  // Initiate WeChat Pay
  initiatePayment: function(orderId, amount) {
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
              
              // Navigate to order detail
              wx.redirectTo({
                url: `/pages/order-detail/order-detail?id=${orderId}`
              });
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
              
              // Navigate to order detail
              wx.redirectTo({
                url: `/pages/order-detail/order-detail?id=${orderId}`
              });
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
  
  // Navigate to tea selection page
  navigateToTea: function() {
    wx.switchTab({
      url: '/pages/tea/tea'
    });
  },
  
  // Navigate to order history
  navigateToOrderHistory: function() {
    wx.navigateTo({
      url: '/pages/order-history/order-history'
    });
  }
}); 