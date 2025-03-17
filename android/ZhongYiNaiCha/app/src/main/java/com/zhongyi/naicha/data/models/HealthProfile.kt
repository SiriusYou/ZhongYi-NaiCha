package com.zhongyi.naicha.data.models

data class HealthProfile(
    val userId: String = "",
    val age: Int = 0,
    val gender: String = "",
    val height: Int = 0,  // cm
    val weight: Int = 0,  // kg
    val constitution: String = "",  // TCM体质类型
    val allergens: List<String> = emptyList(),
    val healthGoals: List<String> = emptyList(),
    val updateTime: Long = System.currentTimeMillis()
) 