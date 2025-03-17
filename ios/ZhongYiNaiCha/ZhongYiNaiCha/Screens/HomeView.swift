import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var authManager: AuthManager
    @EnvironmentObject private var offlineCacheManager: OfflineCacheManager
    @State private var recommendedRecipes: [Recipe] = []
    @State private var isLoading = true
    @State private var currentSeason = "秋季"
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                headerSection
                
                // Wellness greeting
                wellnessGreetingSection
                
                // Recommended recipes
                recommendedRecipesSection
                
                // Seasonal health tips
                seasonalHealthTipsSection
                
                // Quick access
                quickAccessSection
                
                Spacer(minLength: 50)
            }
            .padding(.horizontal)
        }
        .onAppear {
            loadRecommendations()
            determineCurrentSeason()
        }
    }
    
    // MARK: - UI Components
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let user = authManager.currentUser {
                HStack {
                    Text("你好，\(user.name)")
                        .font(.title)
                        .fontWeight(.bold)
                    
                    Spacer()
                    
                    Image(systemName: "bell")
                        .font(.title2)
                        .foregroundColor(.gray)
                        .frame(width: 44, height: 44)
                        .background(Color.gray.opacity(0.1))
                        .clipShape(Circle())
                }
            } else {
                Text("欢迎使用中医奶茶")
                    .font(.title)
                    .fontWeight(.bold)
            }
            
            Text("今天是 \(formattedDate)")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Divider()
                .padding(.vertical, 8)
        }
        .padding(.top)
    }
    
    private var wellnessGreetingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(currentSeason + "养生提示")
                .font(.headline)
            
            HStack(spacing: 16) {
                Image(systemName: "leaf.fill")
                    .font(.title)
                    .foregroundColor(.green)
                    .frame(width: 50, height: 50)
                    .background(Color.green.opacity(0.1))
                    .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(seasonalWellnessGreeting)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    if let user = authManager.currentUser, let profile = user.healthProfile {
                        NavigationLink(destination: HealthProfileView()) {
                            HStack {
                                Text("查看 \(profile.tcmConstitution.displayName) 体质养生方案")
                                    .font(.caption)
                                    .foregroundColor(.blue)
                                
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.blue)
                            }
                        }
                    } else {
                        NavigationLink(destination: HealthProfileView()) {
                            HStack {
                                Text("完善健康档案获取个性化方案")
                                    .font(.caption)
                                    .foregroundColor(.blue)
                                
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
            }
            .padding()
            .background(Color.gray.opacity(0.05))
            .cornerRadius(12)
        }
    }
    
    private var recommendedRecipesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("推荐茶饮")
                    .font(.headline)
                
                Spacer()
                
                NavigationLink(destination: RecipesView()) {
                    Text("查看全部")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
            }
            
            if isLoading {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding()
            } else if recommendedRecipes.isEmpty {
                Text("暂无推荐")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding()
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 16) {
                        ForEach(recommendedRecipes) { recipe in
                            NavigationLink(destination: RecipeDetailView(recipe: recipe)) {
                                RecipeCard(recipe: recipe)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                    .padding(.horizontal, 4)
                    .padding(.vertical, 8)
                }
            }
        }
    }
    
    private var seasonalHealthTipsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("季节养生tips")
                .font(.headline)
            
            VStack(spacing: 12) {
                ForEach(seasonalHealthTips, id: \.self) { tip in
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .padding(.top, 2)
                        
                        Text(tip)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Spacer()
                    }
                }
            }
            .padding()
            .background(Color.gray.opacity(0.05))
            .cornerRadius(12)
        }
    }
    
    private var quickAccessSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("快捷访问")
                .font(.headline)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                QuickAccessButton(title: "体质测试", icon: "heart.text.square.fill", color: .pink) {
                    // Navigate to constitution test
                }
                
                QuickAccessButton(title: "热门配方", icon: "flame.fill", color: .orange) {
                    // Navigate to popular recipes
                }
                
                QuickAccessButton(title: "中医知识", icon: "book.fill", color: .blue) {
                    // Navigate to TCM knowledge
                }
                
                QuickAccessButton(title: "健康档案", icon: "person.text.rectangle.fill", color: .green) {
                    // Navigate to health profile
                }
            }
        }
    }
    
    // MARK: - Helper Views
    
    private var formattedDate: String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy年MM月dd日"
        return dateFormatter.string(from: Date())
    }
    
    private var seasonalWellnessGreeting: String {
        switch currentSeason {
        case "春季":
            return "春季阳气升发，应保持情绪舒畅，饮食宜温补。适量运动，有助于肝气舒展。"
        case "夏季":
            return "夏季暑热当令，宜清淡饮食，避免过度曝晒，保持充足睡眠和水分摄入。"
        case "秋季":
            return "秋季气候干燥，饮食宜滋阴润肺，避免辛辣刺激食物，注意保持情绪平和。"
        case "冬季":
            return "冬季阳气内敛，宜温补阳气，避免过度劳累，适当食用温热食物，早睡晚起。"
        default:
            return "根据季节变化调整饮食起居，保持身心健康平衡。"
        }
    }
    
    private var seasonalHealthTips: [String] {
        switch currentSeason {
        case "春季":
            return ["早睡早起，舒展身体", "多食用葱、姜、蒜等辛温食物", "适当进行户外活动，帮助肝气舒展", "情绪易波动，保持心情舒畅"]
        case "夏季":
            return ["注意防暑降温，避免中暑", "多食用清淡、解热食物", "保持充足睡眠，避免过度疲劳", "及时补充水分，防止体内水分流失"]
        case "秋季":
            return ["注意防寒保暖，特别是颈部和腹部", "饮食宜滋阴润肺，如梨、银耳等", "保持室内湿度，预防皮肤干燥", "保持情绪平稳，防止秋燥伤肺"]
        case "冬季":
            return ["早睡晚起，顺应阳气收藏", "适当进食温热食物，如羊肉、姜汤", "保持适量运动，增强体质", "注意保暖，预防寒邪入侵"]
        default:
            return ["调节作息，保持充足睡眠", "均衡饮食，注意营养摄入", "适量运动，增强体质", "保持心情愉悦，减少压力"]
        }
    }
    
    // MARK: - Logic Methods
    
    private func loadRecommendations() {
        isLoading = true
        
        // In a real app, we would call the API based on user health profile
        // For now, use sample data with a delay to simulate network call
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            let recipes = self.offlineCacheManager.getCachedRecipes()
            
            if let profile = self.authManager.currentUser?.healthProfile {
                // Filter recipes based on user's TCM constitution and current season
                let tcmType = profile.tcmConstitution.displayName
                
                // Map constitution types to suitable recipe types
                var suitableTypes: [String] = []
                
                switch profile.tcmConstitution {
                case .yangDeficiency, .qiDeficiency:
                    suitableTypes = ["warming"]
                case .yinDeficiency, .dampHeat:
                    suitableTypes = ["cooling"]
                default:
                    suitableTypes = ["neutral"]
                }
                
                self.recommendedRecipes = recipes.filter { recipe in
                    let seasonMatch = recipe.bestSeason == self.currentSeason || recipe.bestSeason == "all"
                    let typeMatch = suitableTypes.contains(recipe.type)
                    return typeMatch || seasonMatch
                }
            } else {
                // If no profile, just return all recipes
                self.recommendedRecipes = recipes
            }
            
            self.isLoading = false
        }
    }
    
    private func determineCurrentSeason() {
        let month = Calendar.current.component(.month, from: Date())
        
        switch month {
        case 3, 4, 5:
            currentSeason = "春季"
        case 6, 7, 8:
            currentSeason = "夏季"
        case 9, 10, 11:
            currentSeason = "秋季"
        default:
            currentSeason = "冬季"
        }
    }
}

