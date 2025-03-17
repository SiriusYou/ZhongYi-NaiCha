# API Gateway

The API Gateway serves as the entry point for all client requests to the microservices that make up the backend of the 中医奶茶养生 App (TCM Milk Tea Wellness App). It provides a unified interface for clients, handles cross-cutting concerns, and manages routing to the appropriate backend services.

## Features

- **Unified Entry Point**: Routes client requests to the appropriate microservices
- **Authentication**: Validates JWT tokens for protected endpoints
- **Rate Limiting**: Protects APIs from excessive requests
- **Request Logging**: Logs all API requests for monitoring and debugging
- **Error Handling**: Provides consistent error responses across all services
- **CORS Support**: Configures Cross-Origin Resource Sharing for web clients
- **Service Discovery**: Exposes endpoint to discover available services

## Architecture

The API Gateway sits in front of all microservices and handles:

1. Routing requests to the appropriate microservice
2. Cross-cutting concerns like authentication, rate limiting, and logging
3. Error handling and response formatting

```
Client -> API Gateway -> Microservices (User, Recipe, Community, etc.)
```

## API Routes

The API Gateway routes requests to the following microservices:

- **User Service**: `/api/users/*`, `/api/auth/*`, `/api/profile/*`
- **Recommendation Service**: `/api/recommendations/*`
- **Knowledge Service**: `/api/knowledge/*`, `/api/articles/*`
- **Recipe Service**: `/api/recipes/*`, `/api/categories/*`, `/api/ingredients/*`
- **Order Service**: `/api/orders/*`, `/api/shops/*`, `/api/payments/*`
- **Community Service**: `/api/community/*`, `/api/posts/*`, `/api/comments/*`, `/api/experts/*`, `/api/discussions/*`, `/api/notifications/*`, `/api/likes/*`
- **Data Analysis Service**: `/api/reports/*`, `/api/consumption/*`, `/api/trends/*`, `/api/insights/*`

## Setup and Configuration

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   PORT=3000
   JWT_SECRET=your_jwt_secret_for_api_gateway
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
   NODE_ENV=development
   
   # Service URLs
   USER_SERVICE_URL=http://localhost:5000
   RECOMMENDATION_SERVICE_URL=http://localhost:5001
   RECIPE_SERVICE_URL=http://localhost:5002
   ORDER_SERVICE_URL=http://localhost:5003
   COMMUNITY_SERVICE_URL=http://localhost:5004
   DATA_ANALYSIS_SERVICE_URL=http://localhost:5005
   KNOWLEDGE_SERVICE_URL=http://localhost:5006
   
   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX=100
   AUTH_RATE_LIMIT_MAX=10
   PUBLIC_RATE_LIMIT_MAX=300
   ```

3. Start the service:
   ```
   npm run dev
   ```

## Middleware

The API Gateway uses several middleware components:

- **Authentication**: Validates JWT tokens for protected routes
- **Rate Limiting**: Prevents abuse by limiting the number of requests
- **CORS**: Enables Cross-Origin Resource Sharing
- **Helmet**: Adds security headers
- **Morgan**: Logs HTTP requests

## Error Handling

The API Gateway provides consistent error responses across all services:

```json
{
  "error": "Error Type",
  "message": "Descriptive error message"
}
```

Common error types:
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 429 Too Many Requests
- 500 Internal Server Error
- 503 Service Unavailable

## Health Check and Service Discovery

- **Health Check**: `GET /health` returns the status of the API Gateway
- **Service Discovery**: `GET /services` returns information about all available services

## Deployment

The API Gateway can be deployed as a Docker container:

```
docker build -t api-gateway .
docker run -p 3000:3000 --env-file .env api-gateway
``` 