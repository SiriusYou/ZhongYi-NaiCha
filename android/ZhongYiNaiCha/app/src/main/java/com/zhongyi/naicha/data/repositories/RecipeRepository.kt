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
     * Get recipe details by ID
     */
    suspend fun getRecipeDetails(recipeId: String): Recipe? = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            
            // If user is logged in, get personalized recipe details
            if (token != null) {
                val response = recipeService.getRecipeDetail(
                    token = "Bearer $token",
                    recipeId = recipeId
                )
                
                if (response.isSuccessful && response.body() != null) {
                    return@withContext response.body()?.recipe
                }
            }
            
            // If not logged in or request failed, get public recipe details
            val response = recipeService.getPublicRecipeDetail(recipeId)
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()?.recipe
            }
            
            return@withContext null
        } catch (e: IOException) {
            // Network error
            return@withContext null
        } catch (e: Exception) {
            // Other errors
            return@withContext null
        }
    }
    
    /**
     * Search recipes by query
     */
    suspend fun searchRecipes(query: String, page: Int = 1, limit: Int = 10): List<Recipe> = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken()
            
            // If user is logged in, search personalized recipes
            if (token != null) {
                val response = recipeService.getRecipes(
                    token = "Bearer $token",
                    query = query,
                    page = page,
                    limit = limit
                )
                
                if (response.isSuccessful && response.body() != null) {
                    return@withContext response.body()?.recipes ?: emptyList()
                }
            }
            
            // If not logged in or request failed, search public recipes
            val response = recipeService.getPublicRecipes(
                query = query,
                page = page,
                limit = limit
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
} 