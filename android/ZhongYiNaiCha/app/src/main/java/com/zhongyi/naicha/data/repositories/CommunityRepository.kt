package com.zhongyi.naicha.data.repositories

import com.zhongyi.naicha.data.api.ApiClient
import com.zhongyi.naicha.data.models.Comment
import com.zhongyi.naicha.data.models.Post
import com.zhongyi.naicha.data.storage.TokenManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CommunityRepository @Inject constructor(
    private val tokenManager: TokenManager
) {
    
    private val communityService = ApiClient.communityService
    
    /**
     * Get community posts with pagination
     */
    suspend fun getPosts(page: Int = 1, limit: Int = 10, category: String? = null): List<Post> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            val authHeader = if (token != null) "Bearer $token" else null
            
            val response = communityService.getPosts(
                token = authHeader,
                page = page,
                limit = limit,
                category = category
            )
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.posts
            }
            
            return@withContext emptyList()
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext emptyList()
        }
    }
    
    /**
     * Get post details by ID
     */
    suspend fun getPostDetails(postId: String): Post? = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            val authHeader = if (token != null) "Bearer $token" else null
            
            val response = communityService.getPostDetails(
                token = authHeader,
                postId = postId
            )
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.post
            }
            
            return@withContext null
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext null
        }
    }
    
    /**
     * Create a new post
     */
    suspend fun createPost(title: String, content: String, images: List<String>? = null, category: String? = null, tags: List<String>? = null): Post? = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext null
            
            val postData = mutableMapOf<String, Any>(
                "title" to title,
                "content" to content
            )
            
            images?.let { postData["images"] = it }
            category?.let { postData["category"] = it }
            tags?.let { postData["tags"] = it }
            
            val response = communityService.createPost(
                token = "Bearer $token",
                post = postData
            )
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.post
            }
            
            return@withContext null
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext null
        }
    }
    
    /**
     * Get comments for a post
     */
    suspend fun getComments(postId: String, page: Int = 1, limit: Int = 20): List<Comment> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            val authHeader = if (token != null) "Bearer $token" else null
            
            val response = communityService.getComments(
                token = authHeader,
                postId = postId,
                page = page,
                limit = limit
            )
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.comments
            }
            
            return@withContext emptyList()
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext emptyList()
        }
    }
    
    /**
     * Add a comment to a post
     */
    suspend fun addComment(postId: String, content: String, parentId: String? = null): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext false
            
            val commentData = mutableMapOf(
                "content" to content
            )
            
            parentId?.let { commentData["parentId"] = it }
            
            val response = communityService.addComment(
                token = "Bearer $token",
                postId = postId,
                comment = commentData
            )
            
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }
    
    /**
     * Toggle like status for a post
     */
    suspend fun togglePostLike(postId: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext false
            
            // Get current post details first to check if already liked
            val post = getPostDetails(postId) ?: return@withContext false
            
            val response = if (post.isLiked) {
                communityService.unlikePost("Bearer $token", postId)
            } else {
                communityService.likePost("Bearer $token", postId)
            }
            
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }
    
    /**
     * Toggle bookmark status for a post
     */
    suspend fun togglePostBookmark(postId: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext false
            
            // Get current post details first to check if already bookmarked
            val post = getPostDetails(postId) ?: return@withContext false
            
            val response = if (post.isBookmarked) {
                communityService.unbookmarkPost("Bearer $token", postId)
            } else {
                communityService.bookmarkPost("Bearer $token", postId)
            }
            
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }
    
    /**
     * Toggle like status for a comment
     */
    suspend fun toggleCommentLike(commentId: String, currentlyLiked: Boolean): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext false
            
            val response = if (currentlyLiked) {
                communityService.unlikeComment("Bearer $token", commentId)
            } else {
                communityService.likeComment("Bearer $token", commentId)
            }
            
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }
    
    /**
     * Delete a post
     */
    suspend fun deletePost(postId: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext false
            
            val response = communityService.deletePost(
                token = "Bearer $token",
                postId = postId
            )
            
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }
} 