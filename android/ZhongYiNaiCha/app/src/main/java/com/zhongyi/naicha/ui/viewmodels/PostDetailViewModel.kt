package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.Comment
import com.zhongyi.naicha.data.models.Post
import com.zhongyi.naicha.data.repositories.CommunityRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.io.IOException
import javax.inject.Inject

@HiltViewModel
class PostDetailViewModel @Inject constructor(
    private val communityRepository: CommunityRepository
) : ViewModel() {

    // Post details
    private val _post = MutableLiveData<Post?>()
    val post: LiveData<Post?> = _post
    
    // Comments
    private val _comments = MutableLiveData<List<Comment>>(emptyList())
    val comments: LiveData<List<Comment>> = _comments
    
    // Loading states
    private val _isLoadingPost = MutableLiveData<Boolean>(false)
    val isLoadingPost: LiveData<Boolean> = _isLoadingPost
    
    private val _isLoadingComments = MutableLiveData<Boolean>(false)
    val isLoadingComments: LiveData<Boolean> = _isLoadingComments
    
    private val _isAddingComment = MutableLiveData<Boolean>(false)
    val isAddingComment: LiveData<Boolean> = _isAddingComment
    
    // Error states
    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error
    
    private val _commentsError = MutableLiveData<String?>(null)
    val commentsError: LiveData<String?> = _commentsError
    
    // Pagination for comments
    private var currentPage = 1
    private var isLastPage = false
    
    // Current post ID
    private var currentPostId: String? = null
    
    /**
     * Load post details
     */
    fun loadPostDetails(postId: String) {
        if (_isLoadingPost.value == true) return
        
        currentPostId = postId
        _isLoadingPost.value = true
        _error.value = null
        
        viewModelScope.launch {
            try {
                val post = communityRepository.getPostDetails(postId)
                _post.value = post
                
                // Load comments after loading post
                loadComments(postId)
                
            } catch (e: IOException) {
                _error.value = "网络连接错误，请检查网络连接后重试"
            } catch (e: Exception) {
                _error.value = "加载帖子失败: ${e.message}"
            } finally {
                _isLoadingPost.value = false
            }
        }
    }
    
    /**
     * Load comments for the post
     */
    fun loadComments(postId: String? = null) {
        if (_isLoadingComments.value == true) return
        
        val id = postId ?: currentPostId ?: return
        
        currentPage = 1
        isLastPage = false
        _isLoadingComments.value = true
        _commentsError.value = null
        
        viewModelScope.launch {
            try {
                val fetchedComments = communityRepository.getComments(
                    postId = id,
                    page = currentPage,
                    limit = 20
                )
                
                _comments.value = fetchedComments
                isLastPage = fetchedComments.isEmpty() || fetchedComments.size < 20
                
            } catch (e: IOException) {
                _commentsError.value = "网络连接错误，请检查网络连接后重试"
            } catch (e: Exception) {
                _commentsError.value = "加载评论失败: ${e.message}"
            } finally {
                _isLoadingComments.value = false
            }
        }
    }
    
    /**
     * Load more comments (pagination)
     */
    fun loadMoreComments() {
        if (_isLoadingComments.value == true || isLastPage) return
        
        val postId = currentPostId ?: return
        
        _isLoadingComments.value = true
        
        viewModelScope.launch {
            try {
                currentPage++
                
                val fetchedComments = communityRepository.getComments(
                    postId = postId,
                    page = currentPage,
                    limit = 20
                )
                
                val currentList = _comments.value ?: emptyList()
                _comments.value = currentList + fetchedComments
                
                isLastPage = fetchedComments.isEmpty() || fetchedComments.size < 20
                
            } catch (e: Exception) {
                currentPage-- // Revert page increment on failure
                _commentsError.value = "加载更多评论失败: ${e.message}"
            } finally {
                _isLoadingComments.value = false
            }
        }
    }
    
    /**
     * Add a comment to the current post
     */
    fun addComment(content: String, parentId: String? = null) {
        if (_isAddingComment.value == true) return
        
        val postId = currentPostId ?: return
        
        _isAddingComment.value = true
        _commentsError.value = null
        
        viewModelScope.launch {
            try {
                val success = communityRepository.addComment(
                    postId = postId,
                    content = content,
                    parentId = parentId
                )
                
                if (success) {
                    // Refresh comments
                    loadComments()
                    
                    // Refresh post to update comment count
                    refreshPost()
                } else {
                    _commentsError.value = "添加评论失败"
                }
            } catch (e: IOException) {
                _commentsError.value = "网络连接错误，请检查网络连接后重试"
            } catch (e: Exception) {
                _commentsError.value = "添加评论失败: ${e.message}"
            } finally {
                _isAddingComment.value = false
            }
        }
    }
    
    /**
     * Toggle like status for the current post
     */
    fun togglePostLike() {
        val postId = currentPostId ?: return
        
        viewModelScope.launch {
            try {
                val success = communityRepository.togglePostLike(postId)
                
                if (success) {
                    // Refresh post
                    refreshPost()
                }
            } catch (e: Exception) {
                _error.value = "操作失败: ${e.message}"
            }
        }
    }
    
    /**
     * Toggle bookmark status for the current post
     */
    fun togglePostBookmark() {
        val postId = currentPostId ?: return
        
        viewModelScope.launch {
            try {
                val success = communityRepository.togglePostBookmark(postId)
                
                if (success) {
                    // Refresh post
                    refreshPost()
                }
            } catch (e: Exception) {
                _error.value = "操作失败: ${e.message}"
            }
        }
    }
    
    /**
     * Toggle like status for a comment
     */
    fun toggleCommentLike(commentId: String, currentlyLiked: Boolean) {
        viewModelScope.launch {
            try {
                val success = communityRepository.toggleCommentLike(commentId, currentlyLiked)
                
                if (success) {
                    // Refresh comments
                    loadComments()
                }
            } catch (e: Exception) {
                _commentsError.value = "操作失败: ${e.message}"
            }
        }
    }
    
    /**
     * Refresh the current post
     */
    fun refreshPost() {
        val postId = currentPostId ?: return
        
        viewModelScope.launch {
            try {
                val updatedPost = communityRepository.getPostDetails(postId)
                _post.value = updatedPost
            } catch (e: Exception) {
                _error.value = "刷新帖子失败: ${e.message}"
            }
        }
    }
    
    /**
     * Reset error messages
     */
    fun resetErrors() {
        _error.value = null
        _commentsError.value = null
    }
} 