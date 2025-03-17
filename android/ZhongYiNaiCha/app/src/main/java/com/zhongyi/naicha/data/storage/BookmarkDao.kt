package com.zhongyi.naicha.data.storage

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface BookmarkDao {
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBookmark(bookmark: BookmarkEntity)
    
    @Query("DELETE FROM bookmarks WHERE itemId = :itemId AND type = :type")
    suspend fun deleteBookmark(itemId: String, type: String)
    
    @Query("SELECT * FROM bookmarks WHERE type = :type ORDER BY createdAt DESC")
    fun getBookmarksFlow(type: String): Flow<List<BookmarkEntity>>
    
    @Query("SELECT * FROM bookmarks WHERE type = :type ORDER BY createdAt DESC")
    suspend fun getBookmarks(type: String): List<BookmarkEntity>
    
    @Query("SELECT * FROM bookmarks ORDER BY createdAt DESC")
    suspend fun getAllBookmarks(): List<BookmarkEntity>
    
    @Query("SELECT COUNT(*) > 0 FROM bookmarks WHERE itemId = :itemId AND type = :type")
    suspend fun isBookmarked(itemId: String, type: String): Boolean
} 