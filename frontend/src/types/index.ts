// Frontend Type Definitions for Loan Advisor Chatbot
// Based on backend interfaces and API structure

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

export interface LenderMatch extends Lender {
  eligibilityScore: number;
  affordabilityScore: number;
  specializationScore: number;
  finalScore: number;
  reasons: string[];
  confidence: number;
}

export interface ChatMessage {
  id: number;
  sessionId: string;
  messageType: 'user' | 'bot';
  content: string;
  agentType?: 'mca' | 'pca';
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

export interface UserSession {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'completed';
  userAgent?: string;
  ipAddress?: string;
}

export interface AgentResponse {
  response: string;
  action: 'collect_parameter' | 'trigger_matching' | 'answer_question' | 'redirect';
  matches?: LenderMatch[];
  parameterUpdate?: {
    name: keyof LoanParameters;
    value: string | number;
  };
  completionPercentage: number;
  requiresInput: boolean;
  suggestedReplies?: string[];
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// API Request/Response Types
export interface ChatMessageRequest {
  sessionId: string;
  message: string;
}

export interface ChatMessageResponse extends APIResponse<AgentResponse> {}

export interface SessionCreateResponse extends APIResponse<{
  sessionId: string;
  session: UserSession;
  tracking: ParameterTracking;
}> {}

export interface ParameterStatusResponse extends APIResponse<{
  sessionId: string;
  completionPercentage: number;
  collectedParameters: Partial<LoanParameters>;
  missingParameters: string[];
  tracking: ParameterTracking;
  isComplete: boolean;
}> {}

export interface MatchResultsResponse extends APIResponse<{
  matches: LenderMatch[];
  totalMatches: number;
  sessionId: string;
  calculatedAt: Date;
  parameters: LoanParameters;
}> {}

export interface ConversationHistoryResponse extends APIResponse<{
  messages: ChatMessage[];
  sessionId: string;
  totalMessages: number;
}> {}

export interface LendersResponse extends APIResponse<{
  lenders: Lender[];
  total: number;
}> {}

// Frontend-specific types
export interface AppState {
  sessionId: string | null;
  isSessionActive: boolean;
  messages: ChatMessage[];
  parameterProgress: ParameterTracking | null;
  matchResults: LenderMatch[] | null;
  currentView: 'chat' | 'results' | 'documents';
  isLoading: boolean;
  error: string | null;
  selectedLender: LenderMatch | null;
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface MessageBubbleProps {
  message: ChatMessage;
  isBot?: boolean;
  onQuickReply?: (reply: string) => void;
}

export interface LenderCardProps {
  lender: LenderMatch;
  onSelect: (lender: LenderMatch) => void;
  onApplyClick: (lenderId: number) => void;
}

export interface ParameterProgressProps {
  tracking: ParameterTracking;
  parameters: Partial<LoanParameters>;
}

export interface DocumentUploadProps {
  lenderName: string;
  onComplete: () => void;
  onClose: () => void;
}

export interface MatchScoreProps {
  score: number;
  maxScore?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export interface QuickReplyProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

// Utility types for error handling
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
};

// Hook return types
export interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  error: ApiError | null;
  sessionId: string | null;
  parameterProgress: ParameterTracking | null;
  matchResults: LenderMatch[] | null;
  clearError: () => void;
  refreshData?: () => Promise<void>;
  loadConversationHistory?: () => Promise<void>;
}

export interface UseSessionReturn {
  sessionId: string | null;
  isActive: boolean;
  createSession: () => Promise<string>;
  endSession: () => Promise<void>;
  error: ApiError | null;
  validateSession?: () => Promise<boolean>;
  cleanup?: () => void;
}

// Constants for the application
export const EMPLOYMENT_OPTIONS = [
  'salaried',
  'self-employed', 
  'freelancer',
  'unemployed'
] as const;

export const LOAN_PURPOSE_OPTIONS = [
  'home',
  'auto', 
  'personal',
  'business',
  'education',
  'debt-consolidation'
] as const;

export const API_ENDPOINTS = {
  CHAT: {
    MESSAGE: '/api/chat/message',
    HISTORY: '/api/chat/history',
    SESSION: '/api/chat/session',
  },
  LOAN: {
    STATUS: '/api/loan/status',
    MATCH: '/api/loan/match',
    RESULTS: '/api/loan/results',
    PARAMETERS: '/api/loan/parameters',
    LENDERS: '/api/loan/lenders',
  },
  HEALTH: '/api/health',
} as const;