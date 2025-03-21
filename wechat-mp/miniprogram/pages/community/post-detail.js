const communityUtil = require('../../utils/community');
const shareUtil = require('../../utils/share');

Page({
  data: {
    postId: '',
    post: null,
    comments: [],
    loading: true,
    commentLoading: false,
    submitting: false,
    newComment: '',
    commentPage: 1,
    hasMoreComments: true,
    likeStatus: false,
    favoriteStatus: false
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ postId: options.id });
      this.loadPostDetails();
      this.loadComments();
    } else {
      wx.showToast({
        title: '帖子不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  onPullDownRefresh: function () {
    Promise.all([
      this.loadPostDetails(),
      this.loadComments(true)
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function () {
    if (this.data.hasMoreComments && !this.data.commentLoading) {
      this.loadMoreComments();
    }
  },

  loadPostDetails: function () {
    this.setData({ loading: true });
    
    return communityUtil.getPostDetails(this.data.postId)
      .then(res => {
        this.setData({
          post: res,
          loading: false,
          likeStatus: res.isLiked,
          favoriteStatus: res.isFavorited
        });
      })
      .catch(err => {
        console.error('加载帖子详情失败', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      });
  },

  loadComments: function (refresh = false) {
    this.setData({
      commentLoading: true,
      commentPage: refresh ? 1 : this.data.commentPage
    });
    
    return communityUtil.getComments(this.data.postId, {
      page: this.data.commentPage,
      limit: 20
    })
      .then(res => {
        this.setData({
          comments: refresh ? (res.comments || []) : [...this.data.comments, ...(res.comments || [])],
          hasMoreComments: (res.comments || []).length === 20,
          commentLoading: false
        });
      })
      .catch(err => {
        console.error('加载评论失败', err);
        this.setData({ commentLoading: false });
      });
  },

  loadMoreComments: function () {
    if (this.data.commentLoading) return;
    
    this.setData({
      commentPage: this.data.commentPage + 1
    });
    
    this.loadComments();
  },

  onCommentInput: function (e) {
    this.setData({ newComment: e.detail.value });
  },

  submitComment: function () {
    const comment = this.data.newComment.trim();
    if (!comment) {
      wx.showToast({
        title: '评论内容不能为空',
        icon: 'none'
      });
      return;
    }
    
    if (this.data.submitting) return;
    
    this.setData({ submitting: true });
    
    communityUtil.createComment(this.data.postId, {
      content: comment
    })
      .then(res => {
        this.setData({
          newComment: '',
          submitting: false
        });
        
        // 刷新评论列表
        // Refresh comments list
        this.loadComments(true);
        
        // 更新帖子评论数
        // Update post comment count
        if (this.data.post) {
          const post = { ...this.data.post };
          post.commentCount = (post.commentCount || 0) + 1;
          this.setData({ post });
        }
      })
      .catch(err => {
        console.error('提交评论失败', err);
        this.setData({ submitting: false });
        
        wx.showToast({
          title: '评论失败，请重试',
          icon: 'none'
        });
      });
  },

  onUserTap: function (e) {
    const userId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/profile/user?id=${userId}`
    });
  },

  onLikeTap: function () {
    const isLiked = this.data.likeStatus;
    const postId = this.data.postId;
    
    communityUtil.likePost(postId, !isLiked)
      .then(() => {
        // 更新点赞状态和数量
        // Update like status and count
        const post = { ...this.data.post };
        post.likeCount = (post.likeCount || 0) + (isLiked ? -1 : 1);
        
        this.setData({
          likeStatus: !isLiked,
          post
        });
      })
      .catch(err => {
        console.error('点赞操作失败', err);
        wx.showToast({
          title: isLiked ? '取消点赞失败' : '点赞失败',
          icon: 'none'
        });
      });
  },

  onFavoriteTap: function () {
    const isFavorited = this.data.favoriteStatus;
    const postId = this.data.postId;
    
    communityUtil.favoritePost(postId, !isFavorited)
      .then(() => {
        // 更新收藏状态
        // Update favorite status
        this.setData({
          favoriteStatus: !isFavorited
        });
        
        wx.showToast({
          title: isFavorited ? '已取消收藏' : '已收藏',
          icon: 'success'
        });
      })
      .catch(err => {
        console.error('收藏操作失败', err);
        wx.showToast({
          title: isFavorited ? '取消收藏失败' : '收藏失败',
          icon: 'none'
        });
      });
  },

  onShareAppMessage: function () {
    const { post } = this.data;
    if (!post) return {};
    
    return shareUtil.generateShareCard({
      title: post.title,
      path: `/pages/community/post-detail?id=${this.data.postId}`,
      imageUrl: post.images && post.images.length > 0 ? post.images[0] : ''
    });
  },

  onReplyTap: function (e) {
    const commentId = e.currentTarget.dataset.id;
    const commentAuthor = e.currentTarget.dataset.author;
    
    this.setData({
      newComment: `回复 @${commentAuthor}: `
    });
    
    // 自动聚焦评论框
    // Auto focus comment input
    this.selectComponent('#commentInput').focus();
  }
}); 