package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.Post
import com.zhongyi.naicha.data.repositories.CommunityRepository
import com.zhongyi.naicha.data.repositories.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.io.IOException
import javax.inject.Inject

@HiltViewModel
class CommunityViewModel @Inject constructor(
    private val communityRepository: CommunityRepository,
    private val userRepository: UserRepository
) : ViewModel() {

    // Posts
    private val _posts = MutableLiveData<List<Post>>(emptyList())
    val posts: LiveData<List<Post>> = _posts
    
    // Selected category
    private val _selectedCategory = MutableLiveData<String?>(null)
    val selectedCategory: LiveData<String?> = _selectedCategory
    
    // Loading state
    private val _isLoading = MutableLiveData<Boolean>(false)
    val isLoading: LiveData<Boolean> = _isLoading
    
    // Error state
    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error
    
    // Pagination
    private var currentPage = 1
    private var isLastPage = false
    
    // Is user logged in
    private val _isLoggedIn = MutableLiveData<Boolean>()
    val isLoggedIn: LiveData<Boolean> = _isLoggedIn
    
    init {
        checkLoginStatus()
        loadPosts()
    }
    
    private fun checkLoginStatus() {
        viewModelScope.launch {
            val token = userRepository.getToken()
            _isLoggedIn.value = token != null
        }
    }
    
    /**
     * Load community posts
     */
    fun loadPosts(category: String? = null) {
        if (_isLoading.value == true) return
        
        currentPage = 1
        isLastPage = false
        _selectedCategory.value = category
        _isLoading.value = true
        _error.value = null
        
        viewModelScope.launch {
            try {
                val fetchedPosts = communityRepository.getPosts(
                    page = currentPage,
                    limit = 10,
                    category = category
                )
                
                _posts.value = fetchedPosts
                isLastPage = fetchedPosts.isEmpty() || fetchedPosts.size < 10
                
            } catch (e: IOException) {
                _error.value = "网络连接错误，请检查网络连接后重试"
            } catch (e: Exception) {
                _error.value = "加载内容失败: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Load more posts (pagination)
     */
    fun loadMorePosts() {
        if (_isLoading.value == true || isLastPage) return
        
        _isLoading.value = true
        
        viewModelScope.launch {
            try {
                currentPage++
                
                val fetchedPosts = communityRepository.getPosts(
                    page = currentPage,
                    limit = 10,
                    category = _selectedCategory.value
                )
                
                val currentList = _posts.value ?: emptyList()
                _posts.value = currentList + fetchedPosts
                
                isLastPage = fetchedPosts.isEmpty() || fetchedPosts.size < 10
                
            } catch (e: Exception) {
                currentPage-- // Revert page increment on failure
                _error.value = "加载更多内容失败: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Create a new post
     */
    fun createPost(title: String, content: String, images: List<String>? = null) {
        if (_isLoading.value == true) return
        
        _isLoading.value = true
        _error.value = null
        
        viewModelScope.launch {
            try {
                val category = _selectedCategory.value
                val newPost = communityRepository.createPost(
                    title = title,
                    content = content,
                    images = images,
                    category = category
                )
                
                if (newPost != null) {
                    // Refresh the post list
                    loadPosts(category)
                } else {
                    _error.value = "创建帖子失败"
                }
            } catch (e: IOException) {
                _error.value = "网络连接错误，请检查网络连接后重试"
            } catch (e: Exception) {
                _error.value = "创建帖子失败: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Toggle like status for a post
     */
    fun togglePostLike(postId: String) {
        viewModelScope.launch {
            try {
                val success = communityRepository.togglePostLike(postId)
                
                if (success) {
                    // Update post in the list
                    val updatedPost = communityRepository.getPostDetails(postId)
                    updatePostInList(updatedPost)
                }
            } catch (e: Exception) {
                _error.value = "操作失败: ${e.message}"
            }
        }
    }
    
    /**
     * Toggle bookmark status for a post
     */
    fun togglePostBookmark(postId: String) {
        viewModelScope.launch {
            try {
                val success = communityRepository.togglePostBookmark(postId)
                
                if (success) {
                    // Update post in the list
                    val updatedPost = communityRepository.getPostDetails(postId)
                    updatePostInList(updatedPost)
                }
            } catch (e: Exception) {
                _error.value = "操作失败: ${e.message}"
            }
        }
    }
    
    /**
     * Update a post in the current list
     */
    private fun updatePostInList(updatedPost: Post?) {
        if (updatedPost == null) return
        
        val currentList = _posts.value?.toMutableList() ?: return
        val position = currentList.indexOfFirst { it.id == updatedPost.id }
        
        if (position != -1) {
            currentList[position] = updatedPost
            _posts.value = currentList
        }
    }
    
    /**
     * Reset error message
     */
    fun resetError() {
        _error.value = null
    }
} 