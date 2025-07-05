# Plan.md: Loan Advisor Chatbot Service - Implementation Strategy

## Executive Summary

Build a sophisticated loan matchmaking chatbot using a dual-agent architecture with Gemini API, PostgreSQL database, and multi-metric scoring algorithm. The system will maintain natural conversation flow while systematically collecting required loan parameters through intelligent agent coordination.

## System Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 14
- **AI/ML**: Google Gemini API (gemini-pro model) for conversational AI
- **Agent Framework**: Custom dual-agent system with Gemini
- **Authentication**: Session-based with UUID
- **Deployment**: Docker containers

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

## Part 1: Dual-Agent System Design

### Agent Architecture

The system employs two specialized agents working in tandem:

1. **Main Conversational Agent (MCA)**
   - Handles all user interactions
   - Maintains natural conversation flow
   - Answers financial questions within scope
   - Receives guidance from the Parameter Collection Agent

2. **Parameter Collection Agent (PCA)**
   - Runs as a background process
   - Tracks required loan parameters
   - Identifies missing information
   - Guides the MCA on what to ask next

### Agent Communication Flow

1. User sends message → MCA receives it
2. MCA consults PCA about current state
3. PCA analyzes collected vs missing parameters
4. PCA provides guidance to MCA on next action:
   - If parameters missing: Suggests which parameter to ask for
   - If all collected: Triggers matchmaking process
   - If user asks off-topic: Suggests redirection
5. MCA crafts natural response incorporating PCA guidance
6. Once all parameters collected, PCA triggers backend matchmaking

### System Prompts Strategy

**Main Conversational Agent Prompt:**
- Identity: Professional loan advisor assistant
- Capabilities: Answer loan-related questions, guide through application
- Boundaries: Stay within financial/loan topics
- Tone: Friendly, professional, helpful
- Goal: Collect loan information naturally while being informative

**Parameter Collection Agent Prompt:**
- Role: Backend parameter tracker and flow coordinator
- Responsibilities: Track collected data, identify gaps, prioritize questions
- Output: Structured guidance for MCA
- Trigger: Initiate matchmaking when all parameters collected

## Part 2: Database Architecture

### PostgreSQL Schema Design

**Core Tables:**
1. `lenders` - Static lender information
2. `loan_sessions` - Track user sessions and collected parameters
3. `conversation_history` - Store chat messages
4. `match_results` - Store calculated matches for analytics
5. `parameter_tracking` - Real-time parameter collection status

### Data Flow Strategy

1. **On Application Start**: Load all 15 lenders into PostgreSQL
2. **During Conversation**: 
   - Store each collected parameter in `loan_sessions`
   - Update `parameter_tracking` table
   - Save conversation history
3. **On Match Request**:
   - Fetch all lenders from database
   - Calculate scores for each lender
   - Store results in `match_results`
   - Return top 3 matches

## Part 3: Matchmaking Algorithm Strategy

### Multi-Metric Scoring System

Calculate three distinct scores for comprehensive matching:

1. **Eligibility Score (40% weight)**
   - Hard requirement checks
   - Binary pass/fail for each criterion
   - Determines if user qualifies

2. **Affordability Score (35% weight)**
   - Interest rate comparison
   - Normalized across all lenders
   - Lower rates score higher

3. **Specialization Score (25% weight)**
   - Purpose alignment
   - Special eligibility matching
   - Lender expertise evaluation

### Processing Pipeline

1. **Data Collection Phase**
   - PCA confirms all parameters collected
   - Validate data integrity
   - Store in session

2. **Matching Phase**
   - Fetch all 15 lenders from PostgreSQL
   - For each lender:
     - Calculate eligibility score
     - Calculate affordability score
     - Calculate specialization score
     - Compute weighted final score
   - Generate explainability reasons

3. **Result Phase**
   - Sort lenders by final score
   - Filter out ineligible lenders
   - Select top 3 matches
   - Format with explanations
   - Store results for analytics

## Part 4: API Design Strategy

### RESTful Endpoints

1. **Chat Management**
   - `POST /api/chat/message` - Process user messages
   - `GET /api/chat/history/:sessionId` - Retrieve conversation
   - `POST /api/chat/session` - Initialize new session

2. **Loan Processing**
   - `GET /api/loan/status/:sessionId` - Check parameter collection status
   - `POST /api/loan/match` - Trigger matchmaking
   - `GET /api/loan/results/:sessionId` - Retrieve match results

3. **Support Endpoints**
   - `GET /api/terms/:term` - Financial term definitions
   - `GET /api/health` - System health check

### Request/Response Flow

1. Frontend sends user message with sessionId
2. Backend routes to agent system
3. Agents process and determine response
4. If parameters complete, trigger matching
5. Return conversational response or match results

## Part 5: Frontend Implementation Strategy

### Component Architecture

