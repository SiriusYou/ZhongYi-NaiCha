package com.zhongyi.naicha.data.models

import java.util.Date

data class Recipe(
    val id: String,
    val name: String,
    val description: String,
    val imageUrl: String?,
    val ingredients: List<Ingredient>,
    val steps: List<String>,
    val preparationTime: Int, // in minutes
    val difficulty: String, // "简单", "中等", "复杂"
    val healthBenefits: List<String>,
    val suitableConstitutions: List<String>,
    val suitableSeasons: List<String>, // "春", "夏", "秋", "冬"
    val nutritionInfo: NutritionInfo,
    val rating: Float,
    val reviewCount: Int,
    val popularity: Int,
    val category: Category,
    val tags: List<String>,
    val createdAt: Date?
)

data class Ingredient(
    val id: String,
    val name: String,
    val amount: String,
    val imageUrl: String?,
    val isHerb: Boolean,
    val note: String?
)

data class NutritionInfo(
    val calories: Int,
    val protein: Float,
    val fat: Float,
    val carbs: Float,
    val sugar: Float,
    val notes: String?
) 