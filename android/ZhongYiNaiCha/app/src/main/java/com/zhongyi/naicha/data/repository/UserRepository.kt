package com.zhongyi.naicha.data.repository

import com.zhongyi.naicha.data.api.ApiClient
import com.zhongyi.naicha.data.models.User
import com.zhongyi.naicha.data.storage.TokenManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class UserRepository {
    
    private val apiClient = ApiClient.userService
    private val tokenManager = TokenManager.getInstance()
    
    /**
     * Login with phone number and verification code
     */
    suspend fun login(phoneNumber: String, verificationCode: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.login(phoneNumber, verificationCode)
            
            if (response.isSuccessful && response.body() != null) {
                // Save auth token
                response.body()?.token?.let {
                    tokenManager.saveToken(it)
                }
                
                // Save user info
                response.body()?.user?.let {
                    // TODO: Save user info to local database
                }
                
                return@withContext true
            }
            
            return@withContext false
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext false
        }
    }
    
    /**
     * Register with user data and verification code
     */
    suspend fun register(user: User, verificationCode: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.register(user, verificationCode)
            
            if (response.isSuccessful && response.body() != null) {
                // Save auth token
                response.body()?.token?.let {
                    tokenManager.saveToken(it)
                }
                
                // Save user info
                response.body()?.user?.let {
                    // TODO: Save user info to local database
                }
                
                return@withContext true
            }
            
            return@withContext false
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext false
        }
    }
    
    /**
     * Login with third-party provider
     */
    suspend fun loginWithThirdParty(provider: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.loginWithThirdParty(provider)
            
            if (response.isSuccessful && response.body() != null) {
                // Save auth token
                response.body()?.token?.let {
                    tokenManager.saveToken(it)
                }
                
                // Save user info
                response.body()?.user?.let {
                    // TODO: Save user info to local database
                }
                
                return@withContext true
            }
            
            return@withContext false
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext false
        }
    }
    
    /**
     * Request verification code for phone number
     */
    suspend fun requestVerificationCode(phoneNumber: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.requestVerificationCode(phoneNumber)
            
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext false
        }
    }
    
    /**
     * Get current user info
     */
    suspend fun getCurrentUser(): User? = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext null
            
            val response = apiClient.getCurrentUser("Bearer $token")
            
            if (response.isSuccessful && response.body() != null) {
                return@withContext response.body()?.user
            }
            
            return@withContext null
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            return@withContext null
        }
    }
    
    /**
     * Logout current user
     */
    suspend fun logout(): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = tokenManager.getToken() ?: return@withContext true
            
            val response = apiClient.logout("Bearer $token")
            
            // Clear token regardless of API response
            tokenManager.clearToken()
            
            return@withContext response.isSuccessful
        } catch (e: Exception) {
            // Log error
            e.printStackTrace()
            // Still clear token on error
            tokenManager.clearToken()
            return@withContext false
        }
    }
} 