1. **Chat Interface Components**
   - MessageBubble (user/bot messages)
   - InputBar with send functionality
   - QuickReplyButtons for common options
   - LoadingIndicator for processing states

2. **Result Display Components**
   - LenderCard with visual match score
   - ExplainabilityList showing reasons
   - ComparisonView for top 3 lenders
   - CTAButton for application simulation

3. **State Management**
   - Session management with localStorage
   - Message history tracking
   - Parameter collection progress
   - Match results caching

### UX Flow Design

1. **Initial Greeting**: Bot introduces itself
2. **Conversational Collection**: Natural parameter gathering
3. **Progress Indication**: Visual cues for collected parameters
4. **Match Processing**: Loading animation during calculation
5. **Results Presentation**: Interactive cards with scores
6. **Next Steps**: Application simulation options

## Part 6: Security & Compliance Strategy

### Security Measures

1. **Input Validation**
   - Zod schemas for all API inputs
   - SQL injection prevention
   - XSS protection in chat messages

2. **Data Protection**
   - Environment variables for sensitive config
   - Session-based data isolation
   - No PII storage in logs

3. **Rate Limiting**
   - Per-session message limits
   - API endpoint throttling
   - Gemini API quota management

### Compliance Considerations

1. **Fair Lending**
   - Transparent scoring algorithm
   - Explainable AI decisions
   - No discriminatory factors

2. **Data Privacy**
   - Session data expiration
   - User consent for data collection
   - Clear data usage policies

## Part 7: Implementation Phases

### Phase 1: Foundation (Day 1)
- PostgreSQL setup with schema
- Basic Express server
- Session management
- Load lender data

### Phase 2: Agent System (Day 2)
- Gemini API integration
- Dual-agent architecture
- Parameter tracking logic
- Conversation flow

### Phase 3: Matchmaking (Day 3)
- Scoring algorithm implementation
- Database queries optimization
- Result formatting
- Explainability generation

### Phase 4: Frontend (Day 4)
- React component structure
- Chat interface
- Result displays
- State management

### Phase 5: Integration & Polish (Day 5)
- End-to-end testing
- Security implementation
- Documentation
- Docker configuration

## Part 8: Advanced Features Strategy

### Intelligent Conversation Features

1. **Context Awareness**
   - Remember previous answers
   - Clarify ambiguous inputs
   - Offer relevant suggestions

2. **Error Recovery**
   - Handle invalid inputs gracefully
   - Provide helpful corrections
   - Maintain conversation flow

3. **Dynamic Responses**
   - Vary question phrasing
   - Acknowledge user inputs
   - Provide progress updates

### Enhanced Matching Features

1. **Confidence Scoring**
   - Show match confidence levels
   - Explain uncertainty factors
   - Provide alternative options

2. **Comparison Tools**
   - Side-by-side lender comparison
   - Key differentiator highlights
   - Total cost calculations

## Part 9: Performance Optimization Strategy

### Backend Optimization

1. **Database Performance**
   - Index key columns
   - Connection pooling
   - Query optimization

2. **Caching Strategy**
   - Cache lender data in memory
   - Session data caching
   - Gemini response caching

### Frontend Optimization

1. **React Performance**
   - Lazy loading components
   - Memoization for expensive renders
   - Virtual scrolling for long chats

2. **Network Optimization**
   - Request debouncing
   - Response compression
   - Progressive data loading

## Part 10: Monitoring & Analytics Strategy

### System Monitoring

1. **Performance Metrics**
   - API response times
   - Gemini API latency
   - Database query performance

2. **User Analytics**
   - Conversation completion rates
   - Parameter collection efficiency
   - Match satisfaction metrics

3. **Error Tracking**
   - Failed API calls
   - Agent confusion instances
   - User drop-off points

This comprehensive plan provides a clear roadmap for implementing a sophisticated loan advisor chatbot that showcases advanced technical capabilities while maintaining practical constraints of the assignment.


### NEVER FORGET

Always refer to latest documentation and implementation strategy. Use latest code fixes and code implementation and latest libraries and models. 
Search for whats latest and how to implement using search tool to gather relevant data before implementing.

USE gemini-2.5 flash model and ask for API key when needed to be set in env variable. 

Create a local database for TESTPURPOSE
Create a dev version where it can be tested locally, both the UI and Backend. 

Create a Todo list and ImplementationErrorhistory file 
where you keep track of todo's and update after every cycle 
Also keep track of ImplementationErrorHistory: where you log the errors and how you resolved them
This log should be written in such a way that the model learns how errors were resolved, and what not to repeat again. 
These two files should be part of every iteration, and updated and referred to everytime
Whenver resolving error, always refer to implementationhistory and reason how the previous changes, have failed to resolve the error and rethink how to solve it. Always consider previous error resolving methods to build new strategy and solution for resolving error.

Always search for latest implementation and libraries using search tool. Never use deprecated functions and implementation.