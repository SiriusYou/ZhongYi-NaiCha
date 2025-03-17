package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.Article
import com.zhongyi.naicha.data.models.Herb
import com.zhongyi.naicha.data.repositories.BookmarkRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.io.IOException
import javax.inject.Inject

@HiltViewModel
class BookmarksViewModel @Inject constructor(
    private val bookmarkRepository: BookmarkRepository
) : ViewModel() {

    // Bookmarked articles
    private val _bookmarkedArticles = MutableLiveData<List<Article>>(emptyList())
    val bookmarkedArticles: LiveData<List<Article>> = _bookmarkedArticles
    
    // Bookmarked herbs
    private val _bookmarkedHerbs = MutableLiveData<List<Herb>>(emptyList())
    val bookmarkedHerbs: LiveData<List<Herb>> = _bookmarkedHerbs
    
    // Loading state
    private val _isLoading = MutableLiveData<Boolean>(false)
    val isLoading: LiveData<Boolean> = _isLoading
    
    // Error state
    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error
    
    init {
        // Sync bookmarks with server when ViewModel is created
        syncBookmarksWithServer()
    }
    
    /**
     * Load bookmarked articles
     */
    fun loadBookmarkedArticles() {
        _isLoading.value = true
        _error.value = null
        
        viewModelScope.launch {
            try {
                val articles = bookmarkRepository.getBookmarkedArticles()
                _bookmarkedArticles.value = articles
            } catch (e: IOException) {
                _error.value = "Network error. Please check your connection."
            } catch (e: Exception) {
                _error.value = "Error loading bookmarked articles: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Load bookmarked herbs
     */
    fun loadBookmarkedHerbs() {
        _isLoading.value = true
        _error.value = null
        
        viewModelScope.launch {
            try {
                val herbs = bookmarkRepository.getBookmarkedHerbs()
                _bookmarkedHerbs.value = herbs
            } catch (e: IOException) {
                _error.value = "Network error. Please check your connection."
            } catch (e: Exception) {
                _error.value = "Error loading bookmarked herbs: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Sync bookmarks with server
     */
    private fun syncBookmarksWithServer() {
        viewModelScope.launch {
            try {
                bookmarkRepository.syncBookmarksWithServer()
            } catch (e: Exception) {
                // Silently fail - local bookmarks still work
            }
        }
    }
    
    /**
     * Refresh all bookmarks data
     */
    fun refreshBookmarks() {
        loadBookmarkedArticles()
        loadBookmarkedHerbs()
    }
} 