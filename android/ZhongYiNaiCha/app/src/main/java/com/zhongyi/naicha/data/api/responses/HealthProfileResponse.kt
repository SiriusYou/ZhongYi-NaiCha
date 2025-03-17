package com.zhongyi.naicha.data.api.responses

import com.zhongyi.naicha.data.models.HealthProfile

/**
 * Response for health profile-related API calls
 */
data class HealthProfileResponse(
    val success: Boolean = false,
    val profile: HealthProfile? = null,
    val message: String? = null,
    val error: String? = null
) 