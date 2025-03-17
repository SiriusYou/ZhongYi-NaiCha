package com.zhongyi.naicha.data.api.responses

import com.zhongyi.naicha.data.models.User

/**
 * Response for authentication-related API calls
 */
data class AuthResponse(
    val success: Boolean = false,
    val token: String? = null,
    val user: User? = null,
    val message: String? = null,
    val error: String? = null
) 