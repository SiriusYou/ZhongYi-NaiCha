package com.zhongyi.naicha.data.api

import com.zhongyi.naicha.data.api.responses.ArticleDetailResponse
import com.zhongyi.naicha.data.api.responses.ArticleListResponse
import com.zhongyi.naicha.data.api.responses.CategoryListResponse
import com.zhongyi.naicha.data.api.responses.HerbDetailResponse
import com.zhongyi.naicha.data.api.responses.HerbListResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Path
import retrofit2.http.Query

interface KnowledgeService {
    
    @GET("knowledge/articles")
    suspend fun getArticles(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10,
        @Query("category") category: String? = null,
        @Query("query") query: String? = null
    ): Response<ArticleListResponse>
    
    @GET("knowledge/public/articles")
    suspend fun getPublicArticles(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10,
        @Query("category") category: String? = null,
        @Query("query") query: String? = null
    ): Response<ArticleListResponse>
    
    @GET("knowledge/articles/{id}")
    suspend fun getArticleDetail(
        @Header("Authorization") token: String,
        @Path("id") articleId: String
    ): Response<ArticleDetailResponse>
    
    @GET("knowledge/public/articles/{id}")
    suspend fun getPublicArticleDetail(
        @Path("id") articleId: String
    ): Response<ArticleDetailResponse>
    
    @GET("knowledge/herbs")
    suspend fun getHerbs(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10,
        @Query("nature") nature: String? = null,
        @Query("taste") taste: String? = null,
        @Query("meridian") meridian: String? = null,
        @Query("query") query: String? = null
    ): Response<HerbListResponse>
    
    @GET("knowledge/herbs/{id}")
    suspend fun getHerbDetail(
        @Header("Authorization") token: String,
        @Path("id") herbId: String
    ): Response<HerbDetailResponse>
    
    @GET("knowledge/categories")
    suspend fun getCategories(
        @Header("Authorization") token: String
    ): Response<CategoryListResponse>
    
    @GET("knowledge/public/categories")
    suspend fun getPublicCategories(): Response<CategoryListResponse>
    
    @GET("knowledge/search")
    suspend fun search(
        @Header("Authorization") token: String,
        @Query("query") query: String,
        @Query("type") type: String? = null
    ): Response<Map<String, Any>>
} 