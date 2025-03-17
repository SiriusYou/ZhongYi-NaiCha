package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.Herb
import com.zhongyi.naicha.data.repositories.BookmarkRepository
import com.zhongyi.naicha.data.repositories.KnowledgeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.io.IOException
import javax.inject.Inject

@HiltViewModel
class HerbDetailViewModel @Inject constructor(
    private val knowledgeRepository: KnowledgeRepository,
    private val bookmarkRepository: BookmarkRepository
) : ViewModel() {

    // Herb details
    private val _herb = MutableLiveData<Herb?>(null)
    val herb: LiveData<Herb?> = _herb
    
    // Loading state
    private val _isLoading = MutableLiveData<Boolean>(false)
    val isLoading: LiveData<Boolean> = _isLoading
    
    // Error state
    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error
    
    // Bookmark state
    private val _isBookmarked = MutableLiveData<Boolean>(false)
    val isBookmarked: LiveData<Boolean> = _isBookmarked
    
    // Current herb ID
    private var currentHerbId: String? = null
    
    /**
     * Load herb details from the repository
     */
    fun loadHerbDetails(herbId: String) {
        _isLoading.value = true
        _error.value = null
        currentHerbId = herbId
        
        viewModelScope.launch {
            try {
                // Load herb details
                val fetchedHerb = knowledgeRepository.getHerbDetails(herbId)
                _herb.value = fetchedHerb
                
                if (fetchedHerb == null) {
                    _error.value = "Herb not found"
                }
                
                // Check bookmark status
                checkBookmarkStatus(herbId)
            } catch (e: IOException) {
                _error.value = "Network error. Please check your connection."
            } catch (e: Exception) {
                _error.value = "Error loading herb: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Check if the current herb is bookmarked
     */
    private suspend fun checkBookmarkStatus(herbId: String) {
        try {
            val isBookmarked = bookmarkRepository.isHerbBookmarked(herbId)
            _isBookmarked.value = isBookmarked
        } catch (e: Exception) {
            // Ignore bookmark errors
        }
    }
    
    /**
     * Toggle bookmark status for the current herb
     */
    fun toggleBookmark() {
        val herbId = currentHerbId ?: return
        
        viewModelScope.launch {
            try {
                val isNowBookmarked = bookmarkRepository.toggleHerbBookmark(herbId)
                _isBookmarked.value = isNowBookmarked
            } catch (e: Exception) {
                // Handle error - maybe show a toast
            }
        }
    }
} 