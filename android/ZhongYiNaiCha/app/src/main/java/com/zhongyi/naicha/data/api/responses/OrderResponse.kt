package com.zhongyi.naicha.data.api.responses

import com.google.gson.annotations.SerializedName
import com.zhongyi.naicha.data.models.Order

data class OrderResponse(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("message")
    val message: String?,
    
    @SerializedName("order")
    val order: Order?
) 