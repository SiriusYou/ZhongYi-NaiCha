package com.zhongyi.naicha.data.storage

import android.content.Context
import android.content.SharedPreferences
import com.zhongyi.naicha.ZhongYiNaiChaApplication

class TokenManager private constructor() {
    
    companion object {
        private const val PREFERENCES_NAME = "auth_prefs"
        private const val KEY_TOKEN = "jwt_token"
        
        @Volatile
        private var instance: TokenManager? = null
        
        fun getInstance(): TokenManager {
            return instance ?: synchronized(this) {
                instance ?: TokenManager().also { instance = it }
            }
        }
    }
    
    private val preferences: SharedPreferences by lazy {
        ZhongYiNaiChaApplication.appContext.getSharedPreferences(
            PREFERENCES_NAME,
            Context.MODE_PRIVATE
        )
    }
    
    /**
     * Save auth token to shared preferences
     */
    fun saveToken(token: String) {
        preferences.edit().putString(KEY_TOKEN, token).apply()
    }
    
    /**
     * Get auth token from shared preferences
     */
    fun getToken(): String? {
        return preferences.getString(KEY_TOKEN, null)
    }
    
    /**
     * Clear auth token from shared preferences
     */
    fun clearToken() {
        preferences.edit().remove(KEY_TOKEN).apply()
    }
    
    /**
     * Check if user has a valid token
     */
    fun hasToken(): Boolean {
        return !getToken().isNullOrEmpty()
    }
} 