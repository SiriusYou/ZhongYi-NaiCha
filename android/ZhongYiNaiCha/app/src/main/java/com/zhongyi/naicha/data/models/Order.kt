package com.zhongyi.naicha.data.models

import java.math.BigDecimal
import java.util.Date

data class Order(
    val id: String,
    val userId: String,
    val items: List<CartItem>,
    val subtotal: BigDecimal,
    val tax: BigDecimal,
    val deliveryFee: BigDecimal,
    val total: BigDecimal,
    val status: OrderStatus,
    val paymentMethod: String,
    val deliveryAddress: Address?,
    val shopId: String?,
    val shopName: String?,
    val pickupTime: Date?,
    val deliveryTime: Date?,
    val notes: String?,
    val createdAt: Date,
    val updatedAt: Date?
)

enum class OrderStatus {
    PENDING,
    CONFIRMED,
    PREPARING,
    READY_FOR_PICKUP,
    OUT_FOR_DELIVERY,
    DELIVERED,
    CANCELLED
} 