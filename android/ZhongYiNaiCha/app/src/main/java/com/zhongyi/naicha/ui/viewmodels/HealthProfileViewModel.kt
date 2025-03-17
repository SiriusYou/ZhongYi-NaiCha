package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.HealthProfile
import com.zhongyi.naicha.data.repository.HealthProfileRepository
import kotlinx.coroutines.launch
import java.io.IOException

class HealthProfileViewModel : ViewModel() {
    
    private val repository = HealthProfileRepository()
    
    // Profile data
    val age = MutableLiveData<Int>()
    val height = MutableLiveData<Int>()
    val weight = MutableLiveData<Int>()
    val gender = MutableLiveData<String>()
    val constitution = MutableLiveData<String>()
    
    // UI state
    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading
    
    private val _saveResult = MutableLiveData<Boolean>()
    val saveResult: LiveData<Boolean> = _saveResult
    
    private val _errorMessage = MutableLiveData<String>()
    val errorMessage: LiveData<String> = _errorMessage
    
    init {
        // Load existing profile if available
        loadHealthProfile()
    }
    
    /**
     * Load existing health profile from repository
     */
    private fun loadHealthProfile() {
        _isLoading.value = true
        
        viewModelScope.launch {
            try {
                val profile = repository.getHealthProfile()
                
                profile?.let {
                    age.value = it.age
                    height.value = it.height
                    weight.value = it.weight
                    gender.value = it.gender
                    constitution.value = it.constitution
                }
            } catch (e: Exception) {
                _errorMessage.value = "Error loading profile: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Save health profile to repository
     */
    fun saveHealthProfile(
        age: Int,
        height: Int,
        weight: Int
    ) {
        _isLoading.value = true
        
        viewModelScope.launch {
            try {
                val profile = HealthProfile(
                    age = age,
                    height = height,
                    weight = weight,
                    gender = gender.value ?: "未知",
                    constitution = constitution.value ?: "未知",
                )
                
                val result = repository.saveHealthProfile(profile)
                _saveResult.value = result
                
                if (!result) {
                    _errorMessage.value = "Failed to save profile. Please try again."
                }
            } catch (e: IOException) {
                _saveResult.value = false
                _errorMessage.value = "Network error: ${e.message}"
            } catch (e: Exception) {
                _saveResult.value = false
                _errorMessage.value = "Error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
} 