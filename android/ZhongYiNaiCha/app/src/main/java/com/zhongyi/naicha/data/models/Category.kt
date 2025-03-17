package com.zhongyi.naicha.data.models

data class Category(
    val id: String,
    val name: String,
    val description: String? = null,
    val iconUrl: String? = null,
    val parentId: String? = null
) 