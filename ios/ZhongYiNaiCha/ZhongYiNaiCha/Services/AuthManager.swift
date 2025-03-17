import Foundation
import Combine

class AuthManager: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var currentUser: User?
    @Published var authToken: String?
    
    private var cancellables = Set<AnyCancellable>()
    private let tokenKey = "auth_token"
    
    init() {
        // Load saved authentication state
        loadAuthState()
    }
    
    // Load authentication state from storage (UserDefaults)
    func loadAuthState() {
        if let token = UserDefaults.standard.string(forKey: tokenKey) {
            self.authToken = token
            self.isLoggedIn = true
            fetchUserProfile()
        }
    }
    
    // Login with phone number and verification code
    func login(phone: String, verificationCode: String, completion: @escaping (Bool, String?) -> Void) {
        // Simulate network delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            // This would normally call the API service
            // For development, simulate success
            if phone.count >= 11 && verificationCode.count >= 4 {
                let token = "sample_token_\(UUID().uuidString)"
                self.authToken = token
                UserDefaults.standard.set(token, forKey: self.tokenKey)
                
                // Create mock user
                self.currentUser = User(
                    id: "1",
                    phone: phone,
                    name: "用户\(phone.suffix(4))",
                    email: nil,
                    healthProfile: nil
                )
                
                self.isLoggedIn = true
                completion(true, nil)
            } else {
                completion(false, "手机号或验证码格式错误")
            }
        }
    }
    
    // Login with third-party providers (WeChat, Apple, etc.)
    func loginWithThirdParty(provider: String, completion: @escaping (Bool, String?) -> Void) {
        // Simulate network delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            // This would normally handle OAuth flow
            if provider == "wechat" || provider == "apple" {
                let token = "sample_token_\(provider)_\(UUID().uuidString)"
                self.authToken = token
                UserDefaults.standard.set(token, forKey: self.tokenKey)
                
                // Create mock user
                self.currentUser = User(
                    id: "2",
                    phone: nil,
                    name: provider == "wechat" ? "微信用户" : "Apple用户",
                    email: provider == "apple" ? "user@example.com" : nil,
                    healthProfile: nil
                )
                
                self.isLoggedIn = true
                completion(true, nil)
            } else {
                completion(false, "不支持的登录方式")
            }
        }
    }
    
    // Logout user
    func logout() {
        UserDefaults.standard.removeObject(forKey: tokenKey)
        self.authToken = nil
        self.currentUser = nil
        self.isLoggedIn = false
    }
    
    // Fetch user profile
    private func fetchUserProfile() {
        // In a real app, this would call the API service
        // For now, create mock user data
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.currentUser = User(
                id: "1",
                phone: "13812345678",
                name: "测试用户",
                email: "test@example.com",
                healthProfile: HealthProfile(
                    age: 30,
                    gender: .female,
                    height: 165,
                    weight: 55,
                    tcmConstitution: .balanced,
                    healthGoals: ["增强免疫力", "改善睡眠"],
                    allergies: ["花粉"],
                    medicalConditions: [],
                    bmi: 20.2,
                    updatedAt: Date()
                )
            )
        }
    }
} 