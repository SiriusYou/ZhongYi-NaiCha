package com.zhongyi.naicha.data.models

import java.util.Date

data class Article(
    val id: String,
    val title: String,
    val description: String,
    val content: String,
    val category: Category,
    val publishDate: Date?,
    val imageUrl: String?
) 