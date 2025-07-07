# Loan Advisor Chatbot Service

## Play with Demo at: [LoanApp](https://loanmatcher-frontend-i7e65l5b3q-uc.a.run.app/)  Deployed on GCP
**No need to deploy. However, if you want to test, you may simply run locally via Docker following the instructions in Quick start Instrcutions below.**

A sophisticated LLM based chatbot a dual-agent architecture with Gemini AI, PostgreSQL database, and multi-metric linear regression based scoring algorithm. The system maintains natural conversation flow while systematically collecting required loan parameters through intelligent agent coordination.

## 🏗️ Architecture Overview

```
User → React Chat UI → Express API → Dual Agent System → PostgreSQL
                                         ↓
                                  Gemini API Integration
                                         ↓
                                  Matchmaking Service
                                         ↓
                                  Response Formatting → User
```

## 🚀 **LoanMatchMaker: Comprehensive Feature Analysis**

### **🤖 Core ML Architecture & Techniques**

#### **1. Dual Scoring System**
The system implements a **hybrid approach** with two scoring mechanisms:

**A. Rule-Based Scoring (Fallback System)**
- **Eligibility Score (40% weight)**: Validates 5 core criteria
  - Loan amount within lender's range
  - Monthly income meets minimum (annual income ÷ 12)
  - Credit score above threshold
  - Employment status compatibility
  - Loan purpose alignment
- **Affordability Score (35% weight)**: Interest rate competitiveness
  - Normalized scoring: lower rates = higher scores (2.99% - 15.99% range)
- **Specialization Score (25% weight)**: Purpose matching and special eligibility bonuses

**B. ONNX-Based ML Scoring (Primary System)**
- **Neural Network Model**: Multi-layer perceptron with dropout regularization.
- **GOAL: Binary Logistic Regression on features**
- **Features Extracted**: 10 engineered features per user-lender pair

#### **2. ML Pipeline**

**Feature Engineering (10 Features)**:
```typescript
// Normalized features (0-1 scale) as these features create most drastic scale diff
- loanAmountNorm: min(loanAmount / 1,000,000, 1.0)
- annualIncomeNorm: min(annualIncome / 500,000, 1.0)  
- creditScoreNorm: creditScore / 850
- interestRateNorm: interestRate / 20

// Binary compatibility features
- employmentMatch: 1.0 if employment type accepted
- purposeMatch: 1.0 if loan purpose matches
- specialEligibility: 1.0 if special programs available

// Ratio-based features
- loanToMaxRatio: loanAmount / maxLoanAmount
- incomeMultiple: annualIncome / minIncome  
- creditBuffer: (creditScore - minCreditScore) / 550
```

**Model Architecture**:
```python
# PyTorch Neural Network Simple Binary Logistic Regression
Sequential(
    Linear(10, 32),      # Input → Hidden layer
    ReLU(),
    Dropout(0.2),
    Linear(32, 16),      # Hidden → Hidden layer  
    ReLU(),
    Dropout(0.2),
    Linear(16, 1),       # Hidden → Output
    Sigmoid()            # Probability output (0-1)
)
```

### **🔄 ONNX Deployment Strategy**

#### **Why ONNX Over PyTorch?**

**1. Python-Free Deployment**
- **Challenge**: Vercel and many containerized environments don't support Python runtime. Plus Pytorch takes a whole lot of unncessary data especially if goal is Inference.
- **Solution**: ONNX Runtime for Node.js (`onnxruntime-node`) enables pure JavaScript inference
- **Benefit**: Deploy trained PyTorch models without Python dependencies

**2. Production Advantages**
```typescript
// ONNX Runtime Integration
import * as ort from 'onnxruntime-node';

// Load model once, use repeatedly
const session = await ort.InferenceSession.create('loan_matching_model.onnx');
const result = await session.run(feeds);
```

**3. Export Process**
```python
# PyTorch → ONNX Conversion
torch.onnx.export(
    model,                          # Trained PyTorch model
    dummy_input,                    # Sample input tensor
    'loan_matching_model.onnx',     # Output file
    opset_version=11,               # ONNX version
    dynamic_axes={'input': {0: 'batch_size'}}  # Variable batch size
)
```

### **🏗️ System Architecture Features**

#### **1. Intelligent Agent Orchestration**
- **Conversation Agent**: Handles natural dialogue flow using Gemini AI understanding UserIntention, calling proper tools and a rookie memory and context management system from scratch (No External Agentic Libraries)
- **Parameter Agent**: Systematically extracts 5 required loan parameters
- **Smart Handoff**: Seamless transitions between conversational and data collection modes

