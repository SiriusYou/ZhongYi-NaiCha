package com.zhongyi.naicha.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen() {
    val currentUser = remember { "游客" } // Replace with actual user name when auth is implemented
    val isLoading = remember { mutableStateOf(false) }
    val recommendations = remember { 
        mutableStateOf(getSampleRecommendations()) 
    }
    val currentSeason = remember { getCurrentSeason() }
    
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header Section
        item {
            HeaderSection(userName = currentUser)
        }
        
        // Wellness Greeting Section
        item {
            WellnessGreetingSection(season = currentSeason)
        }
        
        // Recommended Recipes Section
        item {
            Text(
                text = "为您推荐",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            
            if (isLoading.value) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else if (recommendations.value.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "完成健康档案获取个性化推荐",
                        style = MaterialTheme.typography.bodyLarge,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                RecommendedRecipesSection(recommendations = recommendations.value)
            }
        }
        
        // Seasonal Health Tips Section
        item {
            Text(
                text = "${currentSeason}养生小贴士",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 8.dp)
            )
            
            SeasonalTipsSection(season = currentSeason)
        }
        
        // Quick Access Section
        item {
            Text(
                text = "快捷功能",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 8.dp)
            )
            
            QuickAccessSection()
        }
    }
}

@Composable
fun HeaderSection(userName: String) {
    val dateFormat = SimpleDateFormat("yyyy年MM月dd日", Locale.CHINA)
    val currentDate = dateFormat.format(Date())
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = "您好，$userName",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = currentDate,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        
        Icon(
            imageVector = Icons.Default.AccountCircle,
            contentDescription = "User Profile",
            modifier = Modifier.size(40.dp),
            tint = MaterialTheme.colorScheme.primary
        )
    }
}

@Composable
fun WellnessGreetingSection(season: String) {
    val greeting = getSeasonalWellnessGreeting(season)
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = greeting,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            OutlinedButton(
                onClick = { /* Navigate to health profile */ },
                modifier = Modifier.align(Alignment.End)
            ) {
                Text(text = "查看健康档案")
            }
        }
    }
}

@Composable
fun RecommendedRecipesSection(recommendations: List<Recipe>) {
    LazyRow(
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        modifier = Modifier.padding(vertical = 8.dp)
    ) {
        items(recommendations) { recipe ->
            RecipeCard(recipe = recipe)
        }
    }
}

@Composable
fun RecipeCard(recipe: Recipe) {
    Card(
        modifier = Modifier
            .width(200.dp)
            .height(240.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            // Recipe image placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .background(MaterialTheme.colorScheme.primaryContainer)
                    .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = recipe.name.first().toString(),
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            
            Column(
                modifier = Modifier.padding(12.dp)
            ) {
                Text(
                    text = recipe.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = recipe.description,
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = null,
                        tint = Color(0xFFFFA000),
                        modifier = Modifier.size(18.dp)
                    )
                    Text(
                        text = "${recipe.rating}",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(start = 4.dp)
                    )
                    
                    Text(
                        text = recipe.effect,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier
                            .padding(start = 8.dp)
                            .background(
                                color = MaterialTheme.colorScheme.primaryContainer,
                                shape = RoundedCornerShape(4.dp)
                            )
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun SeasonalTipsSection(season: String) {
    val tips = getSeasonalHealthTips(season)
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            tips.forEach { tip ->
                Row(
                    modifier = Modifier.padding(vertical = 4.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Text(
                        text = "•",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(end = 8.dp)
                    )
                    Text(
                        text = tip,
                        style = MaterialTheme.typography.bodyMedium
                    )
                }
            }
        }
    }
}

@Composable
fun QuickAccessSection() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        QuickAccessButton(
            title = "体质测试",
            onClick = { /* Navigate to constitution test */ }
        )
        QuickAccessButton(
            title = "热门茶饮",
            onClick = { /* Navigate to popular recipes */ }
        )
        QuickAccessButton(
            title = "养生知识",
            onClick = { /* Navigate to knowledge center */ }
        )
    }
}

@Composable
fun QuickAccessButton(title: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        modifier = Modifier
            .height(50.dp)
            .width(100.dp),
        shape = RoundedCornerShape(8.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.bodyMedium,
            textAlign = TextAlign.Center
        )
    }
}

// Helper functions and data classes
data class Recipe(
    val id: String,
    val name: String,
    val description: String,
    val rating: Float,
    val effect: String
)

fun getSampleRecommendations(): List<Recipe> {
    return listOf(
        Recipe(
            id = "1",
            name = "玫瑰花茶",
            description = "舒缓压力，温养气血",
            rating = 4.5f,
            effect = "养心安神"
        ),
        Recipe(
            id = "2",
            name = "菊花柠檬茶",
            description = "清热解毒，明目降火",
            rating = 4.2f,
            effect = "清热去火"
        ),
        Recipe(
            id = "3",
            name = "红枣枸杞茶",
            description = "补血养颜，增强免疫",
            rating = 4.7f,
            effect = "补气养血"
        )
    )
}

fun getCurrentSeason(): String {
    val month = Calendar.getInstance().get(Calendar.MONTH) + 1
    return when (month) {
        in 3..5 -> "春季"
        in 6..8 -> "夏季"
        in 9..11 -> "秋季"
        else -> "冬季"
    }
}

fun getSeasonalWellnessGreeting(season: String): String {
    return when (season) {
        "春季" -> "春季万物生长，肝气旺盛，养生宜疏肝解郁，饮食宜清淡，多食温性食物。"
        "夏季" -> "夏季气温升高，心火旺盛，养生宜清心泻火，饮食宜清淡，可适当增加酸味食物。"
        "秋季" -> "秋季气候干燥，肺气当令，养生宜润肺生津，饮食宜滋阴润燥，多食温补食物。"
        "冬季" -> "冬季天寒地冻，肾气当令，养生宜温补肾阳，饮食宜温热，可食用温阳补肾食物。"
        else -> "根据您的健康档案，我们为您提供个性化养生建议。"
    }
}

fun getSeasonalHealthTips(season: String): List<String> {
    return when (season) {
        "春季" -> listOf(
            "春季饮食宜清淡，可多食用芽类蔬菜和春笋",
            "春季养肝为主，可少量饮用菊花茶、薄荷茶等清肝茶饮",
            "春季气温变化大，注意适时增减衣物",
            "春季情绪易波动，保持心情舒畅，加强户外活动"
        )
        "夏季" -> listOf(
            "夏季饮食宜清淡，可多食用西瓜、苦瓜等清热食物",
            "注意防暑降温，避免长时间暴露在强烈阳光下",
            "保持充足睡眠，午休有助于恢复体力",
            "多饮用绿茶、菊花茶等清热解暑的茶饮"
        )
        "秋季" -> listOf(
            "秋季干燥，多食用梨、银耳等润肺生津的食物",
            "适当补充水分，可饮用百合莲子茶、沙参玉竹茶等",
            "注意保暖，防止早晚温差过大引起感冒",
            "适当运动，增强体质，提高免疫力"
        )
        "冬季" -> listOf(
            "冬季注意保暖，特别是颈部、腰部和足部",
            "可适当食用羊肉、狗肉等温热食物，但要注意不可过量",
            "多食用红枣、枸杞、山药等补气养血的食物",
            "保持室内空气流通，但避免直接吹风"
        )
        else -> listOf(
            "根据您的健康状况，我们推荐您定期检查身体",
            "保持均衡饮食，多摄入蔬果和优质蛋白",
            "坚持适当运动，每周至少150分钟中等强度运动",
            "保持良好心态，减少压力，充足睡眠"
        )
    }
} 