const communityUtil = require('../../utils/community');

Page({
  data: {
    posts: [],
    loading: true,
    currentTab: 'latest', // latest, popular, following
    categories: [],
    selectedCategory: '',
    page: 1,
    hasMore: true,
    refreshing: false,
    topics: []
  },

  onLoad: function (options) {
    this.loadTopics();
    this.loadCategories();
    this.loadPosts();
  },

  onPullDownRefresh: function () {
    this.setData({
      posts: [],
      page: 1,
      hasMore: true,
      refreshing: true
    });
    
    Promise.all([
      this.loadPosts(),
      this.loadTopics()
    ]).then(() => {
      wx.stopPullDownRefresh();
      this.setData({ refreshing: false });
    });
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMorePosts();
    }
  },

  loadTopics: function () {
    return communityUtil.getTopics()
      .then(res => {
        this.setData({
          topics: res.topics || []
        });
      })
      .catch(err => {
        console.error('加载话题失败', err);
      });
  },

  loadCategories: function () {
    // You can load these from API or define locally
    this.setData({
      categories: [
        { id: '', name: '全部' },
        { id: 'general', name: '综合讨论' },
        { id: 'health', name: '健康分享' },
        { id: 'tea', name: '茶文化' },
        { id: 'herbs', name: '中草药' },
        { id: 'recipes', name: '食疗方' }
      ]
    });
  },

  loadPosts: function () {
    this.setData({ loading: true });
    
    return communityUtil.getPosts({
      page: this.data.page,
      limit: 20,
      category: this.data.selectedCategory,
      sortBy: this.data.currentTab
    })
      .then(res => {
        this.setData({
          posts: res.posts || [],
          hasMore: (res.posts || []).length === 20,
          loading: false
        });
      })
      .catch(err => {
        console.error('加载帖子失败', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      });
  },

  loadMorePosts: function () {
    if (this.data.loading) return;
    
    this.setData({
      loading: true,
      page: this.data.page + 1
    });
    
    communityUtil.getPosts({
      page: this.data.page,
      limit: 20,
      category: this.data.selectedCategory,
      sortBy: this.data.currentTab
    })
      .then(res => {
        const posts = (res.posts || []);
        this.setData({
          posts: [...this.data.posts, ...posts],
          hasMore: posts.length === 20,
          loading: false
        });
      })
      .catch(err => {
        console.error('加载更多帖子失败', err);
        this.setData({
          loading: false,
          page: this.data.page - 1
        });
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      });
  },

  onTabChange: function (e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.currentTab) return;
    
    this.setData({
      currentTab: tab,
      posts: [],
      page: 1,
      hasMore: true
    });
    
    this.loadPosts();
  },

  onCategoryChange: function (e) {
    const category = e.currentTarget.dataset.category;
    if (category === this.data.selectedCategory) return;
    
    this.setData({
      selectedCategory: category,
      posts: [],
      page: 1,
      hasMore: true
    });
    
    this.loadPosts();
  },

  onPostTap: function (e) {
    const postId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/community/post-detail?id=${postId}`
    });
  },

  onCreatePostTap: function () {
    wx.navigateTo({
      url: '/pages/community/create-post'
    });
  },

  onTopicTap: function (e) {
    const topicId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/community/topic?id=${topicId}`
    });
  },

  onShareAppMessage: function () {
    return {
      title: '中医奶茶 - 健康社区',
      path: '/pages/community/index'
    };
  }
}); 