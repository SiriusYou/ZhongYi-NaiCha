package com.zhongyi.naicha.data.api

import com.zhongyi.naicha.data.api.responses.CategoryListResponse
import com.zhongyi.naicha.data.api.responses.IngredientListResponse
import com.zhongyi.naicha.data.api.responses.RecipeDetailResponse
import com.zhongyi.naicha.data.api.responses.RecipeListResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Path
import retrofit2.http.Query

interface RecipeService {
    
    @GET("recipes")
    suspend fun getRecipes(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10,
        @Query("category") category: String? = null,
        @Query("query") query: String? = null,
        @Query("season") season: String? = null,
        @Query("constitution") constitution: String? = null
    ): Response<RecipeListResponse>
    
    @GET("recipes/public")
    suspend fun getPublicRecipes(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10,
        @Query("category") category: String? = null,
        @Query("query") query: String? = null
    ): Response<RecipeListResponse>
    
    @GET("recipes/{id}")
    suspend fun getRecipeDetail(
        @Header("Authorization") token: String,
        @Path("id") recipeId: String
    ): Response<RecipeDetailResponse>
    
    @GET("recipes/public/{id}")
    suspend fun getPublicRecipeDetail(
        @Path("id") recipeId: String
    ): Response<RecipeDetailResponse>
    
    @GET("categories")
    suspend fun getCategories(
        @Header("Authorization") token: String
    ): Response<CategoryListResponse>
    
    @GET("categories/public")
    suspend fun getPublicCategories(): Response<CategoryListResponse>
    
    @GET("ingredients")
    suspend fun getIngredients(
        @Header("Authorization") token: String,
        @Query("query") query: String? = null
    ): Response<IngredientListResponse>
} 