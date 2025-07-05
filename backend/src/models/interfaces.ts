// Core interface definitions for the Loan Advisor Chatbot

export interface LoanParameters {
  loanAmount: number;
  annualIncome: number;
  employmentStatus: 'salaried' | 'self-employed' | 'freelancer' | 'unemployed';
  creditScore: number;
  loanPurpose: 'home' | 'auto' | 'personal' | 'business' | 'education' | 'debt-consolidation';
  debtToIncomeRatio?: number;
  employmentDuration?: number;
}

export interface Lender {
  id: number;
  name: string;
  interestRate: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  minIncome: number;
  minCreditScore: number;
  employmentTypes: string[];
  loanPurpose?: string;
  specialEligibility?: string;
  processingTimeDays: number;
  features: string[];
}

export interface ScoringResult {
  eligibilityScore: number;
  affordabilityScore: number;
  specializationScore: number;
  finalScore: number;
  reasons: string[];
}

export interface LenderMatch extends Lender {
  eligibilityScore: number;
  affordabilityScore: number;
  specializationScore: number;
  finalScore: number;
  reasons: string[];
  confidence: number;
}

export interface UserSession {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'completed';
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface ChatMessage {
  id: number;
  sessionId: string;
  messageType: 'user' | 'bot';
  content: string;
  agentType?: 'mca' | 'pca' | undefined;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ParameterTracking {
  sessionId: string;
  loanAmountCollected: boolean;
  annualIncomeCollected: boolean;
  employmentStatusCollected: boolean;
  creditScoreCollected: boolean;
  loanPurposeCollected: boolean;
  completionPercentage: number;
  updatedAt: Date;
}

export interface PCAGuidance {
  action: 'collect_parameter' | 'trigger_matching' | 'answer_question' | 'redirect';
  nextParameter?: keyof LoanParameters;
  priority: 'high' | 'medium' | 'low';
  completionPercentage: number;
  reasoning: string;
  parameterUpdate?: {
    name: keyof LoanParameters;
    value: string | number;
  };
}

export interface MCAResponse {
  response: string;
  tone: 'helpful' | 'encouraging' | 'informative' | 'congratulatory';
  requiresInput: boolean;
  suggestedReplies?: string[] | undefined;
}

export interface AgentResponse {
  response: string;
  action: 'collect_parameter' | 'trigger_matching' | 'answer_question' | 'redirect';
  matches?: LenderMatch[];
  parameterUpdate?: {
    name: keyof LoanParameters;
    value: string | number;
  } | undefined;
  completionPercentage: number;
  requiresInput: boolean;
  suggestedReplies?: string[] | undefined;
}

export interface MessageContext {
  sessionId: string;
  message: string;
  parameters: Partial<LoanParameters>;
  tracking: ParameterTracking;
  conversationHistory: ChatMessage[];
}

export interface SessionData {
  session: UserSession;
  parameters: Partial<LoanParameters>;
  tracking: ParameterTracking;
  conversationHistory: ChatMessage[];
  matches?: LenderMatch[];
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: DatabaseConfig;
  gemini: GeminiConfig;
  sessionSecret: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string | undefined;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  services: {
    database: boolean;
    gemini: boolean;
  };
  uptime: number;
}