#### **2. Advanced Session Management**
```typescript
// Session-based parameter collection
interface LoanParameters {
  loanAmount: number;
  annualIncome: number; 
  creditScore: number;
  employmentStatus: string;
  loanPurpose: string;
  debtToIncomeRatio?: number;  // Optional enhanced scoring
  employmentDuration?: number; // Optional confidence boost
}
```

#### **3. Multi-Metric Scoring System**
```typescript
interface LenderMatch {
  // Core scores (0-100 scale)
  eligibilityScore: number;     // Meets basic requirements
  affordabilityScore: number;   // Interest rate competitiveness  
  specializationScore: number;  // Purpose/feature alignment
  finalScore: number;          // Weighted composite score
  
  // ML enhancements
  confidence: number;          // Model confidence (0-100)
  reasons: string[];          // Explainable recommendations
  warnings: string[];         // Risk indicators
}
```

### **🛡️ Production-Ready Features**

#### **1. Fallback Architecture**
```typescript
// Intelligent ML/Rule-based switching
if (this.useMLPredictions && mlSetup.isReady) {
  console.log('🤖 Using ONNX ML-based matching');
  return await this.findMatchesWithONNX(sessionId, userParams, lenders);
} else {
  console.log('📋 Using rule-based matching');
  return await this.findMatchesRuleBased(sessionId, userParams, lenders);
}
```

#### **2. Docker Containerization**
```dockerfile
FROM node:20-slim
# Install ONNX Runtime dependencies
RUN apt-get update && apt-get install -y curl
# No Python required - ONNX runtime handles inference
```

#### **3. Database Integration**
- **PostgreSQL**: Persistent storage for lenders, sessions, match results
- **Session Persistence**: Resume conversations across page refreshes
- **Analytics**: Match statistics and lender performance tracking

## 🛡️ **Comprehensive Security Architecture Analysis**

### **🔐 Authentication & Session Management**

#### **1. Session-Based Security**
```typescript
// UUID-based session tracking
interface SessionSecurity {
  sessionId: string;           // UUID v4 format validation
  timestamp: Date;            // Session expiration tracking
  ipAddress?: string;         // IP-based session binding
  userAgent?: string;         // Device fingerprinting
}

// Session secret validation (32+ character requirement)
SESSION_SECRET_KEY: min 32 characters for cryptographic strength
```

#### **2. Session Validation Middleware**
```typescript
export const validateSession = async (req, res, next) => {
  const sessionId = req.body.sessionId || req.params.sessionId;
  
  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!sessionId || !uuidRegex.test(sessionId)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid session ID format'
    });
  }
}
```

### **🚨 Advanced Rate Limiting System**

#### **Multi-Tier Rate Limiting**
```typescript
// Endpoint-specific rate limits
export const rateLimits = {
  chat: {
    windowMs: 1 * 60 * 1000,    // 1 minute window
    max: 20,                   // 20 messages per minute per session
    keyGenerator: (req) => req.body.sessionId || req.ip
  },
  
  matching: {
    windowMs: 5 * 60 * 1000,    // 5 minute window  
    max: 3,                    // 3 match requests per 5 minutes
    keyGenerator: (req) => req.body.sessionId || req.ip
  },
  
  general: {
    windowMs: 15 * 60 * 1000,   // 15 minute window
    max: 100,                  // 100 requests per 15 minutes per IP
    keyGenerator: (req) => req.ip
  }
};
```

#### **Intelligent Key Generation**
- **Session-based limiting**: Prevents abuse from single user sessions
- **IP-based fallback**: Catches requests without valid sessions
- **Graduated penalties**: Different limits for different endpoint types

### **🔒 Input Validation & Sanitization**

#### **1. Zod Schema Validation**
```typescript
// Comprehensive parameter validation
export const LoanParameterSchema = z.object({
  loanAmount: z.number().min(100000).max(100000000),     // ₹1L - ₹10Cr range
  annualIncome: z.number().positive(),                   // Must be positive
  employmentStatus: z.enum(['salaried', 'self-employed', 'freelancer', 'student', 'unemployed']),
  creditScore: z.number().min(300).max(850),             // Valid FICO range
  loanPurpose: z.enum(['home', 'vehicle', 'education', 'business', 'startup', 'eco', 'emergency', 'gold-backed', 'personal'])
});

// Message validation with length limits
export const ChatMessageSchema = z.object({
  sessionId: z.string().uuid(),                          // Strict UUID validation
  message: z.string().min(1).max(1000),                 // Prevent empty/oversized messages
  timestamp: z.date().optional()
});
```

