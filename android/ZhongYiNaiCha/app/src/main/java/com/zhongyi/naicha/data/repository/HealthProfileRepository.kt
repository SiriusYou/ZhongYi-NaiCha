package com.zhongyi.naicha.data.repository

import com.zhongyi.naicha.data.api.ApiClient
import com.zhongyi.naicha.data.models.HealthProfile
import com.zhongyi.naicha.data.storage.TokenManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class HealthProfileRepository {
    
    private val apiClient = ApiClient.profileService
    private val tokenManager = TokenManager.getInstance()
    
    /**
     * Get user health profile
     */
    suspend fun getHealthProfile(): HealthProfile? = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext null
            
            val response = apiClient.getHealthProfile("Bearer $token")
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()?.profile
            }
            
            return@withContext null
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext null
        }
    }
    
    /**
     * Save user health profile
     */
    suspend fun saveHealthProfile(profile: HealthProfile): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext false
            
            val response = apiClient.saveHealthProfile("Bearer $token", profile)
            
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext false
        }
    }
    
    /**
     * Update user health profile
     */
    suspend fun updateHealthProfile(profile: HealthProfile): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext false
            
            val response = apiClient.updateHealthProfile("Bearer $token", profile)
            
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext false
        }
    }
    
    /**
     * Get TCM constitution assessment questionnaire
     */
    suspend fun getConstitutionQuestionnaire(): List<Map<String, Any>>? = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.getConstitutionQuestionnaire()
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()?.questions
            }
            
            return@withContext null
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext null
        }
    }
    
    /**
     * Submit TCM constitution assessment answers
     */
    suspend fun submitConstitutionAssessment(
        answers: Map<String, Int>
    ): String? = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext null
            
            val response = apiClient.submitConstitutionAssessment("Bearer $token", answers)
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()?.constitutionType
            }
            
            return@withContext null
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext null
        }
    }
} 