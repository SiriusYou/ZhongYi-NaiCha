package com.zhongyi.naicha.data.repositories

import com.zhongyi.naicha.data.api.ApiClient
import com.zhongyi.naicha.data.models.Article
import com.zhongyi.naicha.data.models.Herb
import com.zhongyi.naicha.data.storage.BookmarkDao
import com.zhongyi.naicha.data.storage.BookmarkEntity
import com.zhongyi.naicha.data.storage.TokenManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BookmarkRepository @Inject constructor(
    private val bookmarkDao: BookmarkDao,
    private val knowledgeRepository: KnowledgeRepository,
    private val tokenManager: TokenManager
) {

    private val bookmarkService = ApiClient.bookmarkService
    
    /**
     * Get all bookmarked articles
     */
    fun getBookmarkedArticlesFlow(): Flow<List<String>> {
        return bookmarkDao.getBookmarksFlow(BookmarkEntity.TYPE_ARTICLE)
            .map { bookmarks -> bookmarks.map { it.itemId } }
    }
    
    /**
     * Get all bookmarked herbs
     */
    fun getBookmarkedHerbsFlow(): Flow<List<String>> {
        return bookmarkDao.getBookmarksFlow(BookmarkEntity.TYPE_HERB)
            .map { bookmarks -> bookmarks.map { it.itemId } }
    }
    
    /**
     * Check if an article is bookmarked
     */
    suspend fun isArticleBookmarked(articleId: String): Boolean = withContext(Dispatchers.IO) {
        return@withContext bookmarkDao.isBookmarked(articleId, BookmarkEntity.TYPE_ARTICLE)
    }
    
    /**
     * Check if a herb is bookmarked
     */
    suspend fun isHerbBookmarked(herbId: String): Boolean = withContext(Dispatchers.IO) {
        return@withContext bookmarkDao.isBookmarked(herbId, BookmarkEntity.TYPE_HERB)
    }
    
    /**
     * Toggle article bookmark status
     * Returns true if the article is now bookmarked, false otherwise
     */
    suspend fun toggleArticleBookmark(articleId: String): Boolean = withContext(Dispatchers.IO) {
        val isCurrentlyBookmarked = bookmarkDao.isBookmarked(articleId, BookmarkEntity.TYPE_ARTICLE)
        
        if (isCurrentlyBookmarked) {
            // Remove bookmark
            bookmarkDao.deleteBookmark(articleId, BookmarkEntity.TYPE_ARTICLE)
            // Sync with server if logged in
            syncRemoveBookmarkIfLoggedIn(articleId, BookmarkEntity.TYPE_ARTICLE)
        } else {
            // Add bookmark
            bookmarkDao.insertBookmark(BookmarkEntity(articleId, BookmarkEntity.TYPE_ARTICLE))
            // Sync with server if logged in
            syncAddBookmarkIfLoggedIn(articleId, BookmarkEntity.TYPE_ARTICLE)
        }
        
        return@withContext !isCurrentlyBookmarked
    }
    
    /**
     * Toggle herb bookmark status
     * Returns true if the herb is now bookmarked, false otherwise
     */
    suspend fun toggleHerbBookmark(herbId: String): Boolean = withContext(Dispatchers.IO) {
        val isCurrentlyBookmarked = bookmarkDao.isBookmarked(herbId, BookmarkEntity.TYPE_HERB)
        
        if (isCurrentlyBookmarked) {
            // Remove bookmark
            bookmarkDao.deleteBookmark(herbId, BookmarkEntity.TYPE_HERB)
            // Sync with server if logged in
            syncRemoveBookmarkIfLoggedIn(herbId, BookmarkEntity.TYPE_HERB)
        } else {
            // Add bookmark
            bookmarkDao.insertBookmark(BookmarkEntity(herbId, BookmarkEntity.TYPE_HERB))
            // Sync with server if logged in
            syncAddBookmarkIfLoggedIn(herbId, BookmarkEntity.TYPE_HERB)
        }
        
        return@withContext !isCurrentlyBookmarked
    }
    
    /**
     * Get all bookmarked articles with details
     */
    suspend fun getBookmarkedArticles(): List<Article> = withContext(Dispatchers.IO) {
        val bookmarkedIds = bookmarkDao.getBookmarks(BookmarkEntity.TYPE_ARTICLE).map { it.itemId }
        val articles = mutableListOf<Article>()
        
        for (id in bookmarkedIds) {
            knowledgeRepository.getArticleDetails(id)?.let {
                articles.add(it)
            }
        }
        
        return@withContext articles
    }
    
    /**
     * Get all bookmarked herbs with details
     */
    suspend fun getBookmarkedHerbs(): List<Herb> = withContext(Dispatchers.IO) {
        val bookmarkedIds = bookmarkDao.getBookmarks(BookmarkEntity.TYPE_HERB).map { it.itemId }
        val herbs = mutableListOf<Herb>()
        
        for (id in bookmarkedIds) {
            knowledgeRepository.getHerbDetails(id)?.let {
                herbs.add(it)
            }
        }
        
        return@withContext herbs
    }
    
    /**
     * Sync bookmarks with server
     */
    suspend fun syncBookmarksWithServer() = withContext(Dispatchers.IO) {
        val token = tokenManager.getToken() ?: return@withContext
        
        try {
            // Get bookmarks from server
            val response = bookmarkService.getBookmarks("Bearer $token")
            
            if (response.isSuccessful && response.body() != null) {
                val remoteBookmarks = response.body()!!.bookmarks
                val localBookmarks = bookmarkDao.getAllBookmarks()
                
                // Add new bookmarks from server
                for (bookmark in remoteBookmarks) {
                    if (!localBookmarks.any { it.itemId == bookmark.itemId && it.type == bookmark.type }) {
                        bookmarkDao.insertBookmark(
                            BookmarkEntity(bookmark.itemId, bookmark.type)
                        )
                    }
                }
                
                // Remove local bookmarks that don't exist on server
                for (localBookmark in localBookmarks) {
                    if (!remoteBookmarks.any { it.itemId == localBookmark.itemId && it.type == localBookmark.type }) {
                        bookmarkDao.deleteBookmark(localBookmark.itemId, localBookmark.type)
                    }
                }
            }
        } catch (e: Exception) {
            // Log error but don't throw - local bookmarks still work
            e.printStackTrace()
        }
    }
    
    /**
     * Sync adding a bookmark if user is logged in
     */
    private suspend fun syncAddBookmarkIfLoggedIn(itemId: String, type: String) {
        val token = tokenManager.getToken() ?: return
        
        try {
            bookmarkService.addBookmark(
                token = "Bearer $token",
                itemId = itemId,
                type = type
            )
        } catch (e: IOException) {
            // Network error - will be synced later
        } catch (e: Exception) {
            // Other error - will be synced later
        }
    }
    
    /**
     * Sync removing a bookmark if user is logged in
     */
    private suspend fun syncRemoveBookmarkIfLoggedIn(itemId: String, type: String) {
        val token = tokenManager.getToken() ?: return
        
        try {
            bookmarkService.removeBookmark(
                token = "Bearer $token",
                itemId = itemId,
                type = type
            )
        } catch (e: IOException) {
            // Network error - will be synced later
        } catch (e: Exception) {
            // Other error - will be synced later
        }
    }
} 