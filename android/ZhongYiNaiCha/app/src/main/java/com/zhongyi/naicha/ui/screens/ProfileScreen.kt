package com.zhongyi.naicha.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun ProfileScreen() {
    val isLoggedIn = remember { mutableStateOf(false) } // Replace with actual auth state
    
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        item {
            ProfileHeader(isLoggedIn = isLoggedIn.value)
        }
        
        // Health Profile Card
        item {
            HealthProfileCard(hasProfile = isLoggedIn.value)
        }
        
        // Menu Items
        item {
            MenuSection(title = "我的服务")
        }
        
        // Favorites
        item {
            MenuItemRow(
                icon = Icons.Outlined.Favorite,
                title = "我的收藏",
                subtitle = "收藏的茶饮和知识",
                onClick = { /* Navigate to favorites */ }
            )
        }
        
        // Orders
        item {
            MenuItemRow(
                icon = Icons.Outlined.ShoppingBag,
                title = "我的订单",
                subtitle = "查看历史订单",
                onClick = { /* Navigate to orders */ }
            )
        }
        
        // Community Posts
        item {
            MenuItemRow(
                icon = Icons.Outlined.Article,
                title = "我的帖子",
                subtitle = "发布的帖子和评论",
                onClick = { /* Navigate to my posts */ }
            )
        }
        
        // Settings Section
        item {
            MenuSection(title = "设置")
        }
        
        // App Settings
        item {
            MenuItemRow(
                icon = Icons.Outlined.Settings,
                title = "应用设置",
                subtitle = "通知、隐私、主题等",
                onClick = { /* Navigate to settings */ }
            )
        }
        
        // Help & Support
        item {
            MenuItemRow(
                icon = Icons.Outlined.Help,
                title = "帮助与支持",
                subtitle = "常见问题、联系客服",
                onClick = { /* Navigate to help */ }
            )
        }
        
        // About
        item {
            MenuItemRow(
                icon = Icons.Outlined.Info,
                title = "关于我们",
                subtitle = "应用信息、版本、团队",
                onClick = { /* Navigate to about */ }
            )
        }
        
        // Login/Logout Button
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                contentAlignment = Alignment.Center
            ) {
                Button(
                    onClick = { /* Toggle login state */ },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isLoggedIn.value) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                    )
                ) {
                    Text(text = if (isLoggedIn.value) "退出登录" else "登录/注册")
                }
            }
        }
    }
}

@Composable
fun ProfileHeader(isLoggedIn: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar
        Box(
            modifier = Modifier
                .size(80.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primary),
            contentAlignment = Alignment.Center
        ) {
            if (isLoggedIn) {
                Text(
                    text = "用",
                    style = MaterialTheme.typography.headlineMedium,
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(48.dp)
                )
            }
        }
        
        Spacer(modifier = Modifier.width(16.dp))
        
        // User info
        Column {
            Text(
                text = if (isLoggedIn) "用户名" else "游客",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = if (isLoggedIn) "点击编辑个人资料" else "登录后享受更多功能",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        
        Spacer(modifier = Modifier.weight(1f))
        
        // Edit profile icon
        if (isLoggedIn) {
            IconButton(onClick = { /* Navigate to edit profile */ }) {
                Icon(
                    imageVector = Icons.Default.Edit,
                    contentDescription = "编辑资料",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
fun HealthProfileCard(hasProfile: Boolean) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { /* Navigate to health profile */ },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.FitnessCenter,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(48.dp)
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = "健康档案",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = if (hasProfile) "查看并管理您的健康档案" else "创建您的专属健康档案，获取个性化推荐",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                )
            }
            
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onPrimaryContainer
            )
        }
    }
}

@Composable
fun MenuSection(title: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        
        Spacer(modifier = Modifier.width(8.dp))
        
        Divider(
            modifier = Modifier.weight(1f),
            color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
        )
    }
}

@Composable
fun MenuItemRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
} 