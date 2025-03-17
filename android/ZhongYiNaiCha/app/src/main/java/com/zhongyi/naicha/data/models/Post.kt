package com.zhongyi.naicha.data.models

import java.util.Date

data class Post(
    val id: String,
    val title: String,
    val content: String,
    val authorId: String,
    val authorName: String,
    val authorAvatar: String?,
    val images: List<String>?,
    val tags: List<String>?,
    val likeCount: Int,
    val commentCount: Int,
    val isLiked: Boolean,
    val isBookmarked: Boolean,
    val category: String,
    val createdAt: Date,
    val updatedAt: Date?
) 