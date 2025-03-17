import SwiftUI

struct RecipeDetailView: View {
    let recipe: Recipe
    @State private var selectedTab = 0
    @State private var isFavorite = false
    @State private var showShareSheet = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Recipe image
                if let imageUrl = recipe.imageUrl {
                    Image(imageUrl)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(height: 250)
                        .clipped()
                        .cornerRadius(12)
                        .overlay(
                            VStack {
                                Spacer()
                                LinearGradient(
                                    gradient: Gradient(colors: [Color.clear, Color.black.opacity(0.7)]),
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                                .frame(height: 100)
                                .cornerRadius(12)
                            }
                        )
                } else {
                    Color.gray
                        .frame(height: 250)
                        .cornerRadius(12)
                        .overlay(
                            Text("暂无图片")
                                .foregroundColor(.white)
                                .font(.title)
                        )
                }
                
                // Recipe name and actions
                HStack {
                    Text(recipe.name)
                        .font(.title)
                        .fontWeight(.bold)
                    
                    Spacer()
                    
                    Button(action: {
                        isFavorite.toggle()
                    }) {
                        Image(systemName: isFavorite ? "heart.fill" : "heart")
                            .font(.title2)
                            .foregroundColor(isFavorite ? .red : .gray)
                    }
                    
                    Button(action: {
                        showShareSheet.toggle()
                    }) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.title2)
                            .foregroundColor(.gray)
                    }
                }
                
                // Recipe tags
                HStack(spacing: 12) {
                    Tag(text: recipe.type == "warming" ? "温性" : (recipe.type == "cooling" ? "凉性" : "平性"), 
                        color: recipe.type == "warming" ? .orange : (recipe.type == "cooling" ? .blue : .green))
                    
                    Tag(text: recipe.difficulty, color: .purple)
                    
                    Tag(text: "\(recipe.totalTime)分钟", color: .gray)
                }
                
                // Suitable for constitution types
                if !recipe.suitableForTcmTypes.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("适宜体质")
                            .font(.headline)
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(recipe.suitableForTcmTypes, id: \.self) { type in
                                    Text(type)
                                        .font(.caption)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(Color.green.opacity(0.1))
                                        .foregroundColor(.green)
                                        .cornerRadius(20)
                                }
                            }
                        }
                    }
                }
                
                Divider()
                
                // Tab selection
                VStack(spacing: 0) {
                    HStack {
                        TabButton(text: "配方", isSelected: selectedTab == 0) {
                            selectedTab = 0
                        }
                        
                        TabButton(text: "做法", isSelected: selectedTab == 1) {
                            selectedTab = 1
                        }
                        
                        TabButton(text: "功效", isSelected: selectedTab == 2) {
                            selectedTab = 2
                        }
                    }
                    .padding(.horizontal)
                    
                    TabView(selection: $selectedTab) {
                        // Ingredients tab
                        IngredientsView(ingredients: recipe.ingredients)
                            .tag(0)
                        
                        // Steps tab
                        StepsView(steps: recipe.steps)
                            .tag(1)
                        
                        // Health benefits tab
                        HealthBenefitsView(recipe: recipe)
                            .tag(2)
                    }
                    .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                    .frame(minHeight: 300)
                }
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(items: [recipe.name, recipe.description])
        }
    }
}

// Tab button
struct TabButton: View {
    let text: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Text(text)
                    .fontWeight(isSelected ? .bold : .regular)
                    .foregroundColor(isSelected ? .primary : .secondary)
                
                Rectangle()
                    .fill(isSelected ? Color.blue : Color.clear)
                    .frame(height: 2)
            }
        }
        .buttonStyle(PlainButtonStyle())
        .frame(maxWidth: .infinity)
    }
}

// Tag view
struct Tag: View {
    let text: String
    let color: Color
    
    var body: some View {
        Text(text)
            .font(.caption)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color.opacity(0.1))
            .foregroundColor(color)
            .cornerRadius(8)
    }
}

// Ingredients view
struct IngredientsView: View {
    let ingredients: [Ingredient]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("食材配方")
                .font(.headline)
                .padding(.top)
            
            ForEach(ingredients) { ingredient in
                HStack {
                    Text("•")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    
                    Text(ingredient.name)
                        .font(.body)
                    
                    Spacer()
                    
                    Text(ingredient.amount)
                        .font(.body)
                        .foregroundColor(.secondary)
                }
                .padding(.vertical, 4)
            }
            
