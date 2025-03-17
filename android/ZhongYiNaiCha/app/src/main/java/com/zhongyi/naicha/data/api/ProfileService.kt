package com.zhongyi.naicha.data.api

import com.zhongyi.naicha.data.api.responses.BaseResponse
import com.zhongyi.naicha.data.api.responses.ConstitutionAssessmentResponse
import com.zhongyi.naicha.data.api.responses.HealthProfileResponse
import com.zhongyi.naicha.data.api.responses.QuestionnaireResponse
import com.zhongyi.naicha.data.models.HealthProfile
import retrofit2.Response
import retrofit2.http.*

interface ProfileService {
    
    @GET("profile/health")
    suspend fun getHealthProfile(
        @Header("Authorization") token: String
    ): Response<HealthProfileResponse>
    
    @POST("profile/health")
    suspend fun saveHealthProfile(
        @Header("Authorization") token: String,
        @Body healthProfile: HealthProfile
    ): Response<BaseResponse>
    
    @PUT("profile/health")
    suspend fun updateHealthProfile(
        @Header("Authorization") token: String,
        @Body healthProfile: HealthProfile
    ): Response<BaseResponse>
    
    @GET("profile/constitution/questionnaire")
    suspend fun getConstitutionQuestionnaire(): Response<QuestionnaireResponse>
    
    @POST("profile/constitution/assessment")
    suspend fun submitConstitutionAssessment(
        @Header("Authorization") token: String,
        @Body answers: Map<String, Int>
    ): Response<ConstitutionAssessmentResponse>
} 