package com.zhongyi.naicha.data.storage

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        BookmarkEntity::class
        // Add other entities here as needed
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun bookmarkDao(): BookmarkDao
    // Add other DAOs here as needed
} 