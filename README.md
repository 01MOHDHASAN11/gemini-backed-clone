Gemini Backend Clone
A backend system that enables user-specific chatrooms, OTP-based authentication, Gemini AI-powered conversations, and subscription handling via mock payment system.

📋 Features
User Authentication: OTP-based login system with JWT tokens

Chatroom Management: Create and manage multiple AI-powered chatrooms

Google Gemini Integration: AI-powered conversations using Gemini API

Subscription System: Mock payment integration with Basic and Pro tiers

Rate Limiting: Daily message limits for Basic tier users

Caching: Redis caching for improved performance

🏗️ Architecture Overview
Tech Stack
Backend Framework: Node.js with Express.js

Database: PostgreSQL with Sequelize ORM

Queue System: BullMQ with Redis for async processing

Authentication: JWT with OTP verification

Caching: Redis for query caching

Payments: Mock payment system (Stripe-like API)

AI Integration: Google Gemini API

System Architecture
text
Client → Express Server → Authentication Middleware → Routes
    │
    ├── Chatroom Management (PostgreSQL)
    ├── Message Queue (BullMQ + Redis)
    ├── Gemini AI Integration
    ├── Subscription Management (Mock Payment)
    └── Caching Layer (Redis)
📁 Project Structure
text
gemini-backed-clone/
├── models/                 # Database models
│   ├── index.js           # Sequelize models initialization
│   ├── user.js            # User model
│   ├── otp.js             # OTP model
│   ├── chatroom.js        # Chatroom model
│   └── message.js         # Message model
├── routes/                # API routes
│   └── auth.js           # Authentication routes
├── middleware/            # Custom middleware
│   ├── authenticate.js   # JWT authentication
│   └── rateLimit.js      # Rate limiting
├── queue/                # Message queue system
│   ├── geminiQueue.js    # BullMQ queue setup
│   └── worker.js         # Queue worker processing
├── utils/                # Utility functions
│   └── mockPayment.js    # Mock Stripe implementation
├── db/                   # Database configuration
│   └── dbConnect.js      # Sequelize connection
├── index.js              # Main server file
├── package.json          # Dependencies and scripts
└── .env                  # Environment variables
🔌 API Endpoints
Authentication
POST /auth/signup - Register new user with mobile number

POST /auth/send-otp - Send OTP to mobile number

POST /auth/verify-otp - Verify OTP and get JWT token

POST /auth/forgot-password - Send OTP for password reset

POST /auth/change-password - Change password (authenticated)

User Management
GET /user/me - Get current user details

Chatroom Management
POST /chatroom - Create new chatroom (authenticated)

GET /chatroom - List all user chatrooms (authenticated, cached)

GET /chatroom/:id - Get specific chatroom details (authenticated)

Messages
POST /chatroom/:id/message - Send message to Gemini AI (authenticated, rate limited)

Subscriptions
POST /subscribe/pro - Initiate Pro subscription

GET /subscription/status - Check subscription status

POST /webhook/stripe - Handle mock payment webhook events

🚦 Rate Limiting
Basic Tier: 5 messages per day

Pro Tier: Unlimited messages

Rate limiting is implemented using daily prompt counters

💾 Caching Implementation
Cached Endpoint: GET /chatroom

Justification:

Frequently accessed when loading user dashboard

Chatrooms change less frequently than messages

Reduces database load with 5-minute TTL

Implemented using Redis caching per user

🔄 Queue System
Technology: BullMQ with Redis

Implementation:

Gemini API requests are processed asynchronously

Prevents blocking of main application thread

Handles rate limiting and retries automatically

Provides job tracking and monitoring

💳 Payment System Note
Important: Due to Stripe's unavailability in India and Razorpay's website URL requirement, a mock payment system has been implemented that simulates Stripe's API behavior without actual payment processing.

Mock Payment Features:
Simulates Stripe Checkout flow

Handles subscription lifecycle events

Provides webhook support for payment events

Maintains subscription status in database

🛠️ Setup Instructions
Prerequisites
Node.js (v14 or higher)

PostgreSQL database

Redis server

Google Gemini API key

Installation
Clone the repository

bash
git clone [https://github.com/01MOHDHASAN11/gemini-backed-clone](https://github.com/01MOHDHASAN11/gemini-backed-clone)
cd gemini-backed-clone
Install dependencies

bash
npm install
Environment Configuration
Create a .env file with the following variables:

env
PORT=5000
JWT_SECRET_KEY=your_jwt_secret_key
NODE_ENV=development
DATABASE_URL=postgresql://username:password@host:port/database
GEMINI_API_KEY=your_gemini_api_key
REDIS_URL=redis://localhost:6379
MOCK_PAYMENT_SECRET=your_mock_payment_secret
MOCK_WEBHOOK_SECRET=your_mock_webhook_secret
MOCK_PRICE_ID=price_pro_monthly
Database Setup

bash
npx sequelize-cli db:migrate
Start the application

bash
# Development
npm run dev

# Production
npm start

# Start queue worker
npm run worker
🧪 Testing with Postman
Import the Postman Collection

Import the provided Gemini-Backend.postman_collection.json

Set the base URL to your deployment URL

Test Flow

Start with /auth/signup to create a user

Use /auth/send-otp and /auth/verify-otp to get JWT token

Set the token in Authorization header as Bearer <token>

Test chatroom creation and message sending

Test subscription endpoints (uses mock payment)

🌐 Deployment
This application is deployed on Render with:

PostgreSQL database

Redis for caching and queues

Environment-based configuration

🤝 Assumptions & Design Decisions
OTP Implementation: OTPs are returned in API response instead of SMS for development purposes

Mock Payments: Implemented mock payment system due to Stripe unavailability in India and Razorpay requirements

Queue Processing: Used BullMQ for async Gemini API processing

Caching Strategy: Redis caching for frequently accessed chatroom list

Error Handling: Comprehensive error handling with consistent JSON responses

Security: JWT authentication with proper middleware protection

📊 Database Schema
Users: Mobile, password, subscription tier, daily prompts used

OTPs: Mobile, code, expiration time

Chatrooms: Title, user association

Messages: User message, AI response, chatroom association

🔮 Future Enhancements
Real SMS integration for OTP delivery

Real payment integration when available

Advanced rate limiting configurations

Message history pagination

WebSocket support for real-time updates

Admin dashboard for user management
