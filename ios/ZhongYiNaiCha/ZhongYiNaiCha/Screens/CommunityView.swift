import SwiftUI

struct CommunityView: View {
    @State private var posts: [Post] = mockPosts
    @State private var selectedFilter: String = "推荐"
    @State private var searchText: String = ""
    
    let filters = ["推荐", "讨论", "问答", "心得"]
    
    var body: some View {
        VStack(spacing: 0) {
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                
                TextField("搜索社区内容", text: $searchText)
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
            .padding(.bottom, 8)
            
            // Filters
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 20) {
                    ForEach(filters, id: \.self) { filter in
                        VStack(spacing: 8) {
                            Text(filter)
                                .fontWeight(selectedFilter == filter ? .bold : .regular)
                                .foregroundColor(selectedFilter == filter ? .primary : .gray)
                            
                            // Indicator for selected filter
                            Rectangle()
                                .frame(height: 2)
                                .foregroundColor(selectedFilter == filter ? .blue : .clear)
                        }
                        .onTapGesture {
                            selectedFilter = filter
                        }
                    }
                }
                .padding(.horizontal)
            }
            .padding(.bottom, 8)
            
            Divider()
            
            // Post list
            ScrollView {
                VStack(spacing: 0) {
                    ForEach(filteredPosts) { post in
                        NavigationLink(destination: PostDetailView(post: post)) {
                            PostRow(post: post)
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        Divider()
                    }
                }
            }
            
            // Create post button
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    
                    Button(action: {
                        // Show create post screen
                    }) {
                        Image(systemName: "square.and.pencil")
                            .font(.title)
                            .foregroundColor(.white)
                            .frame(width: 60, height: 60)
                            .background(Color.blue)
                            .clipShape(Circle())
                            .shadow(radius: 4)
                    }
                    .padding(.trailing, 20)
                    .padding(.bottom, 20)
                }
            }
        }
    }
    
    private var filteredPosts: [Post] {
        let categoryFiltered = selectedFilter == "推荐" 
            ? posts 
            : posts.filter { $0.category == selectedFilter }
        
        if searchText.isEmpty {
            return categoryFiltered
        } else {
            return categoryFiltered.filter {
                $0.title.localizedCaseInsensitiveContains(searchText) ||
                $0.content.localizedCaseInsensitiveContains(searchText) ||
                $0.author.name.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
}

struct PostRow: View {
    let post: Post
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Author info
            HStack(spacing: 10) {
                Image(systemName: "person.circle.fill")
                    .resizable()
                    .frame(width: 36, height: 36)
                    .foregroundColor(.gray)
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(post.author.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Text(timeAgo(from: post.createdAt))
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                Text(post.category)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(categoryColor(post.category).opacity(0.1))
                    .foregroundColor(categoryColor(post.category))
                    .cornerRadius(8)
            }
            
            // Post content
            VStack(alignment: .leading, spacing: 8) {
                Text(post.title)
                    .font(.headline)
                
                Text(post.content)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(3)
                
                // Image if available
                if let imageUrl = post.imageUrl {
                    Image(imageUrl)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(height: 180)
                        .cornerRadius(8)
                        .clipped()
                }
            }
            
            // Engagement stats
            HStack(spacing: 20) {
                Label("\(post.likes)", systemImage: "heart")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Label("\(post.comments.count)", systemImage: "text.bubble")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Label("\(post.shares)", systemImage: "arrowshape.turn.up.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
            }
        }
        .padding()
    }
    
    private func timeAgo(from date: Date) -> String {
        let now = Date()
        let components = Calendar.current.dateComponents([.minute, .hour, .day], from: date, to: now)
        
        if let day = components.day, day >= 1 {
            return "\(day)天前"
        } else if let hour = components.hour, hour >= 1 {
            return "\(hour)小时前"
        } else if let minute = components.minute, minute >= 1 {
            return "\(minute)分钟前"
        } else {
            return "刚刚"
        }
    }
    
    private func categoryColor(_ category: String) -> Color {
        switch category {
        case "讨论": return .blue
        case "问答": return .green
        case "心得": return .orange
        default: return .gray
        }
    }
}

struct PostDetailView: View {
    let post: Post
    @State private var newComment = ""
    @State private var isLiked = false
    @State private var showShareSheet = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Author info
                HStack(spacing: 10) {
                    Image(systemName: "person.circle.fill")
                        .resizable()
                        .frame(width: 40, height: 40)
                        .foregroundColor(.gray)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(post.author.name)
                            .font(.headline)
                        
                        Text(formattedDate(post.createdAt))
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                    
                    Spacer()
                    
                    Button(action: {
                        showShareSheet.toggle()
                    }) {
                        Image(systemName: "square.and.arrow.up")
                            .foregroundColor(.gray)
                    }
                }
                .padding(.horizontal)
                
                // Post content
                VStack(alignment: .leading, spacing: 12) {
                    Text(post.title)
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text(post.content)
                        .font(.body)
                        .lineSpacing(6)
                    
                    if let imageUrl = post.imageUrl {
                        Image(imageUrl)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(maxHeight: 250)
                            .cornerRadius(12)
                            .clipped()
                    }
                }
                .padding(.horizontal)
                
                // Actions
                HStack(spacing: 30) {
                    Button(action: {
                        isLiked.toggle()
                    }) {
                        HStack {
                            Image(systemName: isLiked ? "heart.fill" : "heart")
                                .foregroundColor(isLiked ? .red : .gray)
                            
                            Text(isLiked ? "\(post.likes + 1)" : "\(post.likes)")
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    HStack {
                        Image(systemName: "text.bubble")
                            .foregroundColor(.gray)
                        
                        Text("\(post.comments.count)")
                            .foregroundColor(.secondary)
                    }
                    
                    Button(action: {
                        showShareSheet.toggle()
                    }) {
                        HStack {
                            Image(systemName: "arrowshape.turn.up.right")
                                .foregroundColor(.gray)
                            
                            Text("\(post.shares)")
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Spacer()
                }
                .padding()
                
                Divider()
                
                // Comments section
                VStack(alignment: .leading, spacing: 12) {
                    Text("评论 (\(post.comments.count))")
                        .font(.headline)
                        .padding(.horizontal)
                    
                    if post.comments.isEmpty {
                        Text("暂无评论，来发表第一条评论吧！")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding()
                    } else {
                        ForEach(post.comments) { comment in
                            CommentRow(comment: comment)
                            
                            if comment.id != post.comments.last?.id {
                                Divider()
                            }
                        }
                    }
                }
                
                Spacer(minLength: 60)
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .overlay(
            VStack {
                Spacer()
                
                // Comment input field
                HStack {
                    TextField("添加评论...", text: $newComment)
                        .padding(10)
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(20)
                    
                    Button(action: {
                        // Add comment
                        if !newComment.isEmpty {
                            newComment = ""
                        }
                    }) {
                        Image(systemName: "paperplane.fill")
                            .foregroundColor(newComment.isEmpty ? .gray : .blue)
                    }
                    .disabled(newComment.isEmpty)
                }
                .padding()
                .background(Color.white)
                .shadow(radius: 2)
            }
        )
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(items: [post.title, post.content])
        }
    }
    
    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy年MM月dd日 HH:mm"
        return formatter.string(from: date)
    }
}

struct CommentRow: View {
    let comment: Comment
    
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "person.circle.fill")
                .resizable()
                .frame(width: 30, height: 30)
                .foregroundColor(.gray)
            
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(comment.author.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Spacer()
                    
                    Text(timeAgo(from: comment.createdAt))
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Text(comment.content)
                    .font(.subheadline)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
    
    private func timeAgo(from date: Date) -> String {
        let now = Date()
        let components = Calendar.current.dateComponents([.minute, .hour, .day], from: date, to: now)
        
        if let day = components.day, day >= 1 {
            return "\(day)天前"
        } else if let hour = components.hour, hour >= 1 {
            return "\(hour)小时前"
        } else if let minute = components.minute, minute >= 1 {
            return "\(minute)分钟前"
        } else {
            return "刚刚"
        }
    }
}

// Models
struct Post: Identifiable {
    let id: String
    let title: String
    let content: String
    let author: Author
    let createdAt: Date
    let imageUrl: String?
    let category: String
    let likes: Int
    let shares: Int
    let comments: [Comment]
}

struct Author: Identifiable {
    let id: String
    let name: String
    let avatarUrl: String?
}

struct Comment: Identifiable {
    let id: String
    let content: String
    let author: Author
    let createdAt: Date
    let likes: Int
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

// Mock data
let mockAuthor = Author(id: "1", name: "张三", avatarUrl: nil)
let otherAuthor = Author(id: "2", name: "李四", avatarUrl: nil)

let mockComments = [
    Comment(id: "1", content: "这个茶饮我试过了，确实对我的气虚症状有改善，非常推荐！", author: otherAuthor, createdAt: Date().addingTimeInterval(-3600*2), likes: 5),
    Comment(id: "2", content: "请问适合孕妇饮用吗？", author: Author(id: "3", name: "王五", avatarUrl: nil), createdAt: Date().addingTimeInterval(-3600), likes: 1)
]

let mockPosts = [
    Post(id: "1", 
         title: "分享一个适合气虚体质的茶饮配方", 
         content: "最近按照中医的建议，开始调理自己的气虚体质。这款茶饮由黄芪、党参、大枣、桂圆和少量红糖组成，每天一次，坚持了一个月，明显感觉精神变好了，不再那么容易疲劳。\n\n配方：黄芪10克、党参8克、大枣5颗、桂圆10克、红糖适量。\n\n做法：将所有材料放入砂锅中，加入适量清水，小火煮20分钟即可。", 
         author: mockAuthor, 
         createdAt: Date().addingTimeInterval(-86400), 
         imageUrl: nil, 
         category: "心得", 
         likes: 24, 
         shares: 5, 
         comments: mockComments),
    
    Post(id: "2", 
         title: "请问有没有适合春季湿气重的养生茶推荐？", 
         content: "最近天气转暖，但是湿气很重，感觉身体很不舒服，浑身乏力，请问各位有什么好的养生茶推荐吗？最好是能祛湿的，谢谢！", 
         author: otherAuthor, 
         createdAt: Date().addingTimeInterval(-43200), 
         imageUrl: nil, 
         category: "问答", 
         likes: 8, 
         shares: 0, 
         comments: []),
    
    Post(id: "3", 
         title: "中医奶茶的糖分对糖尿病人的影响", 
         content: "最近在讨论健康饮品，想了解大家对中医奶茶中糖分含量的看法。传统配方往往需要添加红糖或蜂蜜来调味，这对血糖控制有要求的人群可能不太友好。\n\n有没有专业人士能分享一些低糖或无糖的替代方案，既保留中医养生功效又适合糖尿病患者？", 
         author: Author(id: "4", name: "专业中医", avatarUrl: nil), 
         createdAt: Date().addingTimeInterval(-172800), 
         imageUrl: nil, 
         category: "讨论", 
         likes: 32, 
         shares: 12, 
         comments: [])
] 