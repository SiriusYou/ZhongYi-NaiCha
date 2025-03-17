package com.zhongyi.naicha.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KnowledgeCenterScreen() {
    var searchQuery by remember { mutableStateOf("") }
    val categories = remember { getKnowledgeCategories() }
    val contents = remember { getSampleKnowledgeContents() }
    
    val filteredContents = remember(searchQuery) {
        if (searchQuery.isBlank()) {
            contents
        } else {
            contents.filter { 
                it.title.contains(searchQuery, ignoreCase = true) || 
                it.description.contains(searchQuery, ignoreCase = true) 
            }
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Search Bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            placeholder = { Text("搜索中医知识...") },
            leadingIcon = { 
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search",
                    tint = MaterialTheme.colorScheme.primary
                )
            },
            singleLine = true,
            shape = RoundedCornerShape(8.dp)
        )
        
        // Categories
        Text(
            text = "知识分类",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            categories.forEach { category ->
                CategoryButton(
                    category = category,
                    onClick = { /* Filter by category */ }
                )
            }
        }
        
        // Content List
        Text(
            text = "推荐内容",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(filteredContents) { content ->
                KnowledgeContentCard(content = content)
            }
        }
    }
}

@Composable
fun CategoryButton(category: KnowledgeCategory, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .width(72.dp)
            .clickable(onClick = onClick)
    ) {
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.secondaryContainer,
            modifier = Modifier
                .size(56.dp)
                .padding(bottom = 4.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = category.icon,
                    contentDescription = category.name,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(28.dp)
                )
            }
        }
        
        Text(
            text = category.name,
            style = MaterialTheme.typography.bodyMedium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun KnowledgeContentCard(content: KnowledgeContent) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { /* Open content detail */ },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Content type icon
            val iconVector = when (content.type) {
                "article" -> Icons.Default.Article
                "video" -> Icons.Default.VideoLibrary
                "audio" -> Icons.Default.Mic
                else -> Icons.Default.Book
            }
            
            Box(
                modifier = Modifier
                    .size(60.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = iconVector,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(28.dp)
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            // Content info
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = content.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = content.description,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val contentTypeString = when (content.type) {
                        "article" -> "文章"
                        "video" -> "视频"
                        "audio" -> "音频"
                        else -> "其他"
                    }
                    
                    Text(
                        text = contentTypeString,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier
                            .background(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(4.dp)
                            )
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                    
                    Spacer(modifier = Modifier.width(8.dp))
                    
                    Text(
                        text = "阅读量 ${content.viewCount}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

// Data models and sample data
data class KnowledgeCategory(
    val id: String,
    val name: String,
    val icon: ImageVector
)

data class KnowledgeContent(
    val id: String,
    val title: String,
    val description: String,
    val type: String, // article, video, audio
    val viewCount: Int,
    val categoryId: String
)

fun getKnowledgeCategories(): List<KnowledgeCategory> {
    return listOf(
        KnowledgeCategory(
            id = "1",
            name = "体质",
            icon = Icons.Default.Book
        ),
        KnowledgeCategory(
            id = "2",
            name = "养生",
            icon = Icons.Default.Article
        ),
        KnowledgeCategory(
            id = "3",
            name = "中药",
            icon = Icons.Default.Book
        ),
        KnowledgeCategory(
            id = "4",
            name = "讲座",
            icon = Icons.Default.VideoLibrary
        )
    )
}

fun getSampleKnowledgeContents(): List<KnowledgeContent> {
    return listOf(
        KnowledgeContent(
            id = "1",
            title = "中医体质分类与调理方法",
            description = "从中医角度解析九种体质特点及对应的日常调理方法",
            type = "article",
            viewCount = 1205,
            categoryId = "1"
        ),
        KnowledgeContent(
            id = "2",
            title = "四季养生茶饮指南",
            description = "根据四季变化调整茶饮搭配，达到阴阳平衡",
            type = "article",
            viewCount = 897,
            categoryId = "2"
        ),
        KnowledgeContent(
            id = "3",
            title = "常见中药材功效与禁忌",
            description = "详解日常养生常用的中药材特性、功效及使用禁忌",
            type = "article",
            viewCount = 756,
            categoryId = "3"
        ),
        KnowledgeContent(
            id = "4",
            title = "中医调理亚健康状态",
            description = "专家讲解如何通过中医方法改善现代人常见的亚健康问题",
            type = "video",
            viewCount = 1542,
            categoryId = "4"
        ),
        KnowledgeContent(
            id = "5",
            title = "传统养生音频课程",
            description = "跟随名老中医学习传统养生精华，轻松掌握日常养生要点",
            type = "audio",
            viewCount = 632,
            categoryId = "2"
        )
    )
} 