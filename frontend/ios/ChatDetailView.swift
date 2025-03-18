import SwiftUI
import Combine

struct ChatMessage: Identifiable, Codable {
    var id: String
    var content: String
    var contentType: String
    var sender: ChatSession.User
    var createdAt: String
    var readBy: [ReadReceipt]
    var isDeleted: Bool
    var replyTo: ChatMessage?
    var ephemeral: Bool?
    var metadata: [String: String]?
    
    struct ReadReceipt: Codable {
        var user: String
        var timestamp: String
    }
}

class ChatDetailViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var session: ChatSession?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var typingUsers: [String] = []
    @Published var messageText = ""
    @Published var isShowingImagePicker = false
    @Published var selectedImage: UIImage?
    
    var sessionId: String
    var isTyping = false
    
    private let apiService = APIService.shared
    private var socketManager = SocketManager.shared
    private var loadMessagesTask: Task<Void, Never>?
    private var messageObserver: AnyCancellable?
    private var typingIndicatorTask: Task<Void, Never>?
    
    init(sessionId: String) {
        self.sessionId = sessionId
        setupMessageObserver()
    }
    
    deinit {
        messageObserver?.cancel()
        loadMessagesTask?.cancel()
        typingIndicatorTask?.cancel()
    }
    
    private func setupMessageObserver() {
        // Observe when message text changes to detect typing
        messageObserver = $messageText
            .debounce(for: .seconds(0.5), scheduler: RunLoop.main)
            .removeDuplicates()
            .sink { [weak self] text in
                self?.handleTypingStatus(!text.isEmpty)
            }
    }
    
    func loadSession() {
        isLoading = true
        
        apiService.fetch(endpoint: "/api/sessions/\(sessionId)", method: "GET") { [weak self] (result: Result<ChatSession, Error>) in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                self.isLoading = false
                
                switch result {
                case .success(let session):
                    self.session = session
                    
                    // Join session for real-time updates
                    self.socketManager.joinSession(sessionId: self.sessionId)
                    
                    // Set up socket event handlers
                    self.setupSocketEventHandlers()
                    
                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    func loadMessages() {
        loadMessagesTask?.cancel()
        
        loadMessagesTask = Task {
            isLoading = true
            
            do {
                let result: [ChatMessage] = try await apiService.fetchAsync(endpoint: "/api/messages/\(sessionId)", method: "GET")
                
                await MainActor.run {
                    self.messages = result
                    self.isLoading = false
                    
                    // Mark all messages as read
                    self.markAllAsRead()
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    func sendMessage() {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        // Optimistically add message to UI
        let tempId = UUID().uuidString
        let optimisticMessage = createOptimisticMessage(content: messageText)
        
        DispatchQueue.main.async {
            self.messages.append(optimisticMessage)
            self.messageText = ""
            
            // Stop typing indicator
            self.handleTypingStatus(false)
        }
        
        // Send API request
        let parameters: [String: Any] = [
            "sessionId": sessionId,
            "content": messageText,
            "contentType": "text"
        ]
        
        apiService.fetch(endpoint: "/api/messages", method: "POST", parameters: parameters) { [weak self] (result: Result<ChatMessage, Error>) in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                switch result {
                case .success(let serverMessage):
                    // Replace optimistic message with server message
                    if let index = self.messages.firstIndex(where: { $0.id == tempId }) {
                        self.messages[index] = serverMessage
                    }
                case .failure(let error):
                    // Show error and mark optimistic message as failed
                    self.errorMessage = error.localizedDescription
                    if let index = self.messages.firstIndex(where: { $0.id == tempId }) {
                        var failedMessage = self.messages[index]
                        failedMessage.metadata = ["status": "failed"]
                        self.messages[index] = failedMessage
                    }
                }
            }
        }
    }
    
    func sendImage() {
        guard let image = selectedImage else { return }
        
        // TODO: Implement image upload
        // 1. Upload image to server or cloud storage
        // 2. Get URL or reference
        // 3. Send message with image reference
    }
    
    private func createOptimisticMessage(content: String) -> ChatMessage {
        let currentUser = ChatSession.User(
            id: UserManager.shared.currentUserId,
            name: UserManager.shared.currentUserName,
            avatar: UserManager.shared.currentUserAvatar
        )
        
        return ChatMessage(
            id: UUID().uuidString,
            content: content,
            contentType: "text",
            sender: currentUser,
            createdAt: ISO8601DateFormatter().string(from: Date()),
            readBy: [],
            isDeleted: false,
            metadata: ["status": "sending"]
        )
    }
    
    func markAsRead(_ messageId: String) {
        apiService.fetch(endpoint: "/api/messages/\(messageId)/read", method: "POST") { result in
            // Handle result if needed
        }
    }
    
    func markAllAsRead() {
        apiService.fetch(endpoint: "/api/messages/\(sessionId)/read-all", method: "POST") { result in
            // Handle result if needed
        }
        
        // Also notify via socket
        socketManager.emit(event: "mark_all_read", data: ["sessionId": sessionId])
    }
    
    private func handleTypingStatus(_ isCurrentlyTyping: Bool) {
        // Avoid sending redundant typing events
        if isCurrentlyTyping == isTyping {
            return
        }
        
        isTyping = isCurrentlyTyping
        
        if isTyping {
            socketManager.emit(event: "typing_start", data: ["sessionId": sessionId])
        } else {
            socketManager.emit(event: "typing_end", data: ["sessionId": sessionId])
        }
    }
    
    private func setupSocketEventHandlers() {
        // Handle new messages
        socketManager.onNewMessage { [weak self] message, sessionId in
            guard let self = self, sessionId == self.sessionId else { return }
            
            DispatchQueue.main.async {
                // Add message if it doesn't already exist
                if !self.messages.contains(where: { $0.id == message.id }) {
                    self.messages.append(message)
                    
                    // Mark message as read
                    self.markAsRead(message.id)
                }
            }
        }
        
        // Handle typing indicators
        socketManager.onUserTyping { [weak self] sessionId, userId, isTyping in
            guard let self = self, sessionId == self.sessionId, userId != UserManager.shared.currentUserId else { return }
            
            DispatchQueue.main.async {
                if isTyping && !self.typingUsers.contains(userId) {
                    self.typingUsers.append(userId)
                } else if !isTyping {
                    self.typingUsers.removeAll { $0 == userId }
                }
            }
        }
        
        // Handle message read receipts
        socketManager.onMessageRead { [weak self] messageId, sessionId, readBy, timestamp in
            guard let self = self, sessionId == self.sessionId else { return }
            
            DispatchQueue.main.async {
                if let index = self.messages.firstIndex(where: { $0.id == messageId }) {
                    var updatedMessage = self.messages[index]
                    
                    // Add read receipt if not already present
                    if !updatedMessage.readBy.contains(where: { $0.user == readBy }) {
                        updatedMessage.readBy.append(ChatMessage.ReadReceipt(user: readBy, timestamp: timestamp))
                        self.messages[index] = updatedMessage
                    }
                }
            }
        }
        
        // Handle message updates (edit/delete)
        socketManager.onMessageUpdated { [weak self] messageId, sessionId, action, updatedMessage in
            guard let self = self, sessionId == self.sessionId else { return }
            
            DispatchQueue.main.async {
                if let index = self.messages.firstIndex(where: { $0.id == messageId }) {
                    self.messages[index] = updatedMessage
                }
            }
        }
    }
}

struct ChatDetailView: View {
    let sessionId: String
    @StateObject private var viewModel: ChatDetailViewModel
    @State private var scrollToBottom = false
    @Environment(\.presentationMode) var presentationMode
    
    init(sessionId: String) {
        self.sessionId = sessionId
        _viewModel = StateObject(wrappedValue: ChatDetailViewModel(sessionId: sessionId))
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Messages ScrollView
            ScrollViewReader { scrollView in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(viewModel.messages) { message in
                            MessageRow(message: message, currentUserId: UserManager.shared.currentUserId)
                                .id(message.id)
                        }
                        
                        // Empty view at the bottom for scrolling
                        Color.clear.frame(height: 1)
                            .id("bottomID")
                    }
                    .padding(.horizontal)
                    .padding(.top, 8)
                }
                .onChange(of: viewModel.messages.count) { _ in
                    // Scroll to bottom when new messages arrive
                    withAnimation {
                        scrollView.scrollTo("bottomID", anchor: .bottom)
                    }
                }
                .onAppear {
                    // Scroll to bottom when view appears
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        withAnimation {
                            scrollView.scrollTo("bottomID", anchor: .bottom)
                        }
                    }
                }
            }
            
            // Typing indicator
            if !viewModel.typingUsers.isEmpty {
                HStack {
                    Text("\(getTypingNames()) 正在输入...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.leading)
                    Spacer()
                }
                .padding(.vertical, 4)
                .background(Color(.systemBackground))
            }
            
            // Input bar
            VStack(spacing: 0) {
                Divider()
                
                HStack(spacing: 12) {
                    // Media attachment button
                    Button(action: {
                        viewModel.isShowingImagePicker = true
                    }) {
                        Image(systemName: "photo")
                            .font(.system(size: 20))
                            .foregroundColor(.blue)
                    }
                    
                    // Text field
                    TextField("输入消息...", text: $viewModel.messageText)
                        .padding(.vertical, 8)
                        .padding(.horizontal, 12)
                        .background(Color(.systemGray6))
                        .cornerRadius(20)
                        .submitLabel(.send)
                        .onSubmit {
                            viewModel.sendMessage()
                        }
                    
                    // Send button
                    Button(action: {
                        viewModel.sendMessage()
                    }) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 30))
                            .foregroundColor(!viewModel.messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? .blue : .gray)
                    }
                    .disabled(viewModel.messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }
            .background(Color(.systemBackground))
            .sheet(isPresented: $viewModel.isShowingImagePicker) {
                ImagePicker(image: $viewModel.selectedImage, isPresented: $viewModel.isShowingImagePicker)
            }
            .onChange(of: viewModel.selectedImage) { image in
                if image != nil {
                    viewModel.sendImage()
                }
            }
        }
        .navigationTitle(getSessionTitle())
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(true)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: {
                    presentationMode.wrappedValue.dismiss()
                }) {
                    HStack {
                        Image(systemName: "chevron.left")
                        Text("返回")
                    }
                }
            }
            
            if viewModel.session?.type == "group" {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink(destination: GroupDetailsView(session: viewModel.session!)) {
                        Image(systemName: "info.circle")
                    }
                }
            }
        }
        .onAppear {
            viewModel.loadSession()
            viewModel.loadMessages()
        }
        .onDisappear {
            // Leave session on disappear
            SocketManager.shared.leaveSession(sessionId: sessionId)
        }
        .alert(item: Binding<IdentifiableError?>(
            get: { viewModel.errorMessage != nil ? IdentifiableError(message: viewModel.errorMessage!) : nil },
            set: { viewModel.errorMessage = $0?.message }
        )) { error in
            Alert(title: Text("Error"), message: Text(error.message), dismissButton: .default(Text("OK")))
        }
    }
    
    private func getSessionTitle() -> String {
        guard let session = viewModel.session else {
            return "聊天"
        }
        
        if session.type == "private" {
            if let otherParticipant = session.participants.first(where: { $0.user.id != UserManager.shared.currentUserId }) {
                return otherParticipant.user.name
            }
            return "私聊"
        } else {
            return session.groupName ?? "群聊"
        }
    }
    
    private func getTypingNames() -> String {
        guard !viewModel.typingUsers.isEmpty else { return "" }
        
        let names = viewModel.typingUsers.compactMap { userId -> String? in
            // Find participant name from session
            if userId == UserManager.shared.currentUserId {
                return nil
            }
            
            return viewModel.session?.participants.first { $0.user.id == userId }?.user.name
        }
        
        if names.isEmpty {
            return "有人"
        } else if names.count == 1 {
            return names[0]
        } else {
            return "\(names[0]) 和其他 \(names.count - 1) 人"
        }
    }
}

