package com.zhongyi.naicha.data.api.responses

import com.zhongyi.naicha.data.models.Recipe

/**
 * Response for recommendation API calls
 */
data class RecommendationResponse(
    val success: Boolean = false,
    val recommendations: List<Recipe> = emptyList(),
    val filters: Map<String, String?> = emptyMap(),
    val message: String? = null,
    val error: String? = null
) 