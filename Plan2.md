# Loan Advisor Chatbot Service - Complete Implementation Plan

## Executive Summary

Build a sophisticated loan matchmaking chatbot using a dual-agent architecture with Gemini API, PostgreSQL database, and multi-metric scoring algorithm. The system maintains natural conversation flow while systematically collecting required loan parameters through intelligent agent coordination, then processes loan matches using a comprehensive scoring system.

## System Architecture Overview

### Tech Stack
- **Frontend**: React 19.1 + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 14 with connection pooling
- **AI/ML**: Google Gemini API (gemini-2.5-flash) for dual-agent system
- **Agent Framework**: Custom dual-agent orchestration
- **Authentication**: Session-based with UUID tracking
- **Deployment**: Docker containers with Docker Compose

### High-Level Architecture Flow
```
User → React Chat UI → Express API → Dual Agent System → PostgreSQL
                                           ↓
                                    Gemini API Integration
                                           ↓
                                    Matchmaking Service
                                           ↓
                                    Response Formatting → User
```

---

## Part 1: Dual-Agent System Design & Implementation

### Agent Architecture Strategy

The system employs a sophisticated dual-agent pattern with clear separation of concerns:

#### 1. Main Conversational Agent (MCA)
**Role**: Primary user interface and conversation manager
**Responsibilities**:
- Handle all direct user interactions
- Maintain natural, engaging conversation flow
- Answer financial questions within defined scope
- Execute responses based on Parameter Collection Agent guidance
- Format and present loan match results

#### 2. Parameter Collection Agent (PCA)
**Role**: Background coordinator and data tracker
**Responsibilities**:
- Track all required loan parameters in real-time
- Identify missing information systematically
- Prioritize which parameters to collect next
- Trigger matchmaking process when complete
- Provide strategic guidance to MCA

### Required Loan Parameters
```typescript
interface LoanParameters {
  loanAmount: number;           // Required loan amount
  annualIncome: number;         // User's annual income
  employmentStatus: string;     // Employment type
  creditScore: number;          // Credit score (300-850)
  loanPurpose: string;         // Purpose of loan
  // Optional for enhanced matching
  debtToIncomeRatio?: number;   // For better affordability analysis
  employmentDuration?: number;  // Months at current job
}
```

### Agent Communication Protocol

#### Flow Structure:
1. **User Message** → **MCA Processing**
2. **MCA** → **PCA Consultation** (current state analysis)
3. **PCA** → **Strategic Response** (what to ask/do next)
4. **MCA** → **User Response** (natural conversation)
5. **State Update** → **Database Persistence**

#### PCA Decision Logic:
```typescript
interface PCAGuidance {
  action: 'collect_parameter' | 'trigger_matching' | 'answer_question' | 'redirect';
  nextParameter?: string;
  priority: 'high' | 'medium' | 'low';
  completionPercentage: number;
  reasoning: string;
}
```

### System Prompts Strategy

#### Main Conversational Agent System Prompt:
```
You are LoanBot, a professional and friendly loan advisor assistant. Your primary goal is to help users find the best loan matches by collecting their financial information through natural conversation.

CORE RESPONSIBILITIES:
- Engage users in natural, helpful conversation about loans
- Answer financial questions related to loans, interest rates, credit scores, and loan processes
- Collect required loan parameters: loan amount, annual income, employment status, credit score, and loan purpose
- Guide users through the loan matching process

CONVERSATION BOUNDARIES:
- Stay strictly within financial and loan-related topics
- If users ask about unrelated topics (philosophy, politics, general life advice), politely redirect to loan assistance
- Do not provide specific financial advice - focus on education and loan matching
- Always maintain a professional, trustworthy tone

RESPONSE STYLE:
- Use encouraging, supportive language
- Ask one question at a time to avoid overwhelming users
- Acknowledge and validate user inputs before proceeding
- Show progress when appropriate ("Great! We're halfway through the process")

Remember: You work with a Parameter Collection Agent that tracks completion status. Always check with PCA before responding to ensure you're asking for the right information next.
```