struct MessageRow: View {
    let message: ChatMessage
    let currentUserId: String
    
    var isCurrentUser: Bool {
        message.sender.id == currentUserId
    }
    
    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if !isCurrentUser {
                // Avatar for other users
                ProfileImageView(imageUrl: message.sender.avatar ?? "", placeholderText: String(message.sender.name.prefix(1)))
                    .frame(width: 30, height: 30)
            } else {
                Spacer()
            }
            
            VStack(alignment: isCurrentUser ? .trailing : .leading, spacing: 2) {
                // Username for group chats
                if !isCurrentUser {
                    Text(message.sender.name)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Message content
                HStack {
                    if message.isDeleted {
                        Text("[此消息已删除]")
                            .italic()
                            .foregroundColor(.gray)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 18)
                                    .fill(Color(.systemGray6))
                            )
                    } else {
                        Text(message.content)
                            .foregroundColor(isCurrentUser ? .white : .primary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 18)
                                    .fill(isCurrentUser ? Color.blue : Color(.systemGray6))
                            )
                    }
                }
                
                // Timestamp and read status
                HStack(spacing: 4) {
                    Text(formatMessageTime(message.createdAt))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    
                    if isCurrentUser && !message.isDeleted {
                        // Read status indicator
                        if message.readBy.isEmpty {
                            Text("已发送")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        } else {
                            Text("已读 (\(message.readBy.count))")
                                .font(.caption2)
                                .foregroundColor(.blue)
                        }
                    }
                }
            }
            
            if isCurrentUser {
                // Avatar for current user
                ProfileImageView(imageUrl: UserManager.shared.currentUserAvatar ?? "", placeholderText: String(UserManager.shared.currentUserName.prefix(1)))
                    .frame(width: 30, height: 30)
            } else {
                Spacer()
            }
        }
        .padding(.vertical, 4)
    }
    
    private func formatMessageTime(_ dateString: String) -> String {
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
            formatter.dateFormat = "MM-dd HH:mm"
            return formatter.string(from: date)
        }
        
        // Otherwise show full date
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.string(from: date)
    }
}

