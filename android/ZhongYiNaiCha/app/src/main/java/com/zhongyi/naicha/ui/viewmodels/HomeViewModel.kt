package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.Recipe
import com.zhongyi.naicha.data.repositories.RecipeRepository
import com.zhongyi.naicha.data.repositories.TipRepository
import com.zhongyi.naicha.data.repositories.UserRepository
import kotlinx.coroutines.launch
import java.io.IOException
import javax.inject.Inject

class HomeViewModel @Inject constructor(
    private val recipeRepository: RecipeRepository,
    private val userRepository: UserRepository,
    private val tipRepository: TipRepository
) : ViewModel() {

    // Personalized recommendations
    private val _recommendations = MutableLiveData<List<Recipe>>()
    val recommendations: LiveData<List<Recipe>> = _recommendations

    // Seasonal recommendations
    private val _seasonalRecommendations = MutableLiveData<List<Recipe>>()
    val seasonalRecommendations: LiveData<List<Recipe>> = _seasonalRecommendations

    // Daily health tip
    private val _dailyTip = MutableLiveData<String>()
    val dailyTip: LiveData<String> = _dailyTip

    // Loading state
    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    // Error messages
    private val _errorMessage = MutableLiveData<String>()
    val errorMessage: LiveData<String> = _errorMessage

    /**
     * Load personalized recommendations based on user's health profile
     */
    fun loadRecommendations() {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                
                // Get user's health profile
                val userProfile = userRepository.getUserHealthProfile()
                
                // Get personalized recommendations
                val recommendations = recipeRepository.getPersonalizedRecommendations(userProfile)
                _recommendations.value = recommendations
                
            } catch (e: IOException) {
                _errorMessage.value = "Network error: ${e.localizedMessage}"
            } catch (e: Exception) {
                _errorMessage.value = "Error loading recommendations: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Load seasonal recommendations based on current season
     */
    fun loadSeasonalRecommendations() {
        viewModelScope.launch {
            try {
                _isLoading.value = true
                
                // Get seasonal recommendations
                val seasonalRecommendations = recipeRepository.getSeasonalRecommendations()
                _seasonalRecommendations.value = seasonalRecommendations
                
            } catch (e: IOException) {
                _errorMessage.value = "Network error: ${e.localizedMessage}"
            } catch (e: Exception) {
                _errorMessage.value = "Error loading seasonal recommendations: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Load daily health tip
     */
    fun loadDailyTip() {
        viewModelScope.launch {
            try {
                // Get daily health tip
                val tip = tipRepository.getDailyTip()
                _dailyTip.value = tip
                
            } catch (e: Exception) {
                _errorMessage.value = "Error loading daily tip: ${e.localizedMessage}"
            }
        }
    }
} 