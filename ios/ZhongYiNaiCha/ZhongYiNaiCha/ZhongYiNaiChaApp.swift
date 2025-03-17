import SwiftUI

@main
struct ZhongYiNaiChaApp: App {
    @StateObject private var authManager = AuthManager()
    @StateObject private var offlineCacheManager = OfflineCacheManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(offlineCacheManager)
                .onAppear {
                    // Trigger initial offline content sync when app launches
                    offlineCacheManager.syncEssentialContent { success in
                        print("Initial sync completed: \(success)")
                    }
                }
        }
    }
} 