package com.zhongyi.naicha.ui.chat

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zhongyi.naicha.api.ApiService
import com.zhongyi.naicha.model.ChatMessage
import com.zhongyi.naicha.model.ChatSession
import com.zhongyi.naicha.utils.SingleLiveEvent
import com.zhongyi.naicha.utils.UserManager
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException
import java.util.UUID

class ChatViewModel : ViewModel() {
    
    private val _sessions = MutableLiveData<List<ChatSession>>(emptyList())
    val sessions: LiveData<List<ChatSession>> = _sessions
    
    private val _messages = MutableLiveData<List<ChatMessage>>(emptyList())
    val messages: LiveData<List<ChatMessage>> = _messages
    
    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading
    
    private val _errorEvent = SingleLiveEvent<String>()
    val errorEvent: LiveData<String> = _errorEvent
    
    private val _currentSession = MutableLiveData<ChatSession>()
    val currentSession: LiveData<ChatSession> = _currentSession
    
    private val _typingUsers = MutableLiveData<List<String>>(emptyList())
    val typingUsers: LiveData<List<String>> = _typingUsers
    
    private val apiService = ApiService.getInstance()
    
    // Current chat state
    private var currentSessionId: String? = null
    
    fun loadSessions() {
        viewModelScope.launch {
            _isLoading.value = true
            
            try {
                val result = apiService.getSessions()
                _sessions.value = result
            } catch (e: HttpException) {
                _errorEvent.value = "Error ${e.code()}: ${e.message()}"
            } catch (e: IOException) {
                _errorEvent.value = "Network error: ${e.message}"
            } catch (e: Exception) {
                _errorEvent.value = "Unexpected error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun loadSession(sessionId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            
            try {
                val result = apiService.getSessionById(sessionId)
                _currentSession.value = result
                currentSessionId = sessionId
            } catch (e: HttpException) {
                _errorEvent.value = "Error ${e.code()}: ${e.message()}"
            } catch (e: IOException) {
                _errorEvent.value = "Network error: ${e.message}"
            } catch (e: Exception) {
                _errorEvent.value = "Unexpected error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun loadMessages(sessionId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            
            try {
                val result = apiService.getMessages(sessionId)
                _messages.value = result
                currentSessionId = sessionId
                
                // Mark all messages as read
                markAllAsRead(sessionId)
            } catch (e: HttpException) {
                _errorEvent.value = "Error ${e.code()}: ${e.message()}"
            } catch (e: IOException) {
                _errorEvent.value = "Network error: ${e.message}"
            } catch (e: Exception) {
                _errorEvent.value = "Unexpected error: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun sendMessage(content: String) {
        currentSessionId?.let { sessionId ->
            // Create optimistic message
            val tempId = UUID.randomUUID().toString()
            val currentUser = UserManager.getCurrentUser()
            
            val optimisticMessage = ChatMessage(
                id = tempId,
                content = content,
                contentType = "text",
                sender = ChatMessage.User(
                    id = currentUser.id,
                    name = currentUser.name,
                    avatar = currentUser.avatar
                ),
                createdAt = System.currentTimeMillis().toString(),
                readBy = emptyList(),
                isDeleted = false,
                metadata = mapOf("status" to "sending")
            )
            
            // Add to UI
            val currentMessages = _messages.value?.toMutableList() ?: mutableListOf()
            currentMessages.add(optimisticMessage)
            _messages.value = currentMessages
            
            // Send the API request
            viewModelScope.launch {
                try {
                    val request = ChatMessage.SendRequest(
                        sessionId = sessionId,
                        content = content,
                        contentType = "text"
                    )
                    
                    val response = apiService.sendMessage(request)
                    
                    // Replace optimistic message with real one
                    val updatedMessages = _messages.value?.toMutableList() ?: mutableListOf()
                    val index = updatedMessages.indexOfFirst { it.id == tempId }
                    if (index != -1) {
                        updatedMessages[index] = response
                        _messages.value = updatedMessages
                    }
                } catch (e: Exception) {
                    // Mark message as failed
                    val updatedMessages = _messages.value?.toMutableList() ?: mutableListOf()
                    val index = updatedMessages.indexOfFirst { it.id == tempId }
                    if (index != -1) {
                        val failedMessage = updatedMessages[index].copy(
                            metadata = mapOf("status" to "failed")
                        )
                        updatedMessages[index] = failedMessage
                        _messages.value = updatedMessages
                    }
                    
                    _errorEvent.value = "Failed to send message: ${e.message}"
                }
            }
        }
    }
    
    fun markAsRead(messageId: String) {
        viewModelScope.launch {
            try {
                apiService.markAsRead(messageId)
            } catch (e: Exception) {
                // Silent failure for read receipts
            }
        }
    }
    
    fun markAllAsRead(sessionId: String) {
        viewModelScope.launch {
            try {
                apiService.markAllAsRead(sessionId)
            } catch (e: Exception) {
                // Silent failure for read receipts
            }
        }
    }
    
    fun createPrivateChat(userId: String, callback: (ChatSession?) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            
            try {
                val request = ChatSession.CreateRequest(
                    type = "private",
                    participants = listOf(userId)
                )
                
                val result = apiService.createSession(request)
                
                // Add to sessions list
                val currentSessions = _sessions.value?.toMutableList() ?: mutableListOf()
                currentSessions.add(result)
                _sessions.value = currentSessions
                
                callback(result)
            } catch (e: Exception) {
                _errorEvent.value = "Failed to create chat: ${e.message}"
                callback(null)
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun createGroupChat(name: String, participants: List<String>, callback: (ChatSession?) -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            
            try {
                val request = ChatSession.CreateRequest(
                    type = "group",
                    participants = participants,
                    groupName = name
                )
                
                val result = apiService.createSession(request)
                
                // Add to sessions list
                val currentSessions = _sessions.value?.toMutableList() ?: mutableListOf()
                currentSessions.add(result)
                _sessions.value = currentSessions
                
                callback(result)
            } catch (e: Exception) {
                _errorEvent.value = "Failed to create group: ${e.message}"
                callback(null)
            } finally {
                _isLoading.value = false
            }
        }
    }
    
    fun addSession(session: ChatSession) {
        val currentSessions = _sessions.value?.toMutableList() ?: mutableListOf()
        if (!currentSessions.any { it.id == session.id }) {
            currentSessions.add(session)
            _sessions.value = currentSessions
        }
    }
    
    fun addMessage(message: ChatMessage) {
        if (message.session == currentSessionId) {
            val currentMessages = _messages.value?.toMutableList() ?: mutableListOf()
            if (!currentMessages.any { it.id == message.id }) {
                currentMessages.add(message)
                _messages.value = currentMessages
                
                // Mark as read
                markAsRead(message.id)
            }
        }
    }
    
    fun updateTypingUsers(userId: String, isTyping: Boolean) {
        if (userId == UserManager.getCurrentUser().id) {
            return
        }
        
        val currentUsers = _typingUsers.value?.toMutableList() ?: mutableListOf()
        
        if (isTyping && !currentUsers.contains(userId)) {
            currentUsers.add(userId)
        } else if (!isTyping) {
            currentUsers.remove(userId)
        }
        
        _typingUsers.value = currentUsers
    }
} 