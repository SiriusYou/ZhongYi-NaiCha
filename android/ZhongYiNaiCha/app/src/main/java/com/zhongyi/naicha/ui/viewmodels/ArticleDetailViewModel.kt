package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.Article
import com.zhongyi.naicha.data.repositories.BookmarkRepository
import com.zhongyi.naicha.data.repositories.KnowledgeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.io.IOException
import javax.inject.Inject

@HiltViewModel
class ArticleDetailViewModel @Inject constructor(
    private val knowledgeRepository: KnowledgeRepository,
    private val bookmarkRepository: BookmarkRepository
) : ViewModel() {

    // Article details
    private val _article = MutableLiveData<Article?>(null)
    val article: LiveData<Article?> = _article
    
    // Loading state
    private val _isLoading = MutableLiveData<Boolean>(false)
    val isLoading: LiveData<Boolean> = _isLoading
    
    // Error state
    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error
    
    // Bookmark state
    private val _isBookmarked = MutableLiveData<Boolean>(false)
    val isBookmarked: LiveData<Boolean> = _isBookmarked
    
    // Current article ID
    private var currentArticleId: String? = null
    
    /**
     * Load article details from the repository
     */
    fun loadArticleDetails(articleId: String) {
        _isLoading.value = true
        _error.value = null
        currentArticleId = articleId
        
        viewModelScope.launch {
            try {
                // Load article details
                val fetchedArticle = knowledgeRepository.getArticleDetails(articleId)
                _article.value = fetchedArticle
                
                if (fetchedArticle == null) {
                    _error.value = "Article not found"
                }
                
                // Check bookmark status
                checkBookmarkStatus(articleId)
            } catch (e: IOException) {
                _error.value = "Network error. Please check your connection."
            } catch (e: Exception) {
                _error.value = "Error loading article: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Check if the current article is bookmarked
     */
    private suspend fun checkBookmarkStatus(articleId: String) {
        try {
            val isBookmarked = bookmarkRepository.isArticleBookmarked(articleId)
            _isBookmarked.value = isBookmarked
        } catch (e: Exception) {
            // Ignore bookmark errors
        }
    }
    
    /**
     * Toggle bookmark status for the current article
     */
    fun toggleBookmark() {
        val articleId = currentArticleId ?: return
        
        viewModelScope.launch {
            try {
                val isNowBookmarked = bookmarkRepository.toggleArticleBookmark(articleId)
                _isBookmarked.value = isNowBookmarked
            } catch (e: Exception) {
                // Handle error - maybe show a toast
            }
        }
    }
} 