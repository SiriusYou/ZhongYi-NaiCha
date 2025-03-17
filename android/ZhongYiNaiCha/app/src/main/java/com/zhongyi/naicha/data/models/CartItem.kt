package com.zhongyi.naicha.data.models

import java.math.BigDecimal

data class CartItem(
    val id: String,
    val recipeId: String,
    val name: String,
    val image: String?,
    val price: BigDecimal,
    val quantity: Int,
    val options: Map<String, String>? = null,
    val notes: String? = null
) 