import Foundation
import Combine

enum APIError: Error, LocalizedError {
    case invalidURL
    case requestFailed(Error)
    case invalidResponse
    case decodingFailed(Error)
    case serverError(Int, String)
    case networkError(Error)
    case unknown
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "无效的URL地址"
        case .requestFailed(let error):
            return "请求失败: \(error.localizedDescription)"
        case .invalidResponse:
            return "服务器返回了无效的响应"
        case .decodingFailed(let error):
            return "数据解析失败: \(error.localizedDescription)"
        case .serverError(let status, let message):
            return "服务器错误 (\(status)): \(message)"
        case .networkError(let error):
            return "网络错误: \(error.localizedDescription)"
        case .unknown:
            return "发生未知错误"
        }
    }
}

class APIService {
    static let shared = APIService()
    
    private let baseURL = "https://api.zhongyi-naicha.com/api/v1"
    private let jsonDecoder: JSONDecoder
    
    private init() {
        jsonDecoder = JSONDecoder()
        jsonDecoder.keyDecodingStrategy = .convertFromSnakeCase
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        jsonDecoder.dateDecodingStrategy = .formatted(dateFormatter)
    }
    
    func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        body: Data? = nil,
        headers: [String: String] = [:]
    ) -> AnyPublisher<T, APIError> {
        guard let url = URL(string: "\(baseURL)/\(endpoint)") else {
            return Fail(error: APIError.invalidURL).eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        
        // Set default headers
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add auth token if available
        if let token = UserDefaults.standard.string(forKey: "auth_token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // Add custom headers
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        return URLSession.shared.dataTaskPublisher(for: request)
            .mapError { error -> APIError in
                return APIError.networkError(error)
            }
            .tryMap { data, response -> Data in
                guard let httpResponse = response as? HTTPURLResponse else {
                    throw APIError.invalidResponse
                }
                
                if 200..<300 ~= httpResponse.statusCode {
                    return data
                } else {
                    let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
                    throw APIError.serverError(httpResponse.statusCode, errorMessage)
                }
            }
            .decode(type: T.self, decoder: jsonDecoder)
            .mapError { error -> APIError in
                if let apiError = error as? APIError {
                    return apiError
                } else {
                    return APIError.decodingFailed(error)
                }
            }
            .eraseToAnyPublisher()
    }
    
    // MARK: - Auth Methods
    
    func login(phone: String, code: String) -> AnyPublisher<LoginResponse, APIError> {
        let loginData: [String: String] = [
            "phone": phone,
            "code": code
        ]
        
        guard let body = try? JSONSerialization.data(withJSONObject: loginData) else {
            return Fail(error: APIError.unknown).eraseToAnyPublisher()
        }
        
        return request(
            endpoint: "auth/login",
            method: "POST",
            body: body
        )
    }
    
    func getProfile() -> AnyPublisher<User, APIError> {
        return request(endpoint: "users/profile")
    }
    
    func updateHealthProfile(profile: HealthProfile) -> AnyPublisher<User, APIError> {
        guard let body = try? JSONEncoder().encode(profile) else {
            return Fail(error: APIError.unknown).eraseToAnyPublisher()
        }
        
        return request(
            endpoint: "users/profile/health",
            method: "PUT",
            body: body
        )
    }
}

// MARK: - Response Models

struct LoginResponse: Decodable {
    let token: String
    let user: User
}

struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T
    let message: String?
} 