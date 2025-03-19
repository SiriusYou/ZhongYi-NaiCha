# Project Progress

This document tracks the development progress of ZhongYi-NaiCha.

## Core Features

1. ✅ Set up project structure and development environment
2. ✅ Design and implement database schemas
3. ✅ Implement user authentication and authorization
4. ✅ Create RESTful API endpoints for TCM resources
5. ✅ Develop mobile UI components for TCM consultations
6. ⏳ Implement personalized health recommendations
7. ⏳ Create herbalist marketplace with verified practitioners
8. ⏳ Build herbal product inventory and e-commerce functionality
9. ⏳ Develop community features (forums, sharing, etc.)

## AI Health Consultation Service

10. ✅ Implement AI Health Consultation with Fine-tuned LLMs
    - ✅ Define multi-tier architecture for the consultation service
    - ✅ Set up microservice infrastructure
    - ✅ Create serverless inference endpoints for:
      - ✅ Symptom assessment
      - ✅ Constitution analysis
      - ✅ Herbal recommendations
    - ✅ Develop preprocessing layer:
      - ✅ Security scanning
      - ✅ Context building
      - ✅ Prompt construction
    - ✅ Implement inference layer:
      - ✅ Multi-provider support (OpenAI, Anthropic)
      - ✅ Fallback mechanisms
      - ✅ Performance monitoring
    - ✅ Build postprocessing layer:
      - ✅ Output validation
      - ✅ Safety filtering
      - ✅ Expert review detection
    - ✅ Develop comprehensive test framework:
      - ✅ Unit tests for security scanner
      - ✅ Unit tests for context builder
      - ✅ Unit tests for prompt constructor 
      - ✅ Unit tests for inference handler
      - ✅ Unit tests for postprocessing handler
      - ✅ Integration tests for complete workflow
      - ✅ Service-level tests for API endpoints
    - ✅ Implement structured dialogue management for guided health assessment journeys
    - ✅ Establish emergency detection protocols with appropriate redirection
    - ✅ Deploy specialized inference instances for each consultation type
    - ✅ Select and incorporate pre-trained medical model (MedExpert) with TCM-specific prompting instead of custom fine-tuning
      - ✅ Implement Ollama provider for local model hosting
      - ✅ Configure MedExpert model for TCM consultation types
      - ✅ Add specialized TCM system prompts for different consultation scenarios
    - ⏳ Implement LoRA fine-tuning approach for specialized models
    - ⏳ Integrate with existing health data systems
    - ⏳ Set up monitoring and analytics for model performance

## Mobile Application

11. ⏳ Create cross-platform mobile UI
12. ⏳ Implement offline functionality
13. ⏳ Add notifications for health reminders
14. ⏳ Build health tracking features
15. ⏳ Create personalized daily regimen recommendations

## Data and Research

16. ⏳ Build comprehensive TCM knowledge base
17. ⏳ Collect and analyze user health data (with consent)
18. ⏳ Implement data pipeline for continuous model improvement
19. ⏳ Develop research partnerships with TCM institutions

## Deployment and DevOps

20. ⏳ Set up continuous integration and deployment
21. ⏳ Implement monitoring and logging
22. ⏳ Conduct security audits and penetration testing
23. ⏳ Optimize for performance and scalability
24. ⏳ Prepare for global deployment across multiple regions

# In serverless.yml
environment:
  # Existing vars...
  OLLAMA_API_URL: ${ssm:/zhongyi-naicha/${opt:stage, 'dev'}/ollama-api-url, 'http://localhost:11434/api/generate'}
  OLLAMA_MODEL: 'OussamaELALLAM/MedExpert'