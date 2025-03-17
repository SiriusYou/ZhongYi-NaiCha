package com.zhongyi.naicha.data.models

data class Recipe(
    val id: String,
    val name: String,
    val description: String,
    val ingredients: List<RecipeIngredient>,
    val steps: List<String>,
    val preparationTime: Int, // In minutes
    val difficulty: String,
    val healthBenefits: List<String>,
    val suitableConstitutions: List<String>,
    val suitableSeasons: List<String>,
    val category: Category,
    val imageUrl: String? = null,
    val rating: Rating? = null,
    val createdAt: Long = 0
)

data class RecipeIngredient(
    val ingredient: Ingredient,
    val amount: String,
    val note: String? = null
)

data class Rating(
    val average: Float = 0f,
    val count: Int = 0
) 