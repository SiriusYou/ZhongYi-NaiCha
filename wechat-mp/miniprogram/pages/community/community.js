// community.js
const app = getApp();

Page({
  data: {
    isLoading: true,
    loadError: false,
    refreshing: false,
    
    // User information
    userInfo: null,
    isLoggedIn: false,
    
    // Network status
    isNetworkAvailable: true,
    
    // Content
    posts: [],
    hasMorePosts: false,
    currentPage: 1,
    pageSize: 10,
    
    // Post categories
    categories: [
      { id: 'all', name: '全部' },
      { id: 'experience', name: '养生经验' },
      { id: 'question', name: '问答' },
      { id: 'recipe', name: '食谱分享' },
      { id: 'tcm', name: '中医知识' }
    ],
    activeCategoryId: 'all',
    
    // New post
    showPostForm: false,
    newPostContent: '',
    newPostImages: [],
    newPostCategory: 'experience',
    
    // Comment features
    activePostId: null,
    showCommentForm: false,
    commentContent: '',
    
    // User interaction tracking for offline support
    pendingLikes: [],
    pendingComments: [],
    
    // UI Controls
    animationData: {}
  },
  
  onLoad: function() {
    // Check network status
    this.checkNetworkStatus();
    
    // Check if user is logged in
    this.checkLoginStatus();
    
    // Load community posts
    this.getPosts();
    
    // Create animation
    this.createAnimation();
  },
  
  onShow: function() {
    // Sync pending interactions when coming back online
    if (this.data.isNetworkAvailable) {
      this.syncPendingInteractions();
    }
  },
  
  // Handle pull down to refresh
  onPullDownRefresh: function() {
    this.setData({
      refreshing: true,
      currentPage: 1
    });
    
    this.getPosts(() => {
      wx.stopPullDownRefresh();
      this.setData({
        refreshing: false
      });
    });
  },
  
  // Handle reaching bottom for pagination
  onReachBottom: function() {
    if (this.data.hasMorePosts) {
      this.loadMorePosts();
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
            title: '当前处于离线模式，部分功能可能不可用',
            icon: 'none',
            duration: 2000
          });
          
          // Load cached posts
          this.loadCachedPosts();
        }
      }
    });
    
    // Listen for network status changes
    wx.onNetworkStatusChange((res) => {
      this.setData({
        isNetworkAvailable: res.isConnected
      });
      
      if (res.isConnected) {
        // Sync pending interactions when coming back online
        this.syncPendingInteractions();
        
        // Refresh posts
        this.getPosts();
      }
    });
  },
  
  // Check if user is logged in
  checkLoginStatus: function() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    this.setData({
      isLoggedIn: !!token,
      userInfo: userInfo || null
    });
    
    if (!token) {
      wx.showToast({
        title: '请先登录后使用社区功能',
        icon: 'none',
        duration: 2000
      });
    }
  },
  
  // Get community posts
  getPosts: function(callback) {
    if (!this.data.isNetworkAvailable) {
      if (callback) callback();
      return;
    }
    
    this.setData({
      isLoading: true,
      loadError: false
    });
    
    // Prepare query parameters
    const params = {
      page: this.data.currentPage,
      limit: this.data.pageSize
    };
    
    // Add category filter if not 'all'
    if (this.data.activeCategoryId !== 'all') {
      params.category = this.data.activeCategoryId;
    }
    
    // Convert params to query string
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/community/posts?${queryString}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const { posts, totalCount } = res.data;
          const hasMorePosts = this.data.currentPage * this.data.pageSize < totalCount;
          
          // Process posts to add local UI state
          const processedPosts = posts.map(post => ({
            ...post,
            isLikedByUser: post.likedBy && post.likedBy.includes(this.data.userInfo?.id),
            showAllContent: false
          }));
          
          // If it's the first page, replace posts array
          // Otherwise, append to existing posts
          const updatedPosts = this.data.currentPage === 1 
            ? processedPosts 
            : [...this.data.posts, ...processedPosts];
          
          this.setData({
            posts: updatedPosts,
            hasMorePosts,
            isLoading: false
          });
          
          // Cache posts for offline access
          wx.setStorageSync('community_posts', updatedPosts);
          wx.setStorageSync('community_posts_timestamp', new Date().getTime());
        } else {
          this.setData({
            loadError: true,
            isLoading: false
          });
        }
      },
      fail: () => {
        this.setData({
          loadError: true,
          isLoading: false
        });
        
        wx.showToast({
          title: '获取社区内容失败',
          icon: 'none'
        });
      },
      complete: () => {
        if (callback) callback();
      }
    });
  },
  
  // Load cached posts for offline mode
  loadCachedPosts: function() {
    const cachedPosts = wx.getStorageSync('community_posts');
    
    if (cachedPosts && cachedPosts.length > 0) {
      this.setData({
        posts: cachedPosts,
        isLoading: false
      });
    } else {
      this.setData({
        loadError: true,
        isLoading: false
      });
    }
  },
  
  // Load more posts (pagination)
  loadMorePosts: function() {
    this.setData({
      currentPage: this.data.currentPage + 1
    });
    
    this.getPosts();
  },
  
  // Change category filter
  changeCategory: function(e) {
    const categoryId = e.currentTarget.dataset.id;
    
    this.setData({
      activeCategoryId: categoryId,
      currentPage: 1,
      posts: []
    });
    
    this.getPosts();
  },
  
  // Toggle post form
  togglePostForm: function() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/auth/auth'
      });
      return;
    }
    
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease'
    });
    
    if (this.data.showPostForm) {
      animation.translateY('100%').step();
    } else {
      animation.translateY(0).step();
    }
    
    this.setData({
      animationData: animation.export(),
      showPostForm: !this.data.showPostForm
    });
  },
  
  // Handle post content input
  onPostContentInput: function(e) {
    this.setData({
      newPostContent: e.detail.value
    });
  },
  
  // Choose post category
  choosePostCategory: function(e) {
    this.setData({
      newPostCategory: e.detail.value
    });
  },
  
  // Choose images for post
  chooseImage: function() {
    wx.chooseImage({
      count: 9 - this.data.newPostImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // Append new images to the existing array
        const newImages = [...this.data.newPostImages, ...res.tempFilePaths];
        
        this.setData({
          newPostImages: newImages
        });
      }
    });
  },
  
  // Preview image
  previewImage: function(e) {
    const current = e.currentTarget.dataset.src;
    const urls = e.currentTarget.dataset.images || [current];
    
    wx.previewImage({
      current,
      urls
    });
  },
  
  // Remove image from post
  removeImage: function(e) {
    const index = e.currentTarget.dataset.index;
    const newImages = [...this.data.newPostImages];
    
    newImages.splice(index, 1);
    
    this.setData({
      newPostImages: newImages
    });
  },
  
  // Submit new post
  submitPost: function() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/auth/auth'
      });
      return;
    }
    
    if (!this.data.newPostContent.trim()) {
      wx.showToast({
        title: '请输入内容',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '离线模式无法发布内容',
        icon: 'none'
      });
      return;
    }
    
    // Show loading
    wx.showLoading({
      title: '发布中...',
      mask: true
    });
    
    // Prepare post data
    const postData = {
      content: this.data.newPostContent,
      category: this.data.newPostCategory
    };
    
    // First upload images if any
    const uploadPromises = this.data.newPostImages.map((imagePath) => {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: `${app.globalData.apiBaseUrl}/uploads`,
          filePath: imagePath,
          name: 'file',
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('token')}`
          },
          success: (res) => {
            if (res.statusCode === 200) {
              const data = JSON.parse(res.data);
              resolve(data.url);
            } else {
              reject(new Error('Upload failed'));
            }
          },
          fail: reject
        });
      });
    });
    
    // Process uploads then create post
    if (uploadPromises.length > 0) {
      Promise.all(uploadPromises)
        .then((imageUrls) => {
          postData.images = imageUrls;
          this.createPost(postData);
        })
        .catch(() => {
          wx.hideLoading();
          wx.showToast({
            title: '图片上传失败',
            icon: 'none'
          });
        });
    } else {
      this.createPost(postData);
    }
  },
  
  // Create post in the API
  createPost: function(postData) {
    wx.request({
      url: `${app.globalData.apiBaseUrl}/community/posts`,
      method: 'POST',
      data: postData,
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        wx.hideLoading();
        
        if (res.statusCode === 201) {
          wx.showToast({
            title: '发布成功',
            icon: 'success'
          });
          
          // Reset form and close it
          this.setData({
            newPostContent: '',
            newPostImages: [],
            newPostCategory: 'experience',
            showPostForm: false
          });
          
          // Refresh posts
          this.setData({
            currentPage: 1,
            posts: []
          });
          
          this.getPosts();
        } else {
          wx.showToast({
            title: res.data.message || '发布失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },
  
  // Toggle showing full post content
  togglePostContent: function(e) {
    const index = e.currentTarget.dataset.index;
    const key = `posts[${index}].showAllContent`;
    
    this.setData({
      [key]: !this.data.posts[index].showAllContent
    });
  },
  
  // Like a post
  likePost: function(e) {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/auth/auth'
      });
      return;
    }
    
    const postId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const isLiked = this.data.posts[index].isLikedByUser;
    
    // Update UI immediately
    const likeKey = `posts[${index}].isLikedByUser`;
    const likesCountKey = `posts[${index}].likesCount`;
    
    this.setData({
      [likeKey]: !isLiked,
      [likesCountKey]: isLiked 
        ? this.data.posts[index].likesCount - 1 
        : this.data.posts[index].likesCount + 1
    });
    
    if (!this.data.isNetworkAvailable) {
      // Store pending like for sync later
      const pendingLikes = [...this.data.pendingLikes];
      pendingLikes.push({
        postId,
        action: isLiked ? 'unlike' : 'like',
        timestamp: new Date().getTime()
      });
      
      this.setData({
        pendingLikes
      });
      
      wx.setStorageSync('pending_likes', pendingLikes);
      return;
    }
    
    // Send like/unlike request
    wx.request({
      url: `${app.globalData.apiBaseUrl}/community/posts/${postId}/${isLiked ? 'unlike' : 'like'}`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      fail: () => {
        // Revert UI changes if request fails
        this.setData({
          [likeKey]: isLiked,
          [likesCountKey]: isLiked 
            ? this.data.posts[index].likesCount + 1 
            : this.data.posts[index].likesCount - 1
        });
        
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      }
    });
  },
  
  // Show comment form for a post
  showComments: function(e) {
    const postId = e.currentTarget.dataset.id;
    
    wx.navigateTo({
      url: `/pages/community/post-detail?id=${postId}`
    });
  },
  
  // Toggle comment form
  toggleCommentForm: function(e) {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/auth/auth'
      });
      return;
    }
    
    const postId = e.currentTarget.dataset.id;
    
    this.setData({
      activePostId: postId,
      showCommentForm: !this.data.showCommentForm,
      commentContent: ''
    });
  },
  
  // Handle comment content input
  onCommentInput: function(e) {
    this.setData({
      commentContent: e.detail.value
    });
  },
  
  // Submit comment
  submitComment: function() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/auth/auth'
      });
      return;
    }
    
    if (!this.data.commentContent.trim()) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      });
      return;
    }
    
    const postId = this.data.activePostId;
    const commentContent = this.data.commentContent;
    
    if (!this.data.isNetworkAvailable) {
      // Store pending comment for sync later
      const pendingComments = [...this.data.pendingComments];
      pendingComments.push({
        postId,
        content: commentContent,
        timestamp: new Date().getTime()
      });
      
      this.setData({
        pendingComments,
        showCommentForm: false,
        commentContent: ''
      });
      
      wx.setStorageSync('pending_comments', pendingComments);
      
      wx.showToast({
        title: '评论将在网络恢复后发送',
        icon: 'none'
      });
      
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/community/posts/${postId}/comments`,
      method: 'POST',
      data: {
        content: commentContent
      },
      header: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      success: (res) => {
        if (res.statusCode === 201) {
          wx.showToast({
            title: '评论成功',
            icon: 'success'
          });
          
          // Update comment count in the post
          const postIndex = this.data.posts.findIndex(post => post.id === postId);
          
          if (postIndex !== -1) {
            const commentsCountKey = `posts[${postIndex}].commentsCount`;
            
            this.setData({
              [commentsCountKey]: this.data.posts[postIndex].commentsCount + 1,
              showCommentForm: false,
              commentContent: ''
            });
          } else {
            this.setData({
              showCommentForm: false,
              commentContent: ''
            });
          }
        } else {
          wx.showToast({
            title: res.data.message || '评论失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },
  
  // Share a post
  sharePost: function(e) {
    const postId = e.currentTarget.dataset.id;
    
    // Custom share implementation
    wx.showActionSheet({
      itemList: ['分享到微信', '复制链接'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // Share to WeChat
          wx.showToast({
            title: '请使用右上角"..."分享',
            icon: 'none'
          });
        } else if (res.tapIndex === 1) {
          // Copy shareable link
          const link = `${app.globalData.shareBaseUrl}/community/post?id=${postId}`;
          
          wx.setClipboardData({
            data: link,
            success: () => {
              wx.showToast({
                title: '链接已复制',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },
  
  // Navigate to user profile
  navigateToProfile: function(e) {
    const userId = e.currentTarget.dataset.id;
    
    wx.navigateTo({
      url: `/pages/community/user-profile?id=${userId}`
    });
  },
  
  // Sync pending likes and comments when online
  syncPendingInteractions: function() {
    // Sync pending likes
    const pendingLikes = wx.getStorageSync('pending_likes') || [];
    
    if (pendingLikes.length > 0) {
      pendingLikes.forEach((like) => {
        wx.request({
          url: `${app.globalData.apiBaseUrl}/community/posts/${like.postId}/${like.action}`,
          method: 'POST',
          header: {
            'Authorization': `Bearer ${wx.getStorageSync('token')}`
          }
        });
      });
      
      // Clear pending likes
      wx.removeStorageSync('pending_likes');
      this.setData({
        pendingLikes: []
      });
    }
    
    // Sync pending comments
    const pendingComments = wx.getStorageSync('pending_comments') || [];
    
    if (pendingComments.length > 0) {
      pendingComments.forEach((comment) => {
        wx.request({
          url: `${app.globalData.apiBaseUrl}/community/posts/${comment.postId}/comments`,
          method: 'POST',
          data: {
            content: comment.content
          },
          header: {
            'content-type': 'application/json',
            'Authorization': `Bearer ${wx.getStorageSync('token')}`
          }
        });
      });
      
      // Clear pending comments
      wx.removeStorageSync('pending_comments');
      this.setData({
        pendingComments: []
      });
      
      wx.showToast({
        title: '离线评论已同步',
        icon: 'success'
      });
    }
  },
  
  // Format date for display
  formatDate: function(timestamp) {
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60 * 1000) {
      return '刚刚';
    }
    
    // Less than 1 hour
    if (diff < 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 1000))}分钟前`;
    }
    
    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
    }
    
    // Less than 30 days
    if (diff < 30 * 24 * 60 * 60 * 1000) {
      return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
    }
    
    // Format date string
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  },
  
  // Create animation for post form
  createAnimation: function() {
    const animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease'
    });
    
    animation.translateY('100%').step();
    
    this.setData({
      animationData: animation.export()
    });
  },
  
  // Share to WeChat friends
  onShareAppMessage: function(res) {
    if (res.from === 'button') {
      const postId = res.target.dataset.id;
      const postIndex = this.data.posts.findIndex(post => post.id === postId);
      
      if (postIndex !== -1) {
        const post = this.data.posts[postIndex];
        
        return {
          title: post.content.substring(0, 30) + (post.content.length > 30 ? '...' : ''),
          path: `/pages/community/post-detail?id=${postId}`,
          imageUrl: post.images && post.images.length > 0 ? post.images[0] : undefined
        };
      }
    }
    
    return {
      title: '中医奶茶社区 - 分享您的养生心得',
      path: '/pages/community/community'
    };
  }
}); 