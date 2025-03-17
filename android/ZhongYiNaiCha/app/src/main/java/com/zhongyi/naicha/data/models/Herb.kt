package com.zhongyi.naicha.data.models

data class Herb(
    val id: String,
    val name: String,
    val chineseName: String,
    val description: String,
    val imageUrl: String? = null,
    val properties: HerbProperties,
    val useCases: List<String> = emptyList(),
    val contraindications: List<String> = emptyList(),
    val relatedHerbs: List<String> = emptyList()
)

data class HerbProperties(
    val nature: String, // 寒、凉、平、温、热
    val taste: List<String>, // 酸、苦、甘、辛、咸、淡
    val meridianAffinity: List<String>, // 归经
    val functions: List<String> = emptyList()
) 