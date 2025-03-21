// diy-guidance.js
const app = getApp();

Page({
  data: {
    isLoading: true,
    loadError: false,
    
    // Recipe data
    recipeId: '',
    recipe: null,
    
    // Guidance state
    isGuidanceStarted: false,
    currentStep: 0,
    totalSteps: 0,
    
    // Timer
    showTimer: false,
    timerRunning: false,
    timerStartTime: 0,
    timerDuration: 0, // in seconds
    timerRemaining: 0, // in seconds
    timerInterval: null,
    
    // Voice guidance
    isVoiceEnabled: true,
    
    // Keep screen on
    keepScreenOn: true,
    
    // Network status
    isNetworkAvailable: true
  },
  
  onLoad: function(options) {
    // Check network status
    this.checkNetworkStatus();
    
    if (options.id) {
      this.setData({
        recipeId: options.id
      });
      
      // Fetch recipe data
      this.fetchRecipeDetails();
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
  
  onUnload: function() {
    // Clear any running timers
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
    }
    
    // Reset screen always on setting
    wx.setKeepScreenOn({
      keepScreenOn: false
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
            title: '当前处于离线模式，将使用缓存数据',
            icon: 'none',
            duration: 2000
          });
          
          // Try to load from cache
          const recipe = this.getRecipeFromCache(this.data.recipeId);
          if (recipe) {
            this.processRecipeData(recipe);
          } else {
            this.setData({
              loadError: true,
              isLoading: false
            });
            
            wx.showToast({
              title: '无法加载食谱数据',
              icon: 'none'
            });
          }
        }
      }
    });
  },
  
  // Get recipe from cache
  getRecipeFromCache: function(recipeId) {
    // Try to get from 'recipe_detail_' + recipeId
    const cachedRecipe = wx.getStorageSync('recipe_detail_' + recipeId);
    if (cachedRecipe) {
      return cachedRecipe;
    }
    
    // Try to get from favorites
    const favorites = wx.getStorageSync('favorite_recipes') || [];
    return favorites.find(item => item.id === recipeId);
  },
  
  // Fetch recipe details from API
  fetchRecipeDetails: function() {
    if (!this.data.isNetworkAvailable) {
      return;
    }
    
    this.setData({
      isLoading: true,
      loadError: false
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/recipes/${this.data.recipeId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const recipe = res.data;
          
          // Cache recipe data
          wx.setStorageSync('recipe_detail_' + recipe.id, recipe);
          
          this.processRecipeData(recipe);
        } else {
          this.setData({
            loadError: true
          });
          
          // Try to get from cache
          const recipe = this.getRecipeFromCache(this.data.recipeId);
          if (recipe) {
            this.processRecipeData(recipe);
          }
        }
      },
      fail: (err) => {
        console.error('Failed to fetch recipe details:', err);
        this.setData({
          loadError: true
        });
        
        // Try to get from cache
        const recipe = this.getRecipeFromCache(this.data.recipeId);
        if (recipe) {
          this.processRecipeData(recipe);
        }
      },
      complete: () => {
        this.setData({
          isLoading: false
        });
      }
    });
  },
  
  // Process recipe data
  processRecipeData: function(recipe) {
    this.setData({
      recipe,
      totalSteps: recipe.steps.length
    });
  },
  
  // Start DIY guidance
  startGuidance: function() {
    this.setData({
      isGuidanceStarted: true,
      currentStep: 0
    });
    
    // Keep screen on during guidance
    if (this.data.keepScreenOn) {
      wx.setKeepScreenOn({
        keepScreenOn: true
      });
    }
    
    // Read first step instruction if voice is enabled
    if (this.data.isVoiceEnabled) {
      this.readStepInstruction(0);
    }
  },
  
  // Go to next step
  nextStep: function() {
    // Stop any running timer
    this.stopTimer();
    
    if (this.data.currentStep < this.data.totalSteps - 1) {
      const nextStep = this.data.currentStep + 1;
      
      this.setData({
        currentStep: nextStep
      });
      
      // Read next step instruction if voice is enabled
      if (this.data.isVoiceEnabled) {
        this.readStepInstruction(nextStep);
      }
      
      // Check if step has a timer
      this.checkStepTimer(nextStep);
    }
  },
  
  // Go to previous step
  prevStep: function() {
    // Stop any running timer
    this.stopTimer();
    
    if (this.data.currentStep > 0) {
      const prevStep = this.data.currentStep - 1;
      
      this.setData({
        currentStep: prevStep
      });
      
      // Read previous step instruction if voice is enabled
      if (this.data.isVoiceEnabled) {
        this.readStepInstruction(prevStep);
      }
      
      // Check if step has a timer
      this.checkStepTimer(prevStep);
    }
  },
  
  // Check if current step has a timer suggestion
  checkStepTimer: function(stepIndex) {
    const step = this.data.recipe.steps[stepIndex];
    const description = step.description.toLowerCase();
    
    // Check for time mentions in the step description
    const timeRegex = /(\d+)\s*(分钟|秒钟|秒)/g;
    const matches = [...description.matchAll(timeRegex)];
    
    if (matches.length > 0) {
      // Get the first time mention
      const match = matches[0];
      const amount = parseInt(match[1]);
      const unit = match[2];
      
      // Convert to seconds
      let seconds = unit === '分钟' ? amount * 60 : amount;
      
      this.setData({
        showTimer: true,
        timerDuration: seconds,
        timerRemaining: seconds
      });
    } else {
      this.setData({
        showTimer: false
      });
    }
  },
  
  // Start timer
  startTimer: function() {
    if (this.data.timerRunning) return;
    
    const startTime = Date.now();
    
    this.setData({
      timerRunning: true,
      timerStartTime: startTime
    });
    
    // Start interval to update timer
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, this.data.timerDuration - elapsed);
      
      this.setData({
        timerRemaining: remaining
      });
      
      if (remaining <= 0) {
        this.stopTimer();
        
        // Play notification sound
        const innerAudioContext = wx.createInnerAudioContext();
        innerAudioContext.src = '/audio/timer-complete.mp3';
        innerAudioContext.play();
        
        // Vibrate
        wx.vibrateShort();
        
        // Show notification
        wx.showToast({
          title: '计时完成',
          icon: 'success'
        });
      }
    }, 1000);
    
    this.setData({
      timerInterval
    });
  },
  
  // Stop timer
  stopTimer: function() {
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
      
      this.setData({
        timerRunning: false,
        timerInterval: null
      });
    }
  },
  
  // Reset timer
  resetTimer: function() {
    this.stopTimer();
    
    this.setData({
      timerRemaining: this.data.timerDuration
    });
  },
  
  // Format timer display
  formatTime: function(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  },
  
  // Toggle voice guidance
  toggleVoice: function() {
    this.setData({
      isVoiceEnabled: !this.data.isVoiceEnabled
    });
  },
  
  // Toggle keep screen on
  toggleKeepScreenOn: function() {
    const newValue = !this.data.keepScreenOn;
    
    this.setData({
      keepScreenOn: newValue
    });
    
    wx.setKeepScreenOn({
      keepScreenOn: newValue
    });
  },
  
  // Read step instruction using text-to-speech
  readStepInstruction: function(stepIndex) {
    const step = this.data.recipe.steps[stepIndex];
    
    // WeChat Mini Program TTS API
    wx.textToSpeech({
      lang: 'zh_CN',
      content: `步骤${stepIndex + 1}，${step.description}`,
      success: function(res) {
        const innerAudioContext = wx.createInnerAudioContext();
        innerAudioContext.src = res.filename;
        innerAudioContext.play();
      },
      fail: function(res) {
        console.error('TTS failed:', res);
      }
    });
  },
  
  // Exit guidance mode
  exitGuidance: function() {
    wx.showModal({
      title: '确认退出',
      content: '是否确认退出制作指引模式？',
      confirmText: '确认',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // Stop timer if running
          this.stopTimer();
          
          // Reset guidance state
          this.setData({
            isGuidanceStarted: false,
            currentStep: 0
          });
          
          // Turn off keep screen on
          wx.setKeepScreenOn({
            keepScreenOn: false
          });
        }
      }
    });
  },
  
  // Navigate back
  navigateBack: function() {
    wx.navigateBack();
  },
  
  // Share recipe
  onShareAppMessage: function() {
    return {
      title: `${this.data.recipe.name} - 中医养生食谱`,
      path: `/pages/recipe-detail/recipe-detail?id=${this.data.recipe.id}`,
      imageUrl: this.data.recipe.image
    };
  }
}); 