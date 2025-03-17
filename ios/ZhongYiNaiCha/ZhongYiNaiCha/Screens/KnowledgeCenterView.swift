import SwiftUI

struct KnowledgeCenterView: View {
    @EnvironmentObject private var offlineCacheManager: OfflineCacheManager
    @State private var knowledgeContent: [KnowledgeContent] = []
    @State private var isLoading = true
    @State private var searchText = ""
    @State private var selectedCategory: String? = nil
    
    let categories = ["全部", "基础知识", "养生指南", "食疗方剂", "体质调理"]
    
    var body: some View {
        VStack {
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                
                TextField("搜索中医知识", text: $searchText)
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
            
            // Category filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(categories, id: \.self) { category in
                        CategoryButton(
                            title: category,
                            isSelected: selectedCategory == category || (category == "全部" && selectedCategory == nil),
                            action: {
                                if category == "全部" {
                                    selectedCategory = nil
                                } else {
                                    selectedCategory = category
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
            } else if filteredContent.isEmpty {
                Spacer()
                VStack {
                    Image(systemName: "magnifyingglass")
                        .font(.largeTitle)
                        .foregroundColor(.gray)
                        .padding()
                    
                    Text(searchText.isEmpty ? "暂无内容" : "未找到相关内容")
                        .foregroundColor(.secondary)
                }
                Spacer()
            } else {
                // Knowledge content list
                List {
                    ForEach(filteredContent) { content in
                        NavigationLink(destination: KnowledgeDetailView(content: content)) {
                            KnowledgeRow(content: content)
                        }
                    }
                }
                .listStyle(PlainListStyle())
            }
        }
        .onAppear {
            loadKnowledgeContent()
        }
    }
    
    private var filteredContent: [KnowledgeContent] {
        var result = knowledgeContent
        
        // Filter by category
        if let category = selectedCategory {
            result = result.filter { $0.category == category }
        }
        
        // Filter by search text
        if !searchText.isEmpty {
            result = result.filter {
                $0.title.localizedCaseInsensitiveContains(searchText) ||
                $0.content.localizedCaseInsensitiveContains(searchText) ||
                $0.tags.contains { $0.localizedCaseInsensitiveContains(searchText) }
            }
        }
        
        return result
    }
    
    private func loadKnowledgeContent() {
        isLoading = true
        
        // In a real app, we would call the API
        // For now, get cached content
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            self.knowledgeContent = self.offlineCacheManager.getCachedKnowledgeContent()
            self.isLoading = false
        }
    }
}

struct CategoryButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
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

struct KnowledgeRow: View {
    let content: KnowledgeContent
    
    var body: some View {
        HStack(spacing: 16) {
            // Image
            if let imageUrl = content.imageUrl {
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
            
            // Content details
            VStack(alignment: .leading, spacing: 4) {
                Text(content.title)
                    .font(.headline)
                
                Text(content.content.prefix(80) + "...")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                
                HStack {
                    Text(content.category)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.green.opacity(0.15))
                        .foregroundColor(.green)
                        .cornerRadius(4)
                    
                    Spacer()
                    
                    if let firstTag = content.tags.first {
                        Text("#\(firstTag)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding(.vertical, 8)
    }
}

struct KnowledgeDetailView: View {
    let content: KnowledgeContent
    @State private var isFavorite = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header image
                if let imageUrl = content.imageUrl {
                    Image(imageUrl)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(height: 200)
                        .clipped()
                } else {
                    Color.gray
                        .frame(height: 150)
                        .overlay(
                            Text(content.title)
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding()
                        )
                }
                
                // Content title and category
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text(content.title)
                            .font(.title)
                            .fontWeight(.bold)
                        
                        Spacer()
                        
                        Button(action: {
                            isFavorite.toggle()
                        }) {
                            Image(systemName: isFavorite ? "bookmark.fill" : "bookmark")
                                .foregroundColor(isFavorite ? .blue : .gray)
                                .font(.title2)
                        }
                    }
                    
                    HStack {
                        Text(content.category)
                            .font(.subheadline)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.green.opacity(0.15))
                            .foregroundColor(.green)
                            .cornerRadius(15)
                        
                        Spacer()
                    }
                    
                    Divider()
                        .padding(.vertical, 8)
                    
                    // Tags
                    if !content.tags.isEmpty {
                        HStack {
                            ForEach(content.tags, id: \.self) { tag in
                                Text("#\(tag)")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .padding(.trailing, 8)
                            }
                        }
                        .padding(.bottom, 12)
                    }
                    
                    // Main content
                    Text(content.content)
                        .font(.body)
                        .lineSpacing(6)
                        .padding(.bottom, 20)
                }
                .padding(.horizontal)
                
                Spacer(minLength: 30)
            }
        }
        .navigationTitle(content.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    // Share action
                }) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
    }
}

struct KnowledgeCenterView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            KnowledgeCenterView()
                .environmentObject(OfflineCacheManager())
        }
    }
} 