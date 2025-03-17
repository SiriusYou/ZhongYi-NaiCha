package com.zhongyi.naicha.data.models

data class Address(
    val id: String,
    val userId: String,
    val name: String,
    val phone: String,
    val province: String,
    val city: String,
    val district: String,
    val street: String,
    val buildingNumber: String?,
    val apartment: String?,
    val postalCode: String?,
    val isDefault: Boolean,
    val label: String? // e.g., "Home", "Work", etc.
) 