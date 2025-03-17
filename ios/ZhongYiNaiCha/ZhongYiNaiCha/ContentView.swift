import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var authManager: AuthManager
    @State private var showOnboarding = true
    
    var body: some View {
        Group {
            if authManager.isLoggedIn {
                MainTabView()
            } else {
                OnboardingView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut, value: authManager.isLoggedIn)
        .onAppear {
            authManager.loadAuthState()
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(AuthManager())
            .environmentObject(OfflineCacheManager())
    }
} 