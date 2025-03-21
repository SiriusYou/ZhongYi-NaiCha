const communityUtil = require('../../utils/community');

Page({
  data: {
    title: '',
    content: '',
    category: 'general',
    tags: [],
    images: [],
    isPublic: true,
    categories: [],
    submitting: false,
    locationEnabled: false,
    location: null,
    showLocationModal: false,
    maxImageCount: 9
  },

  onLoad: function (options) {
    this.loadCategories();
  },

  loadCategories: function () {
    // You can load these from API or define locally
    this.setData({
      categories: [
        { id: 'general', name: '综合讨论' },
        { id: 'health', name: '健康分享' },
        { id: 'tea', name: '茶文化' },
        { id: 'herbs', name: '中草药' },
        { id: 'recipes', name: '食疗方' }
      ]
    });
  },

  onTitleInput: function (e) {
    this.setData({ title: e.detail.value });
  },

  onContentInput: function (e) {
    this.setData({ content: e.detail.value });
  },

  onCategoryChange: function (e) {
    this.setData({ category: e.detail.value });
  },

  onTagsInput: function (e) {
    const tagsStr = e.detail.value;
    if (!tagsStr) {
      this.setData({ tags: [] });
      return;
    }
    
    // Split by commas or spaces and filter out empty tags
    const tags = tagsStr
      .split(/[,，\s]+/)
      .map(tag => tag.trim())
      .filter(tag => tag !== '');
    
    this.setData({ tags });
  },

  onPublicChange: function (e) {
    this.setData({ isPublic: e.detail.value });
  },

  onLocationChange: function (e) {
    this.setData({
      locationEnabled: e.detail.value,
      showLocationModal: e.detail.value
    });
    
    if (e.detail.value) {
      this.getLocation();
    } else {
      this.setData({ location: null });
    }
  },

  getLocation: function () {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          location: {
            latitude: res.latitude,
            longitude: res.longitude,
            name: '当前位置'
          }
        });
        
        this.getLocationName(res.latitude, res.longitude);
      },
      fail: (err) => {
        console.error('获取位置失败', err);
        this.setData({
          locationEnabled: false,
          showLocationModal: false
        });
        wx.showToast({
          title: '获取位置失败，请检查授权',
          icon: 'none'
        });
      }
    });
  },

  getLocationName: function (latitude, longitude) {
    // 如果有腾讯地图或百度地图SDK，可以调用它们的逆地理编码接口
    // If you have Tencent Maps or Baidu Maps SDK, you can call their reverse geocoding API
    console.log('获取位置名称，需要SDK支持', latitude, longitude);
  },

  chooseImage: function () {
    const { images, maxImageCount } = this.data;
    const count = maxImageCount - images.length;
    
    if (count <= 0) {
      wx.showToast({
        title: `最多只能上传${maxImageCount}张图片`,
        icon: 'none'
      });
      return;
    }
    
    wx.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          images: [...images, ...res.tempFilePaths]
        });
      }
    });
  },

  removeImage: function (e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    this.setData({ images });
  },

  previewImage: function (e) {
    const index = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images
    });
  },

  validateForm: function () {
    const { title, content } = this.data;
    
    if (!title.trim()) {
      wx.showToast({
        title: '请输入标题',
        icon: 'none'
      });
      return false;
    }
    
    if (!content.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  submitPost: function () {
    if (!this.validateForm()) return;
    if (this.data.submitting) return;
    
    this.setData({ submitting: true });
    
    const { title, content, category, tags, images, isPublic, location } = this.data;
    
    communityUtil.createPost({
      title,
      content,
      category,
      tags,
      images,
      isPublic,
      location: locationEnabled ? location : null
    })
      .then(res => {
        this.setData({ submitting: false });
        
        wx.showToast({
          title: '发布成功',
          icon: 'success'
        });
        
        // 延迟返回，让用户看到提示
        // Delay return to show the success message
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .catch(err => {
        console.error('发布帖子失败', err);
        this.setData({ submitting: false });
        
        wx.showToast({
          title: '发布失败，请重试',
          icon: 'none'
        });
      });
  },

  cancelPost: function () {
    wx.navigateBack();
  }
}); 