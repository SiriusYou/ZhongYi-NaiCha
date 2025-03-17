import SwiftUI

struct OnboardingView: View {
    @State private var currentPage = 0
    @State private var showLogin = false
    
    let introPages: [IntroPage] = [
        IntroPage(
            title: "传统中医专业茶饮",
            description: "基于传统中医理论，我们提供专业定制的健康茶饮，满足您的身体需求。",
            imageName: "tea-intro-1"
        ),
        IntroPage(
            title: "个性化体质分析",
            description: "通过专业测评了解您的体质类型，获取个性化的饮食和茶饮建议。",
            imageName: "tea-intro-2"
        ),
        IntroPage(
            title: "健康知识管理",
            description: "随时获取中医养生知识，记录您的健康状态，持续改善生活质量。",
            imageName: "tea-intro-3"
        )
    ]
    
    var body: some View {
        if showLogin {
            LoginView()
                .transition(.move(edge: .trailing))
        } else {
            VStack {
                TabView(selection: $currentPage) {
                    ForEach(0..<introPages.count, id: \.self) { index in
                        IntroPageView(page: introPages[index])
                            .tag(index)
                    }
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .always))
                
                HStack {
                    Button(action: {
                        withAnimation {
                            showLogin = true
                        }
                    }) {
                        Text("跳过")
                            .fontWeight(.medium)
                            .padding(.horizontal)
                    }
                    
                    Spacer()
                    
                    Button(action: {
                        withAnimation {
                            if currentPage < introPages.count - 1 {
                                currentPage += 1
                            } else {
                                showLogin = true
                            }
                        }
                    }) {
                        Text(currentPage < introPages.count - 1 ? "下一步" : "开始使用")
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 30)
                            .padding(.vertical, 12)
                            .background(Color.blue)
                            .cornerRadius(25)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 30)
            }
        }
    }
}

struct IntroPage {
    let title: String
    let description: String
    let imageName: String
}

struct IntroPageView: View {
    let page: IntroPage
    
    var body: some View {
        VStack(spacing: 20) {
            Image(page.imageName)
                .resizable()
                .scaledToFit()
                .frame(width: 250, height: 250)
                .padding(.top, 50)
            
            Text(page.title)
                .font(.title)
                .fontWeight(.bold)
                .padding(.top, 30)
            
            Text(page.description)
                .font(.body)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
                .foregroundColor(.secondary)
            
            Spacer()
        }
    }
}

struct LoginView: View {
    @EnvironmentObject private var authManager: AuthManager
    @State private var phone = ""
    @State private var verificationCode = ""
    @State private var loginMode = 0 // 0: Phone, 1: Third Party
    @State private var isLoading = false
    @State private var errorMessage: String? = nil
    @State private var countdown = 0
    @State private var timer: Timer? = nil
    
    var body: some View {
        VStack(spacing: 25) {
            Text("欢迎使用中医奶茶")
                .font(.largeTitle)
                .fontWeight(.bold)
                .padding(.top, 50)
            
            Picker("登录方式", selection: $loginMode) {
                Text("手机号登录").tag(0)
                Text("第三方登录").tag(1)
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding(.horizontal, 30)
            .padding(.top, 20)
            
            if loginMode == 0 {
                // Phone login fields
                VStack(spacing: 15) {
                    TextField("请输入手机号", text: $phone)
                        .keyboardType(.numberPad)
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(8)
                    
                    HStack {
                        TextField("请输入验证码", text: $verificationCode)
                            .keyboardType(.numberPad)
                            .padding()
                            .background(Color.gray.opacity(0.1))
                            .cornerRadius(8)
                        
                        Button(action: {
                            sendVerificationCode()
                        }) {
                            Text(countdown > 0 ? "\(countdown)秒" : "获取验证码")
                                .font(.footnote)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 13)
                                .background(countdown > 0 ? Color.gray : Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                                .disabled(countdown > 0)
                                .frame(width: 100)
                        }
                        .disabled(countdown > 0 || phone.count < 11)
                    }
                    
                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.footnote)
                    }
                }
                .padding(.horizontal, 30)
                
                Button(action: {
                    login()
                }) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("登录")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                }
                .background(Color.blue)
                .cornerRadius(10)
                .padding(.horizontal, 30)
                .disabled(isLoading || phone.isEmpty || verificationCode.isEmpty)
            } else {
                // Third-party login options
                VStack(spacing: 20) {
                    Button(action: {
                        loginWithThirdParty(provider: "wechat")
                    }) {
                        HStack {
                            Image(systemName: "message.fill")
                                .foregroundColor(.white)
                            Text("微信登录")
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .cornerRadius(10)
                    }
                    
                    Button(action: {
                        loginWithThirdParty(provider: "apple")
                    }) {
                        HStack {
                            Image(systemName: "applelogo")
                                .foregroundColor(.white)
                            Text("Apple登录")
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.black)
                        .cornerRadius(10)
                    }
                    
                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.footnote)
                    }
                }
                .padding(.horizontal, 30)
            }
            
            Spacer()
        }
        .onDisappear {
            stopTimer()
        }
    }
    
    private func sendVerificationCode() {
        // In a real app, this would call an API to send a verification code
        // For now, just start the countdown
        countdown = 60
        startTimer()
    }
    
    private func startTimer() {
        stopTimer()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            if countdown > 0 {
                countdown -= 1
            } else {
                stopTimer()
            }
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
    
    private func login() {
        isLoading = true
        errorMessage = nil
        
        authManager.login(phone: phone, verificationCode: verificationCode) { success, error in
            isLoading = false
            
            if !success {
                errorMessage = error ?? "登录失败，请重试"
            }
        }
    }
    
    private func loginWithThirdParty(provider: String) {
        isLoading = true
        errorMessage = nil
        
        authManager.loginWithThirdParty(provider: provider) { success, error in
            isLoading = false
            
            if !success {
                errorMessage = error ?? "第三方登录失败，请重试"
            }
        }
    }
}

struct OnboardingView_Previews: PreviewProvider {
    static var previews: some View {
        OnboardingView()
            .environmentObject(AuthManager())
    }
} 