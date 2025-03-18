import SwiftUI

struct User: Identifiable, Codable {
    var id: String
    var name: String
    var avatar: String?
    var email: String?
    var phone: String?
}

class NewChatViewModel: ObservableObject {
    @Published var users: [User] = []
    @Published var searchText = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedUserIds: [String] = []
    @Published var chatType: ChatType = .private
    @Published var groupName = ""
    
    private let apiService = APIService.shared
    
    enum ChatType: String, CaseIterable, Identifiable {
        case `private` = "private"
        case group = "group"
        
        var id: String { self.rawValue }
        
        var displayName: String {
            switch self {
            case .private: return "私聊"
            case .group: return "群聊"
            }
        }
    }
    
    func loadUsers() {
        isLoading = true
        
        apiService.fetch(endpoint: "/api/users/search", method: "GET", parameters: ["query": searchText]) { [weak self] (result: Result<[User], Error>) in
            DispatchQueue.main.async {
                self?.isLoading = false
                
                switch result {
                case .success(let users):
                    // Filter out current user
                    self?.users = users.filter { $0.id != UserManager.shared.currentUserId }
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    func createChat(completion: @escaping (ChatSession?) -> Void) {
        guard !selectedUserIds.isEmpty else {
            errorMessage = "请至少选择一位聊天对象"
            return
        }
        
        if chatType == .group && groupName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errorMessage = "请输入群组名称"
            return
        }
        
        isLoading = true
        
        var parameters: [String: Any] = [
            "type": chatType.rawValue,
            "participants": selectedUserIds
        ]
        
        if chatType == .group {
            parameters["groupName"] = groupName
        }
        
        apiService.fetch(endpoint: "/api/sessions", method: "POST", parameters: parameters) { [weak self] (result: Result<ChatSession, Error>) in
            DispatchQueue.main.async {
                self?.isLoading = false
                
                switch result {
                case .success(let session):
                    completion(session)
                case .failure(let error):
                    self?.errorMessage = error.localizedDescription
                    completion(nil)
                }
            }
        }
    }
    
    func toggleUserSelection(userId: String) {
        if selectedUserIds.contains(userId) {
            selectedUserIds.removeAll { $0 == userId }
        } else {
            selectedUserIds.append(userId)
            
            // If it's a private chat, limit to one user
            if chatType == .private && selectedUserIds.count > 1 {
                selectedUserIds = [userId]
            }
        }
    }
}

struct NewChatView: View {
    @StateObject private var viewModel = NewChatViewModel()
    @Environment(\.presentationMode) var presentationMode
    var onChatCreated: (ChatSession) -> Void
    
    var body: some View {
        NavigationView {
            VStack {
                // Chat type selector
                Picker("聊天类型", selection: $viewModel.chatType) {
                    ForEach(NewChatViewModel.ChatType.allCases) { type in
                        Text(type.displayName).tag(type)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                
                // Group name field (for group chats)
                if viewModel.chatType == .group {
                    TextField("群组名称", text: $viewModel.groupName)
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                        .padding(.horizontal)
                }
                
                // User search
                SearchBar(text: $viewModel.searchText, onSearchButtonClicked: {
                    viewModel.loadUsers()
                })
                .padding(.horizontal)
                
                if viewModel.isLoading {
                    ProgressView()
                        .padding()
                } else if viewModel.users.isEmpty {
                    VStack {
                        Spacer()
                        
                        if viewModel.searchText.isEmpty {
                            Text("搜索用户开始聊天")
                                .foregroundColor(.gray)
                        } else {
                            Text("未找到匹配的用户")
                                .foregroundColor(.gray)
                        }
                        
                        Spacer()
                    }
                } else {
                    // Selected users preview
                    if !viewModel.selectedUserIds.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(viewModel.selectedUserIds, id: \.self) { userId in
                                    if let user = viewModel.users.first(where: { $0.id == userId }) {
                                        SelectedUserBadge(user: user) {
                                            viewModel.toggleUserSelection(userId: userId)
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                        .padding(.vertical, 8)
                        .background(Color(.systemGray6))
                    }
                    
                    // User list
                    List {
                        ForEach(viewModel.users) { user in
                            UserRow(user: user, isSelected: viewModel.selectedUserIds.contains(user.id)) {
                                viewModel.toggleUserSelection(userId: user.id)
                            }
                        }
                    }
                }
                
                // Create button
                Button(action: {
                    viewModel.createChat { session in
                        if let session = session {
                            onChatCreated(session)
                        }
                    }
                }) {
                    Text("创建对话")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(viewModel.selectedUserIds.isEmpty ? Color.gray : Color.blue)
                        )
                        .padding(.horizontal)
                }
                .disabled(viewModel.selectedUserIds.isEmpty)
                .padding(.bottom)
            }
            .navigationTitle(viewModel.chatType == .private ? "新建私聊" : "新建群聊")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("取消") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
            .alert(item: Binding<IdentifiableError?>(
                get: { viewModel.errorMessage != nil ? IdentifiableError(message: viewModel.errorMessage!) : nil },
                set: { viewModel.errorMessage = $0?.message }
            )) { error in
                Alert(title: Text("错误"), message: Text(error.message), dismissButton: .default(Text("确定")))
            }
        }
    }
}

struct UserRow: View {
    let user: User
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                // Avatar
                ProfileImageView(imageUrl: user.avatar ?? "", placeholderText: String(user.name.prefix(1)))
                    .frame(width: 50, height: 50)
                
                // User info
                VStack(alignment: .leading, spacing: 4) {
                    Text(user.name)
                        .font(.headline)
                    
                    if let phone = user.phone {
                        Text(phone)
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    } else if let email = user.email {
                        Text(email)
                            .font(.subheadline)
                            .foregroundColor(.gray)
                    }
                }
                
                Spacer()
                
                // Selection indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.blue)
                        .font(.system(size: 20))
                }
            }
        }
        .padding(.vertical, 4)
    }
}

struct SelectedUserBadge: View {
    let user: User
    let onRemove: () -> Void
    
    var body: some View {
        VStack {
            ZStack(alignment: .topTrailing) {
                ProfileImageView(imageUrl: user.avatar ?? "", placeholderText: String(user.name.prefix(1)))
                    .frame(width: 60, height: 60)
                
                Button(action: onRemove) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.red)
                        .background(Circle().fill(Color.white))
                        .font(.system(size: 18))
                }
                .offset(x: 5, y: -5)
            }
            
            Text(user.name)
                .font(.caption)
                .lineLimit(1)
                .frame(width: 70)
        }
    }
}

struct SearchBar: View {
    @Binding var text: String
    var onSearchButtonClicked: () -> Void
    
    var body: some View {
        HStack {
            TextField("搜索用户...", text: $text)
                .padding(7)
                .padding(.horizontal, 25)
                .background(Color(.systemGray6))
                .cornerRadius(8)
                .overlay(
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                            .frame(minWidth: 0, maxWidth: .infinity, alignment: .leading)
                            .padding(.leading, 8)
                        
                        if !text.isEmpty {
                            Button(action: {
                                text = ""
                            }) {
                                Image(systemName: "multiply.circle.fill")
                                    .foregroundColor(.gray)
                                    .padding(.trailing, 8)
                            }
                        }
                    }
                )
                .onSubmit {
                    onSearchButtonClicked()
                }
            
            if !text.isEmpty {
                Button("搜索") {
                    onSearchButtonClicked()
                }
                .transition(.move(edge: .trailing))
            }
        }
    }
}

struct NewChatView_Previews: PreviewProvider {
    static var previews: some View {
        NewChatView { _ in
            // Do nothing in preview
        }
    }
} 