#### **2. SQL Injection Protection**
```typescript
// Malicious pattern detection
const suspiciousPatterns = [
  /union\s+select/i,          // SQL Union attacks
  /drop\s+table/i,            // Table deletion attempts
  /insert\s+into/i,           // Unauthorized inserts
  /update\s+set/i,            // Unauthorized updates
  /delete\s+from/i,           // Unauthorized deletions
  /<script.*?>.*?<\/script>/i, // XSS script injection
  /javascript:/i,             // JavaScript protocol injection
  /on\w+\s*=/i,              // Event handler injection
  /eval\s*\(/i,              // Code evaluation attempts
  /expression\s*\(/i         // CSS expression injection
];
```

#### **3. XSS Protection**
```typescript
// Input sanitization middleware
export const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')  // Remove script tags
        .replace(/javascript:/gi, '')                                        // Remove JS protocols
        .replace(/on\w+\s*=/gi, '')                                         // Remove event handlers
        .trim();
    }
    // Recursive sanitization for objects and arrays
  };
};
```

### **🌐 Network Security**

#### **1. Helmet.js Security Headers**
```typescript
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],                                    // Restrict resource origins
      styleSrc: ["'self'", "'unsafe-inline'"],                 // Allow inline styles (Tailwind)
      scriptSrc: ["'self'"],                                    // Block external scripts
      imgSrc: ["'self'", "data:", "https:"],                   // Allow data URIs and HTTPS images
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"], // Gemini API only
      fontSrc: ["'self'", "https:", "data:"],                  // Font loading
      objectSrc: ["'none'"],                                   // Block object/embed tags
      frameSrc: ["'none'"],                                    // Block iframe embedding
    },
  },
  hsts: {
    maxAge: 31536000,        // 1 year HTTPS enforcement
    includeSubDomains: true, // Apply to all subdomains
    preload: true,          // Include in browser preload lists
  },
});
```

#### **2. CORS Security**
```typescript
export const corsOptions = {
  origin: isDevelopment 
    ? ['http://localhost:3000', 'http://127.0.0.1:3000']     // Dev origins
    : process.env.FRONTEND_URL?.split(',') || ['https://yourdomain.com'], // Production origins
  credentials: true,                                         // Allow session cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],    // Explicit method allowlist
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Header whitelist
};
```

#### **3. Request Size Limiting**
```typescript
// Multiple layers of size protection
this.app.use(express.json({ limit: '10mb' }));              // JSON body limit
this.app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Form data limit
this.app.use(validateContentLength(10 * 1024 * 1024));      // Custom middleware validation
```

### **🔍 Security Monitoring & Logging**

#### **1. Security Audit Logging**
```typescript
export const securityLogMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    };
    
    // Log suspicious activity (errors or slow requests)
    if (res.statusCode >= 400 || duration > 5000) {
      console.warn('Security log:', logData);
    }
  });
};
```

#### **2. Error Handling Security**
```typescript
// Production-safe error responses
export const errorHandler = (error, req, res, next) => {
  // Sanitize error details for production
  const logData = {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    statusCode,
    // Remove sensitive data from logs
    sessionId: req.headers['x-session-id'] ? '***redacted***' : undefined,
    ip: req.ip ? req.ip.substring(0, req.ip.lastIndexOf('.')) + '.***' : undefined,
  };
  
  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && !isOperational) {
    errorResponse.error = 'Something went wrong';
    delete errorResponse.message;
  }
};
```

### **⚠️ Advanced Threat Protection**

#### **1. IP Filtering & Blacklisting**
```typescript
export const ipFilter = (blockedIPs: string[] = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (clientIP && blockedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Your IP address has been blocked'
      });
    }
    next();
  };
};
```

#### **2. Environment Variable Security**
```typescript
// Strict configuration validation
export const validateConfig = (): void => {
  const requiredVars = ['DATABASE_URL', 'GEMINI_API_KEY', 'SESSION_SECRET_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Session secret strength validation
  if (config.sessionSecret.length < 32) {
    throw new Error('Session secret key must be at least 32 characters long');
  }
  
  // API key format validation
  if (!config.gemini.apiKey.startsWith('AI')) {
    console.warn('Warning: Gemini API key format may be incorrect');
  }
};
```

### **🎯 Fair Lending Compliance**

#### **Algorithmic Transparency**
```typescript
// Bias-free scoring criteria
interface ScoringCriteria {
  // ✅ Legitimate financial factors
  loanAmount: number;      // Financial capacity
  annualIncome: number;    // Repayment ability  
  creditScore: number;     // Credit history
  employmentStatus: string; // Income stability
  loanPurpose: string;     // Risk assessment
  
}

// Explainable AI results
interface LenderMatch {
  reasons: string[];       // Clear reasoning for each recommendation
  warnings: string[];      // Risk indicators
  confidence: number;      // Model confidence score
}
```

