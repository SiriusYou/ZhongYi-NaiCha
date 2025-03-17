package com.zhongyi.naicha.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
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
import androidx.compose.ui.unit.sp

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecipesScreen() {
    var searchQuery by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("全部") }
    val recipeCategories = remember { getRecipeCategories() }
    val recipes = remember { getSampleRecipes() }
    
    val filteredRecipes = remember(searchQuery, selectedCategory) {
        recipes.filter { recipe ->
            (searchQuery.isBlank() || 
             recipe.name.contains(searchQuery, ignoreCase = true) || 
             recipe.effect.contains(searchQuery, ignoreCase = true)) && 
            (selectedCategory == "全部" || recipe.category == selectedCategory)
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
            placeholder = { Text("搜索茶饮...") },
            leadingIcon = { 
                Icon(
                    imageVector = Icons.Default.Search,
                    contentDescription = "Search"
                )
            },
            trailingIcon = {
                Icon(
                    imageVector = Icons.Default.FilterList,
                    contentDescription = "Filter",
                    modifier = Modifier.clickable { /* Show filter dialog */ }
                )
            },
            singleLine = true,
            shape = RoundedCornerShape(8.dp)
        )
        
        // Category Chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            CategoryChip(
                name = "全部",
                isSelected = selectedCategory == "全部",
                onSelected = { selectedCategory = "全部" }
            )
            
            recipeCategories.forEach { category ->
                CategoryChip(
                    name = category,
                    isSelected = selectedCategory == category,
                    onSelected = { selectedCategory = category }
                )
            }
        }
        
        // Recipes Grid
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(filteredRecipes) { recipe ->
                RecipeCard(recipe = recipe)
            }
        }
    }
}

@Composable
fun CategoryChip(name: String, isSelected: Boolean, onSelected: () -> Unit) {
    Surface(
        modifier = Modifier.clickable(onClick = onSelected),
        shape = CircleShape,
        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface,
        border = if (!isSelected) BorderStroke(1.dp, MaterialTheme.colorScheme.outline) else null
    ) {
        Text(
            text = name,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun RecipeCard(recipe: Recipe) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { /* Navigate to recipe detail */ },
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
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = null,
                        tint = Color(0xFFFFA000),
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "${recipe.rating}",
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(start = 4.dp)
                    )
                }
                
                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = recipe.effect,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier
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

// Data models and sample data
data class Recipe(
    val id: String,
    val name: String,
    val description: String,
    val ingredients: List<String>,
    val steps: List<String>,
    val rating: Float,
    val effect: String,
    val category: String
)

fun getRecipeCategories(): List<String> {
    return listOf("养心安神", "清热去火", "补气养血", "滋阴润燥", "祛湿健脾")
}

fun getSampleRecipes(): List<Recipe> {
    return listOf(
        Recipe(
            id = "1",
            name = "玫瑰花茶",
            description = "玫瑰花茶可舒缓压力，调理气血，对女性经期调理、美容养颜也有良好效果。",
            ingredients = listOf("玫瑰花", "红枣", "冰糖"),
            steps = listOf(
                "将玫瑰花洗净，沥干水分",
                "红枣去核，切小块",
                "锅中加入适量清水，放入所有材料",
                "大火煮沸后转小火煮10分钟",
                "关火，焖5分钟即可饮用"
            ),
            rating = 4.5f,
            effect = "养心安神",
            category = "养心安神"
        ),
        Recipe(
            id = "2",
            name = "菊花柠檬茶",
            description = "菊花柠檬茶清热解毒，明目降火，适合夏季饮用，可缓解眼睛疲劳。",
            ingredients = listOf("菊花", "柠檬", "蜂蜜"),
            steps = listOf(
                "菊花洗净，沥干水分",
                "柠檬切片",
                "锅中加入适量清水，放入菊花",
                "大火煮沸后转小火煮5分钟",
                "关火，加入柠檬片和蜂蜜，搅拌均匀即可"
            ),
            rating = 4.2f,
            effect = "清热去火",
            category = "清热去火"
        ),
        Recipe(
            id = "3",
            name = "红枣枸杞茶",
            description = "红枣枸杞茶补血养颜，增强免疫力，适合气血不足、面色苍白的人群。",
            ingredients = listOf("红枣", "枸杞", "桂圆", "红糖"),
            steps = listOf(
                "红枣洗净，去核",
                "枸杞、桂圆洗净",
                "锅中加入适量清水，放入所有材料",
                "大火煮沸后转小火煮15分钟",
                "加入红糖，搅拌至溶解即可"
            ),
            rating = 4.7f,
            effect = "补气养血",
            category = "补气养血"
        ),
        Recipe(
            id = "4",
            name = "百合莲子汤",
            description = "百合莲子汤滋阴润燥，安神养心，适合秋季干燥时饮用。",
            ingredients = listOf("百合", "莲子", "冰糖"),
            steps = listOf(
                "百合、莲子提前浸泡4小时",
                "锅中加入适量清水，放入百合和莲子",
                "大火煮沸后转小火煮30分钟",
                "加入冰糖，搅拌至溶解即可"
            ),
            rating = 4.3f,
            effect = "滋阴润燥",
            category = "滋阴润燥"
        ),
        Recipe(
            id = "5",
            name = "薏米茶",
            description = "薏米茶祛湿健脾，排毒美容，适合湿气重、水肿的人群。",
            ingredients = listOf("薏米", "红豆", "陈皮"),
            steps = listOf(
                "薏米、红豆提前浸泡4小时",
                "陈皮切细",
                "锅中加入适量清水，放入所有材料",
                "大火煮沸后转小火煮40分钟",
                "可根据个人口味加入少量蜂蜜调味"
            ),
            rating = 4.4f,
            effect = "祛湿健脾",
            category = "祛湿健脾"
        ),
        Recipe(
            id = "6",
            name = "桂花乌龙奶茶",
            description = "桂花乌龙奶茶香气宜人，养胃护胃，增进食欲。",
            ingredients = listOf("乌龙茶", "桂花", "鲜奶", "蜂蜜"),
            steps = listOf(
                "乌龙茶用沸水冲泡5分钟",
                "取出茶叶，加入桂花",
                "再冲泡2分钟，过滤",
                "加入适量鲜奶和蜂蜜，搅拌均匀即可"
            ),
            rating = 4.6f,
            effect = "养心安神",
            category = "养心安神"
        )
    )
} 