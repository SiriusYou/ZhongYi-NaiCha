import Foundation
import SocketIO

class SocketManager {
    static let shared = SocketManager()
    
    private let manager: SocketIO.SocketManager
    private var socket: SocketIOClient
    private let apiUrl = APIService.baseUrl
    
    private init() {
        manager = SocketIO.SocketManager(socketURL: URL(string: apiUrl)!, config: [
            .log(true),
            .compress,
            .forceWebsockets(true),
            .connectParams(["token": UserManager.shared.token ?? ""])
        ])
        
        socket = manager.defaultSocket
        setupDefaultHandlers()
    }
    
    private func setupDefaultHandlers() {
        socket.on(clientEvent: .connect) { [weak self] data, ack in
            print("Socket connected")
        }
        
        socket.on(clientEvent: .disconnect) { [weak self] data, ack in
            print("Socket disconnected")
        }
        
        socket.on(clientEvent: .error) { [weak self] data, ack in
            print("Socket error: \(data)")
        }
        
        socket.on(clientEvent: .reconnect) { [weak self] data, ack in
            print("Socket reconnected")
        }
    }
    
    func connect() {
        // Update token in case it changed
        manager.config = [
            .log(true),
            .compress,
            .forceWebsockets(true),
            .connectParams(["token": UserManager.shared.token ?? ""])
        ]
        
        if !socket.status.active {
            socket.connect()
        }
    }
    
    func disconnect() {
        socket.disconnect()
    }
    
    func joinSession(sessionId: String) {
        socket.emit("join_sessions", ["sessionIds": [sessionId]])
    }
    
    func leaveSession(sessionId: String) {
        socket.emit("leave_session", ["sessionId": sessionId])
    }
    
    func emit(event: String, data: [String: Any]) {
        socket.emit(event, data)
    }
    
    // MARK: - Event handlers
    
    func onNewMessage(callback: @escaping (ChatMessage, String) -> Void) {
        socket.on("new_message") { [weak self] data, ack in
            guard
                let dataDict = data[0] as? [String: Any],
                let messageDict = dataDict["message"] as? [String: Any],
                let sessionId = dataDict["sessionId"] as? String
            else {
                print("Error parsing new_message event data")
                return
            }
            
            do {
                let messageData = try JSONSerialization.data(withJSONObject: messageDict)
                let message = try JSONDecoder().decode(ChatMessage.self, from: messageData)
                callback(message, sessionId)
            } catch {
                print("Error decoding message: \(error)")
            }
        }
    }
    
    func onUserTyping(callback: @escaping (String, String, Bool) -> Void) {
        socket.on("user_typing") { data, ack in
            guard
                let dataDict = data[0] as? [String: Any],
                let sessionId = dataDict["sessionId"] as? String,
                let userId = dataDict["userId"] as? String,
                let isTyping = dataDict["isTyping"] as? Bool
            else {
                print("Error parsing user_typing event data")
                return
            }
            
            callback(sessionId, userId, isTyping)
        }
    }
    
    func onMessageRead(callback: @escaping (String, String, String, String) -> Void) {
        socket.on("message_read") { data, ack in
            guard
                let dataDict = data[0] as? [String: Any],
                let messageId = dataDict["messageId"] as? String,
                let sessionId = dataDict["sessionId"] as? String,
                let readBy = dataDict["readBy"] as? String,
                let timestamp = dataDict["timestamp"] as? String
            else {
                print("Error parsing message_read event data")
                return
            }
            
            callback(messageId, sessionId, readBy, timestamp)
        }
    }
    
    func onMessagesRead(callback: @escaping ([String], String, String, String) -> Void) {
        socket.on("messages_read") { data, ack in
            guard
                let dataDict = data[0] as? [String: Any],
                let messageIds = dataDict["messageIds"] as? [String],
                let sessionId = dataDict["sessionId"] as? String,
                let readBy = dataDict["readBy"] as? String,
                let timestamp = dataDict["timestamp"] as? String
            else {
                print("Error parsing messages_read event data")
                return
            }
            
            callback(messageIds, sessionId, readBy, timestamp)
        }
    }
    
    func onMessageUpdated(callback: @escaping (String, String, String, ChatMessage) -> Void) {
        socket.on("message_updated") { data, ack in
            guard
                let dataDict = data[0] as? [String: Any],
                let messageId = dataDict["messageId"] as? String,
                let sessionId = dataDict["sessionId"] as? String,
                let action = dataDict["action"] as? String,
                let updatedMessageDict = dataDict["updatedMessage"] as? [String: Any]
            else {
                print("Error parsing message_updated event data")
                return
            }
            
            do {
                let messageData = try JSONSerialization.data(withJSONObject: updatedMessageDict)
                let message = try JSONDecoder().decode(ChatMessage.self, from: messageData)
                callback(messageId, sessionId, action, message)
            } catch {
                print("Error decoding updated message: \(error)")
            }
        }
    }
    
    func onNewSession(callback: @escaping (ChatSession) -> Void) {
        socket.on("new_session") { data, ack in
            guard
                let dataDict = data[0] as? [String: Any],
                let sessionDict = dataDict["session"] as? [String: Any]
            else {
                print("Error parsing new_session event data")
                return
            }
            
            do {
                let sessionData = try JSONSerialization.data(withJSONObject: sessionDict)
                let session = try JSONDecoder().decode(ChatSession.self, from: sessionData)
                callback(session)
            } catch {
                print("Error decoding session: \(error)")
            }
        }
    }
    
    func onSessionUpdated(callback: @escaping (ChatSession) -> Void) {
        socket.on("session_updated") { data, ack in
            guard
                let dataDict = data[0] as? [String: Any],
                let sessionDict = dataDict["session"] as? [String: Any]
            else {
                print("Error parsing session_updated event data")
                return
            }
            
            do {
                let sessionData = try JSONSerialization.data(withJSONObject: sessionDict)
                let session = try JSONDecoder().decode(ChatSession.self, from: sessionData)
                callback(session)
            } catch {
                print("Error decoding updated session: \(error)")
            }
        }
    }
    
    func onParticipantsAdded(callback: @escaping (String, [String]) -> Void) {
        socket.on("participants_added") { data, ack in
            guard
                let dataDict = data[0] as? [String: Any],
                let sessionId = dataDict["sessionId"] as? String,
                let newParticipants = dataDict["newParticipants"] as? [String]
            else {
                print("Error parsing participants_added event data")
                return
            }
            
            callback(sessionId, newParticipants)
        }
    }
    
    func onParticipantRemoved(callback: @escaping (String, String, String) -> Void) {
        socket.on("participant_removed") { data, ack in
            guard
                let dataDict = data[0] as? [String: Any],
                let sessionId = dataDict["sessionId"] as? String,
                let removedUserId = dataDict["removedUserId"] as? String,
                let removedBy = dataDict["removedBy"] as? String
            else {
                print("Error parsing participant_removed event data")
                return
            }
            
            callback(sessionId, removedUserId, removedBy)
        }
    }
    
    func removeSessionListeners() {
        socket.off("new_message")
        socket.off("user_typing")
        socket.off("message_read")
        socket.off("messages_read")
        socket.off("message_updated")
        socket.off("session_updated")
        socket.off("participants_added")
        socket.off("participant_removed")
    }
} 