### **🔄 Production Security Features**

#### **1. Docker Security**
```dockerfile
FROM node:18-slim
# Use non-root user for container execution
RUN groupadd -r loanapp && useradd -r -g loanapp loanapp
USER loanapp

# Security-focused package installation
RUN apt-get update && apt-get install -y \
    curl \                    # Health check only
    && rm -rf /var/lib/apt/lists/*  # Clean package cache
```

#### **2. Health Check Security**
```typescript
// Sanitized health endpoint For checking LLM API INTEGRATION
this.app.get('/api/health', async (req, res) => {
  const healthResponse = {
    status: dbHealth && geminiHealth ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealth,     // Boolean only, no connection details
      gemini: geminiHealth,   // Boolean only, no API keys
    },
    uptime: process.uptime(), // System uptime only
    version: process.env.npm_package_version || '1.0.0', // Version info
    // Explicitly exclude sensitive configuration
  };
});
```




### **📊 Performance & Metrics**

#### **Training Data Generation**
- **30,000 synthetic records**: Realistic user-lender combinations
- **15 production lenders**: From assignment specifications
- **Business logic validation**: Ensures meaningful matches

#### **Model Performance**
- **99.67% Test Accuracy**: Excellent classification performance
- **ROC-AUC: 0.9991**: Near-perfect ranking ability
- **Feature Importance**: Automatically learned optimal feature weights

#### **Explainable AI Features**
```typescript
// Auto-generated explanations
reasons: [
  "Your income of $75,000 exceeds their minimum of $50,000",
  "Credit score of 720 is well above minimum of 660", 
  "Competitive interest rate of 8.9%",
  "Specializes in home loans",
  "Fast processing: 3 days"
]
```
### **📈 Model Training History**

![Model Training History](backend/src/training/models/M_X/training_history.png)
### **🚀 Deployment Benefits**

1. **Vercel Compatible**: No Python runtime dependencies
2. **Docker Ready**: Containerized with health checks
3. **Scalable**: ONNX inference scales horizontally
4. **Maintainable**: Clear separation of ML training (Python) and inference (Node.js)
5. **Reliable**: Automatic fallback to rule-based system if ML fails

This architecture successfully bridges the gap between complex ML training capabilities and production deployment constraints, delivering both sophisticated AI-powered matching and robust fallback mechanisms in a Python-free production environment.







## 🚀 Quick Start - Local Development

### Prerequisites

