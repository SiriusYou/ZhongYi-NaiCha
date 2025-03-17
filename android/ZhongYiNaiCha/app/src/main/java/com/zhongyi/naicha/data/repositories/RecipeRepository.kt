package com.zhongyi.naicha.data.repositories

import com.zhongyi.naicha.data.api.ApiClient
import com.zhongyi.naicha.data.models.HealthProfile
import com.zhongyi.naicha.data.models.Recipe
import com.zhongyi.naicha.data.storage.TokenManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RecipeRepository @Inject constructor(
    private val tokenManager: TokenManager
) {
    
    private val recipeService = ApiClient.recipeService
    private val recommendationService = ApiClient.recommendationService
    
    /**
     * Get personalized recipe recommendations based on user's health profile
     */
    suspend fun getPersonalizedRecommendations(healthProfile: HealthProfile?): List<Recipe> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext emptyList()
            
            // If we have a health profile, use it to get personalized recommendations
            if (healthProfile != null) {
                val response = recommendationService.getRecommendations(
                    token = "Bearer $token",
                    constitution = healthProfile.constitution,
                    limit = 5
                )
                
                if (response.isSuccessful && response.body() != null) {
                    return@withContext response.body()?.recommendations ?: emptyList()
                }
            } else {
                // If no health profile, get daily recommendations
                val response = recommendationService.getDailyRecommendations(
                    token = "Bearer $token"
                )
                
                if (response.isSuccessful && response.body() != null) {
                    return@withContext response.body()?.recommendations ?: emptyList()
                }
            }
            
            return@withContext emptyList()
        } catch (e: IOException) {
            // Network error
            return@withContext emptyList()
        } catch (e: Exception) {
            // Other errors
            return@withContext emptyList()
        }
    }
    
    /**
     * Get seasonal recipe recommendations
     */
    suspend fun getSeasonalRecommendations(): List<Recipe> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            
            // If user is logged in, get personalized seasonal recommendations
            if (token != null) {
                val response = recommendationService.getSeasonalRecommendations(
                    token = "Bearer $token"
                )
                
                if (response.isSuccessful && response.body() != null) {
                    return@withContext response.body()?.recommendations ?: emptyList()
                }
            }
            
            // If not logged in or request failed, get public recipes
            val response = recipeService.getPublicRecipes(
                page = 1,
                limit = 5,
                category = "seasonal"
            )
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()?.recipes ?: emptyList()
            }
            
            return@withContext emptyList()
        } catch (e: IOException) {
            // Network error
            return@withContext emptyList()
        } catch (e: Exception) {
            // Other errors
            return@withContext emptyList()
        }
    }
    
    /**
     * Get all recipes (paginated)
     */
    suspend fun getRecipes(page: Int = 1, pageSize: Int = 10): List<Recipe> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            val response = if (token != null) {
                recipeService.getRecipes("Bearer $token", page, pageSize)
            } else {
                recipeService.getRecipes(page = page, pageSize = pageSize)
            }
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.recipes
            }
            return@withContext emptyList()
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext emptyList()
        }
    }
    
    /**
     * Get recipe details by ID
     */
    suspend fun getRecipeDetails(recipeId: String): Recipe? = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            val response = if (token != null) {
                recipeService.getRecipeDetails("Bearer $token", recipeId)
            } else {
                recipeService.getRecipeDetails(recipeId = recipeId)
            }
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.recipe
            }
            return@withContext null
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext null
        }
    }
    
    /**
     * Get recipes by category
     */
    suspend fun getRecipesByCategory(categoryId: String, page: Int = 1, pageSize: Int = 10): List<Recipe> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            val response = if (token != null) {
                recipeService.getRecipesByCategory("Bearer $token", categoryId, page, pageSize)
            } else {
                recipeService.getRecipesByCategory(categoryId = categoryId, page = page, pageSize = pageSize)
            }
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.recipes
            }
            return@withContext emptyList()
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext emptyList()
        }
    }
    
    /**
     * Get recommended recipes for the user
     */
    suspend fun getRecommendedRecipes(limit: Int = 5): List<Recipe> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext emptyList()
            
            val response = recipeService.getRecommendedRecipes("Bearer $token", limit)
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.recipes
            }
            return@withContext emptyList()
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext emptyList()
        }
    }
    
    /**
     * Search recipes
     */
    suspend fun searchRecipes(query: String, page: Int = 1, pageSize: Int = 10): List<Recipe> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            val response = if (token != null) {
                recipeService.searchRecipes("Bearer $token", query, page, pageSize)
            } else {
                recipeService.searchRecipes(query = query, page = page, pageSize = pageSize)
            }
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()!!.recipes
            }
            return@withContext emptyList()
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext emptyList()
        }
    }
} 