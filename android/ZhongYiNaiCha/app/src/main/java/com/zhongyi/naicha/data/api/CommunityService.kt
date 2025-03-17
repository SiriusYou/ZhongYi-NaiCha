package com.zhongyi.naicha.data.api

import com.zhongyi.naicha.data.api.responses.BaseResponse
import com.zhongyi.naicha.data.api.responses.CommentResponse
import com.zhongyi.naicha.data.api.responses.PostListResponse
import com.zhongyi.naicha.data.api.responses.PostResponse
import retrofit2.Response
import retrofit2.http.*

interface CommunityService {

    @GET("community/posts")
    suspend fun getPosts(
        @Header("Authorization") token: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10,
        @Query("category") category: String? = null
    ): Response<PostListResponse>

    @GET("community/posts/{postId}")
    suspend fun getPostDetails(
        @Header("Authorization") token: String? = null,
        @Path("postId") postId: String
    ): Response<PostResponse>

    @POST("community/posts")
    suspend fun createPost(
        @Header("Authorization") token: String,
        @Body post: Map<String, Any>
    ): Response<PostResponse>

    @PUT("community/posts/{postId}")
    suspend fun updatePost(
        @Header("Authorization") token: String,
        @Path("postId") postId: String,
        @Body updates: Map<String, Any>
    ): Response<PostResponse>

    @DELETE("community/posts/{postId}")
    suspend fun deletePost(
        @Header("Authorization") token: String,
        @Path("postId") postId: String
    ): Response<BaseResponse>

    @GET("community/posts/{postId}/comments")
    suspend fun getComments(
        @Header("Authorization") token: String? = null,
        @Path("postId") postId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<CommentResponse>

    @POST("community/posts/{postId}/comments")
    suspend fun addComment(
        @Header("Authorization") token: String,
        @Path("postId") postId: String,
        @Body comment: Map<String, String>
    ): Response<BaseResponse>

    @POST("community/posts/{postId}/like")
    suspend fun likePost(
        @Header("Authorization") token: String,
        @Path("postId") postId: String
    ): Response<BaseResponse>

    @DELETE("community/posts/{postId}/like")
    suspend fun unlikePost(
        @Header("Authorization") token: String,
        @Path("postId") postId: String
    ): Response<BaseResponse>

    @POST("community/comments/{commentId}/like")
    suspend fun likeComment(
        @Header("Authorization") token: String,
        @Path("commentId") commentId: String
    ): Response<BaseResponse>

    @DELETE("community/comments/{commentId}/like")
    suspend fun unlikeComment(
        @Header("Authorization") token: String,
        @Path("commentId") commentId: String
    ): Response<BaseResponse>

    @POST("community/posts/{postId}/bookmark")
    suspend fun bookmarkPost(
        @Header("Authorization") token: String,
        @Path("postId") postId: String
    ): Response<BaseResponse>

    @DELETE("community/posts/{postId}/bookmark")
    suspend fun unbookmarkPost(
        @Header("Authorization") token: String,
        @Path("postId") postId: String
    ): Response<BaseResponse>
} 