// tea.js
const app = getApp();

Page({
  data: {
    isLoading: true,
    loadError: false,
    userInfo: null,
    
    // Recommendation data
    dailyRecommendation: null,
    seasonRecommendations: [],
    symptomRecommendations: [],
    
    // Filter and search
    searchQuery: '',
    selectedCategory: 'all',
    categories: [
      { id: 'all', name: '全部' },
      { id: 'energy', name: '提神醒脑' },
      { id: 'sleep', name: '安神助眠' },
      { id: 'digestion', name: '健脾消食' },
      { id: 'immunity', name: '增强免疫' },
      { id: 'beauty', name: '美容养颜' }
    ],
    
    // Display control
    activeTab: 'recommend',  // recommend, favorite, history
    showTeaDetail: false,
    currentTea: null,
    
    // Pagination
    pageSize: 10,
    currentPage: 1,
    hasMoreData: true,
    
    // Offline storage
    hasNetworkError: false,
    isNetworkAvailable: true,
    offlineData: null,
    
    // Season detection
    currentSeason: '',
    seasonNames: {
      'spring': '春季',
      'summer': '夏季',
      'autumn': '秋季',
      'winter': '冬季'
    }
  },

  onLoad: function() {
    // Check if user is authenticated
    this.checkAuthentication();
    
    // Detect current season
    this.detectCurrentSeason();
    
    // Check network status
    this.checkNetworkStatus();
    
    // Load offline data if available
    this.loadOfflineData();
  },
  
  onShow: function() {
    // Refresh recommendations when page is shown again
    if (app.globalData.isAuthenticated) {
      this.fetchRecommendations();
    }
  },
  
  onPullDownRefresh: function() {
    // Handle pull-down refresh
    this.setData({
      isLoading: true,
      loadError: false,
      currentPage: 1,
      hasMoreData: true
    });
    
    this.fetchRecommendations();
    wx.stopPullDownRefresh();
  },
  
  onReachBottom: function() {
    // Load more recommendations when scrolling to bottom
    if (this.data.hasMoreData && !this.data.isLoading && this.data.activeTab !== 'recommend') {
      this.loadMoreRecommendations();
    }
  },
  
  // Check if user is authenticated
  checkAuthentication: function() {
    if (!app.globalData.isAuthenticated) {
      wx.redirectTo({
        url: '/pages/auth/auth'
      });
      return false;
    }
    
    this.setData({
      userInfo: app.globalData.userInfo || wx.getStorageSync('userInfo')
    });
    
    return true;
  },
  
  // Detect current season based on date
  detectCurrentSeason: function() {
    const date = new Date();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    
    let season = '';
    if (month >= 3 && month <= 5) {
      season = 'spring';
    } else if (month >= 6 && month <= 8) {
      season = 'summer';
    } else if (month >= 9 && month <= 11) {
      season = 'autumn';
    } else {
      season = 'winter';
    }
    
    this.setData({
      currentSeason: season
    });
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
            title: '当前处于离线模式',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },
  
  // Load offline data from storage
  loadOfflineData: function() {
    const offlineData = wx.getStorageSync('tea_recommendations');
    
    if (offlineData) {
      this.setData({
        offlineData
      });
      
      if (!this.data.isNetworkAvailable) {
        this.setData({
          dailyRecommendation: offlineData.dailyRecommendation,
          seasonRecommendations: offlineData.seasonRecommendations,
          symptomRecommendations: offlineData.symptomRecommendations,
          isLoading: false
        });
      }
    }
  },
  
  // Fetch recommendations from API
  fetchRecommendations: function() {
    if (!this.data.isNetworkAvailable) {
      this.setData({
        isLoading: false,
        hasNetworkError: true
      });
      return;
    }
    
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      wx.redirectTo({
        url: '/pages/auth/auth'
      });
      return;
    }
    
    this.setData({
      isLoading: true,
      loadError: false
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/tea/recommendations`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        season: this.data.currentSeason,
        page: this.data.currentPage,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const data = res.data;
          
          this.setData({
            dailyRecommendation: data.dailyRecommendation,
            seasonRecommendations: data.seasonRecommendations,
            symptomRecommendations: data.symptomRecommendations,
            hasMoreData: data.hasMore
          });
          
          // Save data for offline use
          wx.setStorageSync('tea_recommendations', {
            dailyRecommendation: data.dailyRecommendation,
            seasonRecommendations: data.seasonRecommendations,
            symptomRecommendations: data.symptomRecommendations,
            timestamp: new Date().getTime()
          });
        } else {
          this.setData({
            loadError: true
          });
          
          wx.showToast({
            title: '获取推荐失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Failed to fetch recommendations:', err);
        this.setData({
          loadError: true,
          hasNetworkError: true
        });
        
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
      }
    });
  },
  
  // Load more recommendations for pagination
  loadMoreRecommendations: function() {
    if (!this.data.isNetworkAvailable || this.data.isLoading) {
      return;
    }
    
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    const nextPage = this.data.currentPage + 1;
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/tea/recommendations`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        season: this.data.currentSeason,
        category: this.data.selectedCategory !== 'all' ? this.data.selectedCategory : undefined,
        query: this.data.searchQuery || undefined,
        page: nextPage,
        pageSize: this.data.pageSize,
        listType: this.data.activeTab === 'favorite' ? 'favorites' : 'history'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const data = res.data;
          
          // Append new data to existing lists
          if (this.data.activeTab === 'favorite') {
            this.setData({
              seasonRecommendations: this.data.seasonRecommendations.concat(data.items),
              currentPage: nextPage,
              hasMoreData: data.hasMore
            });
          } else if (this.data.activeTab === 'history') {
            this.setData({
              symptomRecommendations: this.data.symptomRecommendations.concat(data.items),
              currentPage: nextPage,
              hasMoreData: data.hasMore
            });
          }
        }
      },
      fail: (err) => {
        console.error('Failed to load more recommendations:', err);
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
      }
    });
  },
  
  // Handle tab change
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    
    this.setData({
      activeTab: tab,
      currentPage: 1,
      hasMoreData: true
    });
    
    if (tab === 'favorite') {
      this.fetchFavorites();
    } else if (tab === 'history') {
      this.fetchHistory();
    }
  },
  
  // Fetch favorite teas
  fetchFavorites: function() {
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '离线模式下无法获取收藏',
        icon: 'none'
      });
      return;
    }
    
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/tea/favorites`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        page: 1,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            seasonRecommendations: res.data.items,
            hasMoreData: res.data.hasMore
          });
        } else {
          wx.showToast({
            title: '获取收藏失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Failed to fetch favorites:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
      }
    });
  },
  
  // Fetch tea history
  fetchHistory: function() {
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '离线模式下无法获取历史',
        icon: 'none'
      });
      return;
    }
    
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/tea/history`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        page: 1,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            symptomRecommendations: res.data.items,
            hasMoreData: res.data.hasMore
          });
        } else {
          wx.showToast({
            title: '获取历史失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Failed to fetch history:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
      }
    });
  },
  
  // Handle search input
  onSearchInput: function(e) {
    this.setData({
      searchQuery: e.detail.value
    });
  },
  
  // Handle search submit
  onSearchSubmit: function() {
    this.setData({
      currentPage: 1,
      hasMoreData: true
    });
    
    this.fetchSearchResults();
  },
  
  // Fetch search results
  fetchSearchResults: function() {
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '离线模式下无法搜索',
        icon: 'none'
      });
      return;
    }
    
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/tea/search`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        query: this.data.searchQuery,
        category: this.data.selectedCategory !== 'all' ? this.data.selectedCategory : undefined,
        page: 1,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            activeTab: 'search',
            seasonRecommendations: res.data.items,
            hasMoreData: res.data.hasMore
          });
        } else {
          wx.showToast({
            title: '搜索失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Failed to search:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
      }
    });
  },
  
  // Change category filter
  changeCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    
    this.setData({
      selectedCategory: category,
      currentPage: 1,
      hasMoreData: true
    });
    
    if (this.data.searchQuery) {
      this.fetchSearchResults();
    } else if (this.data.activeTab === 'favorite') {
      this.fetchFavorites();
    } else if (this.data.activeTab === 'history') {
      this.fetchHistory();
    } else {
      this.fetchRecommendations();
    }
  },
  
  // Show tea detail
  showTeaDetail: function(e) {
    const teaId = e.currentTarget.dataset.id;
    let tea = null;
    
    // Find tea in recommendations
    if (this.data.dailyRecommendation && this.data.dailyRecommendation.id === teaId) {
      tea = this.data.dailyRecommendation;
    } else {
      tea = this.data.seasonRecommendations.find(item => item.id === teaId) ||
            this.data.symptomRecommendations.find(item => item.id === teaId);
    }
    
    if (tea) {
      this.setData({
        showTeaDetail: true,
        currentTea: tea
      });
    }
  },
  
  // Hide tea detail
  hideTeaDetail: function() {
    this.setData({
      showTeaDetail: false,
      currentTea: null
    });
  },
  
  // Toggle favorite status
  toggleFavorite: function(e) {
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '离线模式下无法收藏',
        icon: 'none'
      });
      return;
    }
    
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      return;
    }
    
    const teaId = e.currentTarget.dataset.id;
    const action = e.currentTarget.dataset.action;
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/tea/favorites/${teaId}`,
      method: action === 'add' ? 'POST' : 'DELETE',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // Update UI to show favorite status
          let updated = false;
          
          if (this.data.dailyRecommendation && this.data.dailyRecommendation.id === teaId) {
            this.setData({
              'dailyRecommendation.isFavorite': action === 'add'
            });
            updated = true;
          }
          
          if (!updated) {
            const seasonIndex = this.data.seasonRecommendations.findIndex(item => item.id === teaId);
            if (seasonIndex !== -1) {
              this.setData({
                [`seasonRecommendations[${seasonIndex}].isFavorite`]: action === 'add'
              });
              updated = true;
            }
          }
          
          if (!updated) {
            const symptomIndex = this.data.symptomRecommendations.findIndex(item => item.id === teaId);
            if (symptomIndex !== -1) {
              this.setData({
                [`symptomRecommendations[${symptomIndex}].isFavorite`]: action === 'add'
              });
            }
          }
          
          wx.showToast({
            title: action === 'add' ? '已收藏' : '已取消收藏',
            icon: 'success'
          });
          
          // If in favorites tab, refresh the list
          if (this.data.activeTab === 'favorite' && action === 'remove') {
            this.fetchFavorites();
          }
        } else {
          wx.showToast({
            title: '操作失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Failed to toggle favorite:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },
  
  // Navigate to tea detail page
  navigateToDetail: function(e) {
    const teaId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/recipe-detail/recipe-detail?id=${teaId}`
    });
  }
}); 