            if ingredients.isEmpty {
                Text("暂无配方信息")
                    .foregroundColor(.secondary)
                    .italic()
                    .padding()
            }
        }
    }
}

// Steps view
struct StepsView: View {
    let steps: [Step]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("制作步骤")
                .font(.headline)
                .padding(.top)
            
            ForEach(0..<steps.count, id: \.self) { index in
                HStack(alignment: .top, spacing: 15) {
                    // Step number
                    ZStack {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 30, height: 30)
                        
                        Text("\(index + 1)")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        // Step description
                        Text(steps[index].description)
                            .font(.body)
                        
                        // Step image if available
                        if let imageUrl = steps[index].imageUrl {
                            Image(imageUrl)
                                .resizable()
                                .scaledToFit()
                                .frame(maxHeight: 180)
                                .cornerRadius(8)
                        }
                        
                        // Step timing if available
                        if let timing = steps[index].timing, !timing.isEmpty {
                            Text("时间: \(timing)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .padding(.bottom, 5)
                
                if index < steps.count - 1 {
                    Divider()
                        .padding(.leading, 15)
                }
            }
            
            if steps.isEmpty {
                Text("暂无步骤信息")
                    .foregroundColor(.secondary)
                    .italic()
                    .padding()
            }
        }
    }
}

// Health benefits view
struct HealthBenefitsView: View {
    let recipe: Recipe
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("养生功效")
                .font(.headline)
                .padding(.top)
            
            // Recipe description
            Text(recipe.description)
                .font(.body)
                .padding(.vertical, 4)
            
            // Health benefits
            if !recipe.healthBenefits.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("主要功效")
                        .font(.headline)
                        .padding(.top, 8)
                    
                    ForEach(recipe.healthBenefits, id: \.self) { benefit in
                        HStack(alignment: .top) {
                            Image(systemName: "leaf.fill")
                                .foregroundColor(.green)
                                .frame(width: 20)
                            
                            Text(benefit)
                                .font(.body)
                        }
                    }
                }
            }
            
            // Contraindications
            if !recipe.contraindications.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("不适宜人群")
                        .font(.headline)
                        .foregroundColor(.red)
                        .padding(.top, 8)
                    
                    ForEach(recipe.contraindications, id: \.self) { contraindication in
                        HStack(alignment: .top) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                                .frame(width: 20)
                            
                            Text(contraindication)
                                .font(.body)
                        }
                    }
                }
            }
            
            // Seasonal recommendations
            if let seasonalTips = recipe.seasonalTips, !seasonalTips.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    Text("季节建议")
                        .font(.headline)
                        .padding(.top, 8)
                    
                    Text(seasonalTips)
                        .font(.body)
                }
            }
        }
    }
}

// Share sheet
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: items, applicationActivities: nil)
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// Preview with mock data
struct RecipeDetailView_Previews: PreviewProvider {
    static var previews: some View {
        let mockRecipe = Recipe(
            id: "1",
            name: "养生红枣枸杞奶茶",
            description: "滋补养生的红枣枸杞奶茶，适合气血双虚体质人群。",
            type: "warming",
            difficulty: "easy",
            prepTime: 5,
            totalTime: 10,
            servings: 1,
            calories: 150,
            imageUrl: "recipe_hongzao",
            ingredients: [
                Ingredient(name: "红枣", amount: "5颗", unit: ""),
                Ingredient(name: "枸杞", amount: "1", unit: "茶匙"),
                Ingredient(name: "茶叶", amount: "1", unit: "茶匙"),
                Ingredient(name: "牛奶", amount: "200", unit: "ml")
            ],
            steps: [
                Step(number: 1, description: "将红枣洗净去核，枸杞洗净", imageUrl: "step1"),
                Step(number: 2, description: "煮沸水，加入茶叶冲泡3分钟后过滤", imageUrl: "step2"),
                Step(number: 3, description: "加入红枣、枸杞和牛奶小火煮沸", imageUrl: "step3")
            ],
            suitableForTcmTypes: ["气虚质", "血虚质"],
            bestSeason: "秋冬"
        )
        
        return NavigationView {
            RecipeDetailView(recipe: mockRecipe)
        }
    }
} 