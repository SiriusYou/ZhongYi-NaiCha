package com.zhongyi.naicha.data.api.responses

import com.zhongyi.naicha.data.models.Article
import com.zhongyi.naicha.data.models.Herb

/**
 * Response for article list API calls
 */
data class ArticleListResponse(
    val success: Boolean = false,
    val articles: List<Article> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val limit: Int = 10,
    val message: String? = null,
    val error: String? = null
)

/**
 * Response for article detail API calls
 */
data class ArticleDetailResponse(
    val success: Boolean = false,
    val article: Article? = null,
    val message: String? = null,
    val error: String? = null
)

/**
 * Response for herb list API calls
 */
data class HerbListResponse(
    val success: Boolean = false,
    val herbs: List<Herb> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val limit: Int = 10,
    val message: String? = null,
    val error: String? = null
)

/**
 * Response for herb detail API calls
 */
data class HerbDetailResponse(
    val success: Boolean = false,
    val herb: Herb? = null,
    val message: String? = null,
    val error: String? = null
) 