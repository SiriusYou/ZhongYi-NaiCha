const recommendationsUtil = require('../../utils/recommendations.js');
const userProfileUtil = require('../../utils/userProfile.js');

Page({
  /**
   * 页面的初始数据 - Page initial data
   */
  data: {
    loading: true,
    teaRecommendations: [],
    wellnessAdvice: null,
    seasonalTips: [],
    userProfile: null,
    selectedSymptoms: [],
    showSymptomSelector: false,
    symptoms: [
      { id: 'headache', name: '头痛' },
      { id: 'insomnia', name: '失眠' },
      { id: 'fatigue', name: '疲劳' },
      { id: 'digestive', name: '消化不良' },
      { id: 'cold', name: '感冒' },
      { id: 'cough', name: '咳嗽' },
      { id: 'stress', name: '压力大' },
      { id: 'allergy', name: '过敏' },
      { id: 'skinissue', name: '皮肤问题' },
      { id: 'jointpain', name: '关节疼痛' }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   * Lifecycle function--Called when page load
   */
  onLoad: function (options) {
    this.loadUserProfile();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   * Page event handler function--Called when user pull down refresh
   */
  onPullDownRefresh: function () {
    this.loadRecommendations();
    this.loadWellnessAdvice();
    this.loadSeasonalTips();
    wx.stopPullDownRefresh();
  },

  /**
   * 加载用户档案 - Load user profile
   */
  loadUserProfile: function () {
    this.setData({ loading: true });
    
    userProfileUtil.getUserProfile()
      .then(profile => {
        this.setData({ 
          userProfile: profile,
          loading: false
        });
        
        // 加载所有推荐内容 - Load all recommendation content
        this.loadRecommendations();
        this.loadWellnessAdvice();
        this.loadSeasonalTips();
      })
      .catch(error => {
        console.error('Failed to load user profile:', error);
        wx.showToast({
          title: '加载用户档案失败',
          icon: 'none'
        });
        this.setData({ loading: false });
      });
  },

  /**
   * 加载茶饮推荐 - Load tea recommendations
   */
  loadRecommendations: function () {
    this.setData({ loading: true });
    
    recommendationsUtil.getTeaRecommendations({
      symptoms: this.data.selectedSymptoms,
      limit: 5
    })
      .then(recommendations => {
        this.setData({ 
          teaRecommendations: recommendations,
          loading: false
        });
      })
      .catch(error => {
        console.error('Failed to load tea recommendations:', error);
        wx.showToast({
          title: '加载推荐失败',
          icon: 'none'
        });
        this.setData({ 
          teaRecommendations: [],
          loading: false
        });
      });
  },

  /**
   * 加载养生建议 - Load wellness advice
   */
  loadWellnessAdvice: function () {
    recommendationsUtil.getWellnessAdvice()
      .then(advice => {
        this.setData({ wellnessAdvice: advice });
      })
      .catch(error => {
        console.error('Failed to load wellness advice:', error);
        wx.showToast({
          title: '加载养生建议失败',
          icon: 'none'
        });
      });
  },

  /**
   * 加载季节健康提示 - Load seasonal health tips
   */
  loadSeasonalTips: function () {
    recommendationsUtil.getSeasonalTips()
      .then(tips => {
        this.setData({ seasonalTips: tips });
      })
      .catch(error => {
        console.error('Failed to load seasonal tips:', error);
        wx.showToast({
          title: '加载季节提示失败',
          icon: 'none'
        });
      });
  },

  /**
   * 切换症状选择器 - Toggle symptom selector
   */
  toggleSymptomSelector: function () {
    this.setData({
      showSymptomSelector: !this.data.showSymptomSelector
    });
  },

  /**
   * 症状选择变化 - Symptom selection change
   */
  onSymptomChange: function (e) {
    const symptomId = e.currentTarget.dataset.symptom;
    let selectedSymptoms = [...this.data.selectedSymptoms];
    
    if (selectedSymptoms.includes(symptomId)) {
      // 如果已选中，则移除 - If already selected, remove it
      selectedSymptoms = selectedSymptoms.filter(id => id !== symptomId);
    } else {
      // 如果未选中，则添加 - If not selected, add it
      selectedSymptoms.push(symptomId);
    }
    
    this.setData({ selectedSymptoms });
    
    // 重新加载推荐 - Reload recommendations
    this.loadRecommendations();
  },

  /**
   * 点击茶饮 - Tea tap handler
   */
  onTeaTap: function (e) {
    const index = e.currentTarget.dataset.index;
    const tea = this.data.teaRecommendations[index];
    
    wx.navigateTo({
      url: `/pages/tea-detail/index?id=${tea.id}`
    });
  },

  /**
   * 提交反馈 - Submit feedback
   */
  submitFeedback: function (e) {
    const { itemId, feedbackType } = e.currentTarget.dataset;
    
    recommendationsUtil.submitFeedback({
      itemId,
      feedbackType,
      comments: ''  // 可以添加评论 - Can add comments
    })
      .then(() => {
        wx.showToast({
          title: '感谢您的反馈',
          icon: 'success'
        });
      })
      .catch(error => {
        console.error('Failed to submit feedback:', error);
        wx.showToast({
          title: '提交反馈失败',
          icon: 'none'
        });
      });
  },

  /**
   * 用户点击右上角分享
   * User clicks on the top right corner to share
   */
  onShareAppMessage: function () {
    return {
      title: '中医养生个性化推荐',
      path: '/pages/recommendations/index',
      imageUrl: '/images/share-recommendations.png'
    };
  }
}); 