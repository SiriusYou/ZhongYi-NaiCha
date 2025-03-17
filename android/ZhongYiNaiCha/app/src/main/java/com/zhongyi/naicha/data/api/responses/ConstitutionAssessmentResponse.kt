package com.zhongyi.naicha.data.api.responses

/**
 * Response for TCM constitution assessment API calls
 */
data class ConstitutionAssessmentResponse(
    val success: Boolean = false,
    val constitutionType: String? = null,
    val score: Map<String, Int> = emptyMap(),
    val description: String? = null,
    val recommendations: List<String> = emptyList(),
    val message: String? = null,
    val error: String? = null
) 