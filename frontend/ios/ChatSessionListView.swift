import SwiftUI

struct ChatSession: Identifiable, Codable {
    var id: String
    var type: String
    var participants: [Participant]
    var updatedAt: String
    var lastMessage: Message?
    var groupName: String?
    var groupAvatar: String?
    
    struct Participant: Codable {
        var user: User
        var lastSeen: String?
        var isAdmin: Bool
    }
    
    struct User: Codable {
        var id: String
        var name: String
        var avatar: String?
    }
    
    struct Message: Codable {
        var id: String
        var content: String
        var sender: User
        var createdAt: String
        var isDeleted: Bool
    }
}

class ChatViewModel: ObservableObject {
    @Published var sessions: [ChatSession] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = APIService.shared
    
    func loadSessions() {
        isLoading = true
        
        apiService.fetch(endpoint: "/api/sessions", method: "GET") { [weak self] (result: Result<[ChatSession], Error>) in
            DispatchQueue.main.async {
                self?.isLoading = false
                
                switch result {
                case .success(let sessions):
                    self?.sessions = sessions
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    func createPrivateChat(withUser userId: String, completion: @escaping (Result<ChatSession, Error>) -> Void) {
        let parameters: [String: Any] = [
            "type": "private",
            "participants": [userId]
        ]
        
        apiService.fetch(endpoint: "/api/sessions", method: "POST", parameters: parameters) { (result: Result<ChatSession, Error>) in
            DispatchQueue.main.async {
                switch result {
                case .success(let session):
                    self.sessions.append(session)
                    completion(.success(session))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
        }
    }
    
    func createGroupChat(name: String, participants: [String], completion: @escaping (Result<ChatSession, Error>) -> Void) {
        let parameters: [String: Any] = [
            "type": "group",
            "participants": participants,
            "groupName": name
        ]
        
        apiService.fetch(endpoint: "/api/sessions", method: "POST", parameters: parameters) { (result: Result<ChatSession, Error>) in
            DispatchQueue.main.async {
                switch result {
                case .success(let session):
                    self.sessions.append(session)
                    completion(.success(session))
                case .failure(let error):
                    completion(.failure(error))
                }
            }
        }
    }
}

struct ChatSessionListView: View {
    @StateObject private var viewModel = ChatViewModel()
    @State private var showingNewChatSheet = false
    @State private var searchText = ""
    
    var filteredSessions: [ChatSession] {
        if searchText.isEmpty {
            return viewModel.sessions
        } else {
            return viewModel.sessions.filter { session in
                // For private chats, search other participant's name
                if session.type == "private",
                   let otherParticipant = session.participants.first(where: { $0.user.id != UserManager.shared.currentUserId }) {
                    return otherParticipant.user.name.localizedCaseInsensitiveContains(searchText)
                }
                // For group chats, search group name
                else if let groupName = session.groupName {
                    return groupName.localizedCaseInsensitiveContains(searchText)
                }
                return false
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                List {
                    ForEach(filteredSessions) { session in
                        NavigationLink(destination: ChatDetailView(sessionId: session.id)) {
                            ChatSessionRow(session: session)
                        }
                    }
                }
                .listStyle(PlainListStyle())
                .refreshable {
                    viewModel.loadSessions()
                }
                
                if viewModel.isLoading && viewModel.sessions.isEmpty {
                    ProgressView()
                        .scaleEffect(1.5)
                }
                
                if viewModel.sessions.isEmpty && !viewModel.isLoading {
                    VStack {
                        Image(systemName: "bubble.left.and.bubble.right")
                            .font(.system(size: 60))
                            .foregroundColor(.gray.opacity(0.5))
                        
                        Text("没有聊天记录")
                            .font(.headline)
                            .foregroundColor(.gray)
                            .padding(.top)
                        
                        Text("点击右上角的加号开始新的对话")
                            .font(.subheadline)
                            .foregroundColor(.gray.opacity(0.8))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                }
            }
            .navigationTitle("聊天")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingNewChatSheet = true
                    }) {
                        Image(systemName: "square.and.pencil")
                    }
                }
            }
            .searchable(text: $searchText, prompt: "搜索对话")
            .sheet(isPresented: $showingNewChatSheet) {
                NewChatView { session in
                    showingNewChatSheet = false
                }
            }
        }
        .onAppear {
            viewModel.loadSessions()
            // Setup socket connection
            SocketManager.shared.connect()
            SocketManager.shared.onNewSession { [weak viewModel] session in
                viewModel?.sessions.append(session)
            }
        }
        .onDisappear {
            // Clean up socket listeners but don't disconnect
            SocketManager.shared.removeSessionListeners()
        }
        .alert(item: Binding<IdentifiableError?>(
            get: { viewModel.errorMessage != nil ? IdentifiableError(message: viewModel.errorMessage!) : nil },
            set: { viewModel.errorMessage = $0?.message }
        )) { error in
            Alert(title: Text("Error"), message: Text(error.message), dismissButton: .default(Text("OK")))
        }
    }
}

struct ChatSessionRow: View {
    let session: ChatSession
    @State private var otherParticipantName: String = ""
    @State private var avatarUrl: String = ""
    
    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            if session.type == "private" {
                ProfileImageView(imageUrl: avatarUrl, placeholderText: String(otherParticipantName.prefix(1)))
                    .frame(width: 50, height: 50)
            } else {
                GroupAvatarView(session: session)
                    .frame(width: 50, height: 50)
            }
            
            // Content
            VStack(alignment: .leading, spacing: 4) {
                // Session name
                Text(getSessionName())
                    .font(.headline)
                
                // Last message
                if let lastMessage = session.lastMessage {
                    if lastMessage.isDeleted {
                        Text("[此消息已删除]")
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    } else {
                        Text(lastMessage.content)
                            .font(.subheadline)
                            .foregroundColor(.gray)
                            .lineLimit(1)
                    }
                } else {
                    Text("没有消息")
                        .font(.subheadline)
                        .foregroundColor(.gray)
                }
            }
            
            Spacer()
            
            // Timestamp
            VStack(alignment: .trailing, spacing: 4) {
                Text(formatDate(session.updatedAt))
                    .font(.caption)
                    .foregroundColor(.gray)
                
                // You can add unread count badge here
            }
        }
        .padding(.vertical, 8)
        .onAppear {
            setupSessionInfo()
        }
    }
    
    private func setupSessionInfo() {
        if session.type == "private" {
            if let otherParticipant = session.participants.first(where: { $0.user.id != UserManager.shared.currentUserId }) {
                otherParticipantName = otherParticipant.user.name
                avatarUrl = otherParticipant.user.avatar ?? ""
            }
        }
    }
    
    private func getSessionName() -> String {
        if session.type == "private" {
            return otherParticipantName
        } else {
            return session.groupName ?? "群聊"
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        // Format date string for display
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        
        guard let date = formatter.date(from: dateString) else {
            return ""
        }
        
        // If today, show time only
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            formatter.dateFormat = "HH:mm"
            return formatter.string(from: date)
        }
        
        // If this year, show month and day
        if calendar.isDate(date, equalTo: Date(), toGranularity: .year) {
            formatter.dateFormat = "MM-dd"
            return formatter.string(from: date)
        }
        
        // Otherwise show year-month-day
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

struct GroupAvatarView: View {
    let session: ChatSession
    
    var body: some View {
        ZStack {
            Circle()
                .fill(Color.green.opacity(0.3))
            
            Text(session.groupName?.prefix(1) ?? "G")
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.green)
        }
    }
}

struct ProfileImageView: View {
    var imageUrl: String
    var placeholderText: String
    
    var body: some View {
        if !imageUrl.isEmpty {
            AsyncImage(url: URL(string: imageUrl)) { phase in
                switch phase {
                case .empty:
                    placeholderView
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .clipShape(Circle())
                case .failure:
                    placeholderView
                @unknown default:
                    placeholderView
                }
            }
        } else {
            placeholderView
        }
    }
    
    var placeholderView: some View {
        ZStack {
            Circle()
                .fill(Color.blue.opacity(0.3))
            
            Text(placeholderText)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.blue)
        }
    }
}

// Helper for displaying alerts with identifiable errors
struct IdentifiableError: Identifiable {
    let id = UUID()
    let message: String
}

struct ChatSessionListView_Previews: PreviewProvider {
    static var previews: some View {
        ChatSessionListView()
    }
} 