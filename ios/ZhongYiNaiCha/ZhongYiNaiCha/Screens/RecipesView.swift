import SwiftUI

struct RecipesView: View {
    @EnvironmentObject private var offlineCacheManager: OfflineCacheManager
    @State private var recipes: [Recipe] = []
    @State private var isLoading = true
    @State private var selectedFilter: String? = nil
    @State private var searchText = ""
    
    let filterOptions = ["全部", "温性", "凉性", "平性"]
    
    var body: some View {
        VStack {
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                
                TextField("搜索茶饮配方", text: $searchText)
                    .autocapitalization(.none)
                
                if !searchText.isEmpty {
                    Button(action: {
                        searchText = ""
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.gray)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(10)
            .background(Color.gray.opacity(0.1))
            .cornerRadius(10)
            .padding(.horizontal)
            
            // Filter options
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(filterOptions, id: \.self) { option in
                        FilterChip(
                            text: option,
                            isSelected: selectedFilter == option || (option == "全部" && selectedFilter == nil),
                            action: {
                                if option == "全部" {
                                    selectedFilter = nil
                                } else {
                                    selectedFilter = option
                                }
                            }
                        )
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }
            
            if isLoading {
                Spacer()
                ProgressView("加载中...")
                Spacer()
            } else if filteredRecipes.isEmpty {
                Spacer()
                VStack {
                    Image(systemName: "leaf")
                        .font(.largeTitle)
                        .foregroundColor(.gray)
                        .padding()
                    
                    Text(searchText.isEmpty ? "暂无茶饮配方" : "未找到匹配的茶饮配方")
                        .foregroundColor(.secondary)
                }
                Spacer()
            } else {
                List {
                    ForEach(filteredRecipes) { recipe in
                        NavigationLink(destination: RecipeDetailView(recipe: recipe)) {
                            RecipeRow(recipe: recipe)
                        }
                    }
                }
                .listStyle(PlainListStyle())
            }
        }
        .onAppear {
            loadRecipes()
        }
    }
    
    private var filteredRecipes: [Recipe] {
        var result = recipes
        
        // Apply type filter
        if let filter = selectedFilter {
            let filterMap = [
                "温性": "warming",
                "凉性": "cooling",
                "平性": "neutral"
            ]
            
            if let filterValue = filterMap[filter] {
                result = result.filter { $0.type == filterValue }
            }
        }
        
        // Apply search filter
        if !searchText.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(searchText) ||
                $0.description.localizedCaseInsensitiveContains(searchText) ||
                $0.suitableForTcmTypes.contains { $0.localizedCaseInsensitiveContains(searchText) }
            }
        }
        
        return result
    }
    
    private func loadRecipes() {
        isLoading = true
        
        // In a real app, we would call the API
        // For now, get cached recipes
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            self.recipes = self.offlineCacheManager.getCachedRecipes()
            self.isLoading = false
        }
    }
}

struct FilterChip: View {
    let text: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(text)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(isSelected ? Color.blue.opacity(0.1) : Color.gray.opacity(0.1))
                .foregroundColor(isSelected ? .blue : .primary)
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 1)
                )
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct RecipeRow: View {
    let recipe: Recipe
    
    var body: some View {
        HStack(spacing: 16) {
            // Recipe image
            if let imageUrl = recipe.imageUrl {
                Image(imageUrl)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 80, height: 80)
                    .cornerRadius(10)
                    .clipped()
            } else {
                Color.gray
                    .frame(width: 80, height: 80)
                    .cornerRadius(10)
                    .overlay(
                        Text("无图")
                            .foregroundColor(.white)
                    )
            }
            
            // Recipe details
            VStack(alignment: .leading, spacing: 4) {
                Text(recipe.name)
                    .font(.headline)
                
                Text(recipe.description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                
                HStack(spacing: 10) {
                    Text(recipe.type == "warming" ? "温性" : (recipe.type == "cooling" ? "凉性" : "平性"))
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(recipe.type == "warming" ? Color.orange.opacity(0.15) : (recipe.type == "cooling" ? Color.blue.opacity(0.15) : Color.green.opacity(0.15)))
                        .foregroundColor(recipe.type == "warming" ? .orange : (recipe.type == "cooling" ? .blue : .green))
                        .cornerRadius(4)
                    
                    Text(recipe.difficulty)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.purple.opacity(0.15))
                        .foregroundColor(.purple)
                        .cornerRadius(4)
                    
                    Text("\(recipe.totalTime)分钟")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.gray.opacity(0.15))
                        .foregroundColor(.gray)
                        .cornerRadius(4)
                }
            }
            
            Spacer()
        }
        .padding(.vertical, 8)
    }
}

struct RecipesView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            RecipesView()
                .environmentObject(OfflineCacheManager())
        }
    }
} 