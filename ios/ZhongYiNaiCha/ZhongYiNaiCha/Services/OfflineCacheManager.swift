import Foundation
import Combine

class OfflineCacheManager: ObservableObject {
    @Published var isSyncing: Bool = false
    @Published var lastSyncDate: Date?
    
    private var cancellables = Set<AnyCancellable>()
    private let cacheDirectory: URL
    
    init() {
        // Setup cache directory in documents folder
        let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        self.cacheDirectory = documentsDirectory.appendingPathComponent("offline_cache")
        
        // Create directory if it doesn't exist
        if !FileManager.default.fileExists(atPath: cacheDirectory.path) {
            try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        }
    }
    
    // MARK: - Public Methods
    
    func syncEssentialContent(completion: @escaping (Bool) -> Void) {
        guard !isSyncing else {
            completion(false)
            return
        }
        
        isSyncing = true
        
        // Combine both recipe and knowledge content sync operations
        Publishers.Zip(syncEssentialRecipes(), syncEssentialKnowledgeContent())
            .sink(receiveCompletion: { [weak self] result in
                DispatchQueue.main.async {
                    self?.isSyncing = false
                    
                    switch result {
                    case .finished:
                        self?.lastSyncDate = Date()
                        completion(true)
                    case .failure(_):
                        completion(false)
                    }
                }
            }, receiveValue: { _, _ in })
            .store(in: &cancellables)
    }
    
    func getCachedRecipes() -> [Recipe] {
        return (try? loadFromCache(forKey: "essential_recipes")) ?? []
    }
    
    func getCachedKnowledgeContent() -> [KnowledgeContent] {
        return (try? loadFromCache(forKey: "essential_knowledge")) ?? []
    }
    
    func saveToCache<T: Encodable>(_ data: T, forKey key: String) throws {
        let encoder = JSONEncoder()
        let data = try encoder.encode(data)
        let fileURL = cacheDirectory.appendingPathComponent("\(key).json")
        try data.write(to: fileURL)
    }
    
    func loadFromCache<T: Decodable>(forKey key: String) throws -> T {
        let fileURL = cacheDirectory.appendingPathComponent("\(key).json")
        let data = try Data(contentsOf: fileURL)
        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: data)
    }
    
    func clearCache() {
        try? FileManager.default.removeItem(at: cacheDirectory)
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
    }
    
    // MARK: - Private Methods
    
    private func syncEssentialRecipes() -> AnyPublisher<[Recipe], Error> {
        // In a real app, this would fetch from the API
        // For now, creating mock data
        return Future<[Recipe], Error> { promise in
            // Simulate network delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                // Create mock recipes data
                let recipes: [Recipe] = [
                    Recipe(
                        id: "1",
                        name: "养生红枣枸杞奶茶",
                        description: "滋补养生的红枣枸杞奶茶，适合气血双虚体质人群。",
                        type: "warming",
                        difficulty: "easy",
                        prepTime: 5,
                        totalTime: 10,
                        servings: 1,
                        calories: 150,
                        imageUrl: "recipe_hongzao",
                        ingredients: [
                            Ingredient(name: "红枣", amount: "5颗", unit: ""),
                            Ingredient(name: "枸杞", amount: "1", unit: "茶匙"),
                            Ingredient(name: "茶叶", amount: "1", unit: "茶匙"),
                            Ingredient(name: "牛奶", amount: "200", unit: "ml")
                        ],
                        steps: [
                            Step(number: 1, description: "将红枣洗净去核，枸杞洗净", imageUrl: "step1"),
                            Step(number: 2, description: "煮沸水，加入茶叶冲泡3分钟后过滤", imageUrl: "step2"),
                            Step(number: 3, description: "加入红枣、枸杞和牛奶小火煮沸", imageUrl: "step3")
                        ],
                        suitableForTcmTypes: ["气虚质", "血虚质"],
                        bestSeason: "秋冬"
                    ),
                    Recipe(
                        id: "2",
                        name: "清凉薄荷绿茶",
                        description: "清热解暑的薄荷绿茶，适合夏季饮用。",
                        type: "cooling",
                        difficulty: "easy",
                        prepTime: 3,
                        totalTime: 8,
                        servings: 1,
                        calories: 80,
                        imageUrl: "recipe_bohe",
                        ingredients: [
                            Ingredient(name: "绿茶", amount: "1", unit: "茶匙"),
                            Ingredient(name: "薄荷叶", amount: "5", unit: "片"),
                            Ingredient(name: "蜂蜜", amount: "1", unit: "茶匙")
                        ],
                        steps: [
                            Step(number: 1, description: "烧水至80度，加入绿茶冲泡", imageUrl: "step1"),
                            Step(number: 2, description: "加入薄荷叶，继续冲泡2分钟", imageUrl: "step2"),
                            Step(number: 3, description: "加入蜂蜜调味", imageUrl: "step3")
                        ],
                        suitableForTcmTypes: ["湿热质", "阴虚质"],
                        bestSeason: "夏季"
                    )
                ]
                
                // Save to cache
                do {
                    try self.saveToCache(recipes, forKey: "essential_recipes")
                    promise(.success(recipes))
                } catch {
                    promise(.failure(error))
                }
            }
        }.eraseToAnyPublisher()
    }
    
    private func syncEssentialKnowledgeContent() -> AnyPublisher<[KnowledgeContent], Error> {
        // In a real app, this would fetch from the API
        return Future<[KnowledgeContent], Error> { promise in
            // Simulate network delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                // Create mock knowledge content
                let knowledge: [KnowledgeContent] = [
                    KnowledgeContent(
                        id: "1",
                        title: "中医体质分类基础知识",
                        content: "中医将人的体质分为九种...",
                        category: "基础知识",
                        tags: ["体质", "中医理论"],
                        imageUrl: "tcm_constitution"
                    ),
                    KnowledgeContent(
                        id: "2",
                        title: "四季养生茶饮指南",
                        content: "不同季节应当饮用不同属性的茶饮...",
                        category: "养生指南",
                        tags: ["四季", "养生"],
                        imageUrl: "seasonal_tea"
                    )
                ]
                
                // Save to cache
                do {
                    try self.saveToCache(knowledge, forKey: "essential_knowledge")
                    promise(.success(knowledge))
                } catch {
                    promise(.failure(error))
                }
            }
        }.eraseToAnyPublisher()
    }
}

// MARK: - Data Models

struct Recipe: Codable, Identifiable {
    let id: String
    let name: String
    let description: String
    let type: String // warming, cooling, neutral
    let difficulty: String
    let prepTime: Int // in minutes
    let totalTime: Int // in minutes
    let servings: Int
    let calories: Int
    let imageUrl: String
    let ingredients: [Ingredient]
    let steps: [Step]
    let suitableForTcmTypes: [String]
    let bestSeason: String
}

struct Ingredient: Codable {
    let name: String
    let amount: String
    let unit: String
}

struct Step: Codable {
    let number: Int
    let description: String
    let imageUrl: String?
}

struct KnowledgeContent: Codable, Identifiable {
    let id: String
    let title: String
    let content: String
    let category: String
    let tags: [String]
    let imageUrl: String?
} 