struct RecipeCard: View {
    let recipe: Recipe
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let imageUrl = recipe.imageUrl {
                Image(imageUrl)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 140, height: 140)
                    .cornerRadius(12)
                    .clipped()
            } else {
                Color.gray
                    .frame(width: 140, height: 140)
                    .cornerRadius(12)
                    .overlay(
                        Text("暂无图片")
                            .foregroundColor(.white)
                    )
            }
            
            Text(recipe.name)
                .font(.subheadline)
                .fontWeight(.medium)
                .lineLimit(1)
                .foregroundColor(.primary)
            
            Text(recipe.type == "warming" ? "温性" : (recipe.type == "cooling" ? "凉性" : "平性"))
                .font(.caption)
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(recipe.type == "warming" ? Color.orange.opacity(0.15) : (recipe.type == "cooling" ? Color.blue.opacity(0.15) : Color.green.opacity(0.15)))
                .foregroundColor(recipe.type == "warming" ? .orange : (recipe.type == "cooling" ? .blue : .green))
                .cornerRadius(4)
        }
        .frame(width: 140)
    }
}

struct QuickAccessButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                    .frame(width: 44, height: 44)
                    .background(color.opacity(0.1))
                    .clipShape(Circle())
                
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.gray.opacity(0.05))
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            HomeView()
                .environmentObject(AuthManager())
                .environmentObject(OfflineCacheManager())
        }
    }
} 