#### Parameter Collection Agent System Prompt:
```
You are the Parameter Collection Agent (PCA), a backend coordinator that ensures systematic collection of loan parameters. You work behind the scenes to guide the Main Conversational Agent.

CORE FUNCTION:
Track and manage the collection of required loan parameters:
1. loanAmount (number, $1,000 - $500,000)
2. annualIncome (number, positive value)
3. employmentStatus (enum: salaried, self-employed, freelancer, unemployed)
4. creditScore (number, 300-850)
5. loanPurpose (enum: home, auto, personal, business, education, debt-consolidation)

DECISION FRAMEWORK:
- Analyze current parameter collection status
- Identify the most important missing parameter
- Determine if user query is off-topic
- Trigger matching when all parameters collected
- Provide clear guidance to MCA

OUTPUT FORMAT:
Always respond with structured guidance including:
- Recommended action for MCA
- Next parameter to collect (if applicable)
- Current completion percentage
- Brief reasoning for the recommendation

PRIORITY ORDER for parameter collection:
1. loanAmount (establishes loan scope)
2. loanPurpose (determines lender fit)
3. annualIncome (income qualification)
4. creditScore (approval likelihood)
5. employmentStatus (employment verification)
```

---

## Part 2: PostgreSQL Database Architecture & Strategy

### Database Schema Design

#### Core Tables Structure:

```sql
-- 1. Lenders Table (Static data from dataset)
CREATE TABLE lenders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    min_loan_amount INTEGER NOT NULL,
    max_loan_amount INTEGER NOT NULL,
    min_income INTEGER NOT NULL,
    min_credit_score INTEGER NOT NULL,
    employment_types TEXT[] NOT NULL,
    loan_purpose VARCHAR(100),
    special_eligibility VARCHAR(255),
    processing_time_days INTEGER,
    features TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. User Sessions (Track conversation sessions)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    status VARCHAR(50) DEFAULT 'active',
    user_agent TEXT,
    ip_address INET
);

-- 3. Loan Parameters (Store collected user data)
CREATE TABLE loan_parameters (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    loan_amount INTEGER,
    annual_income INTEGER,
    employment_status VARCHAR(50),
    credit_score INTEGER,
    loan_purpose VARCHAR(100),
    debt_to_income_ratio DECIMAL(5,2),
    employment_duration INTEGER,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_complete BOOLEAN DEFAULT FALSE
);

-- 4. Conversation History (Store chat messages)
CREATE TABLE conversation_history (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL, -- 'user' or 'bot'
    content TEXT NOT NULL,
    agent_type VARCHAR(20), -- 'mca' or 'pca' for bot messages
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Match Results (Store calculated matches)
CREATE TABLE match_results (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES user_sessions(id) ON DELETE CASCADE,
    lender_id INTEGER REFERENCES lenders(id),
    eligibility_score INTEGER NOT NULL,
    affordability_score INTEGER NOT NULL,
    specialization_score INTEGER NOT NULL,
    final_score INTEGER NOT NULL,
    match_reasons TEXT[],
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Parameter Tracking (Real-time collection status)
CREATE TABLE parameter_tracking (
    session_id UUID PRIMARY KEY REFERENCES user_sessions(id) ON DELETE CASCADE,
    loan_amount_collected BOOLEAN DEFAULT FALSE,
    annual_income_collected BOOLEAN DEFAULT FALSE,
    employment_status_collected BOOLEAN DEFAULT FALSE,
    credit_score_collected BOOLEAN DEFAULT FALSE,
    loan_purpose_collected BOOLEAN DEFAULT FALSE,
    completion_percentage INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Database Indexes for Performance:
```sql
-- Optimize common queries
CREATE INDEX idx_sessions_status ON user_sessions(status);
CREATE INDEX idx_conversation_session ON conversation_history(session_id, created_at);
CREATE INDEX idx_match_results_session ON match_results(session_id, final_score DESC);
CREATE INDEX idx_lenders_criteria ON lenders(min_loan_amount, max_loan_amount, min_income, min_credit_score);
```

### Database Interaction Strategy

#### 1. Session Management Flow:
```typescript
// Session lifecycle management
class SessionService {
  async createSession(): Promise<string> {
    // Create new session in user_sessions
    // Initialize parameter_tracking record
    // Return session UUID
  }
  
  async getSessionData(sessionId: string): Promise<SessionData> {
    // Fetch session with parameter collection status
    // Include conversation history if needed
  }
  
  async updateParameterStatus(sessionId: string, parameter: string, value: any): Promise<void> {
    // Update loan_parameters table
    // Update parameter_tracking completion status
    // Calculate new completion percentage
  }
}
```

#### 2. Lender Data Management:
```typescript
// Lender service for matchmaking
class LenderService {
  async getAllLenders(): Promise<Lender[]> {
    // Fetch all lenders from database
    // Cache results for performance
  }
  
