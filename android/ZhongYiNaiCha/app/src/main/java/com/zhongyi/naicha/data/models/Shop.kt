package com.zhongyi.naicha.data.models

import java.util.Date

data class Shop(
    val id: String,
    val name: String,
    val address: String,
    val longitude: Double,
    val latitude: Double,
    val phone: String,
    val openingHours: List<OpeningHours>,
    val imageUrl: String?,
    val rating: Float,
    val averagePreparationTime: Int, // in minutes
    val distance: Double?, // in kilometers, may be calculated client-side
    val isOpen: Boolean
)

data class OpeningHours(
    val dayOfWeek: Int, // 1 = Monday, 7 = Sunday
    val openTime: String, // "09:00"
    val closeTime: String // "21:00"
) 