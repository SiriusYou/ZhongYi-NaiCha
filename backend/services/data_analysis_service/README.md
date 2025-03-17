# Data Analysis Service

This service provides in-depth analysis of user consumption patterns and health data to generate personalized health insights, trends, and reports for the 中医奶茶养生 App.

## Features

- **Health Data Analysis**: Analyze user health profiles and consumption patterns to generate personalized health insights
- **Consumption Pattern Analysis**: Track and analyze user consumption habits, preferred recipes, and TCM properties
- **Trend Analysis**: Identify consumption trends over time and correlate with health outcomes
- **Report Generation**: Create detailed PDF reports with charts and visualizations
- **Seasonal Recommendations**: Provide TCM recommendations based on the current season

## Technical Stack

- **Framework**: Express.js
- **Database**: MongoDB
- **Chart Generation**: Chart.js
- **PDF Generation**: PDFKit
- **API Handling**: Axios for microservice communication

## API Endpoints

### Reports

- `GET /api/reports` - Get all reports for the authenticated user
- `GET /api/reports/:id` - Get a specific report by ID
- `POST /api/reports/health` - Generate a health analysis report
- `POST /api/reports/consumption` - Generate a consumption analysis report
- `DELETE /api/reports/:id` - Delete a report

### Consumption Statistics

- `GET /api/consumption/stats` - Get consumption statistics for a user
- `GET /api/consumption/totals` - Get total consumption statistics
- `GET /api/consumption/favorite-recipes` - Get user's favorite recipes
- `GET /api/consumption/tcm-properties` - Get consumption by TCM properties
- `POST /api/consumption/generate-stats` - Generate/update consumption statistics

### Trends

- `GET /api/trends/consumption` - Get consumption trends data
- `GET /api/trends/orders` - Get order trends data
- `GET /api/trends/recipes` - Get recipe consumption trends
- `POST /api/trends/report` - Generate a trends analysis report

### Insights

- `GET /api/insights/health` - Get health insights based on consumption patterns
- `GET /api/insights/consumption` - Get consumption pattern insights
- `GET /api/insights/seasonal` - Get seasonal consumption recommendations

## Service Dependencies

This service depends on the following microservices:

- **User Service**: For retrieving user profile and health data
- **Order Service**: For retrieving order history and consumption data
- **Recipe Service**: For retrieving recipe details and recommendations

## Setup and Configuration

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   NODE_ENV=development
   PORT=5005
   MONGO_URI=mongodb://localhost:27017/zhongyi-naicha-data-analysis
   JWT_SECRET=your_jwt_secret_for_data_analysis
   PDF_STORAGE_PATH=./storage/pdfs
   CHART_STORAGE_PATH=./storage/charts
   USER_SERVICE_URL=http://localhost:5000
   ORDER_SERVICE_URL=http://localhost:5003
   RECIPE_SERVICE_URL=http://localhost:5002
   ```

3. Start the service:
   ```
   npm run dev
   ```

## Development

### Project Structure

- `server.js` - Main entry point for the service
- `middleware/` - Custom middleware functions (authentication, error handling)
- `models/` - MongoDB data models
- `routes/` - API route handlers
- `utils/` - Utility functions (chart generation, PDF generation, service requests)
- `storage/` - Storage for generated PDFs and charts

### Adding New Features

1. Define new data models in the `models/` directory
2. Create route handlers in the `routes/` directory
3. Implement business logic in the appropriate utility files
4. Update `server.js` to wire up new routes

## Deployment

The service is packaged as a Docker container for deployment:

```
docker build -t data-analysis-service .
docker run -p 5005:5005 data-analysis-service 