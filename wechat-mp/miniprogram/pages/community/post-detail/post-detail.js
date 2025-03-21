// post-detail.js
const app = getApp();

Page({
  data: {
    isLoading: true,
    loadError: false,
    
    // Post data
    postId: '',
    post: null,
    
    // Comments data
    comments: [],
    hasMoreComments: false,
    currentPage: 1,
    pageSize: 20,
    
    // User information
    userInfo: null,
    isLoggedIn: false,
    
    // Comment input
    commentContent: '',
    
    // Network status
    isNetworkAvailable: true
  },
  
  onLoad: function(options) {
    // Check network status
    this.checkNetworkStatus();
    
    // Check if user is logged in
    this.checkLoginStatus();
    
    if (options.id) {
      this.setData({
        postId: options.id
      });
      
      // Get post details
      this.getPostDetails();
      
      // Get comments
      this.getComments();
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
          
          // Try to load from cache
          this.loadCachedPostData();
        }
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
  },
  
  // Get post details
  getPostDetails: function() {
    if (!this.data.isNetworkAvailable) {
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/community/posts/${this.data.postId}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const post = res.data;
          
          // Check if user liked the post
          post.isLikedByUser = post.likedBy && post.likedBy.includes(this.data.userInfo?.id);
          
          this.setData({
            post,
            isLoading: false
          });
          
          // Cache post data
          wx.setStorageSync(`post_${this.data.postId}`, post);
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
          title: '获取帖子失败',
          icon: 'none'
        });
      }
    });
  },
  
  // Load cached post data
  loadCachedPostData: function() {
    const cachedPost = wx.getStorageSync(`post_${this.data.postId}`);
    const cachedComments = wx.getStorageSync(`comments_${this.data.postId}`);
    
    if (cachedPost) {
      this.setData({
        post: cachedPost,
        isLoading: false
      });
    } else {
      this.setData({
        loadError: true,
        isLoading: false
      });
    }
    
    if (cachedComments) {
      this.setData({
        comments: cachedComments
      });
    }
  },
  
  // Get comments for post
  getComments: function() {
    if (!this.data.isNetworkAvailable) {
      return;
    }
    
    // Prepare query parameters
    const params = {
      page: this.data.currentPage,
      limit: this.data.pageSize
    };
    
    // Convert params to query string
    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/community/posts/${this.data.postId}/comments?${queryString}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200) {
          const { comments, totalCount } = res.data;
          const hasMoreComments = this.data.currentPage * this.data.pageSize < totalCount;
          
          // If it's the first page, replace comments array
          // Otherwise, append to existing comments
          const updatedComments = this.data.currentPage === 1 
            ? comments 
            : [...this.data.comments, ...comments];
          
          this.setData({
            comments: updatedComments,
            hasMoreComments
          });
          
          // Cache comments
          wx.setStorageSync(`comments_${this.data.postId}`, updatedComments);
        }
      }
    });
  },
  
  // Load more comments (pagination)
  loadMoreComments: function() {
    this.setData({
      currentPage: this.data.currentPage + 1
    });
    
    this.getComments();
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
    
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '离线模式无法评论',
        icon: 'none'
      });
      return;
    }
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/community/posts/${this.data.postId}/comments`,
      method: 'POST',
      data: {
        content: this.data.commentContent
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
          
          // Reset comment input
          this.setData({
            commentContent: '',
            currentPage: 1,
            comments: []
          });
          
          // Refresh comments
          this.getComments();
          
          // Update post comment count
          if (this.data.post) {
            this.setData({
              'post.commentsCount': (this.data.post.commentsCount || 0) + 1
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
  
  // Like the post
  likePost: function() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({
        url: '/pages/auth/auth'
      });
      return;
    }
    
    if (!this.data.post) {
      return;
    }
    
    const isLiked = this.data.post.isLikedByUser;
    
    // Update UI immediately
    this.setData({
      'post.isLikedByUser': !isLiked,
      'post.likesCount': isLiked 
        ? this.data.post.likesCount - 1 
        : this.data.post.likesCount + 1
    });
    
    if (!this.data.isNetworkAvailable) {
      wx.showToast({
        title: '离线模式无法操作',
        icon: 'none'
      });
      return;
    }
    
    // Send like/unlike request
    wx.request({
      url: `${app.globalData.apiBaseUrl}/community/posts/${this.data.postId}/${isLiked ? 'unlike' : 'like'}`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${wx.getStorageSync('token')}`
      },
      fail: () => {
        // Revert UI changes if request fails
        this.setData({
          'post.isLikedByUser': isLiked,
          'post.likesCount': isLiked 
            ? this.data.post.likesCount + 1 
            : this.data.post.likesCount - 1
        });
        
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      }
    });
  },
  
  // Share the post
  sharePost: function() {
    // The share option will open the native share UI in WeChat
    // This is mainly handled by onShareAppMessage
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
  
  // Navigate to user profile
  navigateToProfile: function(e) {
    const userId = e.currentTarget.dataset.id;
    
    wx.navigateTo({
      url: `/pages/community/user-profile?id=${userId}`
    });
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
  
  // Share to WeChat friends
  onShareAppMessage: function() {
    if (this.data.post) {
      return {
        title: this.data.post.content.substring(0, 30) + (this.data.post.content.length > 30 ? '...' : ''),
        path: `/pages/community/post-detail?id=${this.data.postId}`,
        imageUrl: this.data.post.images && this.data.post.images.length > 0 ? this.data.post.images[0] : undefined
      };
    }
    
    return {
      title: '中医奶茶社区',
      path: '/pages/community/community'
    };
  }
}); 