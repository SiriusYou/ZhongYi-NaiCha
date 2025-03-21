// 中医师市场页面 - Herbalist marketplace page
const marketplaceUtil = require('../../utils/marketplace.js');

Page({
  /**
   * 页面的初始数据 - Page initial data
   */
  data: {
    loading: true,
    practitioners: [],
    filters: {
      specialties: [],
      rating: 0,
      distance: 0
    },
    selectedSpecialties: [],
    showFilterPanel: false,
    searchValue: '',
    location: null,
    pagination: {
      page: 1,
      pageSize: 10,
      hasMore: true
    },
    specialtyOptions: [
      { id: 'general', name: '综合调理' },
      { id: 'acupuncture', name: '针灸' },
      { id: 'tuina', name: '推拿按摩' },
      { id: 'herbs', name: '草药配方' },
      { id: 'nutrition', name: '营养指导' },
      { id: 'cupping', name: '拔罐' },
      { id: 'pediatric', name: '儿科' },
      { id: 'gynecology', name: '妇科' },
      { id: 'dermatology', name: '皮肤科' },
      { id: 'chronic', name: '慢性病管理' }
    ],
    distanceOptions: [
      { value: 0, label: '不限' },
      { value: 1000, label: '1千米' },
      { value: 3000, label: '3千米' },
      { value: 5000, label: '5千米' },
      { value: 10000, label: '10千米' }
    ],
    ratingOptions: [
      { value: 0, label: '不限' },
      { value: 3, label: '3星及以上' },
      { value: 4, label: '4星及以上' },
      { value: 4.5, label: '4.5星及以上' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   * Lifecycle function--Called when page load
   */
  onLoad: function (options) {
    // 获取用户位置 - Get user location
    this.getUserLocation();
    
    // 加载专业人士列表 - Load practitioners
    this.loadPractitioners();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   * Page event handler function--Called when user pull down refresh
   */
  onPullDownRefresh: function () {
    this.resetPagination();
    this.loadPractitioners();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   * Called when page reach bottom
   */
  onReachBottom: function () {
    if (this.data.pagination.hasMore && !this.data.loading) {
      this.loadMorePractitioners();
    }
  },

  /**
   * 获取用户位置
   * Get user location
   */
  getUserLocation: function () {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const location = {
          latitude: res.latitude,
          longitude: res.longitude
        };
        this.setData({ location });
        this.loadPractitioners();
      },
      fail: (err) => {
        console.error('获取位置失败', err);
        // 位置获取失败时仍然加载数据，但不会有距离排序
        // Still load data even if location fails, but won't have distance sorting
        this.loadPractitioners();
      }
    });
  },

  /**
   * 重置分页
   * Reset pagination
   */
  resetPagination: function () {
    this.setData({
      'pagination.page': 1,
      'pagination.hasMore': true,
      practitioners: []
    });
  },

  /**
   * 加载专业人士列表
   * Load practitioners
   */
  loadPractitioners: function () {
    this.setData({ loading: true });
    
    const params = {
      page: this.data.pagination.page,
      pageSize: this.data.pagination.pageSize,
      specialties: this.data.selectedSpecialties,
      rating: this.data.filters.rating,
      distance: this.data.filters.distance,
      location: this.data.location,
      search: this.data.searchValue
    };
    
    marketplaceUtil.getPractitioners(params)
      .then(result => {
        this.setData({
          practitioners: result.practitioners,
          'pagination.hasMore': result.hasMore,
          loading: false
        });
      })
      .catch(error => {
        console.error('加载专业人士失败', error);
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
        this.setData({ loading: false });
      });
  },

  /**
   * 加载更多专业人士
   * Load more practitioners
   */
  loadMorePractitioners: function () {
    if (this.data.loading) return;
    
    this.setData({
      loading: true,
      'pagination.page': this.data.pagination.page + 1
    });
    
    const params = {
      page: this.data.pagination.page,
      pageSize: this.data.pagination.pageSize,
      specialties: this.data.selectedSpecialties,
      rating: this.data.filters.rating,
      distance: this.data.filters.distance,
      location: this.data.location,
      search: this.data.searchValue
    };
    
    marketplaceUtil.getPractitioners(params)
      .then(result => {
        this.setData({
          practitioners: [...this.data.practitioners, ...result.practitioners],
          'pagination.hasMore': result.hasMore,
          loading: false
        });
      })
      .catch(error => {
        console.error('加载更多专业人士失败', error);
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
        this.setData({
          'pagination.page': this.data.pagination.page - 1,
          loading: false
        });
      });
  },

  /**
   * 切换筛选面板
   * Toggle filter panel
   */
  toggleFilterPanel: function () {
    this.setData({
      showFilterPanel: !this.data.showFilterPanel
    });
  },

  /**
   * 切换专业选择
   * Toggle specialty selection
   */
  toggleSpecialty: function (e) {
    const specialtyId = e.currentTarget.dataset.id;
    let selectedSpecialties = [...this.data.selectedSpecialties];
    
    if (selectedSpecialties.includes(specialtyId)) {
      selectedSpecialties = selectedSpecialties.filter(id => id !== specialtyId);
    } else {
      selectedSpecialties.push(specialtyId);
    }
    
    this.setData({ selectedSpecialties });
  },

  /**
   * 设置评分筛选
   * Set rating filter
   */
  setRatingFilter: function (e) {
    this.setData({
      'filters.rating': parseFloat(e.currentTarget.dataset.value)
    });
  },

  /**
   * 设置距离筛选
   * Set distance filter
   */
  setDistanceFilter: function (e) {
    this.setData({
      'filters.distance': parseInt(e.currentTarget.dataset.value)
    });
  },

  /**
   * 应用筛选
   * Apply filters
   */
  applyFilters: function () {
    this.resetPagination();
    this.loadPractitioners();
    this.toggleFilterPanel();
  },

  /**
   * 重置筛选
   * Reset filters
   */
  resetFilters: function () {
    this.setData({
      selectedSpecialties: [],
      'filters.rating': 0,
      'filters.distance': 0
    });
  },

  /**
   * 搜索输入变化
   * Search input change
   */
  onSearchInput: function (e) {
    this.setData({
      searchValue: e.detail.value
    });
  },

  /**
   * 确认搜索
   * Confirm search
   */
  confirmSearch: function () {
    this.resetPagination();
    this.loadPractitioners();
  },

  /**
   * 清除搜索
   * Clear search
   */
  clearSearch: function () {
    this.setData({ searchValue: '' });
    this.resetPagination();
    this.loadPractitioners();
  },

  /**
   * 查看专业人士详情
   * View practitioner details
   */
  viewPractitionerDetails: function (e) {
    const practitionerId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/marketplace/practitioner-detail?id=${practitionerId}`
    });
  },

  /**
   * 用户点击右上角分享
   * User clicks on the top right corner to share
   */
  onShareAppMessage: function () {
    return {
      title: '找寻专业中医师',
      path: '/pages/marketplace/index',
      imageUrl: '/images/share-marketplace.png'
    };
  }
}); 