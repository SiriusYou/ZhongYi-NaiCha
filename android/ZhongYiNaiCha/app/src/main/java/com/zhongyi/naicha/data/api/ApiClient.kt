package com.zhongyi.naicha.data.api

import com.zhongyi.naicha.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Singleton class for creating and providing Retrofit service interfaces
 */
object ApiClient {
    
    private const val BASE_URL = "http://10.0.2.2:3000/api/" // Default for Android emulator to localhost
    
    private val httpClient: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
        
        OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    
    private val retrofit: Retrofit by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(httpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    // Service interfaces
    val userService: UserService by lazy {
        retrofit.create(UserService::class.java)
    }
    
    val profileService: ProfileService by lazy {
        retrofit.create(ProfileService::class.java)
    }
    
    val recipeService: RecipeService by lazy {
        retrofit.create(RecipeService::class.java)
    }
    
    val knowledgeService: KnowledgeService by lazy {
        retrofit.create(KnowledgeService::class.java)
    }
    
    val recommendationService: RecommendationService by lazy {
        retrofit.create(RecommendationService::class.java)
    }
    
    val communityService: CommunityService by lazy {
        retrofit.create(CommunityService::class.java)
    }
} 