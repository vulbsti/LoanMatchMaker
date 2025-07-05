# Loan Advisor Chatbot Service

A sophisticated loan matchmaking chatbot using a dual-agent architecture with Gemini AI, PostgreSQL database, and multi-metric scoring algorithm. The system maintains natural conversation flow while systematically collecting required loan parameters through intelligent agent coordination.

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

## 📚 Additional Resources

- [Gemini AI Documentation](https://ai.google.dev/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [React Documentation](https://react.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [Docker Documentation](https://docs.docker.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Need Help?** Check the troubleshooting section above or create an issue in the repository.