  async findMatchingLenders(criteria: LoanParameters): Promise<ScoredLender[]> {
    // Get all lenders
    // Calculate scores for each
    // Store results in match_results table
    // Return top 3 matches
  }
}
```

---

## Part 3: Matchmaking Algorithm & Scoring System

### Multi-Metric Scoring Implementation

#### Scoring Components (Weighted System):

1. **Eligibility Score (40% weight)**
   - Binary pass/fail checks for hard requirements
   - Determines basic qualification

2. **Affordability Score (35% weight)**
   - Interest rate competitiveness
   - Debt-to-income ratio consideration

3. **Specialization Score (25% weight)**
   - Loan purpose alignment
   - Special eligibility matching

#### Detailed Scoring Logic:

```typescript
interface ScoringResult {
  eligibilityScore: number;    // 0-100
  affordabilityScore: number;  // 0-100
  specializationScore: number; // 0-100
  finalScore: number;         // Weighted combination
  reasons: string[];          // Explainability
}

class MatchmakingService {
  async calculateMatches(userParams: LoanParameters): Promise<LenderMatch[]> {
    const lenders = await this.lenderService.getAllLenders();
    
    const scoredLenders = lenders.map(lender => {
      const scores = this.calculateLenderScore(userParams, lender);
      return {
        lender,
        ...scores,
        explainability: this.generateExplanation(userParams, lender, scores)
      };
    });
    
    // Filter eligible lenders and sort by score
    return scoredLenders
      .filter(l => l.eligibilityScore > 0)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 3);
  }
  
  private calculateLenderScore(user: LoanParameters, lender: Lender): ScoringResult {
    // 1. Eligibility Score Calculation
    const eligibilityChecks = [
      user.loanAmount >= lender.minLoanAmount && user.loanAmount <= lender.maxLoanAmount,
      user.annualIncome >= lender.minIncome,
      user.creditScore >= lender.minCreditScore,
      lender.employmentTypes.includes(user.employmentStatus),
      !lender.loanPurpose || lender.loanPurpose === user.loanPurpose
    ];
    
    const eligibilityScore = (eligibilityChecks.filter(Boolean).length / eligibilityChecks.length) * 100;
    
    // 2. Affordability Score (interest rate comparison)
    const allRates = this.getAllInterestRates(); // Cache this
    const minRate = Math.min(...allRates);
    const maxRate = Math.max(...allRates);
    const affordabilityScore = 100 * (1 - ((lender.interestRate - minRate) / (maxRate - minRate)));
    
    // 3. Specialization Score
    let specializationScore = 50; // Default for general lenders
    if (lender.loanPurpose === user.loanPurpose) specializationScore = 100;
    if (lender.specialEligibility && this.checkSpecialEligibility(user, lender)) specializationScore = 100;
    if (lender.loanPurpose && lender.loanPurpose !== user.loanPurpose) specializationScore = 0;
    
    // 4. Final Weighted Score
    const finalScore = Math.round(
      (eligibilityScore * 0.4) + (affordabilityScore * 0.35) + (specializationScore * 0.25)
    );
    
    return {
      eligibilityScore: Math.round(eligibilityScore),
      affordabilityScore: Math.round(affordabilityScore),
      specializationScore: Math.round(specializationScore),
      finalScore,
      reasons: this.generateReasons(user, lender, eligibilityChecks)
    };
  }
}
```

---

## Part 4: Backend API Design & Implementation

### RESTful API Structure

#### Core Endpoints:

```typescript
// Chat Management
POST   /api/chat/message              // Process user messages through dual-agent system
GET    /api/chat/history/:sessionId   // Retrieve conversation history
POST   /api/chat/session              // Initialize new chat session
DELETE /api/chat/session/:sessionId   // End session and cleanup

// Loan Processing
GET    /api/loan/status/:sessionId    // Get parameter collection status
POST   /api/loan/match                // Trigger matchmaking process
GET    /api/loan/results/:sessionId   // Retrieve match results
PUT    /api/loan/parameters/:sessionId // Update specific parameter

