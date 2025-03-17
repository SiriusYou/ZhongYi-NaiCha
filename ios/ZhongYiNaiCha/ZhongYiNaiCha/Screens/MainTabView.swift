import SwiftUI

struct MainTabView: View {
    @State private var selectedTab = 0
    @EnvironmentObject private var authManager: AuthManager
    @EnvironmentObject private var offlineCacheManager: OfflineCacheManager
    
    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationView {
                HomeView()
                    .navigationTitle("中医奶茶")
            }
            .tabItem {
                Label("首页", systemImage: "house")
            }
            .tag(0)
            
            NavigationView {
                KnowledgeCenterView()
                    .navigationTitle("知识库")
            }
            .tabItem {
                Label("知识", systemImage: "book")
            }
            .tag(1)
            
            NavigationView {
                RecipesView()
                    .navigationTitle("茶饮方")
            }
            .tabItem {
                Label("茶饮", systemImage: "cup.and.saucer")
            }
            .tag(2)
            
            NavigationView {
                CommunityView()
                    .navigationTitle("社区")
            }
            .tabItem {
                Label("社区", systemImage: "person.3")
            }
            .tag(3)
            
            NavigationView {
                ProfileView()
                    .navigationTitle("我的")
            }
            .tabItem {
                Label("我的", systemImage: "person.circle")
            }
            .tag(4)
        }
    }
}

// MARK: - Tab Views

struct ProfileView: View {
    @EnvironmentObject private var authManager: AuthManager
    @State private var showHealthProfile = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if let user = authManager.currentUser {
                    Group {
                        Text("欢迎，\(user.name)！")
                            .font(.title)
                            .padding(.bottom, 5)
                        
                        if let healthProfile = user.healthProfile {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("健康档案")
                                    .font(.headline)
                                
                                Text("体质：\(healthProfile.tcmConstitution.displayName)")
                                Text("年龄：\(healthProfile.age)岁")
                                Text("体重：\(String(format: "%.1f", healthProfile.weight))kg")
                                Text("身高：\(String(format: "%.1f", healthProfile.height))cm")
                                Text("BMI：\(String(format: "%.1f", healthProfile.bmi))")
                                
                                if !healthProfile.healthGoals.isEmpty {
                                    Text("健康目标：\(healthProfile.healthGoals.joined(separator: "、"))")
                                }
                                
                                if !healthProfile.allergies.isEmpty {
                                    Text("过敏源：\(healthProfile.allergies.joined(separator: "、"))")
                                }
                                
                                NavigationLink(destination: HealthProfileView()) {
                                    Text("查看完整档案")
                                        .font(.subheadline)
                                        .foregroundColor(.blue)
                                        .padding(.top, 8)
                                }
                            }
                        } else {
                            NavigationLink(destination: HealthProfileView()) {
                                Text("创建健康档案")
                                    .font(.headline)
                                    .frame(maxWidth: .infinity)
                                    .padding()
                                    .background(Color.blue)
                                    .foregroundColor(.white)
                                    .cornerRadius(10)
                            }
                            .padding(.top)
                        }
                    }
                    .padding()
                } else {
                    Text("用户信息不可用")
                        .font(.title)
                        .padding()
                }
                
                Button(action: {
                    authManager.logout()
                }) {
                    Text("退出登录")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.red)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                }
                .padding()
            }
        }
    }
}

struct MainTabView_Previews: PreviewProvider {
    static var previews: some View {
        MainTabView()
            .environmentObject(AuthManager())
            .environmentObject(OfflineCacheManager())
    }
} 