// recipe-create.js
const app = getApp();

Page({
  data: {
    isLoading: false,
    isSubmitting: false,
    
    // Recipe data
    recipeName: '',
    recipeDescription: '',
    difficulty: 2, // 1-5 scale, default medium
    prepTime: 30, // in minutes
    cookingTime: 30, // in minutes
    servings: 2,
    calories: '',
    
    // Recipe categories
    categories: [
      { id: 'tea', name: '茶饮', selected: false },
      { id: 'soup', name: '汤品', selected: false },
      { id: 'food', name: '食品', selected: true },
      { id: 'medicinal', name: '药膳', selected: false },
      { id: 'seasonal', name: '时令', selected: false }
    ],
    selectedCategory: 'food',
    
    // TCM properties
    tcmProperties: [
      { id: 'warm', name: '温性', selected: false },
      { id: 'cold', name: '寒性', selected: false },
      { id: 'hot', name: '热性', selected: false },
      { id: 'cool', name: '凉性', selected: false },
      { id: 'neutral', name: '平性', selected: true }
    ],
    selectedProperty: 'neutral',
    
    // Ingredients
    ingredients: [
      { name: '', amount: '', unit: '克', id: 1 }
    ],
    unitOptions: ['克', '毫升', '汤匙', '茶匙', '个', '片', '杯', '适量'],
    nextIngredientId: 2,
    
    // Steps
    steps: [
      { description: '', image: '', id: 1 }
    ],
    nextStepId: 2,
    
    // Health benefits
    healthBenefits: '',
    
    // Suitable constitutions
    constitutions: [],
    
    // Photo/Image
    recipeImage: '', // URL of the uploaded image
    
    // Error message
    errorMessage: '',
    
    // Network status
    isNetworkAvailable: true
  },
  
  onLoad: function() {
    // Check network status
    this.checkNetworkStatus();
    
    // Load TCM constitutions
    this.setData({
      constitutions: app.globalData.tcmConstitutions.map(item => ({
        ...item,
        selected: false
      }))
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
            title: '当前处于离线模式，部分功能可能不可用',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },
  
  // Handle input changes
  onInputChange: function(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [field]: e.detail.value
    });
  },
  
  // Handle number input changes with validation
  onNumberInputChange: function(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    // Ensure value is a valid number
    if (value === '' || /^\d+$/.test(value)) {
      this.setData({
        [field]: value
      });
    }
  },
  
  // Handle category selection
  onCategorySelect: function(e) {
    const { categoryId } = e.currentTarget.dataset;
    
    const updatedCategories = this.data.categories.map(category => ({
      ...category,
      selected: category.id === categoryId
    }));
    
    this.setData({
      categories: updatedCategories,
      selectedCategory: categoryId
    });
  },
  
  // Handle TCM property selection
  onPropertySelect: function(e) {
    const { propertyId } = e.currentTarget.dataset;
    
    const updatedProperties = this.data.tcmProperties.map(property => ({
      ...property,
      selected: property.id === propertyId
    }));
    
    this.setData({
      tcmProperties: updatedProperties,
      selectedProperty: propertyId
    });
  },
  
  // Handle constitution toggle
  onConstitutionToggle: function(e) {
    const { constitutionId } = e.currentTarget.dataset;
    const index = this.data.constitutions.findIndex(item => item.id === constitutionId);
    
    if (index !== -1) {
      const updatedConstitutions = [...this.data.constitutions];
      updatedConstitutions[index].selected = !updatedConstitutions[index].selected;
      
      this.setData({
        constitutions: updatedConstitutions
      });
    }
  },
  
  // Add new ingredient field
  addIngredient: function() {
    const ingredients = [...this.data.ingredients];
    ingredients.push({
      name: '',
      amount: '',
      unit: '克',
      id: this.data.nextIngredientId
    });
    
    this.setData({
      ingredients,
      nextIngredientId: this.data.nextIngredientId + 1
    });
  },
  
  // Remove ingredient
  removeIngredient: function(e) {
    const { id } = e.currentTarget.dataset;
    
    // Don't remove if it's the last ingredient
    if (this.data.ingredients.length <= 1) {
      return;
    }
    
    const ingredients = this.data.ingredients.filter(item => item.id !== id);
    
    this.setData({
      ingredients
    });
  },
  
  // Update ingredient field
  updateIngredient: function(e) {
    const { id, field } = e.currentTarget.dataset;
    const { value } = e.detail;
    const index = this.data.ingredients.findIndex(item => item.id === id);
    
    if (index !== -1) {
      const ingredients = [...this.data.ingredients];
      ingredients[index][field] = value;
      
      this.setData({
        ingredients
      });
    }
  },
  
  // Change ingredient unit
  changeIngredientUnit: function(e) {
    const { id } = e.currentTarget.dataset;
    const { value } = e.detail;
    const index = this.data.ingredients.findIndex(item => item.id === id);
    
    if (index !== -1) {
      const ingredients = [...this.data.ingredients];
      ingredients[index].unit = this.data.unitOptions[value];
      
      this.setData({
        ingredients
      });
    }
  },
  
  // Add new step
  addStep: function() {
    const steps = [...this.data.steps];
    steps.push({
      description: '',
      image: '',
      id: this.data.nextStepId
    });
    
    this.setData({
      steps,
      nextStepId: this.data.nextStepId + 1
    });
  },
  
  // Remove step
  removeStep: function(e) {
    const { id } = e.currentTarget.dataset;
    
    // Don't remove if it's the last step
    if (this.data.steps.length <= 1) {
      return;
    }
    
    const steps = this.data.steps.filter(item => item.id !== id);
    
    this.setData({
      steps
    });
  },
  
  // Update step field
  updateStep: function(e) {
    const { id } = e.currentTarget.dataset;
    const { value } = e.detail;
    const index = this.data.steps.findIndex(item => item.id === id);
    
    if (index !== -1) {
      const steps = [...this.data.steps];
      steps[index].description = value;
      
      this.setData({
        steps
      });
    }
  },
  
  // Choose image for step
  chooseStepImage: function(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        const index = this.data.steps.findIndex(item => item.id === id);
        
        if (index !== -1) {
          const steps = [...this.data.steps];
          steps[index].image = tempFilePath;
          
          this.setData({
            steps
          });
        }
      }
    });
  },
  
  // Choose main recipe image
  chooseRecipeImage: function() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          recipeImage: res.tempFilePaths[0]
        });
      }
    });
  },
  
  // Validate recipe data
  validateRecipe: function() {
    if (!this.data.recipeName.trim()) {
      this.setData({ errorMessage: '请输入食谱名称' });
      return false;
    }
    
    if (!this.data.recipeDescription.trim()) {
      this.setData({ errorMessage: '请输入食谱描述' });
      return false;
    }
    
    if (!this.data.recipeImage) {
      this.setData({ errorMessage: '请上传食谱图片' });
      return false;
    }
    
    // Check ingredients
    for (let i = 0; i < this.data.ingredients.length; i++) {
      const ingredient = this.data.ingredients[i];
      if (!ingredient.name.trim()) {
        this.setData({ errorMessage: `第${i+1}个配料名称不能为空` });
        return false;
      }
      
      if (!ingredient.amount.trim() && ingredient.unit !== '适量') {
        this.setData({ errorMessage: `第${i+1}个配料数量不能为空` });
        return false;
      }
    }
    
    // Check steps
    for (let i = 0; i < this.data.steps.length; i++) {
      const step = this.data.steps[i];
      if (!step.description.trim()) {
        this.setData({ errorMessage: `第${i+1}步骤描述不能为空` });
        return false;
      }
    }
    
    this.setData({ errorMessage: '' });
    return true;
  },
  
  // Handle form submit
  submitRecipe: function() {
    if (!this.validateRecipe()) {
      wx.showToast({
        title: this.data.errorMessage,
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '无网络连接，请稍后再试',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      isSubmitting: true
    });
    
    // Upload images first, then submit recipe data
    this.uploadImages().then(imageUrls => {
      // Prepare recipe data for submission
      const recipeData = {
        name: this.data.recipeName,
        description: this.data.recipeDescription,
        category: this.data.selectedCategory,
        tcmProperty: this.data.selectedProperty,
        difficulty: parseInt(this.data.difficulty),
        prepTime: parseInt(this.data.prepTime),
        cookingTime: parseInt(this.data.cookingTime),
        servings: parseInt(this.data.servings),
        calories: this.data.calories ? parseInt(this.data.calories) : null,
        image: imageUrls.main,
        ingredients: this.data.ingredients.map(item => ({
          name: item.name,
          amount: item.amount,
          unit: item.unit
        })),
        steps: this.data.steps.map((step, index) => ({
          number: index + 1,
          description: step.description,
          image: imageUrls.steps[index] || ''
        })),
        healthBenefits: this.data.healthBenefits,
        suitableConstitutions: this.data.constitutions
          .filter(item => item.selected)
          .map(item => item.id),
        isUserCreated: true
      };
      
      return this.submitRecipeData(recipeData);
    }).then(recipeId => {
      this.setData({
        isSubmitting: false
      });
      
      wx.showToast({
        title: '食谱创建成功',
        icon: 'success'
      });
      
      // Navigate to recipe detail page
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/recipe-detail/recipe-detail?id=${recipeId}`
        });
      }, 1500);
    }).catch(error => {
      this.setData({
        isSubmitting: false
      });
      
      wx.showToast({
        title: error.message || '提交失败，请重试',
        icon: 'none'
      });
    });
  },
  
  // Upload all images (main recipe image and step images)
  uploadImages: function() {
    return new Promise((resolve, reject) => {
      const imagePromises = [];
      let mainImageUrl = '';
      const stepImageUrls = Array(this.data.steps.length).fill('');
      
      // Upload main image
      if (this.data.recipeImage) {
        const mainImagePromise = this.uploadFile(this.data.recipeImage)
          .then(url => {
            mainImageUrl = url;
          });
        
        imagePromises.push(mainImagePromise);
      }
      
      // Upload step images
      this.data.steps.forEach((step, index) => {
        if (step.image) {
          const stepImagePromise = this.uploadFile(step.image)
            .then(url => {
              stepImageUrls[index] = url;
            });
          
          imagePromises.push(stepImagePromise);
        }
      });
      
      Promise.all(imagePromises)
        .then(() => {
          resolve({
            main: mainImageUrl,
            steps: stepImageUrls
          });
        })
        .catch(reject);
    });
  },
  
  // Upload single file to server
  uploadFile: function(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `${app.globalData.apiBaseUrl}/upload/image`,
        filePath: filePath,
        name: 'image',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
        success: (res) => {
          if (res.statusCode === 200) {
            const data = JSON.parse(res.data);
            resolve(data.url);
          } else {
            reject(new Error('图片上传失败'));
          }
        },
        fail: () => {
          reject(new Error('图片上传请求失败'));
        }
      });
    });
  },
  
  // Submit recipe data to server
  submitRecipeData: function(recipeData) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.apiBaseUrl}/recipes`,
        method: 'POST',
        data: recipeData,
        header: {
          'content-type': 'application/json',
          'Authorization': `Bearer ${wx.getStorageSync('token')}`
        },
        success: (res) => {
          if (res.statusCode === 201) {
            resolve(res.data.id);
          } else {
            reject(new Error(`提交失败: ${res.statusCode}`));
          }
        },
        fail: () => {
          reject(new Error('网络请求失败'));
        }
      });
    });
  },
  
  // Navigate back to previous page
  navigateBack: function() {
    wx.navigateBack();
  }
}); 