// recipe.js
const app = getApp();

Page({
  data: {
    isLoading: true,
    loadError: false,
    
    // Recipe data
    recipes: [],
    popularRecipes: [],
    
    // Filters
    categories: [
      { id: 'all', name: '全部', selected: true },
      { id: 'tea', name: '茶饮', selected: false },
      { id: 'soup', name: '汤品', selected: false },
      { id: 'food', name: '食品', selected: false },
      { id: 'medicinal', name: '药膳', selected: false },
      { id: 'seasonal', name: '时令', selected: false }
    ],
    currentCategory: 'all',
    
    // DIY Guidance
    showDiyGuidance: false,
    currentRecipe: null,
    currentStep: 0,
    
    // Favorites
    favoriteRecipes: [],
    showFavoritesOnly: false,
    
    // Search
    searchQuery: '',
    isSearchMode: false,
    searchResults: [],
    
    // Pagination
    pageSize: 10,
    currentPage: 1,
    hasMoreData: true,
    
    // Offline
    isNetworkAvailable: true
  },
  
  onLoad: function() {
    // Check network status
    this.checkNetworkStatus();
    
    // Load favorites from storage
    this.loadFavoriteRecipes();
    
    // Fetch popular recipes
    this.fetchPopularRecipes();
    
    // Fetch recipes for default category (all)
    this.fetchRecipes();
  },
  
  onPullDownRefresh: function() {
    // Reset pagination
    this.setData({
      currentPage: 1,
      hasMoreData: true
    });
    
    // Refresh data
    if (this.data.isSearchMode) {
      this.searchRecipes();
    } else if (this.data.showFavoritesOnly) {
      this.loadFavoriteRecipes();
      wx.stopPullDownRefresh();
    } else {
      this.fetchRecipes();
    }
  },
  
  onReachBottom: function() {
    // Load more when reaching bottom
    if (this.data.hasMoreData && !this.data.isLoading) {
      if (this.data.isSearchMode) {
        this.loadMoreSearchResults();
      } else if (!this.data.showFavoritesOnly) {
        this.loadMoreRecipes();
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
          
          // If offline, show favorites only
          this.setData({
            showFavoritesOnly: true
          });
        }
      }
    });
    
    // Listen for network status change
    wx.onNetworkStatusChange((res) => {
      this.setData({
        isNetworkAvailable: res.isConnected
      });
      
      if (res.isConnected && this.data.showFavoritesOnly) {
        wx.showToast({
          title: '网络已连接，已切换到在线模式',
          icon: 'none',
          duration: 2000
        });
        
        // Fetch fresh data when coming back online
        this.setData({
          showFavoritesOnly: false,
          currentPage: 1
        });
        
        this.fetchPopularRecipes();
        this.fetchRecipes();
      } else if (!res.isConnected) {
        wx.showToast({
          title: '网络已断开，已切换到离线模式',
          icon: 'none',
          duration: 2000
        });
        
        this.setData({
          showFavoritesOnly: true
        });
      }
    });
  },
  
  // Load favorite recipes from storage
  loadFavoriteRecipes: function() {
    const favoriteRecipes = wx.getStorageSync('favorite_recipes') || [];
    
    this.setData({
      favoriteRecipes,
      isLoading: false
    });
    
    // If in favorites mode, update displayed recipes
    if (this.data.showFavoritesOnly) {
      this.setData({
        recipes: favoriteRecipes
      });
    }
    
    return favoriteRecipes;
  },
  
  // Fetch popular recipes
  fetchPopularRecipes: function() {
    if (!this.data.isNetworkAvailable) {
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/recipes/popular`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          // Mark favorite recipes
          const favoriteIds = this.data.favoriteRecipes.map(item => item.id);
          const markedRecipes = res.data.map(recipe => ({
            ...recipe,
            isFavorite: favoriteIds.includes(recipe.id)
          }));
          
          this.setData({
            popularRecipes: markedRecipes
          });
          
          // Cache popular recipes for offline use
          wx.setStorageSync('popular_recipes', markedRecipes);
        } else {
          console.error('Failed to fetch popular recipes:', res.statusCode);
          
          // Try to use cached popular recipes
          const cachedPopular = wx.getStorageSync('popular_recipes');
          if (cachedPopular) {
            this.setData({
              popularRecipes: cachedPopular
            });
          }
        }
      },
      fail: (err) => {
        console.error('Network error when fetching popular recipes:', err);
        
        // Try to use cached popular recipes
        const cachedPopular = wx.getStorageSync('popular_recipes');
        if (cachedPopular) {
          this.setData({
            popularRecipes: cachedPopular
          });
        }
      }
    });
  },
  
  // Fetch recipes by category
  fetchRecipes: function() {
    if (!this.data.isNetworkAvailable) {
      // If offline and not showing favorites, switch to favorites
      if (!this.data.showFavoritesOnly) {
        this.setData({
          showFavoritesOnly: true
        });
      }
      wx.stopPullDownRefresh();
      return;
    }
    
    this.setData({
      isLoading: true,
      loadError: false
    });
    
    let url = `${app.globalData.apiBaseUrl}/recipes`;
    let data = {
      page: 1,
      pageSize: this.data.pageSize
    };
    
    // Only add category parameter if not 'all'
    if (this.data.currentCategory !== 'all') {
      data.category = this.data.currentCategory;
    }
    
    wx.request({
      url: url,
      method: 'GET',
      data: data,
      success: (res) => {
        if (res.statusCode === 200) {
          const recipes = res.data.items;
          
          // Mark favorite recipes
          const favoriteIds = this.data.favoriteRecipes.map(item => item.id);
          const markedRecipes = recipes.map(recipe => ({
            ...recipe,
            isFavorite: favoriteIds.includes(recipe.id)
          }));
          
          this.setData({
            recipes: markedRecipes,
            hasMoreData: res.data.hasMore,
            currentPage: 1
          });
          
          // Cache recipes by category
          const recipesCache = wx.getStorageSync('recipes_categories') || {};
          recipesCache[this.data.currentCategory] = {
            items: markedRecipes,
            timestamp: new Date().getTime()
          };
          wx.setStorageSync('recipes_categories', recipesCache);
        } else {
          this.setData({
            loadError: true
          });
          
          // Try to use cached category recipes
          const recipesCache = wx.getStorageSync('recipes_categories') || {};
          const cachedData = recipesCache[this.data.currentCategory];
          
          if (cachedData) {
            this.setData({
              recipes: cachedData.items,
              hasMoreData: false // Assume no more when using cached
            });
          }
        }
      },
      fail: (err) => {
        console.error('Failed to fetch recipes:', err);
        this.setData({
          loadError: true
        });
        
        // Try to use cached category recipes
        const recipesCache = wx.getStorageSync('recipes_categories') || {};
        const cachedData = recipesCache[this.data.currentCategory];
        
        if (cachedData) {
          this.setData({
            recipes: cachedData.items,
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
  
  // Load more recipes for current category
  loadMoreRecipes: function() {
    if (!this.data.isNetworkAvailable || this.data.isLoading) {
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    const nextPage = this.data.currentPage + 1;
    
    let url = `${app.globalData.apiBaseUrl}/recipes`;
    let data = {
      page: nextPage,
      pageSize: this.data.pageSize
    };
    
    // Only add category parameter if not 'all'
    if (this.data.currentCategory !== 'all') {
      data.category = this.data.currentCategory;
    }
    
    wx.request({
      url: url,
      method: 'GET',
      data: data,
      success: (res) => {
        if (res.statusCode === 200) {
          const newRecipes = res.data.items;
          
          // Mark favorite recipes
          const favoriteIds = this.data.favoriteRecipes.map(item => item.id);
          const markedRecipes = newRecipes.map(recipe => ({
            ...recipe,
            isFavorite: favoriteIds.includes(recipe.id)
          }));
          
          // Append to existing list
          const updatedRecipes = [...this.data.recipes, ...markedRecipes];
          
          this.setData({
            recipes: updatedRecipes,
            hasMoreData: res.data.hasMore,
            currentPage: nextPage
          });
          
          // Update cache
          const recipesCache = wx.getStorageSync('recipes_categories') || {};
          recipesCache[this.data.currentCategory] = {
            items: updatedRecipes,
            timestamp: new Date().getTime()
          };
          wx.setStorageSync('recipes_categories', recipesCache);
        }
      },
      fail: (err) => {
        console.error('Failed to load more recipes:', err);
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
      showFavoritesOnly: false
    });
    
    // Check if we have a recent cache (less than 10 minutes old)
    const recipesCache = wx.getStorageSync('recipes_categories') || {};
    const cachedData = recipesCache[categoryId];
    const now = new Date().getTime();
    const cacheAge = now - (cachedData?.timestamp || 0);
    
    if (cachedData && cacheAge < 10 * 60 * 1000) {
      // Use cached data if recent
      this.setData({
        recipes: cachedData.items
      });
    } else {
      // Fetch fresh data
      this.fetchRecipes();
    }
  },
  
  // Toggle favorite recipe
  toggleFavorite: function(e) {
    const recipeId = e.currentTarget.dataset.id;
    let recipe = null;
    
    // Find the recipe from all possible sources
    if (this.data.isSearchMode) {
      recipe = this.data.searchResults.find(item => item.id === recipeId);
    } else if (this.data.showDiyGuidance && this.data.currentRecipe?.id === recipeId) {
      recipe = this.data.currentRecipe;
    } else {
      recipe = this.data.recipes.find(item => item.id === recipeId) || 
               this.data.popularRecipes.find(item => item.id === recipeId);
    }
    
    if (!recipe) return;
    
    // Get current favorite recipes
    let favoriteRecipes = [...this.data.favoriteRecipes];
    const isFavorite = favoriteRecipes.some(item => item.id === recipeId);
    
    if (isFavorite) {
      // Remove from favorites
      favoriteRecipes = favoriteRecipes.filter(item => item.id !== recipeId);
      wx.showToast({
        title: '已取消收藏',
        icon: 'success'
      });
    } else {
      // Add to favorites
      favoriteRecipes.push(recipe);
      wx.showToast({
        title: '已收藏',
        icon: 'success'
      });
    }
    
    // Update favorites in storage
    wx.setStorageSync('favorite_recipes', favoriteRecipes);
    
    this.setData({
      favoriteRecipes
    });
    
    // Update UI to reflect favorite status
    this.updateRecipeFavoriteState(recipeId, !isFavorite);
    
    // If in favorites-only mode, refresh the displayed recipes
    if (this.data.showFavoritesOnly) {
      this.setData({
        recipes: favoriteRecipes
      });
    }
  },
  
  // Update the favorite state of a recipe in all relevant locations
  updateRecipeFavoriteState: function(recipeId, isFavorite) {
    // Update in current recipe detail
    if (this.data.currentRecipe?.id === recipeId) {
      this.setData({
        'currentRecipe.isFavorite': isFavorite
      });
    }
    
    // Update in recipes list
    const recipeIndex = this.data.recipes.findIndex(item => item.id === recipeId);
    if (recipeIndex !== -1) {
      this.setData({
        [`recipes[${recipeIndex}].isFavorite`]: isFavorite
      });
    }
    
    // Update in popular recipes
    const popularIndex = this.data.popularRecipes.findIndex(item => item.id === recipeId);
    if (popularIndex !== -1) {
      this.setData({
        [`popularRecipes[${popularIndex}].isFavorite`]: isFavorite
      });
    }
    
    // Update in search results
    if (this.data.isSearchMode) {
      const searchIndex = this.data.searchResults.findIndex(item => item.id === recipeId);
      if (searchIndex !== -1) {
        this.setData({
          [`searchResults[${searchIndex}].isFavorite`]: isFavorite
        });
      }
    }
  },
  
  // Toggle show favorites only
  toggleFavoritesOnly: function() {
    this.setData({
      showFavoritesOnly: !this.data.showFavoritesOnly,
      isSearchMode: false
    });
    
    if (this.data.showFavoritesOnly) {
      // Make sure we have the latest favorites
      this.loadFavoriteRecipes();
    } else {
      // Go back to category view
      this.fetchRecipes();
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
      showFavoritesOnly: false,
      currentPage: 1,
      hasMoreData: true
    });
    
    this.searchRecipes();
  },
  
  // Search recipes by keyword
  searchRecipes: function() {
    if (!this.data.isNetworkAvailable) {
      // If offline, search only in favorites
      this.searchOfflineRecipes();
      return;
    }
    
    this.setData({
      isLoading: true,
      loadError: false
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/recipes/search`,
      method: 'GET',
      data: {
        query: this.data.searchQuery,
        page: 1,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const recipes = res.data.items;
          
          // Mark favorite recipes
          const favoriteIds = this.data.favoriteRecipes.map(item => item.id);
          const markedRecipes = recipes.map(recipe => ({
            ...recipe,
            isFavorite: favoriteIds.includes(recipe.id)
          }));
          
          this.setData({
            searchResults: markedRecipes,
            hasMoreData: res.data.hasMore
          });
        } else {
          this.setData({
            loadError: true,
            searchResults: []
          });
          
          // Fall back to offline search
          this.searchOfflineRecipes();
        }
      },
      fail: (err) => {
        console.error('Failed to search recipes:', err);
        this.setData({
          loadError: true,
          searchResults: []
        });
        
        // Fall back to offline search
        this.searchOfflineRecipes();
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
        wx.stopPullDownRefresh();
      }
    });
  },
  
  // Search within offline/favorite recipes
  searchOfflineRecipes: function() {
    const query = this.data.searchQuery.toLowerCase();
    
    // Get all available offline content
    const favoriteRecipes = this.data.favoriteRecipes;
    const recipesCache = wx.getStorageSync('recipes_categories') || {};
    let cachedRecipes = [];
    
    // Collect recipes from all category caches
    Object.values(recipesCache).forEach(category => {
      if (category && category.items) {
        cachedRecipes = [...cachedRecipes, ...category.items];
      }
    });
    
    // Combine and deduplicate
    const allRecipes = [...favoriteRecipes];
    cachedRecipes.forEach(recipe => {
      if (!allRecipes.some(r => r.id === recipe.id)) {
        allRecipes.push(recipe);
      }
    });
    
    // Simple search in name, description, and ingredients
    const results = allRecipes.filter(recipe => 
      recipe.name.toLowerCase().includes(query) ||
      recipe.description.toLowerCase().includes(query) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(query))
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
      url: `${app.globalData.apiBaseUrl}/recipes/search`,
      method: 'GET',
      data: {
        query: this.data.searchQuery,
        page: nextPage,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const newRecipes = res.data.items;
          
          // Mark favorite recipes
          const favoriteIds = this.data.favoriteRecipes.map(item => item.id);
          const markedRecipes = newRecipes.map(recipe => ({
            ...recipe,
            isFavorite: favoriteIds.includes(recipe.id)
          }));
          
          this.setData({
            searchResults: [...this.data.searchResults, ...markedRecipes],
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
  
  // Show recipe details
  showRecipeDetail: function(e) {
    const recipeId = e.currentTarget.dataset.id;
    
    // Navigate to recipe detail page
    wx.navigateTo({
      url: `/pages/recipe-detail/recipe-detail?id=${recipeId}`
    });
  },
  
  // Show DIY step-by-step guidance
  showDiyGuidance: function(e) {
    const recipeId = e.currentTarget.dataset.id;
    let recipe = null;
    
    // Find the recipe from all possible sources
    if (this.data.isSearchMode) {
      recipe = this.data.searchResults.find(item => item.id === recipeId);
    } else {
      recipe = this.data.recipes.find(item => item.id === recipeId) || 
               this.data.popularRecipes.find(item => item.id === recipeId);
    }
    
    if (!recipe || !recipe.steps || recipe.steps.length === 0) {
      wx.showToast({
        title: '此食谱暂无制作指南',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      currentRecipe: recipe,
      currentStep: 0,
      showDiyGuidance: true
    });
  },
  
  // Navigate to next DIY step
  nextDiyStep: function() {
    if (!this.data.currentRecipe || !this.data.currentRecipe.steps) return;
    
    const nextStep = this.data.currentStep + 1;
    if (nextStep >= this.data.currentRecipe.steps.length) {
      // Last step reached, show completion
      wx.showToast({
        title: '恭喜完成制作!',
        icon: 'success'
      });
      return;
    }
    
    this.setData({
      currentStep: nextStep
    });
  },
  
  // Navigate to previous DIY step
  prevDiyStep: function() {
    if (!this.data.currentRecipe || !this.data.currentRecipe.steps) return;
    
    const prevStep = this.data.currentStep - 1;
    if (prevStep < 0) return;
    
    this.setData({
      currentStep: prevStep
    });
  },
  
  // Close DIY guidance
  closeDiyGuidance: function() {
    this.setData({
      showDiyGuidance: false,
      currentRecipe: null,
      currentStep: 0
    });
  },
  
  // Navigate to search page
  navigateToSearch: function() {
    wx.navigateTo({
      url: '/pages/recipe-search/recipe-search'
    });
  },
  
  // Share recipe
  onShareAppMessage: function(res) {
    if (res.from === 'button' && this.data.currentRecipe) {
      return {
        title: `中医养生食谱: ${this.data.currentRecipe.name}`,
        path: `/pages/recipe-detail/recipe-detail?id=${this.data.currentRecipe.id}`,
        imageUrl: this.data.currentRecipe.image
      };
    }
    
    return {
      title: '中医养生食谱',
      path: '/pages/recipe/recipe'
    };
  }
}); 