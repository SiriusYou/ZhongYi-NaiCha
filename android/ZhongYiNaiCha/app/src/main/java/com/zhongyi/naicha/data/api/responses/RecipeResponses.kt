package com.zhongyi.naicha.data.api.responses

import com.zhongyi.naicha.data.models.Category
import com.zhongyi.naicha.data.models.Ingredient
import com.zhongyi.naicha.data.models.Recipe

/**
 * Response for recipe list API calls
 */
data class RecipeListResponse(
    val success: Boolean = false,
    val recipes: List<Recipe> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val limit: Int = 10,
    val message: String? = null,
    val error: String? = null
)

/**
 * Response for recipe detail API calls
 */
data class RecipeDetailResponse(
    val success: Boolean = false,
    val recipe: Recipe? = null,
    val message: String? = null,
    val error: String? = null
)

/**
 * Response for category list API calls
 */
data class CategoryListResponse(
    val success: Boolean = false,
    val categories: List<Category> = emptyList(),
    val message: String? = null,
    val error: String? = null
)

/**
 * Response for ingredient list API calls
 */
data class IngredientListResponse(
    val success: Boolean = false,
    val ingredients: List<Ingredient> = emptyList(),
    val message: String? = null,
    val error: String? = null
) 