struct ImagePicker: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Binding var isPresented: Bool
    
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.allowsEditing = true
        return picker
    }
    
    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        let parent: ImagePicker
        
        init(_ parent: ImagePicker) {
            self.parent = parent
        }
        
        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let editedImage = info[.editedImage] as? UIImage {
                parent.image = editedImage
            } else if let originalImage = info[.originalImage] as? UIImage {
                parent.image = originalImage
            }
            
            parent.isPresented = false
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.isPresented = false
        }
    }
}

struct GroupDetailsView: View {
    let session: ChatSession
    
    var body: some View {
        List {
            Section(header: Text("群组信息")) {
                HStack {
                    Text("群名称")
                    Spacer()
                    Text(session.groupName ?? "未命名群组")
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("成员数量")
                    Spacer()
                    Text("\(session.participants.count)")
                        .foregroundColor(.secondary)
                }
            }
            
            Section(header: Text("成员列表")) {
                ForEach(session.participants, id: \.user.id) { participant in
                    HStack {
                        ProfileImageView(imageUrl: participant.user.avatar ?? "", placeholderText: String(participant.user.name.prefix(1)))
                            .frame(width: 40, height: 40)
                        
                        VStack(alignment: .leading) {
                            Text(participant.user.name)
                            
                            if let lastSeen = participant.lastSeen {
                                Text(formatLastSeen(lastSeen))
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        if participant.isAdmin {
                            Text("管理员")
                                .font(.caption)
                                .foregroundColor(.blue)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 2)
                                .background(
                                    RoundedRectangle(cornerRadius: 4)
                                        .stroke(Color.blue, lineWidth: 1)
                                )
                        }
                    }
                }
            }
            
            Section {
                Button(action: {
                    // Leave group
                }) {
                    HStack {
                        Spacer()
                        Text("退出群组")
                            .foregroundColor(.red)
                        Spacer()
                    }
                }
            }
        }
        .navigationTitle("群组详情")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func formatLastSeen(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        
        guard let date = formatter.date(from: dateString) else {
            return "未知"
        }
        
        let now = Date()
        let components = Calendar.current.dateComponents([.minute, .hour, .day], from: date, to: now)
        
        if let minute = components.minute, minute < 60 {
            return minute == 0 ? "刚刚在线" : "\(minute)分钟前在线"
        } else if let hour = components.hour, hour < 24 {
            return "\(hour)小时前在线"
        } else if let day = components.day {
            return "\(day)天前在线"
        }
        
        return "未知"
    }
}

struct ChatDetailView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            ChatDetailView(sessionId: "dummy-id")
        }
    }
} 