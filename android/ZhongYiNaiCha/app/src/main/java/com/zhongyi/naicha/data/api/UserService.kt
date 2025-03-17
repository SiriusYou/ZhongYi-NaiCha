package com.zhongyi.naicha.data.api

import com.zhongyi.naicha.data.api.responses.AuthResponse
import com.zhongyi.naicha.data.api.responses.BaseResponse
import com.zhongyi.naicha.data.api.responses.UserResponse
import com.zhongyi.naicha.data.models.User
import retrofit2.Response
import retrofit2.http.*

interface UserService {
    
    @FormUrlEncoded
    @POST("auth/login")
    suspend fun login(
        @Field("phoneNumber") phoneNumber: String,
        @Field("verificationCode") verificationCode: String
    ): Response<AuthResponse>
    
    @POST("auth/register")
    suspend fun register(
        @Body user: User,
        @Query("verificationCode") verificationCode: String
    ): Response<AuthResponse>
    
    @GET("auth/verify")
    suspend fun verifyToken(
        @Header("Authorization") token: String
    ): Response<BaseResponse>
    
    @FormUrlEncoded
    @POST("auth/verification-code")
    suspend fun requestVerificationCode(
        @Field("phoneNumber") phoneNumber: String
    ): Response<BaseResponse>
    
    @GET("users/me")
    suspend fun getCurrentUser(
        @Header("Authorization") token: String
    ): Response<UserResponse>
    
    @POST("auth/logout")
    suspend fun logout(
        @Header("Authorization") token: String
    ): Response<BaseResponse>
    
    @POST("auth/third-party")
    suspend fun loginWithThirdParty(
        @Query("provider") provider: String
    ): Response<AuthResponse>
} 