package com.zhongyi.naicha.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommunityScreen() {
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("社区动态", "健康打卡", "专家问答")
    val posts = remember { getSamplePosts() }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Tabs
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = MaterialTheme.colorScheme.primary
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    text = { Text(title) },
                    selected = selectedTab == index,
                    onClick = { selectedTab = index }
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // New Post Button
        Button(
            onClick = { /* Navigate to create post screen */ },
            modifier = Modifier.align(Alignment.End),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text("发布")
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Content based on selected tab
        when (selectedTab) {
            0 -> CommunityPostsContent(posts)
            1 -> HealthCheckInsContent()
            2 -> ExpertQAContent()
        }
    }
}

@Composable
fun CommunityPostsContent(posts: List<Post>) {
    LazyColumn(
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        items(posts) { post ->
            PostCard(post = post)
        }
    }
}

@Composable
fun HealthCheckInsContent() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "健康打卡功能即将上线，敬请期待！",
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun ExpertQAContent() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "专家问答功能即将上线，敬请期待！",
            style = MaterialTheme.typography.titleMedium,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun PostCard(post: Post) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { /* Navigate to post detail */ },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // User info
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                // User avatar
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = post.author.first().toString(),
                        color = MaterialTheme.colorScheme.onPrimary,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                Spacer(modifier = Modifier.width(12.dp))
                
                Column {
                    Text(
                        text = post.author,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Text(
                        text = formatDate(post.timestamp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Post content
            Text(
                text = post.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = post.content,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
            
            // Image placeholder if post has images
            if (post.hasImages) {
                Spacer(modifier = Modifier.height(12.dp))
                
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.secondaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Image,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.size(48.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Interaction buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                InteractionButton(
                    icon = Icons.Default.ThumbUp,
                    count = post.likes,
                    onClick = { /* Like post */ }
                )
                
                InteractionButton(
                    icon = Icons.Default.Comment,
                    count = post.comments,
                    onClick = { /* Open comments */ }
                )
                
                InteractionButton(
                    icon = Icons.Default.Share,
                    count = post.shares,
                    onClick = { /* Share post */ }
                )
                
                InteractionButton(
                    icon = Icons.Default.Bookmark,
                    count = null,
                    onClick = { /* Bookmark post */ }
                )
            }
        }
    }
}

@Composable
fun InteractionButton(icon: androidx.compose.ui.graphics.vector.ImageVector, count: Int?, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .clickable(onClick = onClick)
            .padding(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(20.dp)
        )
        
        if (count != null) {
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "$count",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

// Helper functions and data classes
data class Post(
    val id: String,
    val author: String,
    val authorAvatar: String? = null,
    val timestamp: Long,
    val title: String,
    val content: String,
    val hasImages: Boolean,
    val likes: Int,
    val comments: Int,
    val shares: Int
)

fun formatDate(timestamp: Long): String {
    val date = Date(timestamp)
    val now = Date()
    val diff = now.time - date.time
    
    return when {
        diff < 60 * 1000 -> "刚刚"
        diff < 60 * 60 * 1000 -> "${diff / (60 * 1000)}分钟前"
        diff < 24 * 60 * 60 * 1000 -> "${diff / (60 * 60 * 1000)}小时前"
        diff < 30 * 24 * 60 * 60 * 1000 -> "${diff / (24 * 60 * 60 * 1000)}天前"
        else -> {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            sdf.format(date)
        }
    }
}

fun getSamplePosts(): List<Post> {
    val now = System.currentTimeMillis()
    return listOf(
        Post(
            id = "1",
            author = "健康养生大师",
            timestamp = now - 30 * 60 * 1000, // 30 minutes ago
            title = "春季养生小贴士",
            content = "春季是肝气当令的季节，养生应以疏肝解郁为主。推荐大家尝试以下几种茶饮：\n\n1. 菊花茶：清热解毒，明目降火\n2. 玫瑰花茶：舒缓肝郁，调理气血\n3. 薄荷茶：疏散风热，清利头目",
            hasImages = true,
            likes = 78,
            comments = 23,
            shares = 12
        ),
        Post(
            id = "2",
            author = "茶艺爱好者",
            timestamp = now - 3 * 60 * 60 * 1000, // 3 hours ago
            title = "分享一款改良版奶茶配方",
            content = "今天尝试了一款改良版的桂花乌龙奶茶，减少了糖分，增加了一些健康的配料。口感丝滑，香气宜人，而且对胃部很友善。\n\n主要配料：优质乌龙茶、新鲜桂花、有机牛奶、少量蜂蜜代替白糖，加入一点点枸杞提升口感和营养价值。",
            hasImages = true,
            likes = 156,
            comments = 42,
            shares = 35
        ),
        Post(
            id = "3",
            author = "中医养生研究者",
            timestamp = now - 1 * 24 * 60 * 60 * 1000, // 1 day ago
            title = "不同体质的人应该如何选择奶茶",
            content = "中医认为，不同体质的人应当选择不同的茶饮。\n\n阳虚体质：适合喝红茶奶茶，可加入生姜、肉桂等温性香料\n阴虚体质：适合喝绿茶奶茶，可加入菊花、枸杞等滋阴食材\n湿热体质：适合喝乌龙茶奶茶，少加糖，可加入薏米、荷叶等健脾祛湿食材\n气虚体质：适合喝红枣奶茶，可加入黄芪、人参等补气食材",
            hasImages = false,
            likes = 246,
            comments = 67,
            shares = 89
        ),
        Post(
            id = "4",
            author = "生活达人",
            timestamp = now - 5 * 24 * 60 * 60 * 1000, // 5 days ago
            title = "如何在家制作健康奶茶",
            content = "市面上的奶茶含糖量高，添加剂多，长期饮用对健康不利。今天分享几个在家制作健康奶茶的小技巧：\n\n1. 使用新鲜牛奶或植物奶，避免奶精\n2. 用蜂蜜或枣泥代替白糖\n3. 选择高质量的茶叶，避免茶包\n4. 加入适量的中药材，如枸杞、桂圆等\n5. 控制饮用频率，每周不超过2-3次",
            hasImages = true,
            likes = 312,
            comments = 98,
            shares = 127
        )
    )
} 