// Support & Utility
GET    /api/terms/:term               // Financial term definitions
GET    /api/health                    // System health check
GET    /api/lenders                   // Get all available lenders (for dev/testing)
```

#### Request/Response Flow Implementation:

```typescript
// Main chat endpoint handler
export class ChatController {
  async processMessage(req: Request, res: Response) {
    const { sessionId, message } = req.body;
    
    try {
      // 1. Get current session state
      const sessionData = await this.sessionService.getSessionData(sessionId);
      
      // 2. Store user message
      await this.conversationService.addMessage(sessionId, 'user', message);
      
      // 3. Process through dual-agent system
      const agentResponse = await this.agentOrchestrator.processMessage({
        sessionId,
        message,
        currentParams: sessionData.parameters,
        completionStatus: sessionData.tracking
      });
      
      // 4. Handle agent decisions
      if (agentResponse.action === 'trigger_matching') {
        const matches = await this.matchmakingService.findMatches(sessionData.parameters);
        await this.matchResultService.storeResults(sessionId, matches);
        agentResponse.matches = matches;
      }
      
      // 5. Store bot response
      await this.conversationService.addMessage(sessionId, 'bot', agentResponse.response);
      
      // 6. Update parameter tracking if needed
      if (agentResponse.parameterUpdate) {
        await this.parameterService.updateParameter(
          sessionId, 
          agentResponse.parameterUpdate.name,
          agentResponse.parameterUpdate.value
        );
      }
      
      res.json(agentResponse);
      
    } catch (error) {
      console.error('Chat processing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
```

### Agent Orchestration Service

```typescript
export class AgentOrchestrator {
  constructor(
    private geminiService: GeminiService,
    private parameterTracker: ParameterTrackingService
  ) {}
  
  async processMessage(context: MessageContext): Promise<AgentResponse> {
    // 1. Consult Parameter Collection Agent
    const pcaGuidance = await this.consultPCA(context);
    
    // 2. Process through Main Conversational Agent
    const mcaResponse = await this.processMCA(context, pcaGuidance);
    
    // 3. Combine responses and determine actions
    return this.orchestrateResponse(pcaGuidance, mcaResponse);
  }
  
  private async consultPCA(context: MessageContext): Promise<PCAGuidance> {
    const prompt = this.buildPCAPrompt(context);
    const response = await this.geminiService.generateContent(prompt);
    return this.parsePCAResponse(response);
  }
  
  private async processMCA(context: MessageContext, guidance: PCAGuidance): Promise<MCAResponse> {
    const prompt = this.buildMCAPrompt(context, guidance);
    const response = await this.geminiService.generateContent(prompt);
    return this.parseMCAResponse(response);
  }
}
```

---

## Part 5: Frontend Implementation Strategy

### Component Architecture

#### 1. Core Chat Components:

```typescript
// Main chat interface
interface ChatWindowProps {
  sessionId: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [parameterProgress, setParameterProgress] = useState(0);
  
  // Component handles conversation flow, parameter progress, and result display
};

// Individual message component
interface MessageBubbleProps {
  message: ChatMessage;
  isBot: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isBot }) => {
  // Renders user/bot messages with proper styling and formatting
};

// Quick reply buttons for common responses
interface QuickReplyProps {
  options: string[];
  onSelect: (option: string) => void;
}

export const QuickReplyButtons: React.FC<QuickReplyProps> = ({ options, onSelect }) => {
  // Renders clickable buttons for employment types, loan purposes, etc.
};
```

#### 2. Loan Result Components:

```typescript
// Lender match card display
interface LenderCardProps {
  lender: LenderMatch;
  onApplyClick: (lenderId: string) => void;
}

export const LenderCard: React.FC<LenderCardProps> = ({ lender, onApplyClick }) => {
  return (
    <div className="border rounded-lg p-6 shadow-lg">
      <h3 className="text-xl font-bold">{lender.name}</h3>
      <div className="text-2xl text-green-600 font-bold">
        {lender.interestRate}% APR
      </div>
      <CircularProgress value={lender.finalScore} label="Match Score" />
      <ExplainabilityList reasons={lender.reasons} />
      <button 
        onClick={() => onApplyClick(lender.id)}
        className="w-full bg-blue-600 text-white py-2 rounded-lg"
      >
        Simulate Application
      </button>
    </div>
  );
};

// Visual match score display
interface CircularProgressProps {
  value: number;
  label: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({ value, label }) => {
  // SVG-based circular progress indicator
};

// Explainability reasons list
interface ExplainabilityListProps {
  reasons: string[];
}

export const ExplainabilityList: React.FC<ExplainabilityListProps> = ({ reasons }) => {
  return (
    <ul className="space-y-2">
      {reasons.map((reason, index) => (
        <li key={index} className="flex items-center space-x-2">
          <CheckIcon className="text-green-500" />
          <span>{reason}</span>
        </li>
      ))}
    </ul>
  );
};
```

#### 3. Document Upload Simulation:

```typescript
// Document upload simulation component
interface DocUploaderProps {
  lenderName: string;
  onComplete: () => void;
  onClose: () => void;
}

export const DocUploader: React.FC<DocUploaderProps> = ({ lenderName, onComplete, onClose }) => {
  const [uploadedDocs, setUploadedDocs] = useState<Set<string>>(new Set());
  
  const requiredDocs = [
    'Pay Stub (last 2 months)',
    'Bank Statement',
    'Photo ID',
    'Proof of Address'
  ];
  
  const handleFileUpload = (docType: string, file: File) => {
    // Simulate file processing
    setTimeout(() => {
      setUploadedDocs(prev => new Set([...prev, docType]));
    }, 2000);
  };
  
  // Component renders drag-and-drop interface with progress tracking
};
```

### State Management Strategy

```typescript
// Global application state
interface AppState {
  sessionId: string;
  messages: ChatMessage[];
  parameterProgress: ParameterProgress;
  matchResults: LenderMatch[];
  currentView: 'chat' | 'results' | 'documents';
}

// Parameter collection progress
interface ParameterProgress {
  loanAmount: boolean;
  annualIncome: boolean;
  employmentStatus: boolean;
  creditScore: boolean;
  loanPurpose: boolean;
  completionPercentage: number;
}

// Use React Context + useReducer for state management
export const AppContext = createContext<AppState>(initialState);
export const AppDispatchContext = createContext<Dispatch<AppAction>>(null!);
```

---

## Part 6: Security & Compliance Implementation

### Security Measures

#### 1. Input Validation & Sanitization:

```typescript
// Zod schemas for API validation
import { z } from 'zod';

export const LoanParameterSchema = z.object({
  loanAmount: z.number().min(1000).max(500000),
  annualIncome: z.number().positive(),
  employmentStatus: z.enum(['salaried', 'self-employed', 'freelancer', 'unemployed']),
  creditScore: z.number().min(300).max(850),
  loanPurpose: z.enum(['home', 'auto', 'personal', 'business', 'education', 'debt-consolidation'])
});

export const ChatMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(1000),
  timestamp: z.date().optional()
});

// Middleware for request validation
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid request data', details: error });
    }
  };
};
```

#### 2. Rate Limiting & API Protection:

```typescript
import rateLimit from 'express-rate-limit';

