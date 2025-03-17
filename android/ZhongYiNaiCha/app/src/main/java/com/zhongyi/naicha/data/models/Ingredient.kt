package com.zhongyi.naicha.data.models

data class Ingredient(
    val id: String,
    val name: String,
    val chineseName: String? = null,
    val description: String? = null,
    val imageUrl: String? = null,
    val properties: IngredientProperties? = null
)

data class IngredientProperties(
    val nature: String? = null, // 寒、凉、平、温、热
    val taste: List<String> = emptyList(), // 酸、苦、甘、辛、咸、淡
    val meridianAffinity: List<String> = emptyList() // 归经
) 