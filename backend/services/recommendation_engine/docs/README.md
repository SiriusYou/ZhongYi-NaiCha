# Recommendation Engine Service

The Recommendation Engine Service provides personalized content recommendations for users of the 中医奶茶养生 App. The service integrates with other components of the application to deliver a personalized experience based on user behavior, preferences, and health conditions.

## Features

- **Personalized Recommendations**: Content recommendations tailored to each user's interests and behaviors
- **Health-Based Recommendations**: Specialized recommendations based on users' TCM constitutions and health conditions
- **Seasonal Content**: Recommendations aligned with traditional Chinese medicine seasonal principles
- **A/B Testing Framework**: Tools for testing and optimizing different recommendation algorithms
- **User Interest Tracking**: Systems for analyzing and storing user interests based on behavior
- **Content Similarity**: Algorithms for finding content similar to items users have already engaged with

## Architecture

The recommendation engine is implemented as a microservice with the following components:

- **API Layer**: Express.js routes for handling recommendation requests
- **Service Layer**: Core business logic implementing the recommendation algorithms
- **Data Models**: Mongoose models for storing recommendation-related data
- **Utilities**: Reusable functions for algorithm implementations

## API Endpoints

### Recommendations

- `GET /api/recommendations` - Get personalized recommendations for the current user
- `GET /api/recommendations/similar/:contentId` - Get content similar to a specific item
- `GET /api/recommendations/category/:category` - Get recommendations for a specific category
- `GET /api/recommendations/trending` - Get trending content recommendations
- `GET /api/recommendations/health` - Get health-based content recommendations
- `GET /api/recommendations/seasonal` - Get seasonal content recommendations
- `GET /api/recommendations/interests` - Get user interests
- `POST /api/recommendations/track` - Track user behavior with content

### Admin Endpoints

- `POST /api/recommendations/admin/abtests` - Create or update A/B tests
- `GET /api/recommendations/admin/abtests` - List all A/B tests
- `GET /api/recommendations/admin/abtests/:testId/results` - Get A/B test results

### Health Checks

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health check with dependency status
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

## Recommendation Algorithms

The service implements several recommendation algorithms:

1. **Content-Based Filtering**: Recommends items similar to those the user has liked based on content properties
2. **Collaborative Filtering**: Recommends items that similar users have liked
3. **Hybrid Approach**: Combines content-based and collaborative filtering
4. **Seasonal Relevance**: Boosts content relevant to the current season
5. **Health Condition Matching**: Recommends content relevant to user's health profile

## Model Schemas

- **UserBehavior**: Tracks user interactions with content
- **UserInterest**: Stores user's interests derived from behavior
- **UserProfile**: Stores user's health information and preferences
- **Content**: Stores content metadata with TCM properties
- **ABTest**: Stores A/B test configurations
- **RecommendationLog**: Logs recommendation events for analysis

## Configuration

The service can be configured through environment variables, including:

- MongoDB connection settings
- JWT authentication settings
- Algorithm weights for different recommendation types
- User interest calculation parameters
- Rate limiting and caching settings

See `config.js` for a complete list of configuration options.

## Setup and Deployment

### Prerequisites

- Node.js 16+
- MongoDB 4.4+
- Access to content and user services

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Start the service: `npm start`

For development:
```
npm run dev
```

### Docker

A Dockerfile is provided for containerized deployment:

```
docker build -t recommendation-engine .
docker run -p 3003:3003 recommendation-engine
```

## Testing

Run the test suite with:

```
npm test
```

## Performance Considerations

- Recommendations are cached to reduce database load
- Heavy calculations are performed in background jobs
- Results are paginated for large result sets

## Future Enhancements

- Real-time recommendation updates using WebSockets
- Machine learning-based recommendations
- Natural language processing for content analysis
- Integration with external content sources
- Recommendation explanations for users

## Documentation

Additional documentation:

- [API Reference](./API_REFERENCE.md)
- [Algorithm Details](./ALGORITHMS.md)
- [Testing & A/B Testing Framework](./TESTING.md)
- [Data Models](./DATA_MODELS.md) 