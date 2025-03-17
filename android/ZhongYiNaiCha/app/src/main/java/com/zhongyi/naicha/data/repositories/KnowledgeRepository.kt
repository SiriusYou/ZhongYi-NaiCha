package com.zhongyi.naicha.data.repositories

import com.zhongyi.naicha.data.api.ApiClient
import com.zhongyi.naicha.data.models.Article
import com.zhongyi.naicha.data.models.Category
import com.zhongyi.naicha.data.models.Herb
import com.zhongyi.naicha.data.storage.TokenManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class KnowledgeRepository @Inject constructor(
    private val tokenManager: TokenManager
) {
    
    private val knowledgeService = ApiClient.knowledgeService
    
    /**
     * Get articles
     * Returns a pair of (articles list, total pages)
     */
    suspend fun getArticles(page: Int = 1, limit: Int = 10): Pair<List<Article>, Int> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            
            // If user is logged in, get personalized articles
            if (token != null) {
                val response = knowledgeService.getArticles(
                    token = "Bearer $token",
                    page = page,
                    limit = limit
                )
                
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    val totalPages = calculateTotalPages(body.total, limit)
                    return@withContext Pair(body.articles, totalPages)
                }
            }
            
            // If not logged in or request failed, get public articles
            val response = knowledgeService.getPublicArticles(
                page = page,
                limit = limit
            )
            
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val totalPages = calculateTotalPages(body.total, limit)
                return@withContext Pair(body.articles, totalPages)
            }
            
            return@withContext Pair(emptyList(), 0)
        } catch (e: IOException) {
            // Network error
            return@withContext Pair(emptyList(), 0)
        } catch (e: Exception) {
            // Other errors
            return@withContext Pair(emptyList(), 0)
        }
    }
    
    /**
     * Get article details by ID
     */
    suspend fun getArticleDetails(articleId: String): Article? = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            
            // If user is logged in, get personalized article details
            if (token != null) {
                val response = knowledgeService.getArticleDetail(
                    token = "Bearer $token",
                    articleId = articleId
                )
                
                if (response.isSuccessful && response.body() != null) {
                    return@withContext response.body()?.article
                }
            }
            
            // If not logged in or request failed, get public article details
            val response = knowledgeService.getPublicArticleDetail(articleId)
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()?.article
            }
            
            return@withContext null
        } catch (e: IOException) {
            // Network error
            return@withContext null
        } catch (e: Exception) {
            // Other errors
            return@withContext null
        }
    }
    
    /**
     * Get herbs
     * Returns a pair of (herbs list, total pages)
     */
    suspend fun getHerbs(page: Int = 1, limit: Int = 10): Pair<List<Herb>, Int> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext Pair(emptyList(), 0)
            
            val response = knowledgeService.getHerbs(
                token = "Bearer $token",
                page = page,
                limit = limit
            )
            
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val totalPages = calculateTotalPages(body.total, limit)
                return@withContext Pair(body.herbs, totalPages)
            }
            
            return@withContext Pair(emptyList(), 0)
        } catch (e: IOException) {
            // Network error
            return@withContext Pair(emptyList(), 0)
        } catch (e: Exception) {
            // Other errors
            return@withContext Pair(emptyList(), 0)
        }
    }
    
    /**
     * Get herb details by ID
     */
    suspend fun getHerbDetails(herbId: String): Herb? = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext null
            
            val response = knowledgeService.getHerbDetail(
                token = "Bearer $token",
                herbId = herbId
            )
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()?.herb
            }
            
            return@withContext null
        } catch (e: IOException) {
            // Network error
            return@withContext null
        } catch (e: Exception) {
            // Other errors
            return@withContext null
        }
    }
    
    /**
     * Get knowledge categories
     */
    suspend fun getCategories(): List<Category> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            
            // If user is logged in, get personalized categories
            if (token != null) {
                val response = knowledgeService.getCategories(
                    token = "Bearer $token"
                )
                
                if (response.isSuccessful && response.body() != null) {
                    return@withContext response.body()?.categories ?: emptyList()
                }
            }
            
            // If not logged in or request failed, get public categories
            val response = knowledgeService.getPublicCategories()
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()?.categories ?: emptyList()
            }
            
            return@withContext emptyList()
        } catch (e: IOException) {
            // Network error
            return@withContext emptyList()
        } catch (e: Exception) {
            // Other errors
            return@withContext emptyList()
        }
    }
    
    /**
     * Search articles by query
     * Returns a pair of (articles list, total pages)
     */
    suspend fun searchArticles(query: String, page: Int = 1, limit: Int = 10): Pair<List<Article>, Int> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            
            // If user is logged in, search personalized articles
            if (token != null) {
                val response = knowledgeService.getArticles(
                    token = "Bearer $token",
                    query = query,
                    page = page,
                    limit = limit
                )
                
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    val totalPages = calculateTotalPages(body.total, limit)
                    return@withContext Pair(body.articles, totalPages)
                }
            }
            
            // If not logged in or request failed, search public articles
            val response = knowledgeService.getPublicArticles(
                query = query,
                page = page,
                limit = limit
            )
            
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val totalPages = calculateTotalPages(body.total, limit)
                return@withContext Pair(body.articles, totalPages)
            }
            
            return@withContext Pair(emptyList(), 0)
        } catch (e: IOException) {
            // Network error
            return@withContext Pair(emptyList(), 0)
        } catch (e: Exception) {
            // Other errors
            return@withContext Pair(emptyList(), 0)
        }
    }
    
    /**
     * Search herbs by query
     * Returns a pair of (herbs list, total pages)
     */
    suspend fun searchHerbs(query: String, page: Int = 1, limit: Int = 10): Pair<List<Herb>, Int> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext Pair(emptyList(), 0)
            
            val response = knowledgeService.getHerbs(
                token = "Bearer $token",
                query = query,
                page = page,
                limit = limit
            )
            
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val totalPages = calculateTotalPages(body.total, limit)
                return@withContext Pair(body.herbs, totalPages)
            }
            
            return@withContext Pair(emptyList(), 0)
        } catch (e: IOException) {
            // Network error
            return@withContext Pair(emptyList(), 0)
        } catch (e: Exception) {
            // Other errors
            return@withContext Pair(emptyList(), 0)
        }
    }
    
    /**
     * Calculate total pages based on total items and page size
     */
    private fun calculateTotalPages(totalItems: Int, pageSize: Int): Int {
        return if (totalItems <= 0) 0 else (totalItems + pageSize - 1) / pageSize
    }
} 