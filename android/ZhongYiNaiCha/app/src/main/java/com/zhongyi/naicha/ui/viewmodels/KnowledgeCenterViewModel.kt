package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.Article
import com.zhongyi.naicha.data.models.Herb
import com.zhongyi.naicha.data.repositories.KnowledgeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.io.IOException
import javax.inject.Inject

@HiltViewModel
class KnowledgeCenterViewModel @Inject constructor(
    private val knowledgeRepository: KnowledgeRepository
) : ViewModel() {

    // Articles
    private val _articles = MutableLiveData<List<Article>>(emptyList())
    val articles: LiveData<List<Article>> = _articles
    
    // Herbs
    private val _herbs = MutableLiveData<List<Herb>>(emptyList())
    val herbs: LiveData<List<Herb>> = _herbs
    
    // Loading state
    private val _isLoading = MutableLiveData<Boolean>(false)
    val isLoading: LiveData<Boolean> = _isLoading
    
    // Error state
    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error
    
    // Pagination state
    private val _isLastPage = MutableLiveData<Boolean>(false)
    val isLastPage: LiveData<Boolean> = _isLastPage
    
    // Current page and search query
    private var currentArticlePage = 1
    private var totalArticlePages = 1
    private var currentHerbPage = 1
    private var totalHerbPages = 1
    private var currentArticleQuery: String? = null
    private var currentHerbQuery: String? = null
    
    // Page size
    private val pageSize = 10
    
    /**
     * Load articles from the repository
     */
    fun loadArticles() {
        _isLoading.value = true
        _error.value = null
        currentArticlePage = 1
        currentArticleQuery = null
        
        viewModelScope.launch {
            try {
                val (fetchedArticles, totalPages) = knowledgeRepository.getArticles(page = 1, limit = pageSize)
                _articles.value = fetchedArticles
                totalArticlePages = totalPages
                _isLastPage.value = currentArticlePage >= totalArticlePages
            } catch (e: IOException) {
                _error.value = "Network error. Please check your connection."
            } catch (e: Exception) {
                _error.value = "Error loading articles: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Load more articles for pagination
     */
    fun loadMoreArticles() {
        if (_isLoading.value == true || currentArticlePage >= totalArticlePages) {
            return
        }
        
        _isLoading.value = true
        viewModelScope.launch {
            try {
                val nextPage = currentArticlePage + 1
                val result = if (currentArticleQuery != null) {
                    knowledgeRepository.searchArticles(currentArticleQuery!!, page = nextPage, limit = pageSize)
                } else {
                    knowledgeRepository.getArticles(page = nextPage, limit = pageSize)
                }
                
                val (fetchedArticles, totalPages) = result
                val currentList = _articles.value ?: emptyList()
                _articles.value = currentList + fetchedArticles
                
                currentArticlePage = nextPage
                totalArticlePages = totalPages
                _isLastPage.value = currentArticlePage >= totalArticlePages
            } catch (e: Exception) {
                // Log the error but don't display to user for pagination errors
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Search articles by query
     */
    fun searchArticles(query: String) {
        if (query.isBlank()) {
            loadArticles()
            return
        }
        
        _isLoading.value = true
        _error.value = null
        currentArticlePage = 1
        currentArticleQuery = query
        
        viewModelScope.launch {
            try {
                val (fetchedArticles, totalPages) = knowledgeRepository.searchArticles(query, page = 1, limit = pageSize)
                _articles.value = fetchedArticles
                totalArticlePages = totalPages
                _isLastPage.value = currentArticlePage >= totalArticlePages
            } catch (e: IOException) {
                _error.value = "Network error. Please check your connection."
            } catch (e: Exception) {
                _error.value = "Error searching articles: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Load herbs from the repository
     */
    fun loadHerbs() {
        _isLoading.value = true
        _error.value = null
        currentHerbPage = 1
        currentHerbQuery = null
        
        viewModelScope.launch {
            try {
                val (fetchedHerbs, totalPages) = knowledgeRepository.getHerbs(page = 1, limit = pageSize)
                _herbs.value = fetchedHerbs
                totalHerbPages = totalPages
                _isLastPage.value = currentHerbPage >= totalHerbPages
            } catch (e: IOException) {
                _error.value = "Network error. Please check your connection."
            } catch (e: Exception) {
                _error.value = "Error loading herbs: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Load more herbs for pagination
     */
    fun loadMoreHerbs() {
        if (_isLoading.value == true || currentHerbPage >= totalHerbPages) {
            return
        }
        
        _isLoading.value = true
        viewModelScope.launch {
            try {
                val nextPage = currentHerbPage + 1
                val result = if (currentHerbQuery != null) {
                    knowledgeRepository.searchHerbs(currentHerbQuery!!, page = nextPage, limit = pageSize)
                } else {
                    knowledgeRepository.getHerbs(page = nextPage, limit = pageSize)
                }
                
                val (fetchedHerbs, totalPages) = result
                val currentList = _herbs.value ?: emptyList()
                _herbs.value = currentList + fetchedHerbs
                
                currentHerbPage = nextPage
                totalHerbPages = totalPages
                _isLastPage.value = currentHerbPage >= totalHerbPages
            } catch (e: Exception) {
                // Log the error but don't display to user for pagination errors
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Search herbs by query
     */
    fun searchHerbs(query: String) {
        if (query.isBlank()) {
            loadHerbs()
            return
        }
        
        _isLoading.value = true
        _error.value = null
        currentHerbPage = 1
        currentHerbQuery = query
        
        viewModelScope.launch {
            try {
                val (fetchedHerbs, totalPages) = knowledgeRepository.searchHerbs(query, page = 1, limit = pageSize)
                _herbs.value = fetchedHerbs
                totalHerbPages = totalPages
                _isLastPage.value = currentHerbPage >= totalHerbPages
            } catch (e: IOException) {
                _error.value = "Network error. Please check your connection."
            } catch (e: Exception) {
                _error.value = "Error searching herbs: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
} 