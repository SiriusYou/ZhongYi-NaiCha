// 中医师详情页面 - Practitioner detail page
const marketplaceUtil = require('../../utils/marketplace.js');
const userUtil = require('../../utils/user.js');

Page({
  /**
   * 页面的初始数据 - Page initial data
   */
  data: {
    loading: true,
    practitionerId: null,
    practitioner: null,
    reviews: [],
    showAppointmentModal: false,
    appointmentDate: '',
    appointmentTime: '',
    appointmentReason: '',
    dateOptions: [],
    timeOptions: [],
    currentTab: 'intro',
    reviewStatistics: {
      average: 0,
      total: 0,
      distribution: [0, 0, 0, 0, 0]
    },
    pagination: {
      page: 1,
      pageSize: 10,
      hasMore: true
    },
    loadingMore: false,
    isLoggedIn: false
  },

  /**
   * 生命周期函数--监听页面加载
   * Lifecycle function--Called when page load
   */
  onLoad: function (options) {
    if (options.id) {
      this.setData({
        practitionerId: options.id
      });
      
      // 加载中医师详情
      this.loadPractitionerDetails();
      
      // 加载评价
      this.loadReviews();
      
      // 检查用户登录状态
      this.checkLoginStatus();
    } else {
      wx.showToast({
        title: '获取中医师信息失败',
        icon: 'none'
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 生命周期函数--监听页面显示
   * Lifecycle function--Called when page show
   */
  onShow: function () {
    // 检查用户登录状态，可能从登录页返回
    this.checkLoginStatus();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   * Page event handler function--Called when user pull down refresh
   */
  onPullDownRefresh: function () {
    this.loadPractitionerDetails();
    this.resetReviewPagination();
    this.loadReviews();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   * Called when page reach bottom
   */
  onReachBottom: function () {
    if (this.data.currentTab === 'reviews' && this.data.pagination.hasMore && !this.data.loadingMore) {
      this.loadMoreReviews();
    }
  },

  /**
   * 检查用户登录状态
   * Check user login status
   */
  checkLoginStatus: function () {
    userUtil.isLoggedIn()
      .then(isLoggedIn => {
        this.setData({ isLoggedIn });
      });
  },

  /**
   * 加载中医师详情
   * Load practitioner details
   */
  loadPractitionerDetails: function () {
    this.setData({ loading: true });
    
    marketplaceUtil.getPractitionerDetails(this.data.practitionerId)
      .then(practitioner => {
        this.setData({
          practitioner,
          loading: false
        });
        
        // 生成可预约日期选项
        this.generateDateOptions();
      })
      .catch(error => {
        console.error('获取中医师详情失败', error);
        wx.showToast({
          title: '获取中医师信息失败，请重试',
          icon: 'none'
        });
        this.setData({ loading: false });
      });
  },

  /**
   * 重置评价分页
   * Reset review pagination
   */
  resetReviewPagination: function () {
    this.setData({
      'pagination.page': 1,
      'pagination.hasMore': true,
      reviews: []
    });
  },

  /**
   * 加载评价
   * Load reviews
   */
  loadReviews: function () {
    marketplaceUtil.getPractitionerReviews(this.data.practitionerId, {
      page: this.data.pagination.page,
      pageSize: this.data.pagination.pageSize
    })
      .then(result => {
        this.setData({
          reviews: result.reviews,
          reviewStatistics: result.statistics,
          'pagination.hasMore': result.hasMore
        });
      })
      .catch(error => {
        console.error('获取评价失败', error);
        wx.showToast({
          title: '获取评价失败，请重试',
          icon: 'none'
        });
      });
  },

  /**
   * 加载更多评价
   * Load more reviews
   */
  loadMoreReviews: function () {
    this.setData({
      loadingMore: true,
      'pagination.page': this.data.pagination.page + 1
    });
    
    marketplaceUtil.getPractitionerReviews(this.data.practitionerId, {
      page: this.data.pagination.page,
      pageSize: this.data.pagination.pageSize
    })
      .then(result => {
        this.setData({
          reviews: [...this.data.reviews, ...result.reviews],
          'pagination.hasMore': result.hasMore,
          loadingMore: false
        });
      })
      .catch(error => {
        console.error('获取更多评价失败', error);
        wx.showToast({
          title: '获取评价失败，请重试',
          icon: 'none'
        });
        this.setData({
          'pagination.page': this.data.pagination.page - 1,
          loadingMore: false
        });
      });
  },

  /**
   * 切换标签页
   * Switch tab
   */
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  /**
   * 显示预约弹窗
   * Show appointment modal
   */
  showAppointmentModal: function () {
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '需要登录',
        content: '预约咨询需要先登录账号',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/index'
            });
          }
        }
      });
      return;
    }
    
    this.setData({
      showAppointmentModal: true
    });
  },

  /**
   * 关闭预约弹窗
   * Hide appointment modal
   */
  hideAppointmentModal: function () {
    this.setData({
      showAppointmentModal: false
    });
  },

  /**
   * 生成可预约日期选项
   * Generate date options
   */
  generateDateOptions: function () {
    const dateOptions = [];
    const now = new Date();
    
    // 生成未来14天的日期选项
    for (let i = 1; i <= 14; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() + i);
      
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
      
      dateOptions.push({
        date: `${year}-${month}-${day}`,
        display: `${month}月${day}日 ${weekday}`
      });
    }
    
    this.setData({ 
      dateOptions,
      appointmentDate: dateOptions[0].date
    });
    
    // 生成该日期可用的时间选项
    this.generateTimeOptions(dateOptions[0].date);
  },

  /**
   * 生成可预约时间选项
   * Generate time options
   */
  generateTimeOptions: function (date) {
    // 这里应该根据中医师的排班和已有预约来生成可用时间
    // 简化处理，假设每天有固定的时间段可以预约
    const timeOptions = [
      { time: '09:00', display: '上午 9:00' },
      { time: '10:00', display: '上午 10:00' },
      { time: '11:00', display: '上午 11:00' },
      { time: '14:00', display: '下午 2:00' },
      { time: '15:00', display: '下午 3:00' },
      { time: '16:00', display: '下午 4:00' }
    ];
    
    this.setData({ 
      timeOptions,
      appointmentTime: timeOptions[0].time
    });
  },

  /**
   * 选择预约日期
   * Select appointment date
   */
  onDateChange: function (e) {
    const index = e.detail.value;
    const date = this.data.dateOptions[index].date;
    
    this.setData({ appointmentDate: date });
    this.generateTimeOptions(date);
  },

  /**
   * 选择预约时间
   * Select appointment time
   */
  onTimeChange: function (e) {
    const index = e.detail.value;
    this.setData({
      appointmentTime: this.data.timeOptions[index].time
    });
  },

  /**
   * 输入预约原因
   * Input appointment reason
   */
  onReasonInput: function (e) {
    this.setData({
      appointmentReason: e.detail.value
    });
  },

  /**
   * 提交预约
   * Submit appointment
   */
  submitAppointment: function () {
    if (!this.data.appointmentReason) {
      wx.showToast({
        title: '请输入预约原因',
        icon: 'none'
      });
      return;
    }
    
    const appointmentData = {
      practitionerId: this.data.practitionerId,
      date: this.data.appointmentDate,
      time: this.data.appointmentTime,
      reason: this.data.appointmentReason
    };
    
    wx.showLoading({
      title: '提交中...',
    });
    
    marketplaceUtil.createAppointment(appointmentData)
      .then(() => {
        wx.hideLoading();
        wx.showToast({
          title: '预约成功',
          icon: 'success'
        });
        this.hideAppointmentModal();
        
        // 跳转到我的预约页面
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/user/appointments'
          });
        }, 1500);
      })
      .catch(error => {
        wx.hideLoading();
        console.error('预约失败', error);
        wx.showToast({
          title: '预约失败，请重试',
          icon: 'none'
        });
      });
  },

  /**
   * 拨打电话
   * Make a phone call
   */
  callPractitioner: function () {
    if (this.data.practitioner && this.data.practitioner.phone) {
      wx.makePhoneCall({
        phoneNumber: this.data.practitioner.phone
      });
    } else {
      wx.showToast({
        title: '暂无电话信息',
        icon: 'none'
      });
    }
  },

  /**
   * 用户点击右上角分享
   * User clicks on the top right corner to share
   */
  onShareAppMessage: function () {
    const practitioner = this.data.practitioner;
    return {
      title: `${practitioner ? practitioner.name + '中医师 - ' + practitioner.title : '专业中医师'}`,
      path: `/pages/marketplace/practitioner-detail?id=${this.data.practitionerId}`,
      imageUrl: practitioner && practitioner.avatarUrl ? practitioner.avatarUrl : '/images/share-practitioner.png'
    };
  }
}); 