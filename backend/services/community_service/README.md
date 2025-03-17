# Community Interaction Service

The Community Interaction Service provides APIs for managing user-generated content, social interactions, and expert engagement within the 中医奶茶养生 App ecosystem.

## Features

- **Post Management**: Create, read, update, and delete posts with rich content
- **Comment System**: Hierarchical comment system with threaded replies
- **Like & Favorite**: Like and favorite posts and comments
- **Expert Verification**: Expert certification and content verification
- **Discussions**: Group discussions and Q&A functionality
- **Notifications**: Real-time notifications for user interactions
- **Content Moderation**: Automated and manual content review system

## Technical Stack

- **Framework**: Express.js
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Authentication**: JWT-based authentication
- **Validation**: express-validator
- **Content Moderation**: Custom moderation system with AI capabilities

## API Endpoints

### Posts

- `GET /api/posts` - Get all posts with pagination and filtering
- `GET /api/posts/:id` - Get post by ID
- `POST /api/posts` - Create a post
- `PUT /api/posts/:id` - Update a post
- `DELETE /api/posts/:id` - Delete a post
- `PUT /api/posts/:id/like` - Like a post
- `PUT /api/posts/:id/unlike` - Unlike a post
- `PUT /api/posts/:id/verify` - Verify a post (experts only)
- `PUT /api/posts/:id/report` - Report a post

### Comments

- `GET /api/comments` - Get all comments with pagination
- `GET /api/comments/:id` - Get comment by ID
- `POST /api/comments` - Create a comment
- `PUT /api/comments/:id` - Update a comment
- `DELETE /api/comments/:id` - Delete a comment
- `PUT /api/comments/:id/like` - Like a comment
- `PUT /api/comments/:id/unlike` - Unlike a comment
- `PUT /api/comments/:id/report` - Report a comment

### Experts

- `GET /api/experts` - Get all experts with pagination
- `GET /api/experts/:id` - Get expert by ID
- `POST /api/experts` - Apply to become an expert
- `PUT /api/experts/:id` - Update expert profile
- `PUT /api/experts/:id/verify` - Verify an expert (admin only)
- `POST /api/experts/:id/rate` - Rate an expert
- `GET /api/experts/specialization/:type` - Get experts by specialization

### Discussions

- `GET /api/discussions` - Get all discussions with pagination
- `GET /api/discussions/:id` - Get discussion by ID
- `POST /api/discussions` - Create a discussion
- `PUT /api/discussions/:id` - Update a discussion
- `DELETE /api/discussions/:id` - Delete a discussion
- `POST /api/discussions/:id/message` - Add a message to a discussion
- `PUT /api/discussions/:id/report` - Report a discussion

### Notifications

- `GET /api/notifications` - Get all notifications for the authenticated user
- `PUT /api/notifications/:id/read` - Mark a notification as read
- `DELETE /api/notifications/:id` - Delete a notification

### Content Moderation

- `GET /api/content-review` - Get all content reviews with pagination (admin only)
- `GET /api/content-review/pending` - Get pending content reviews (admin only)
- `GET /api/content-review/:id` - Get content review by ID (admin only)
- `PUT /api/content-review/:id/review` - Submit moderator review decision (admin only)
- `PUT /api/content-review/:id/appeal` - Submit an appeal for rejected content
- `PUT /api/content-review/:id/resolve-appeal` - Resolve an appeal (admin only)
- `GET /api/content-review/stats/dashboard` - Get content moderation statistics (admin only)

- `GET /api/moderation/pending` - Get pending content reviews (admin only)
- `GET /api/moderation/history` - Get moderation history (admin only)
- `POST /api/moderation/report` - Report content for review
- `PUT /api/moderation/review/:id` - Review reported content (admin only)
- `GET /api/moderation/stats` - Get moderation statistics (admin only)

## Content Moderation System

The Community Service includes a comprehensive content moderation system that combines automated and manual review processes:

### Automated Moderation

- **Keyword Filtering**: Automatically checks content against a list of prohibited keywords
- **AI Moderation**: Optional integration with external AI moderation APIs for content analysis
- **Configurable Thresholds**: Customizable sensitivity levels for different types of content

### Manual Moderation

- **Admin Dashboard**: Interface for moderators to review flagged content
- **User Reporting**: Allows users to report inappropriate content
- **Appeal System**: Enables users to appeal moderation decisions

### Moderation Workflow

1. **Content Creation**: When content is created, it passes through automated moderation
2. **Automated Review**: Content is checked against prohibited keywords and optionally analyzed by AI
3. **User Reports**: Users can report content they find inappropriate
4. **Moderator Review**: Moderators review flagged content and make decisions
5. **Content Action**: Based on review, content may be approved or hidden
6. **Appeal Process**: Users can appeal rejected content for further review

## Setup Instructions

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with the required environment variables (see `.env.example`)
4. Start the service: `npm run dev`

## Environment Variables

```
NODE_ENV=development
PORT=5004
MONGO_URI=mongodb://localhost:27017/zhongyi_community
JWT_SECRET=your_jwt_secret_change_in_production
JWT_EXPIRE=24h

# Content Moderation Configuration
CONTENT_MODERATION_ENABLED=true
AI_MODERATION_ENABLED=false
AI_MODERATION_API_URL=https://api.moderation-service.com/v1/moderate
AI_MODERATION_API_KEY=your_api_key_here

# Prohibited Keywords (comma-separated)
PROHIBITED_KEYWORDS=illegal,scam,fake
```

## Project Structure

```
community_service/
├── config/
│   └── db.js
├── middleware/
│   ├── auth.js
│   ├── admin.js
│   └── contentModeration.js
├── models/
│   ├── Comment.js
│   ├── ContentReview.js
│   ├── Discussion.js
│   ├── Expert.js
│   ├── Notification.js
│   └── Post.js
├── routes/
│   ├── comments.js
│   ├── contentReview.js
│   ├── discussions.js
│   ├── experts.js
│   ├── likes.js
│   ├── moderation.js
│   ├── notifications.js
│   └── posts.js
├── utils/
│   └── contentModeration.js
├── .env
├── package.json
└── server.js
```

## Deployment

The service can be deployed as a standalone microservice or as part of the complete 中医奶茶养生 App backend ecosystem. For production deployment, consider using Docker containers and a container orchestration system like Kubernetes. 