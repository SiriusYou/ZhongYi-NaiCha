package com.zhongyi.naicha.data.api.responses

import com.google.gson.annotations.SerializedName
import com.zhongyi.naicha.data.models.Order

data class OrderListResponse(
    @SerializedName("success")
    val success: Boolean,
    
    @SerializedName("message")
    val message: String?,
    
    @SerializedName("orders")
    val orders: List<Order>,
    
    @SerializedName("total")
    val total: Int,
    
    @SerializedName("page")
    val page: Int,
    
    @SerializedName("limit")
    val limit: Int,
    
    @SerializedName("totalPages")
    val totalPages: Int
) 