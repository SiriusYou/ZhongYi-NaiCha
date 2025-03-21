// knowledge.js
const app = getApp();

Page({
  data: {
    isLoading: true,
    loadError: false,
    
    // Knowledge data
    featuredArticles: [],
    categories: [
      { id: 'basics', name: '中医基础', selected: true },
      { id: 'herbs', name: '本草药材', selected: false },
      { id: 'techniques', name: '养生技法', selected: false },
      { id: 'diet', name: '食疗方案', selected: false },
      { id: 'seasons', name: '四季养生', selected: false },
      { id: 'theories', name: '理论体系', selected: false }
    ],
    currentCategory: 'basics',
    articles: [],
    
    // Search
    searchQuery: '',
    isSearchMode: false,
    searchResults: [],
    
    // Pagination
    pageSize: 10,
    currentPage: 1,
    hasMoreData: true,
    
    // Offline
    isNetworkAvailable: true,
    savedArticles: [],
    showSavedOnly: false,
    
    // Detail
    showArticleDetail: false,
    currentArticle: null
  },
  
  onLoad: function() {
    // Check network status
    this.checkNetworkStatus();
    
    // Load saved articles from storage
    this.loadSavedArticles();
    
    // Fetch featured articles
    this.fetchFeaturedArticles();
    
    // Fetch articles for default category
    this.fetchArticles();
  },
  
  onPullDownRefresh: function() {
    // Reset pagination
    this.setData({
      currentPage: 1,
      hasMoreData: true
    });
    
    // Refresh data
    if (this.data.isSearchMode) {
      this.searchArticles();
    } else if (this.data.showSavedOnly) {
      this.loadSavedArticles();
      wx.stopPullDownRefresh();
    } else {
      this.fetchArticles();
    }
  },
  
  onReachBottom: function() {
    // Load more when reaching bottom
    if (this.data.hasMoreData && !this.data.isLoading) {
      if (this.data.isSearchMode) {
        this.loadMoreSearchResults();
      } else if (!this.data.showSavedOnly) {
        this.loadMoreArticles();
      }
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
            title: '当前处于离线模式',
            icon: 'none',
            duration: 2000
          });
          
          // If offline, show saved articles
          this.setData({
            showSavedOnly: true
          });
        }
      }
    });
    
    // Listen for network status change
    wx.onNetworkStatusChange((res) => {
      this.setData({
        isNetworkAvailable: res.isConnected
      });
      
      if (res.isConnected && this.data.showSavedOnly) {
        wx.showToast({
          title: '网络已连接，已切换到在线模式',
          icon: 'none',
          duration: 2000
        });
        
        // Fetch fresh data when coming back online
        this.setData({
          showSavedOnly: false,
          currentPage: 1
        });
        
        this.fetchFeaturedArticles();
        this.fetchArticles();
      } else if (!res.isConnected) {
        wx.showToast({
          title: '网络已断开，已切换到离线模式',
          icon: 'none',
          duration: 2000
        });
        
        this.setData({
          showSavedOnly: true
        });
      }
    });
  },
  
  // Load saved articles from storage
  loadSavedArticles: function() {
    const savedArticles = wx.getStorageSync('knowledge_saved_articles') || [];
    
    this.setData({
      savedArticles,
      isLoading: false
    });
    
    return savedArticles;
  },
  
  // Fetch featured articles
  fetchFeaturedArticles: function() {
    if (!this.data.isNetworkAvailable) {
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/knowledge/featured`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            featuredArticles: res.data
          });
          
          // Cache featured articles for offline use
          wx.setStorageSync('knowledge_featured', res.data);
        } else {
          console.error('Failed to fetch featured articles:', res.statusCode);
          
          // Try to use cached featured articles
          const cachedFeatured = wx.getStorageSync('knowledge_featured');
          if (cachedFeatured) {
            this.setData({
              featuredArticles: cachedFeatured
            });
          }
        }
      },
      fail: (err) => {
        console.error('Network error when fetching featured articles:', err);
        
        // Try to use cached featured articles
        const cachedFeatured = wx.getStorageSync('knowledge_featured');
        if (cachedFeatured) {
          this.setData({
            featuredArticles: cachedFeatured
          });
        }
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
      }
    });
  },
  
  // Fetch articles by category
  fetchArticles: function() {
    if (!this.data.isNetworkAvailable) {
      // If offline and not showing saved, switch to saved
      if (!this.data.showSavedOnly) {
        this.setData({
          showSavedOnly: true
        });
      }
      wx.stopPullDownRefresh();
      return;
    }
    
    this.setData({
      isLoading: true,
      loadError: false
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/knowledge/articles`,
      method: 'GET',
      data: {
        category: this.data.currentCategory,
        page: 1,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const articles = res.data.items;
          
          // Mark saved articles
          const savedIds = this.data.savedArticles.map(item => item.id);
          const markedArticles = articles.map(article => ({
            ...article,
            isSaved: savedIds.includes(article.id)
          }));
          
          this.setData({
            articles: markedArticles,
            hasMoreData: res.data.hasMore,
            currentPage: 1
          });
          
          // Cache articles by category
          const categoryCache = wx.getStorageSync('knowledge_categories') || {};
          categoryCache[this.data.currentCategory] = {
            items: markedArticles,
            timestamp: new Date().getTime()
          };
          wx.setStorageSync('knowledge_categories', categoryCache);
        } else {
          this.setData({
            loadError: true
          });
          
          // Try to use cached category articles
          const categoryCache = wx.getStorageSync('knowledge_categories') || {};
          const cachedData = categoryCache[this.data.currentCategory];
          
          if (cachedData) {
            this.setData({
              articles: cachedData.items,
              hasMoreData: false // Assume no more when using cached
            });
          }
        }
      },
      fail: (err) => {
        console.error('Failed to fetch articles:', err);
        this.setData({
          loadError: true
        });
        
        // Try to use cached category articles
        const categoryCache = wx.getStorageSync('knowledge_categories') || {};
        const cachedData = categoryCache[this.data.currentCategory];
        
        if (cachedData) {
          this.setData({
            articles: cachedData.items,
            hasMoreData: false // Assume no more when using cached
          });
        }
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
        wx.stopPullDownRefresh();
      }
    });
  },
  
  // Load more articles for current category
  loadMoreArticles: function() {
    if (!this.data.isNetworkAvailable || this.data.isLoading) {
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    const nextPage = this.data.currentPage + 1;
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/knowledge/articles`,
      method: 'GET',
      data: {
        category: this.data.currentCategory,
        page: nextPage,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const newArticles = res.data.items;
          
          // Mark saved articles
          const savedIds = this.data.savedArticles.map(item => item.id);
          const markedArticles = newArticles.map(article => ({
            ...article,
            isSaved: savedIds.includes(article.id)
          }));
          
          // Append to existing list
          const updatedArticles = [...this.data.articles, ...markedArticles];
          
          this.setData({
            articles: updatedArticles,
            hasMoreData: res.data.hasMore,
            currentPage: nextPage
          });
          
          // Update cache
          const categoryCache = wx.getStorageSync('knowledge_categories') || {};
          categoryCache[this.data.currentCategory] = {
            items: updatedArticles,
            timestamp: new Date().getTime()
          };
          wx.setStorageSync('knowledge_categories', categoryCache);
        }
      },
      fail: (err) => {
        console.error('Failed to load more articles:', err);
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
      }
    });
  },
  
  // Handle category change
  changeCategory: function(e) {
    const categoryId = e.currentTarget.dataset.id;
    if (categoryId === this.data.currentCategory) {
      return;
    }
    
    // Update categories selection state
    const updatedCategories = this.data.categories.map(cat => ({
      ...cat,
      selected: cat.id === categoryId
    }));
    
    this.setData({
      categories: updatedCategories,
      currentCategory: categoryId,
      currentPage: 1,
      hasMoreData: true,
      isSearchMode: false,
      showSavedOnly: false
    });
    
    // Check if we have a recent cache (less than 10 minutes old)
    const categoryCache = wx.getStorageSync('knowledge_categories') || {};
    const cachedData = categoryCache[categoryId];
    const now = new Date().getTime();
    const cacheAge = now - (cachedData?.timestamp || 0);
    
    if (cachedData && cacheAge < 10 * 60 * 1000) {
      // Use cached data if recent
      this.setData({
        articles: cachedData.items
      });
    } else {
      // Fetch fresh data
      this.fetchArticles();
    }
  },
  
  // Toggle save article for offline reading
  toggleSaveArticle: function(e) {
    const articleId = e.currentTarget.dataset.id;
    let article = null;
    
    // Find the article from all possible sources
    if (this.data.isSearchMode) {
      article = this.data.searchResults.find(item => item.id === articleId);
    } else if (this.data.showArticleDetail && this.data.currentArticle?.id === articleId) {
      article = this.data.currentArticle;
    } else {
      article = this.data.articles.find(item => item.id === articleId) || 
                this.data.featuredArticles.find(item => item.id === articleId);
    }
    
    if (!article) return;
    
    // Get current saved articles
    let savedArticles = [...this.data.savedArticles];
    const isSaved = savedArticles.some(item => item.id === articleId);
    
    if (isSaved) {
      // Remove from saved
      savedArticles = savedArticles.filter(item => item.id !== articleId);
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      });
    } else {
      // Add to saved
      // Make sure to include the full content if we have it
      if (!article.content && this.data.currentArticle?.id === articleId) {
        article.content = this.data.currentArticle.content;
      }
      
      // If we don't have the content, fetch it first
      if (!article.content) {
        this.fetchArticleContent(articleId, true);
        return;
      }
      
      savedArticles.push(article);
      wx.showToast({
        title: '已收藏',
        icon: 'success'
      });
    }
    
    // Update saved articles in storage
    wx.setStorageSync('knowledge_saved_articles', savedArticles);
    
    this.setData({
      savedArticles
    });
    
    // Update UI to reflect saved status
    this.updateArticleSavedState(articleId, !isSaved);
  },
  
  // Update the saved state of an article in all relevant locations
  updateArticleSavedState: function(articleId, isSaved) {
    // Update in current article detail
    if (this.data.currentArticle?.id === articleId) {
      this.setData({
        'currentArticle.isSaved': isSaved
      });
    }
    
    // Update in articles list
    const articleIndex = this.data.articles.findIndex(item => item.id === articleId);
    if (articleIndex !== -1) {
      this.setData({
        [`articles[${articleIndex}].isSaved`]: isSaved
      });
    }
    
    // Update in featured articles
    const featuredIndex = this.data.featuredArticles.findIndex(item => item.id === articleId);
    if (featuredIndex !== -1) {
      this.setData({
        [`featuredArticles[${featuredIndex}].isSaved`]: isSaved
      });
    }
    
    // Update in search results
    if (this.data.isSearchMode) {
      const searchIndex = this.data.searchResults.findIndex(item => item.id === articleId);
      if (searchIndex !== -1) {
        this.setData({
          [`searchResults[${searchIndex}].isSaved`]: isSaved
        });
      }
    }
  },
  
  // Toggle show saved articles only
  toggleSavedOnly: function() {
    this.setData({
      showSavedOnly: !this.data.showSavedOnly,
      isSearchMode: false
    });
    
    if (this.data.showSavedOnly) {
      // Make sure we have the latest saved articles
      this.loadSavedArticles();
    } else {
      // Go back to category view
      this.fetchArticles();
    }
  },
  
  // Handle search input
  onSearchInput: function(e) {
    this.setData({
      searchQuery: e.detail.value
    });
  },
  
  // Handle search submit
  onSearchSubmit: function() {
    if (!this.data.searchQuery.trim()) {
      return;
    }
    
    this.setData({
      isSearchMode: true,
      showSavedOnly: false,
      currentPage: 1,
      hasMoreData: true
    });
    
    this.searchArticles();
  },
  
  // Search articles by keyword
  searchArticles: function() {
    if (!this.data.isNetworkAvailable) {
      // If offline, search only in saved articles
      this.searchOfflineArticles();
      return;
    }
    
    this.setData({
      isLoading: true,
      loadError: false
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/knowledge/search`,
      method: 'GET',
      data: {
        query: this.data.searchQuery,
        page: 1,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const articles = res.data.items;
          
          // Mark saved articles
          const savedIds = this.data.savedArticles.map(item => item.id);
          const markedArticles = articles.map(article => ({
            ...article,
            isSaved: savedIds.includes(article.id)
          }));
          
          this.setData({
            searchResults: markedArticles,
            hasMoreData: res.data.hasMore
          });
        } else {
          this.setData({
            loadError: true,
            searchResults: []
          });
          
          // Fall back to offline search
          this.searchOfflineArticles();
        }
      },
      fail: (err) => {
        console.error('Failed to search articles:', err);
        this.setData({
          loadError: true,
          searchResults: []
        });
        
        // Fall back to offline search
        this.searchOfflineArticles();
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
        wx.stopPullDownRefresh();
      }
    });
  },
  
  // Search within offline/saved articles
  searchOfflineArticles: function() {
    const query = this.data.searchQuery.toLowerCase();
    
    // Get all available offline content
    const savedArticles = this.data.savedArticles;
    const categoryCache = wx.getStorageSync('knowledge_categories') || {};
    let cachedArticles = [];
    
    // Collect articles from all category caches
    Object.values(categoryCache).forEach(category => {
      if (category && category.items) {
        cachedArticles = [...cachedArticles, ...category.items];
      }
    });
    
    // Combine and deduplicate
    const allArticles = [...savedArticles];
    cachedArticles.forEach(article => {
      if (!allArticles.some(a => a.id === article.id)) {
        allArticles.push(article);
      }
    });
    
    // Simple search in title, description, and content
    const results = allArticles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.description.toLowerCase().includes(query) ||
      (article.content && article.content.toLowerCase().includes(query))
    );
    
    this.setData({
      searchResults: results,
      hasMoreData: false,
      isLoading: false
    });
    
    if (results.length === 0) {
      wx.showToast({
        title: '离线模式下未找到相关内容',
        icon: 'none'
      });
    }
    
    wx.stopPullDownRefresh();
  },
  
  // Load more search results
  loadMoreSearchResults: function() {
    if (!this.data.isNetworkAvailable || this.data.isLoading) {
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    const nextPage = this.data.currentPage + 1;
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/knowledge/search`,
      method: 'GET',
      data: {
        query: this.data.searchQuery,
        page: nextPage,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const newArticles = res.data.items;
          
          // Mark saved articles
          const savedIds = this.data.savedArticles.map(item => item.id);
          const markedArticles = newArticles.map(article => ({
            ...article,
            isSaved: savedIds.includes(article.id)
          }));
          
          this.setData({
            searchResults: [...this.data.searchResults, ...markedArticles],
            hasMoreData: res.data.hasMore,
            currentPage: nextPage
          });
        }
      },
      fail: (err) => {
        console.error('Failed to load more search results:', err);
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
      }
    });
  },
  
  // Show article detail
  showArticleDetail: function(e) {
    const articleId = e.currentTarget.dataset.id;
    let article = null;
    
    // Find article from all possible sources
    if (this.data.isSearchMode) {
      article = this.data.searchResults.find(item => item.id === articleId);
    } else if (this.data.showSavedOnly) {
      article = this.data.savedArticles.find(item => item.id === articleId);
    } else {
      article = this.data.articles.find(item => item.id === articleId) || 
                this.data.featuredArticles.find(item => item.id === articleId);
    }
    
    if (!article) return;
    
    // Check if we already have full content
    if (article.content) {
      this.setData({
        currentArticle: article,
        showArticleDetail: true
      });
    } else {
      // Fetch content first
      this.fetchArticleContent(articleId);
    }
  },
  
  // Fetch article content
  fetchArticleContent: function(articleId, saveAfterFetch = false) {
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '离线模式下无法获取文章详情',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/knowledge/articles/${articleId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const article = res.data;
          
          // Mark saved status
          const isSaved = this.data.savedArticles.some(item => item.id === articleId);
          article.isSaved = isSaved;
          
          if (saveAfterFetch) {
            // Add to saved articles
            const savedArticles = [...this.data.savedArticles, article];
            wx.setStorageSync('knowledge_saved_articles', savedArticles);
            
            this.setData({
              savedArticles
            });
            
            // Update saved state in UI
            this.updateArticleSavedState(articleId, true);
            
            wx.showToast({
              title: '已收藏',
              icon: 'success'
            });
          } else {
            // Show article detail
            this.setData({
              currentArticle: article,
              showArticleDetail: true
            });
          }
        } else {
          wx.showToast({
            title: '获取文章详情失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Failed to fetch article content:', err);
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
  
  // Close article detail
  closeArticleDetail: function() {
    this.setData({
      showArticleDetail: false,
      currentArticle: null
    });
  },
  
  // Navigate to search page
  navigateToSearch: function() {
    wx.navigateTo({
      url: '/pages/knowledge-search/knowledge-search'
    });
  },
  
  // Share article
  onShareAppMessage: function(res) {
    if (res.from === 'button' && this.data.currentArticle) {
      return {
        title: this.data.currentArticle.title,
        path: `/pages/knowledge-detail/knowledge-detail?id=${this.data.currentArticle.id}`,
        imageUrl: this.data.currentArticle.coverImage
      };
    }
    
    return {
      title: '中医养生知识库',
      path: '/pages/knowledge/knowledge'
    };
  }
}); 