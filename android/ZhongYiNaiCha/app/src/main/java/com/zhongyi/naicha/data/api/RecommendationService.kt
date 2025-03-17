package com.zhongyi.naicha.data.api

import com.zhongyi.naicha.data.api.responses.RecommendationResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Query

interface RecommendationService {
    
    @GET("recommendations")
    suspend fun getRecommendations(
        @Header("Authorization") token: String,
        @Query("constitution") constitution: String? = null,
        @Query("season") season: String? = null,
        @Query("symptoms") symptoms: String? = null,
        @Query("limit") limit: Int = 5
    ): Response<RecommendationResponse>
    
    @GET("recommendations/daily")
    suspend fun getDailyRecommendations(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int = 3
    ): Response<RecommendationResponse>
    
    @GET("recommendations/seasonal")
    suspend fun getSeasonalRecommendations(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int = 3
    ): Response<RecommendationResponse>
} 