// Chat endpoint rate limiting
export const chatRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each session to 20 requests per windowMs
  keyGenerator: (req) => req.body.sessionId || req.ip,
  message: 'Too many messages, please slow down'
});

// Matchmaking endpoint rate limiting
export const matchRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Limit to 3 match requests per session per 5 minutes
  keyGenerator: (req) => req.body.sessionId || req.ip
});
```

#### 3. Data Protection & Privacy:

```typescript
// Session data encryption
export class SessionEncryption {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey = process.env.SESSION_SECRET_KEY!;
  
  encrypt(data: any): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.secretKey);
    cipher.setAAD(Buffer.from('session_data'));
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  decrypt(encryptedData: string): any {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
    decipher.setAAD(Buffer.from('session_data'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}
```

### Compliance Strategy

#### Fair Lending Documentation:

```markdown
## Commitment to Fair Lending

Our loan matching algorithm is designed with transparency and fairness as core principles:

### Algorithmic Transparency
- **Deterministic Scoring**: All match scores are calculated using explicit mathematical formulas
- **Explainable Results**: Every recommendation includes clear reasoning
- **No Bias Variables**: Algorithm uses only legitimate financial criteria (income, credit score, loan amount)

### Protected Class Compliance
- **No Discriminatory Factors**: Gender, race, religion, age, or other protected characteristics are not collected or used
- **Income-Based Only**: Qualification is based solely on financial capacity and creditworthiness
- **Equal Access**: All users receive identical treatment regardless of personal characteristics

### Audit Trail
- **Decision Logging**: All scoring calculations are logged for review
- **Parameter Tracking**: Complete record of data collection and usage
- **Result Documentation**: Match reasons are stored and reviewable
```

---

## Part 7: Implementation Timeline & Phases

### Day 1: Foundation & Database Setup
**Morning (4 hours):**
- PostgreSQL database setup with Docker
- Database schema creation and seeding
- Basic Express server with TypeScript
- Environment configuration

**Afternoon (4 hours):**
- Lender data import and validation
- Session management service
- Basic API endpoints structure
- Database connection testing

### Day 2: Dual-Agent System Implementation
**Morning (4 hours):**
- Gemini API integration and testing
- Parameter Collection Agent logic
- Main Conversational Agent implementation
- Agent orchestration service

**Afternoon (4 hours):**
- Conversation flow testing
- Parameter tracking system
- Chat message storage
- Agent response validation

### Day 3: Matchmaking & Scoring Algorithm
**Morning (4 hours):**
- Multi-metric scoring algorithm
- Lender comparison logic
- Explainability generation
- Result ranking system

**Afternoon (4 hours):**
- Database query optimization
- Match result storage
- API endpoint completion
- Backend testing and validation

### Day 4: Frontend Development
**Morning (4 hours):**
- React application setup with Vite
- Chat interface components
- Message bubble and input components
- Real-time communication setup

**Afternoon (4 hours):**
- Lender card result display
- Progress tracking UI
- Document upload simulation
- State management implementation

### Day 5: Integration & Polish
**Morning (4 hours):**
- End-to-end testing
- Security implementation
- Error handling and validation
- Performance optimization

**Afternoon (4 hours):**
- UI/UX refinements
- Documentation completion
- Docker containerization
- Final testing and deployment

---

## Part 8: Development Guidelines & Best Practices

### Code Structure Standards

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   └── gemini.ts
│   ├── controllers/
│   │   ├── chatController.ts
│   │   └── loanController.ts
│   ├── services/
│   │   ├── agentOrchestrator.ts
│   │   ├── matchmakingService.ts
│   │   ├── sessionService.ts
│   │   └── geminiService.ts
│   ├── models/
│   │   ├── interfaces.ts
│   │   └── schemas.ts
│   ├── middleware/
│   │   ├── validation.ts
│   │   ├── rateLimit.ts
│   │   └── security.ts
│   ├── routes/
│   │   ├── chatRoutes.ts
│   │   └── loanRoutes.ts
│   ├── utils/
│   │   ├── encryption.ts
│   │   └── helpers.ts
│   └── app.ts
├── data/
│   └── lenders.json
├── tests/
├── Dockerfile
└── package.json

frontend/
├── src/
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── QuickReply.tsx
│   │   ├── results/
│   │   │   ├── LenderCard.tsx
│   │   │   ├── MatchScore.tsx
│   │   │   └── ExplainabilityList.tsx
│   │   └── simulation/
│   │       └── DocUploader.tsx
│   ├── hooks/
│   │   ├── useChat.ts
│   │   └── useSession.ts
│   ├── services/
│   │   └── apiService.ts
│   ├── types/
│   │   └── interfaces.ts
│   ├── utils/
│   │   └── helpers.ts
│   └── App.tsx
├── public/
├── Dockerfile
└── package.json
```

### Error Handling Strategy

```typescript
// Centralized error handling
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error middleware
export const globalErrorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { statusCode = 500, message } = error;
  
  console.error(`Error ${statusCode}: ${message}`);
  
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : message
  });
};
```

### Testing Strategy

```typescript
// Unit tests for scoring algorithm
describe('MatchmakingService', () => {
  test('calculates eligibility score correctly', async () => {
    const userParams = { loanAmount: 50000, creditScore: 750, /* ... */ };
    const lender = { minLoanAmount: 25000, maxLoanAmount: 100000, /* ... */ };
    
    const result = matchmakingService.calculateLenderScore(userParams, lender);
    expect(result.eligibilityScore).toBe(100);
  });
  
  test('prioritizes lower interest rates in affordability score', async () => {
    // Test affordability calculation logic
  });
});

// Integration tests for agent system
describe('Agent Orchestration', () => {
  test('PCA correctly identifies missing parameters', async () => {
    // Test parameter collection logic
  });
  
  test('MCA maintains conversation boundaries', async () => {
    // Test scope limitations
  });
});
```

This comprehensive plan provides a complete roadmap for implementing a sophisticated loan advisor chatbot that demonstrates advanced technical capabilities while adhering to the assignment requirements. The dual-agent architecture ensures natural conversation flow while systematically collecting data, and the PostgreSQL