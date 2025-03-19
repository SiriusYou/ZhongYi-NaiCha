# AI Consultation Service Tests

This directory contains tests for the AI Consultation Service, organized in a structured manner to ensure comprehensive test coverage.

## Test Structure

The tests are organized into the following directories:

- `mocks/`: Contains mock implementations of dependencies for testing
- `unit/`: Unit tests for individual components
  - `serverless/`: Tests for the serverless functions
    - `preprocessing/`: Tests for the preprocessing components
    - `inference/`: Tests for the inference handler
    - `postprocessing/`: Tests for the postprocessing components
- `integration/`: Tests that verify the interaction between components in the service
- `service/`: Tests for the API endpoints and service-level functionality

## Running Tests

You can run the tests using the following commands:

```bash
# Run all tests
npm run test

# Run only serverless function tests
npm run test:serverless

# Run only integration tests
npm run test:integration

# Run only service-level tests
npm run test:service
```

## Test Coverage

The test suite covers the following aspects of the AI Consultation Service:

### Unit Tests

- **Security Scanner**: Tests for harmful content detection, emergency situation identification, and input validation
- **Context Builder**: Tests for building contextual information, including user profile retrieval and consultation history
- **Prompt Constructor**: Tests for generating effective prompts based on user input and context
- **Inference Handler**: Tests for model selection, provider fallback mechanisms, and API interactions
- **Postprocessing Handler**: Tests for output validation, safety filtering, and content formatting

### Integration Tests

- **Complete Workflow**: Tests the entire consultation pipeline from security scanning to postprocessing
- **Error Handling**: Tests error conditions and fallback mechanisms across the pipeline
- **Safety Filters**: Tests that safety filters are properly applied at different stages

### Service-Level Tests

- **API Endpoints**: Tests the RESTful API endpoints for the consultation service
- **Authentication**: Tests that authentication and authorization are properly applied
- **Error Handling**: Tests that API errors are handled gracefully with appropriate status codes

## Test Data

Test fixtures are provided in the `fixtures/` directory, including sample user profiles, consultation histories, and expected outputs.

## Mocks

The following dependencies are mocked for testing:

- **Logger**: A mock logger implementation that avoids actual logging during tests
- **Database**: Mock implementations of database interactions
- **External APIs**: Mock implementations of external API calls (OpenAI, Anthropic)

## Extending Tests

When adding new functionality to the service, please follow these guidelines:

1. Add unit tests for any new components
2. Update integration tests if the new functionality affects the overall workflow
3. Update service-level tests if the new functionality exposes new API endpoints

## Continuous Integration

These tests are run automatically on pull requests and merges to the main branch using our CI pipeline. 