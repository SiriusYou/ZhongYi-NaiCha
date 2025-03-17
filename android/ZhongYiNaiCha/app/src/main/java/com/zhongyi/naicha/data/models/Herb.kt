package com.zhongyi.naicha.data.models

data class Herb(
    val id: String,
    val name: String,
    val properties: String,
    val commonUsage: String,
    val benefits: String,
    val precautions: String,
    val imageUrl: String?
)

data class HerbProperties(
    val nature: String, // 寒、凉、平、温、热
    val taste: List<String>, // 酸、苦、甘、辛、咸、淡
    val meridianAffinity: List<String>, // 归经
    val functions: List<String> = emptyList()
) 