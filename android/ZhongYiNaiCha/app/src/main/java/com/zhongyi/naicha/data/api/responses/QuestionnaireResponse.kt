package com.zhongyi.naicha.data.api.responses

/**
 * Response for TCM constitution questionnaire API calls
 */
data class QuestionnaireResponse(
    val success: Boolean = false,
    val questions: List<Map<String, Any>> = emptyList(),
    val message: String? = null,
    val error: String? = null
) 