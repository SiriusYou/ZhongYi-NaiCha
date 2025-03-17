import SwiftUI
import Combine

struct HealthProfileView: View {
    @EnvironmentObject private var authManager: AuthManager
    @State private var isEditing = false
    @State private var showingSuccessAlert = false
    @State private var errorMessage: String? = nil
    
    // Editable health profile properties
    @State private var age: String = ""
    @State private var gender: Gender = .other
    @State private var height: String = ""
    @State private var weight: String = ""
    @State private var constitution: TCMConstitution = .balanced
    @State private var healthGoals: Set<String> = []
    @State private var allergies: String = ""
    @State private var medicalConditions: String = ""
    
    // Available health goals
    let availableHealthGoals = [
        "增强免疫力", "改善睡眠", "减轻疲劳", "提高精力",
        "减重", "调理肠胃", "改善皮肤", "缓解压力"
    ]
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                headerView
                
                if let profile = authManager.currentUser?.healthProfile {
                    if isEditing {
                        editForm
                    } else {
                        profileDetailsView(profile: profile)
                    }
                } else {
                    createProfileSection
                }
            }
            .padding()
        }
        .navigationTitle("健康档案")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let _ = authManager.currentUser?.healthProfile {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(isEditing ? "保存" : "编辑") {
                        if isEditing {
                            saveProfile()
                        } else {
                            startEditing()
                        }
                    }
                }
            }
        }
        .alert("保存成功", isPresented: $showingSuccessAlert) {
            Button("确定", role: .cancel) { }
        }
        .alert(errorMessage ?? "发生错误", isPresented: .constant(errorMessage != nil)) {
            Button("确定", role: .cancel) { 
                errorMessage = nil
            }
        }
    }
    
    private var headerView: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("健康档案")
                .font(.largeTitle)
                .fontWeight(.bold)
            
            Text("完善您的健康信息，获取更个性化的茶饮推荐")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding(.bottom, 10)
            
            Divider()
        }
    }
    
    private func profileDetailsView(profile: HealthProfile) -> some View {
        VStack(alignment: .leading, spacing: 20) {
            InfoRow(title: "TCM体质", value: profile.tcmConstitution.displayName)
            InfoRow(title: "性别", value: profile.gender.displayName)
            InfoRow(title: "年龄", value: "\(profile.age)岁")
            InfoRow(title: "身高", value: "\(String(format: "%.1f", profile.height))厘米")
            InfoRow(title: "体重", value: "\(String(format: "%.1f", profile.weight))公斤")
            InfoRow(title: "BMI", value: "\(String(format: "%.1f", profile.bmi))")
            
            VStack(alignment: .leading, spacing: 8) {
                Text("健康目标")
                    .font(.headline)
                
                ForEach(profile.healthGoals, id: \.self) { goal in
                    Label(goal, systemImage: "checkmark.circle.fill")
                        .foregroundColor(.primary)
                        .padding(.vertical, 4)
                }
            }
            .padding(.vertical, 8)
            
            if !profile.allergies.isEmpty {
                InfoRow(title: "过敏原", value: profile.allergies.joined(separator: "、"))
            }
            
            if !profile.medicalConditions.isEmpty {
                InfoRow(title: "健康状况", value: profile.medicalConditions.joined(separator: "、"))
            }
            
            VStack(alignment: .leading, spacing: 10) {
                Text("体质说明")
                    .font(.headline)
                
                Text(profile.tcmConstitution.description())
                    .font(.body)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.vertical, 8)
        }
    }
    
    private var createProfileSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("您还没有创建健康档案")
                .font(.headline)
                .padding(.top, 8)
            
            Text("创建健康档案可以帮助我们提供更符合您体质的茶饮推荐。所有信息仅用于个性化推荐，不会用于其他用途。")
                .font(.body)
                .foregroundColor(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            
            Button(action: {
                isEditing = true
            }) {
                Text("创建健康档案")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(10)
            }
            .padding(.top, 8)
            
            editForm
                .opacity(isEditing ? 1 : 0)
                .frame(height: isEditing ? nil : 0)
        }
    }
    
    private var editForm: some View {
        VStack(alignment: .leading, spacing: 20) {
            Group {
                VStack(alignment: .leading) {
                    Text("基本信息")
                        .font(.headline)
                        .padding(.bottom, 8)
                    
                    TextField("年龄", text: $age)
                        .keyboardType(.numberPad)
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(8)
                    
                    Picker("性别", selection: $gender) {
                        ForEach(Gender.allCases, id: \.self) { gender in
                            Text(gender.displayName).tag(gender)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                    .padding(.vertical, 8)
                    
                    TextField("身高 (厘米)", text: $height)
                        .keyboardType(.decimalPad)
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(8)
                    
                    TextField("体重 (公斤)", text: $weight)
                        .keyboardType(.decimalPad)
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(8)
                }
                
                VStack(alignment: .leading, spacing: 10) {
                    Text("体质类型")
                        .font(.headline)
                        .padding(.bottom, 8)
                    
                    Picker("体质类型", selection: $constitution) {
                        ForEach(TCMConstitution.allCases, id: \.self) { constitution in
                            Text(constitution.displayName).tag(constitution)
                        }
                    }
                    .pickerStyle(WheelPickerStyle())
                    .frame(height: 100)
                    
                    Text(constitution.description())
                        .font(.footnote)
                        .foregroundColor(.secondary)
                        .padding(.top, 8)
                        .fixedSize(horizontal: false, vertical: true)
                }
                
                VStack(alignment: .leading, spacing: 10) {
                    Text("健康目标 (可多选)")
                        .font(.headline)
                        .padding(.bottom, 8)
                    
                    ForEach(availableHealthGoals, id: \.self) { goal in
                        Button(action: {
                            if healthGoals.contains(goal) {
                                healthGoals.remove(goal)
                            } else {
                                healthGoals.insert(goal)
                            }
                        }) {
                            HStack {
                                Image(systemName: healthGoals.contains(goal) ? "checkmark.square.fill" : "square")
                                    .foregroundColor(healthGoals.contains(goal) ? .blue : .gray)
                                
                                Text(goal)
                                    .foregroundColor(.primary)
                                
                                Spacer()
                            }
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(PlainButtonStyle())
                        .padding(.vertical, 4)
                    }
                }
                
                VStack(alignment: .leading, spacing: 10) {
                    Text("过敏原 (多个请用逗号分隔)")
                        .font(.headline)
                        .padding(.bottom, 8)
                    
                    TextField("例如：花粉,牛奶,坚果", text: $allergies)
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(8)
                }
                
                VStack(alignment: .leading, spacing: 10) {
                    Text("健康状况 (多个请用逗号分隔)")
                        .font(.headline)
                        .padding(.bottom, 8)
                    
                    TextField("例如：高血压,糖尿病", text: $medicalConditions)
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(8)
                }
            }
            
            Button(action: {
                saveProfile()
            }) {
                Text(authManager.currentUser?.healthProfile == nil ? "创建档案" : "保存修改")
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .cornerRadius(10)
            }
            .padding(.top, 16)
            
            if authManager.currentUser?.healthProfile != nil {
                Button(action: {
                    isEditing = false
                }) {
                    Text("取消")
                        .fontWeight(.semibold)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(10)
                }
            }
        }
    }
    
    private func startEditing() {
        if let profile = authManager.currentUser?.healthProfile {
            age = "\(profile.age)"
            gender = profile.gender
            height = String(format: "%.1f", profile.height)
            weight = String(format: "%.1f", profile.weight)
            constitution = profile.tcmConstitution
            healthGoals = Set(profile.healthGoals)
            allergies = profile.allergies.joined(separator: ", ")
            medicalConditions = profile.medicalConditions.joined(separator: ", ")
        }
        
        isEditing = true
    }
    
    private func saveProfile() {
        guard let ageValue = Int(age), ageValue > 0 else {
            errorMessage = "请输入有效的年龄"
            return
        }
        
        guard let heightValue = Double(height), heightValue > 0 else {
            errorMessage = "请输入有效的身高"
            return
        }
        
        guard let weightValue = Double(weight), weightValue > 0 else {
            errorMessage = "请输入有效的体重"
            return
        }
        
        // Calculate BMI
        let heightInMeters = heightValue / 100
        let bmiValue = weightValue / (heightInMeters * heightInMeters)
        
        // Parse allergies and medical conditions
        let allergiesList = allergies.split(separator: ",").map { String($0.trimmingCharacters(in: .whitespaces)) }
        let medicalConditionsList = medicalConditions.split(separator: ",").map { String($0.trimmingCharacters(in: .whitespaces)) }
        
        // Create health profile
        let healthProfile = HealthProfile(
            age: ageValue,
            gender: gender,
            height: heightValue,
            weight: weightValue,
            tcmConstitution: constitution,
            healthGoals: Array(healthGoals),
            allergies: allergiesList,
            medicalConditions: medicalConditionsList,
            bmi: bmiValue,
            updatedAt: Date()
        )
        
        // In a real app, this would call the API service
        // For now, just update the local user object
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            if var user = authManager.currentUser {
                user.healthProfile = healthProfile
                authManager.currentUser = user
                isEditing = false
                showingSuccessAlert = true
            }
        }
    }
}

struct InfoRow: View {
    let title: String
    let value: String
    
    var body: some View {
        HStack(alignment: .top) {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .frame(width: 80, alignment: .leading)
            
            Text(value)
                .font(.subheadline)
            
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

struct HealthProfileView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationView {
            HealthProfileView()
                .environmentObject(AuthManager())
        }
    }
} 