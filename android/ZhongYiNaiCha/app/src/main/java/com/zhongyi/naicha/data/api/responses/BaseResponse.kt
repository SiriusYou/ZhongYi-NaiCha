package com.zhongyi.naicha.data.api.responses

/**
 * Base response for all API calls
 */
data class BaseResponse(
    val success: Boolean = false,
    val message: String? = null,
    val error: String? = null
) 