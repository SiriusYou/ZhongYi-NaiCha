package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.Herb
import com.zhongyi.naicha.data.repositories.KnowledgeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.io.IOException
import javax.inject.Inject

@HiltViewModel
class HerbDetailViewModel @Inject constructor(
    private val knowledgeRepository: KnowledgeRepository
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
    
    /**
     * Load herb details from the repository
     */
    fun loadHerbDetails(herbId: String) {
        _isLoading.value = true
        _error.value = null
        
        viewModelScope.launch {
            try {
                val fetchedHerb = knowledgeRepository.getHerbDetails(herbId)
                _herb.value = fetchedHerb
                
                if (fetchedHerb == null) {
                    _error.value = "Herb not found"
                }
            } catch (e: IOException) {
                _error.value = "Network error. Please check your connection."
            } catch (e: Exception) {
                _error.value = "Error loading herb: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
} 