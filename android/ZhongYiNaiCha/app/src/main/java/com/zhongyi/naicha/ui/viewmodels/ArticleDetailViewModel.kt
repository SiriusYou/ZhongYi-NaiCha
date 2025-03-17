package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.Article
import com.zhongyi.naicha.data.repositories.KnowledgeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.io.IOException
import javax.inject.Inject

@HiltViewModel
class ArticleDetailViewModel @Inject constructor(
    private val knowledgeRepository: KnowledgeRepository
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
    
    /**
     * Load article details from the repository
     */
    fun loadArticleDetails(articleId: String) {
        _isLoading.value = true
        _error.value = null
        
        viewModelScope.launch {
            try {
                val fetchedArticle = knowledgeRepository.getArticleDetails(articleId)
                _article.value = fetchedArticle
                
                if (fetchedArticle == null) {
                    _error.value = "Article not found"
                }
            } catch (e: IOException) {
                _error.value = "Network error. Please check your connection."
            } catch (e: Exception) {
                _error.value = "Error loading article: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
} 