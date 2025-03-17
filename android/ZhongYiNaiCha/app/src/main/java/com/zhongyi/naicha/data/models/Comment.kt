package com.zhongyi.naicha.data.models

import java.util.Date

data class Comment(
    val id: String,
    val postId: String,
    val content: String,
    val authorId: String,
    val authorName: String,
    val authorAvatar: String?,
    val likeCount: Int,
    val isLiked: Boolean,
    val parentId: String?,
    val createdAt: Date,
    val updatedAt: Date?
) 