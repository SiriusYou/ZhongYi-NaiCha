// health.js
const app = getApp();
const utils = require('../../utils/util.js');
const syncUtils = require('../../utils/sync.js');
const profileService = require('../../utils/profile.js');
// Import chart component
let wxCharts;
// Try to import wxCharts if available
try {
  wxCharts = require('../../utils/wxcharts.js');
} catch (e) {
  console.error('wxCharts not found, charts will not be available', e);
}

// Import echarts
let echarts;
try {
  echarts = require('../../utils/echarts.min.js');
} catch (e) {
  console.error('ECharts not found, advanced charts will not be available', e);
}

// Initialize ec-canvas function
function initChart(canvas, width, height, dpr) {
  const chart = echarts.init(canvas, null, {
    width: width,
    height: height,
    devicePixelRatio: dpr
  });
  canvas.setChart(chart);
  return chart;
}

Page({
  data: {
    isSetup: false,
    isLoading: false,
    saveSuccess: false,
    saveError: '',
    
    // Tab management
    activeTab: 'profile',
    
    // User health data
    basicInfo: {
      age: '',
      gender: 'male', // default to male
      height: '',
      weight: ''
    },
    
    // TCM constitution types
    constitutionTypes: [
      { id: 'balanced', name: '平和质', selected: false, description: '体形匀称、面色红润、精力充沛、性格平和' },
      { id: 'qi_deficiency', name: '气虚质', selected: false, description: '疲乏无力、容易出汗、说话声音低弱' },
      { id: 'yang_deficiency', name: '阳虚质', selected: false, description: '怕冷、手脚发凉、喜温热食物' },
      { id: 'yin_deficiency', name: '阴虚质', selected: false, description: '手心发热、口燥咽干、手脚心热' },
      { id: 'phlegm_dampness', name: '痰湿质', selected: false, description: '体形肥胖、腹部肥满松软、皮肤油腻' },
      { id: 'damp_heat', name: '湿热质', selected: false, description: '面垢油光、易生痤疮、口苦口臭' },
      { id: 'blood_stasis', name: '血瘀质', selected: false, description: '面色晦暗、肤色紫暗、容易有瘀斑' },
      { id: 'qi_stagnation', name: '气郁质', selected: false, description: '情绪波动大、容易忧郁、胸胁胀满' },
      { id: 'special', name: '特禀质', selected: false, description: '对特定物质容易过敏、体质敏感' }
    ],
    
    // Health goals
    healthGoals: [
      { id: 'energy', name: '提升精力', selected: false },
      { id: 'sleep', name: '改善睡眠', selected: false },
      { id: 'digestion', name: '促进消化', selected: false },
      { id: 'immunity', name: '增强免疫', selected: false },
      { id: 'stress', name: '缓解压力', selected: false },
      { id: 'beauty', name: '美容养颜', selected: false },
      { id: 'weight', name: '体重管理', selected: false }
    ],

    // Common health symptoms
    symptoms: [
      { id: 'fatigue', name: '疲劳乏力', selected: false },
      { id: 'insomnia', name: '失眠多梦', selected: false },
      { id: 'headache', name: '头痛头晕', selected: false },
      { id: 'digestive', name: '消化不良', selected: false },
      { id: 'dry_mouth', name: '口干舌燥', selected: false },
      { id: 'cold_hands', name: '手脚冰凉', selected: false },
      { id: 'irritability', name: '烦躁易怒', selected: false },
      { id: 'bloating', name: '腹胀便秘', selected: false }
    ],
    
    // Health tracking data
    currentDate: '',
    isSavingTracking: false,
    metrics: {
      sleep: 7,
      water: 4,
      mood: 'neutral',
      weight: '',
      activity: 30,
      food: ''
    },
    dailySymptoms: [
      { id: 'fatigue', name: '疲劳乏力', selected: false },
      { id: 'insomnia', name: '失眠多梦', selected: false },
      { id: 'headache', name: '头痛头晕', selected: false },
      { id: 'digestive', name: '消化不良', selected: false },
      { id: 'dry_mouth', name: '口干舌燥', selected: false },
      { id: 'cold_hands', name: '手脚冰凉', selected: false },
      { id: 'irritability', name: '烦躁易怒', selected: false },
      { id: 'bloating', name: '腹胀便秘', selected: false }
    ],
    
    // Insights data
    insightsPeriod: 'week',
    insights: [],
    sleepData: [],
    weightData: [],
    waterData: [],
    activityData: [],
    
    // Other settings
    showConstitutionInfo: false,
    currentConstitution: null,
    
    // ECharts configuration
    ecSleep: {
      onInit: initChart
    },
    ecWeight: {
      onInit: initChart
    },
    ecWater: {
      onInit: initChart
    },
    ecActivity: {
      onInit: initChart
    }
  },

  onLoad: function(options) {
    // Check if this is profile setup
    this.setData({
      isSetup: options.setup === 'true'
    });
    
    // Setup current date
    const today = new Date();
    const formattedDate = utils.formatDate(today);
    this.setData({
      currentDate: formattedDate
    });
    
    // If not setup mode, load user profile
    if (!this.data.isSetup) {
      this.loadUnifiedProfile();
    }
    
    // Load today's health tracking data
    this.loadTrackingData(formattedDate);
    
    // Load insights data based on default period (week)
    this.loadInsightsData('week');
    
    // Check for data that needs to be synced
    this.checkAndSyncData();
  },
  
  onShow: function() {
    // When page becomes visible again, refresh insights data if on insights tab
    if (this.data.activeTab === 'insights') {
      this.loadInsightsData(this.data.insightsPeriod);
    }
  },

  // Tab switching
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
    
    // Load data if switching to insights tab
    if (tab === 'insights') {
      this.loadInsightsData(this.data.insightsPeriod);
      
      // Render charts after a slight delay to ensure DOM is ready
      setTimeout(() => {
        this.renderCharts();
      }, 300);
    }
  },

  // Load unified profile
  loadUnifiedProfile: function() {
    this.setData({ isLoading: true });
    
    profileService.getUnifiedProfile()
      .then(profile => {
        // Update basic info
        this.setData({
          'basicInfo.age': profile.age || '',
          'basicInfo.gender': profile.gender || 'male',
          'basicInfo.height': profile.height || '',
          'basicInfo.weight': profile.weight || ''
        });
        
        // Update constitution types if they exist
        if (profile.constitutionTypes && profile.constitutionTypes.length > 0) {
          const constitutionTypes = this.data.constitutionTypes.map(type => {
            return {
              ...type,
              selected: profile.constitutionTypes.includes(type.id)
            };
          });
          
          this.setData({ constitutionTypes });
        }
        
        // Update health goals if they exist
        if (profile.healthGoals && profile.healthGoals.length > 0) {
          const healthGoals = this.data.healthGoals.map(goal => {
            return {
              ...goal,
              selected: profile.healthGoals.includes(goal.id)
            };
          });
          
          this.setData({ healthGoals });
        }
        
        // Update symptoms if they exist
        if (profile.symptoms && profile.symptoms.length > 0) {
          const symptoms = this.data.symptoms.map(symptom => {
            return {
              ...symptom,
              selected: profile.symptoms.includes(symptom.id)
            };
          });
          
          this.setData({ symptoms });
        }
        
        console.log('统一个人资料加载成功', profile);
      })
      .catch(err => {
        console.error('加载统一个人资料失败:', err);
        
        // Fallback to local loading if available
        const localProfile = wx.getStorageSync('user_profile');
        if (localProfile) {
          // Update basic info
          this.setData({
            'basicInfo.age': localProfile.age || '',
            'basicInfo.gender': localProfile.gender || 'male',
            'basicInfo.height': localProfile.height || '',
            'basicInfo.weight': localProfile.weight || ''
          });
          
          // Update constitution types if they exist
          if (localProfile.constitutionTypes && localProfile.constitutionTypes.length > 0) {
            const constitutionTypes = this.data.constitutionTypes.map(type => {
              return {
                ...type,
                selected: localProfile.constitutionTypes.includes(type.id)
              };
            });
            
            this.setData({ constitutionTypes });
          }
          
          // Update health goals if they exist
          if (localProfile.healthGoals && localProfile.healthGoals.length > 0) {
            const healthGoals = this.data.healthGoals.map(goal => {
              return {
                ...goal,
                selected: localProfile.healthGoals.includes(goal.id)
              };
            });
            
            this.setData({ healthGoals });
          }
          
          // Update symptoms if they exist
          if (localProfile.symptoms && localProfile.symptoms.length > 0) {
            const symptoms = this.data.symptoms.map(symptom => {
              return {
                ...symptom,
                selected: localProfile.symptoms.includes(symptom.id)
              };
            });
            
            this.setData({ symptoms });
          }
        } else {
          wx.showToast({
            title: '获取健康档案失败',
            icon: 'none'
          });
        }
      })
      .finally(() => {
        this.setData({ isLoading: false });
      });
  },

  // Update basic info fields
  updateBasicInfo: function(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`basicInfo.${field}`]: value
    });
  },
  
  // Update gender selection
  updateGender: function(e) {
    const gender = e.detail.value;
    
    this.setData({
      'basicInfo.gender': gender
    });
  },

  // Toggle constitution type selection
  toggleConstitution: function(e) {
    const { index } = e.currentTarget.dataset;
    const constitutionTypes = this.data.constitutionTypes;
    
    constitutionTypes[index].selected = !constitutionTypes[index].selected;
    
    this.setData({
      constitutionTypes
    });
  },

  // Show constitution info modal
  showConstitutionInfo: function(e) {
    const { index } = e.currentTarget.dataset;
    
    this.setData({
      showConstitutionInfo: true,
      currentConstitution: this.data.constitutionTypes[index]
    });
  },

  // Close constitution info modal
  closeConstitutionInfo: function() {
    this.setData({
      showConstitutionInfo: false,
      currentConstitution: null
    });
  },

  // Toggle health goal selection
  toggleHealthGoal: function(e) {
    const { index } = e.currentTarget.dataset;
    const healthGoals = this.data.healthGoals;
    
    healthGoals[index].selected = !healthGoals[index].selected;
    
    this.setData({
      healthGoals
    });
  },

  // Toggle symptom selection
  toggleSymptom: function(e) {
    const { index } = e.currentTarget.dataset;
    const symptoms = this.data.symptoms;
    
    symptoms[index].selected = !symptoms[index].selected;
    
    this.setData({
      symptoms
    });
  },

  // Validate form before submission
  validateForm: function() {
    const { basicInfo, constitutionTypes } = this.data;
    
    if (!basicInfo.age || !basicInfo.height || !basicInfo.weight) {
      wx.showToast({
        title: '请填写基本信息',
        icon: 'none'
      });
      return false;
    }
    
    // Check if at least one constitution type is selected
    const hasSelectedConstitution = constitutionTypes.some(type => type.selected);
    if (!hasSelectedConstitution) {
      wx.showToast({
        title: '请选择至少一种体质类型',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  // Update saveProfile to use unified profile service
  saveProfile: function() {
    if (!this.validateForm()) {
      return;
    }
    
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      wx.redirectTo({
        url: '/pages/auth/auth'
      });
      return;
    }
    
    const { basicInfo, constitutionTypes, healthGoals, symptoms } = this.data;
    
    // Get all selected constitution types
    const selectedConstitutionTypes = constitutionTypes
      .filter(type => type.selected)
      .map(type => type.id);
      
    // Get all selected health goals
    const selectedHealthGoals = healthGoals
      .filter(goal => goal.selected)
      .map(goal => goal.id);
      
    // Get all selected symptoms
    const selectedSymptoms = symptoms
      .filter(symptom => symptom.selected)
      .map(symptom => symptom.id);
    
    const profile = {
      age: parseInt(basicInfo.age),
      gender: basicInfo.gender,
      height: parseFloat(basicInfo.height),
      weight: parseFloat(basicInfo.weight),
      constitutionTypes: selectedConstitutionTypes,
      healthGoals: selectedHealthGoals,
      symptoms: selectedSymptoms
    };
    
    this.setData({ isLoading: true });
    
    // Use unified profile service to update
    profileService.updateUnifiedProfile(profile)
      .then(result => {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
          
        // If setup mode, navigate to home
        if (this.data.isSetup) {
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }, 1500);
        }
      })
      .catch(err => {
        console.error('更新个人资料失败:', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      })
      .finally(() => {
        this.setData({ isLoading: false });
      });
  },
  
  // ===== Health Tracking Functions =====
  
  // Load tracking data for a specific date
  loadTrackingData: function(date) {
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/health-tracking/${date}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const data = res.data;
          
          // Update metrics
          this.setData({
            metrics: {
              sleep: data.sleep || 7,
              water: data.water || 4,
              mood: data.mood || 'neutral',
              weight: data.weight || '',
              activity: data.activity || 30,
              food: data.food || ''
            }
          });
          
          // Update daily symptoms
          if (data.symptoms && data.symptoms.length > 0) {
            const dailySymptoms = this.data.dailySymptoms.map(symptom => {
              return {
                ...symptom,
                selected: data.symptoms.includes(symptom.id)
              };
            });
            
            this.setData({ dailySymptoms });
          } else {
            // Reset symptoms if none selected
            const dailySymptoms = this.data.dailySymptoms.map(symptom => {
              return {
                ...symptom,
                selected: false
              };
            });
            
            this.setData({ dailySymptoms });
          }
        } else {
          // If no data or error, reset to defaults
          this.resetTrackingData();
        }
      },
      fail: (err) => {
        console.error('Failed to load tracking data:', err);
        this.resetTrackingData();
      }
    });
  },
  
  // Reset tracking data to defaults
  resetTrackingData: function() {
    // Use current weight from profile if available
    const weight = this.data.basicInfo.weight || '';
    
    this.setData({
      metrics: {
        sleep: 7,
        water: 4,
        mood: 'neutral',
        weight: weight,
        activity: 30,
        food: ''
      },
      dailySymptoms: this.data.dailySymptoms.map(symptom => {
        return {
          ...symptom,
          selected: false
        };
      })
    });
  },
  
  // Navigate to previous day
  previousDay: function() {
    const currentDate = new Date(this.data.currentDate);
    currentDate.setDate(currentDate.getDate() - 1);
    const formattedDate = utils.formatDate(currentDate);
    
    this.setData({
      currentDate: formattedDate
    });
    
    this.loadTrackingData(formattedDate);
  },
  
  // Navigate to next day
  nextDay: function() {
    const currentDate = new Date(this.data.currentDate);
    const today = new Date();
    
    // Prevent selecting future dates
    if (currentDate.getTime() >= today.setHours(0, 0, 0, 0)) {
      wx.showToast({
        title: '不能选择未来日期',
        icon: 'none'
      });
      return;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
    const formattedDate = utils.formatDate(currentDate);
    
    this.setData({
      currentDate: formattedDate
    });
    
    this.loadTrackingData(formattedDate);
  },
  
  // Update metric values
  updateMetric: function(e) {
    const { metric } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setData({
      [`metrics.${metric}`]: value
    });
  },
  
  // Update weight
  updateWeight: function(e) {
    this.setData({
      'metrics.weight': e.detail.value
    });
  },
  
  // Update activity
  updateActivity: function(e) {
    this.setData({
      'metrics.activity': e.detail.value
    });
  },
  
  // Update food input
  updateFood: function(e) {
    this.setData({
      'metrics.food': e.detail.value
    });
  },
  
  // Select mood
  selectMood: function(e) {
    const { mood } = e.currentTarget.dataset;
    
    this.setData({
      'metrics.mood': mood
    });
  },
  
  // Toggle daily symptom
  toggleDailySymptom: function(e) {
    const { index } = e.currentTarget.dataset;
    const dailySymptoms = this.data.dailySymptoms;
    
    dailySymptoms[index].selected = !dailySymptoms[index].selected;
    
    this.setData({
      dailySymptoms
    });
  },
  
  // Save tracking data
  saveTracking: function() {
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      wx.redirectTo({
        url: '/pages/auth/auth'
      });
      return;
    }
    
    // Validate weight if provided
    if (this.data.metrics.weight && isNaN(parseFloat(this.data.metrics.weight))) {
      wx.showToast({
        title: '请输入有效的体重',
        icon: 'none'
      });
      return;
    }
    
    // Validate activity if provided
    if (this.data.metrics.activity && isNaN(parseInt(this.data.metrics.activity))) {
      wx.showToast({
        title: '请输入有效的活动时间',
        icon: 'none'
      });
      return;
    }
    
    const { metrics, dailySymptoms, currentDate } = this.data;
    
    // Get selected symptoms
    const selectedSymptoms = dailySymptoms
      .filter(symptom => symptom.selected)
      .map(symptom => symptom.id);
    
    const trackingData = {
      date: currentDate,
      sleep: parseFloat(metrics.sleep),
      water: parseInt(metrics.water),
      mood: metrics.mood,
      weight: metrics.weight ? parseFloat(metrics.weight) : null,
      activity: metrics.activity ? parseInt(metrics.activity) : null,
      food: metrics.food,
      symptoms: selectedSymptoms,
      timestamp: Date.now()
    };
    
    this.setData({ isSavingTracking: true });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/health-tracking`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: trackingData,
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          // Store tracking data locally
          const healthTracking = wx.getStorageSync('health_tracking') || {};
          healthTracking[currentDate] = trackingData;
          wx.setStorageSync('health_tracking', healthTracking);
          wx.setStorageSync('health_timestamp', trackingData.timestamp);
          
          // Sync health data across platforms
          syncUtils.syncHealthData({
            tracking: healthTracking,
            timestamp: trackingData.timestamp
          })
            .then(syncResult => {
              console.log('健康数据同步成功', syncResult);
            })
            .catch(syncErr => {
              console.error('健康数据同步失败:', syncErr);
            });
            
          wx.showToast({
            title: '记录保存成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Failed to save tracking data:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({ isSavingTracking: false });
      }
    });
  },
  
  // ===== Insights Functions =====
  
  // Change insights period
  changePeriod: function(e) {
    const { period } = e.currentTarget.dataset;
    
    this.setData({
      insightsPeriod: period
    });
    
    this.loadInsightsData(period);
  },
  
  // Load insights data
  loadInsightsData: function(period) {
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/health-insights/${period}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const data = res.data;
          
          // Update chart data
          this.setData({
            sleepData: data.sleep || [],
            weightData: data.weight || [],
            waterData: data.water || [],
            activityData: data.activity || [],
            insights: data.insights || []
          });
          
          // Store insights data locally with timestamp
          const healthInsights = {
            period: period,
            sleep: data.sleep,
            weight: data.weight,
            water: data.water,
            activity: data.activity,
            insights: data.insights,
            timestamp: Date.now()
          };
          
          wx.setStorageSync('health_insights', healthInsights);
          
          // Sync insights data after loading
          const healthTracking = wx.getStorageSync('health_tracking') || {};
          syncUtils.syncHealthData({
            tracking: healthTracking,
            insights: healthInsights,
            timestamp: healthInsights.timestamp
          })
            .then(syncResult => {
              console.log('洞察数据同步成功', syncResult);
            })
            .catch(syncErr => {
              console.error('洞察数据同步失败:', syncErr);
            });
          
          // Render charts
          this.renderCharts();
        } else {
          // Show no data message
          this.setData({
            sleepData: [],
            weightData: [],
            waterData: [],
            activityData: [],
            insights: []
          });
        }
      },
      fail: (err) => {
        console.error('Failed to load insights data:', err);
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
      }
    });
  },
  
  // Render all charts
  renderCharts: function() {
    // If echarts is available, use it for advanced charts
    if (echarts) {
      // Initialize chart components if data is available
      this.initSleepChart();
      this.initWeightChart();
      this.initWaterChart();
      this.initActivityChart();
    } 
    // Fallback to wxCharts if echarts is not available
    else if (wxCharts) {
      console.log('Using wxCharts as fallback');
      
      // Render sleep chart
      if (this.data.sleepData.length > 0) {
        this.renderSleepChart();
      }
      
      // Render weight chart
      if (this.data.weightData.length > 0) {
        this.renderWeightChart();
      }
      
      // Render water chart
      if (this.data.waterData.length > 0) {
        this.renderWaterChart();
      }
      
      // Render activity chart
      if (this.data.activityData.length > 0) {
        this.renderActivityChart();
      }
    } else {
      console.warn('No chart library available');
    }
  },
  
  // Initialize sleep chart with ECharts
  initSleepChart: function() {
    if (this.data.sleepData.length === 0) return;
    
    const data = this.data.sleepData;
    const categories = data.map(item => item.date);
    const series = data.map(item => item.value);
    
    const ecComponent = this.selectComponent('#ec-sleep');
    if (ecComponent && ecComponent.chart) {
      const chart = ecComponent.chart;
      
      const option = {
        title: {
          text: '睡眠趋势',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: {c} 小时'
        },
        xAxis: {
          type: 'category',
          data: categories
        },
        yAxis: {
          type: 'value',
          name: '小时',
          min: 0
        },
        series: [{
          data: series,
          type: 'line',
          smooth: true,
          name: '睡眠',
          itemStyle: {
            color: '#8a2be2'
          }
        }]
      };
      
      chart.setOption(option);
    }
  },
  
  // Initialize weight chart with ECharts
  initWeightChart: function() {
    if (this.data.weightData.length === 0) return;
    
    const data = this.data.weightData;
    const categories = data.map(item => item.date);
    const series = data.map(item => item.value);
    
    const ecComponent = this.selectComponent('#ec-weight');
    if (ecComponent && ecComponent.chart) {
      const chart = ecComponent.chart;
      
      const option = {
        title: {
          text: '体重趋势',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: {c} kg'
        },
        xAxis: {
          type: 'category',
          data: categories
        },
        yAxis: {
          type: 'value',
          name: 'kg',
          scale: true
        },
        series: [{
          data: series,
          type: 'line',
          smooth: true,
          name: '体重',
          itemStyle: {
            color: '#ff7f50'
          }
        }]
      };
      
      chart.setOption(option);
    }
  },
  
  // Initialize water chart with ECharts
  initWaterChart: function() {
    if (this.data.waterData.length === 0) return;
    
    const data = this.data.waterData;
    const categories = data.map(item => item.date);
    const series = data.map(item => item.value);
    
    const ecComponent = this.selectComponent('#ec-water');
    if (ecComponent && ecComponent.chart) {
      const chart = ecComponent.chart;
      
      const option = {
        title: {
          text: '水分摄入',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: {c} 杯'
        },
        xAxis: {
          type: 'category',
          data: categories
        },
        yAxis: {
          type: 'value',
          name: '杯',
          min: 0
        },
        series: [{
          data: series,
          type: 'bar',
          name: '水分摄入',
          itemStyle: {
            color: '#1e90ff'
          }
        }]
      };
      
      chart.setOption(option);
    }
  },
  
  // Initialize activity chart with ECharts
  initActivityChart: function() {
    if (this.data.activityData.length === 0) return;
    
    const data = this.data.activityData;
    const categories = data.map(item => item.date);
    const series = data.map(item => item.value);
    
    const ecComponent = this.selectComponent('#ec-activity');
    if (ecComponent && ecComponent.chart) {
      const chart = ecComponent.chart;
      
      const option = {
        title: {
          text: '活动时间',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          formatter: '{b}: {c} 分钟'
        },
        xAxis: {
          type: 'category',
          data: categories
        },
        yAxis: {
          type: 'value',
          name: '分钟',
          min: 0
        },
        series: [{
          data: series,
          type: 'bar',
          name: '活动时间',
          itemStyle: {
            color: '#32cd32'
          }
        }]
      };
      
      chart.setOption(option);
    }
  },
  
  // Legacy chart rendering with wxCharts (fallback)
  renderSleepChart: function() {
    const data = this.data.sleepData;
    const categories = data.map(item => item.date);
    const series = data.map(item => item.value);
    
    new wxCharts({
      canvasId: 'sleepChart',
      type: 'line',
      categories: categories,
      series: [{
        name: '睡眠时间',
        data: series,
        format: function (val) {
          return val + '小时';
        }
      }],
      yAxis: {
        title: '小时',
        format: function (val) {
          return val.toFixed(1);
        },
        min: 0
      },
      width: 320,
      height: 200,
      dataLabel: false,
      dataPointShape: true,
      extra: {
        lineStyle: 'curve'
      }
    });
  },
  
  // Render weight chart
  renderWeightChart: function() {
    const data = this.data.weightData;
    const categories = data.map(item => item.date);
    const series = data.map(item => item.value);
    
    new wxCharts({
      canvasId: 'weightChart',
      type: 'line',
      categories: categories,
      series: [{
        name: '体重',
        data: series,
        format: function (val) {
          return val + 'kg';
        }
      }],
      yAxis: {
        title: 'kg',
        format: function (val) {
          return val.toFixed(1);
        }
      },
      width: 320,
      height: 200,
      dataLabel: false,
      dataPointShape: true,
      extra: {
        lineStyle: 'curve'
      }
    });
  },
  
  // Render water chart
  renderWaterChart: function() {
    const data = this.data.waterData;
    const categories = data.map(item => item.date);
    const series = data.map(item => item.value);
    
    new wxCharts({
      canvasId: 'waterChart',
      type: 'column',
      categories: categories,
      series: [{
        name: '水分摄入',
        data: series,
        format: function (val) {
          return val + '杯';
        }
      }],
      yAxis: {
        format: function (val) {
          return val;
        },
        min: 0
      },
      width: 320,
      height: 200,
      dataLabel: false,
      extra: {
        column: {
          width: 15
        }
      }
    });
  },
  
  // Render activity chart
  renderActivityChart: function() {
    const data = this.data.activityData;
    const categories = data.map(item => item.date);
    const series = data.map(item => item.value);
    
    new wxCharts({
      canvasId: 'activityChart',
      type: 'column',
      categories: categories,
      series: [{
        name: '活动时间',
        data: series,
        format: function (val) {
          return val + '分钟';
        }
      }],
      yAxis: {
        format: function (val) {
          return val;
        },
        min: 0
      },
      width: 320,
      height: 200,
      dataLabel: false,
      extra: {
        column: {
          width: 15
        }
      }
    });
  },
  
  // Generate health report
  generateReport: function() {
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      wx.redirectTo({
        url: '/pages/auth/auth'
      });
      return;
    }
    
    wx.showLoading({
      title: '生成报告中',
    });
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/health-insights/report`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        wx.hideLoading();
        
        if (res.statusCode === 200 && res.data && res.data.reportUrl) {
          // Download the report
          wx.downloadFile({
            url: res.data.reportUrl,
            success: function (res) {
              const filePath = res.tempFilePath;
              
              // Open the report
              wx.openDocument({
                filePath: filePath,
                fileType: 'pdf',
                success: function (res) {
                  console.log('Report opened successfully');
                },
                fail: function(err) {
                  console.error('Failed to open report:', err);
                  wx.showToast({
                    title: '无法打开报告',
                    icon: 'none'
                  });
                }
              });
            },
            fail: function(err) {
              console.error('Failed to download report:', err);
              wx.showToast({
                title: '下载报告失败',
                icon: 'none'
              });
            }
          });
        } else {
          wx.showToast({
            title: '生成报告失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('Failed to generate report:', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },
  
  checkAndSyncData: function() {
    // Auto sync with 30 min threshold (1800000 ms)
    syncUtils.autoSync(1800000)
      .then(syncResult => {
        if (syncResult.synced) {
          console.log('数据同步完成', syncResult);
          // Reload data after sync
          this.loadUnifiedProfile();
          this.loadCurrentDateTracking();
          if (this.data.activeTab === 'insights') {
            this.loadInsightsData(this.data.insightsPeriod);
          }
          wx.showToast({
            title: '数据已同步',
            icon: 'success',
            duration: 1500
          });
        }
      })
      .catch(err => {
        console.error('自动同步失败:', err);
      });
  },
  
  /**
   * Force sync all data manually
   */
  forceSync: function() {
    wx.showLoading({
      title: '同步数据中...',
    });
    
    syncUtils.pullLatestData()
      .then(result => {
        wx.hideLoading();
        console.log('强制同步完成', result);
        
        // Reload data after sync
        this.loadUnifiedProfile();
        this.loadCurrentDateTracking();
        if (this.data.activeTab === 'insights') {
          this.loadInsightsData(this.data.insightsPeriod);
        }
        
        wx.showToast({
          title: '数据已同步',
          icon: 'success',
          duration: 1500
        });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('强制同步失败:', err);
        wx.showToast({
          title: '同步失败',
          icon: 'none',
          duration: 1500
        });
      });
  },
  
  // Update the loadCurrentDateTracking method to sync tracking data
  loadCurrentDateTracking: function() {
    const token = wx.getStorageSync('auth_token');
    if (!token) {
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/health-tracking/${this.data.currentDate}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const data = res.data;
          
          // Update metrics
          this.setData({
            metrics: {
              sleep: data.sleep || 7,
              water: data.water || 4,
              mood: data.mood || 'neutral',
              weight: data.weight || '',
              activity: data.activity || 30,
              food: data.food || ''
            }
          });
          
          // Update daily symptoms
          if (data.symptoms && data.symptoms.length > 0) {
            const dailySymptoms = this.data.dailySymptoms.map(symptom => {
              return {
                ...symptom,
                selected: data.symptoms.includes(symptom.id)
              };
            });
            
            this.setData({ dailySymptoms });
          } else {
            // Reset symptoms if none selected
            const dailySymptoms = this.data.dailySymptoms.map(symptom => {
              return {
                ...symptom,
                selected: false
              };
            });
            
            this.setData({ dailySymptoms });
          }
        } else {
          // If no data or error, reset to defaults
          this.resetTrackingData();
        }
      },
      fail: (err) => {
        console.error('Failed to load tracking data:', err);
        this.resetTrackingData();
      }
    });
  }
}); 