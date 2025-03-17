import Foundation

struct User: Codable, Identifiable {
    let id: String
    let phone: String?
    let name: String
    let email: String?
    var healthProfile: HealthProfile?
}

struct HealthProfile: Codable {
    let age: Int
    let gender: Gender
    let height: Double // cm
    let weight: Double // kg
    let tcmConstitution: TCMConstitution
    let healthGoals: [String]
    let allergies: [String]
    let medicalConditions: [String]
    let bmi: Double
    let updatedAt: Date
}

enum Gender: String, Codable, CaseIterable {
    case male = "male"
    case female = "female"
    case other = "other"
    
    var displayName: String {
        switch self {
        case .male: return "男"
        case .female: return "女"
        case .other: return "其他"
        }
    }
}

enum TCMConstitution: String, Codable, CaseIterable {
    case balanced = "balanced"
    case qiDeficiency = "qi_deficiency"
    case yangDeficiency = "yang_deficiency"
    case yinDeficiency = "yin_deficiency"
    case phlegmDampness = "phlegm_dampness"
    case dampHeat = "damp_heat"
    case bloodStasis = "blood_stasis"
    case qiStagnation = "qi_stagnation"
    case specialConstitution = "special_constitution"
    
    var displayName: String {
        switch self {
        case .balanced: return "平和质"
        case .qiDeficiency: return "气虚质"
        case .yangDeficiency: return "阳虚质"
        case .yinDeficiency: return "阴虚质"
        case .phlegmDampness: return "痰湿质"
        case .dampHeat: return "湿热质"
        case .bloodStasis: return "血瘀质"
        case .qiStagnation: return "气郁质"
        case .specialConstitution: return "特禀质"
        }
    }
    
    func description() -> String {
        switch self {
        case .balanced:
            return "平和质 (Balanced): 体态匀称、面色红润、精力充沛，对外界适应能力强，一般不易生病。"
        case .qiDeficiency:
            return "气虚质 (Qi Deficiency): 常表现为疲乏、气短、声音低弱，容易感冒，适合补气健脾的调养。"
        case .yangDeficiency:
            return "阳虚质 (Yang Deficiency): 怕冷、手脚发凉、面色苍白，适合温阳补虚的调养。"
        case .yinDeficiency:
            return "阴虚质 (Yin Deficiency): 口干、手足心热、容易烦躁，适合滋阴养血的调养。"
        case .phlegmDampness:
            return "痰湿质 (Phlegm Dampness): 体态肥胖、多汗、容易疲劳，适合化痰祛湿的调养。"
        case .dampHeat:
            return "湿热质 (Damp Heat): 面垢油光、易生痘痘、口苦，适合清热祛湿的调养。"
        case .bloodStasis:
            return "血瘀质 (Blood Stasis): 肤色晦黯、嘴唇暗紫、舌有瘀点，适合活血化瘀的调养。"
        case .qiStagnation:
            return "气郁质 (Qi Stagnation): 情绪波动大、容易忧郁、胸闷，适合疏肝解郁的调养。"
        case .specialConstitution:
            return "特禀质 (Special Constitution): 对某些物质过敏、易患过敏性疾病，需根据个人情况特别调养。"
        }
    }
} 