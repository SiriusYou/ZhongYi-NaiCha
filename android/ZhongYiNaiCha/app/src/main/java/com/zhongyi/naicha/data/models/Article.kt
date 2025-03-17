package com.zhongyi.naicha.data.models

data class Article(
    val id: String,
    val title: String,
    val summary: String,
    val content: String,
    val categories: List<Category>,
    val author: String? = null,
    val imageUrl: String? = null,
    val createdAt: Long = 0,
    val updatedAt: Long = 0,
    val tags: List<String> = emptyList(),
    val viewCount: Int = 0
) 