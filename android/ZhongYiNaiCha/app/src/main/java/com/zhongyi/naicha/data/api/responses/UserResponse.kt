package com.zhongyi.naicha.data.api.responses

import com.zhongyi.naicha.data.models.User

/**
 * Response for user-related API calls
 */
data class UserResponse(
    val success: Boolean = false,
    val user: User? = null,
    val message: String? = null,
    val error: String? = null
) 