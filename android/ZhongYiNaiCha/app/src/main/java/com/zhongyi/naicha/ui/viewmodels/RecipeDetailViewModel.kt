package com.zhongyi.naicha.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.data.models.Recipe
import com.zhongyi.naicha.data.repositories.OrderRepository
import com.zhongyi.naicha.data.repositories.RecipeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.io.IOException
import java.math.BigDecimal
import javax.inject.Inject

@HiltViewModel
class RecipeDetailViewModel @Inject constructor(
    private val recipeRepository: RecipeRepository,
    private val orderRepository: OrderRepository
) : ViewModel() {

    // Recipe details
    private val _recipe = MutableLiveData<Recipe?>(null)
    val recipe: LiveData<Recipe?> = _recipe
    
    // Related recipes
    private val _relatedRecipes = MutableLiveData<List<Recipe>>(emptyList())
    val relatedRecipes: LiveData<List<Recipe>> = _relatedRecipes
    
    // Loading state
    private val _isLoading = MutableLiveData<Boolean>(false)
    val isLoading: LiveData<Boolean> = _isLoading
    
    // Error state
    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error
    
    // Add to cart success
    private val _addToCartSuccess = MutableLiveData<Boolean>(false)
    val addToCartSuccess: LiveData<Boolean> = _addToCartSuccess
    
    // Current recipe ID
    private var currentRecipeId: String? = null
    
    /**
     * Load recipe details from the repository
     */
    fun loadRecipeDetails(recipeId: String) {
        _isLoading.value = true
        _error.value = null
        currentRecipeId = recipeId
        
        viewModelScope.launch {
            try {
                // Load recipe details
                val fetchedRecipe = recipeRepository.getRecipeDetails(recipeId)
                _recipe.value = fetchedRecipe
                
                if (fetchedRecipe == null) {
                    _error.value = "Recipe not found"
                } else {
                    // Load related recipes based on category
                    loadRelatedRecipes(fetchedRecipe.category.id)
                }
            } catch (e: IOException) {
                _error.value = "Network error. Please check your connection."
            } catch (e: Exception) {
                _error.value = "Error loading recipe: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    /**
     * Load related recipes from the same category
     */
    private suspend fun loadRelatedRecipes(categoryId: String, limit: Int = 4) {
        try {
            val recipes = recipeRepository.getRecipesByCategory(categoryId, pageSize = limit)
            // Filter out the current recipe
            val filteredRecipes = recipes.filter { it.id != currentRecipeId }
            _relatedRecipes.value = filteredRecipes.take(limit)
        } catch (e: Exception) {
            // Ignore errors for related recipes
        }
    }
    
    /**
     * Refresh recipe details
     */
    fun refreshRecipe() {
        currentRecipeId?.let { recipeId ->
            loadRecipeDetails(recipeId)
        }
    }
    
    /**
     * Add the current recipe to the cart
     */
    fun addToCart(quantity: Int = 1, options: Map<String, String>? = null, notes: String? = null) {
        val currentRecipe = _recipe.value ?: return
        
        val success = orderRepository.addItemToCart(
            recipeId = currentRecipe.id,
            name = currentRecipe.name,
            image = currentRecipe.imageUrl,
            price = BigDecimal(currentRecipe.price),
            quantity = quantity,
            options = options,
            notes = notes
        )
        
        _addToCartSuccess.value = success
        // Reset after a short delay
        viewModelScope.launch {
            kotlinx.coroutines.delay(2000)
            _addToCartSuccess.value = false
        }
    }
} 