# 中医奶茶养生 App (TCM Milk Tea Wellness App)

This application merges Traditional Chinese Medicine principles with modern beverage culture, providing personalized tea recipe recommendations based on users' body constitution, seasonal changes, and specific health needs.

## Project Overview

The 中医奶茶养生 App aims to help users enjoy delicious milk tea beverages while benefiting from traditional Chinese medicine principles. It offers:

- Personalized tea recipe recommendations
- TCM knowledge center
- DIY guidance for making healthy tea beverages
- Community interaction with fellow users and TCM experts
- Optional ordering system integration with local tea shops

## Project Structure

The project follows a microservices architecture with separate native mobile applications:

- `/ios` - iOS native application
- `/android` - Android native application
- `/backend` - Backend microservices
  - `/user` - User authentication and profiles
  - `/recommendation` - Tea recipe recommendation engine
  - `/knowledge` - TCM knowledge content
  - `/recipe` - Recipe and DIY guidance
  - `/order` - Order processing system
  - `/community` - User community and expert Q&A
  - `/data` - Data analysis and health insights
  - `/api-gateway` - API Gateway for routing requests
  - `/config` - Configuration files

## Setup Instructions

### Prerequisites

- For iOS development: Xcode, Swift
- For Android development: Android Studio, Kotlin
- For backend development: Node.js, Docker

### Installation

1. Clone the repository
2. Set up the backend services
   ```
   cd backend
   npm install
   ```
3. Set up the iOS application
   ```
   cd ios
   pod install
   ```
4. Set up the Android application
   ```
   cd android
   ./gradlew build
   ```

## Implementation Plan

The project implementation follows a phased approach:

1. Environment Setup
2. Frontend Development
3. Backend Development
4. Integration
5. Deployment

For detailed implementation steps, refer to the documentation folder.

## Technology Stack

- **Frontend**: iOS Native (Swift), Android Native (Kotlin)
- **Backend**: Microservices architecture
- **Databases**: Relational database for user data, NoSQL for content, Object Storage for media
- **Security**: TLS 1.3 encryption, end-to-end encryption for sensitive data
- **Integrations**: External payment gateways, AI-assisted content moderation 