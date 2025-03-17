package com.zhongyi.naicha.data.storage

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "bookmarks", primaryKeys = ["itemId", "type"])
data class BookmarkEntity(
    val itemId: String,
    val type: String,
    val createdAt: Long = System.currentTimeMillis()
) {
    companion object {
        const val TYPE_ARTICLE = "article"
        const val TYPE_HERB = "herb"
    }
} 