- **Node.js** 18+ 
- **Docker & Docker Compose**
- **Git**
- **Gemini API Key** (Get from [Google AI Studio](https://makersuite.google.com/app/apikey))

### 1. Clone and Setup

```bash
git clone <repository-url>
cd LoanMatchMaker

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your specific values:

```bash
# Database Configuration
DATABASE_URL=postgresql://loan_user:loan_password@localhost:5432/loan_advisor
POSTGRES_DB=loan_advisor
POSTGRES_USER=loan_user
POSTGRES_PASSWORD=loan_password

# Server Configuration
PORT=3001
NODE_ENV=development

# 🔑 REQUIRED: Get your Gemini API Key from Google AI Studio
GEMINI_API_KEY=your_gemini_api_key_here

# 🔑 REQUIRED: Generate a secure session secret (32+ characters)
SESSION_SECRET_KEY=your_secure_session_secret_key_here_minimum_32_chars

# Frontend Configuration
VITE_API_URL=http://localhost:3001
```

### 3. Generate Required Keys

#### **Gemini API Key** 🤖
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env` file

#### **Session Secret Key** 🔐
Generate a secure random string (32+ characters):

```bash
# Option 1: Using OpenSSL
openssl rand -hex 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Online generator
# Visit: https://generate-secret.vercel.app/32
```

### 4. Start the Application

```bash
# Start all services with Docker Compose
docker-compose up --build

# Or start individual services:

# Start database only
docker-compose up postgres

# Install dependencies and start backend
cd backend
npm install
npm run dev

# Install dependencies and start frontend (in new terminal)
cd frontend
npm install
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health
- **API Documentation**: http://localhost:3001/api/docs
- **Database**: localhost:5432 (credentials in .env)

## 📦 Service Details

### Backend (Port 3001)
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL with 15 pre-loaded lenders
- **AI**: Gemini 2.0 Flash for dual-agent system
- **Features**: Session management, parameter extraction, loan matching

### Frontend (Port 3000)  
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Features**: Chat interface, loan results display, progress tracking

### Database (Port 5432)
- **Engine**: PostgreSQL 14
- **Schema**: 6 tables with indexes and triggers
- **Data**: 15 sample lenders with diverse loan products

## 🔧 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key | `AIza...` |
| `SESSION_SECRET_KEY` | ✅ | Session encryption key (32+ chars) | `abc123...` |
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://user:pass@host:port/db` |
| `PORT` | ❌ | Backend server port | `3001` |
| `NODE_ENV` | ❌ | Environment mode | `development` |
| `VITE_API_URL` | ❌ | Frontend API endpoint | `http://localhost:3001` |

## 🐳 Docker Deployment

### Development
```bash
# Start all services
docker-compose up --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Reset database
docker-compose down -v
docker-compose up --build
```

### Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## 🗄️ Database Management

### Connect to Database
```bash
# Using Docker
docker-compose exec postgres psql -U loan_user -d loan_advisor

# Using local PostgreSQL
psql postgresql://loan_user:loan_password@localhost:5432/loan_advisor
```

### Reset Database
```bash
# Stop services
docker-compose down

# Remove database volume
docker volume rm loanmatchmaker_postgres_data

# Restart services (will recreate database)
docker-compose up --build
```

### View Sample Data
```sql
-- View all lenders
SELECT name, interest_rate, loan_purpose FROM lenders;

-- View active sessions
SELECT id, created_at, status FROM user_sessions WHERE status = 'active';

-- View conversation history
SELECT session_id, message_type, content FROM conversation_history ORDER BY created_at DESC LIMIT 10;
```

## 🔍 API Testing

### Create Session
```bash
curl -X POST http://localhost:3001/api/chat/session \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Send Message
```bash
curl -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "message": "I need a $50000 loan for a house"
  }'
```

### Get Lenders
```bash
curl http://localhost:3001/api/loan/lenders
```

## 🚨 Troubleshooting

### Common Issues

#### 1. **Gemini API Key Invalid**
```
Error: Gemini API request failed: API key invalid
```
**Solution**: Verify your API key at [Google AI Studio](https://makersuite.google.com/app/apikey)

#### 2. **Database Connection Failed**
```
Error: Database connection failed
```
**Solutions**:
- Check if PostgreSQL container is running: `docker-compose ps`
- Verify DATABASE_URL in `.env` file
- Reset database: `docker-compose down -v && docker-compose up --build`

#### 3. **Session Secret Key Too Short**
```
Error: Session secret key must be at least 32 characters long
```
**Solution**: Generate a longer key using the methods in step 3 above

#### 4. **Port Already in Use**
```
Error: Port 3001 is already in use
```
**Solutions**:
- Change PORT in `.env` file
- Kill process using port: `lsof -ti:3001 | xargs kill -9`

#### 5. **Frontend Can't Connect to Backend**
```
Network Error: Failed to fetch
```
**Solutions**:
- Verify backend is running on port 3001
- Check VITE_API_URL in `.env` file
- Ensure CORS is configured correctly

### Debug Mode

#### Backend Logs
```bash
# View backend logs
docker-compose logs -f backend

# Enable debug mode
NODE_ENV=development npm run dev
```

#### Database Logs
```bash
# View database logs
docker-compose logs -f postgres

# Enable query logging (add to docker-compose.yml)
command: postgres -c log_statement=all
```

## 📁 Project Structure

```
LoanMatchMaker/
├── backend/
│   ├── src/
│   │   ├── config/          # Database & Gemini config
│   │   ├── controllers/     # Route handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Security & validation
│   │   ├── models/          # TypeScript interfaces
│   │   ├── routes/          # API endpoints
│   │   └── data/            # Database initialization
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API calls
│   │   └── types/           # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml       # Development setup
├── .env.example            # Environment template
└── README.md              # This file
```

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests  
cd frontend
npm test

# E2E tests
npm run test:e2e
```

### Manual Testing Flow
1. Create new session
2. Send various loan-related messages
3. Verify parameter extraction
4. Complete all required parameters
5. Verify loan matches are returned
6. Test error scenarios



## CHAT APP FLOW IMAGES:

![Chat Step 1](chat_images/a1.png)


![Chat Step 2](chat_images/a2.png)


![Chat Step 3](chat_images/a3.png)


![Chat Step 4](chat_images/a4.png)


![Chat Step 5](chat_images/a5.png)


![Chat Step 6](chat_images/a6.png)


![Chat Step 7](chat_images/a7.png)


![Chat Step 8](chat_images/a8.png)

