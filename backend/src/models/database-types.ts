// Database row type definitions for PostgreSQL query results

export interface LenderRow {
  id: number;
  name: string;
  interest_rate: string;
  min_loan_amount: number;
  max_loan_amount: number;
  min_income: number;
  min_credit_score: number;
  employment_types: string[];
  loan_purpose: string;
  special_eligibility: string;
  processing_time_days: number;
  features: string[];
}

export interface ConversationRow {
  id: number;
  session_id: string;
  message_type: 'user' | 'bot';
  content: string;
  agent_type: 'mca' | 'pca' | null;
  metadata: any;
  created_at: Date;
}

export interface SessionRow {
  id: string;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
  status: 'active' | 'expired' | 'completed';
  user_agent: string | null;
  ip_address: string | null;
}

export interface ParameterTrackingRow {
  session_id: string;
  loan_amount_collected: boolean;
  annual_income_collected: boolean;
  employment_status_collected: boolean;
  credit_score_collected: boolean;
  loan_purpose_collected: boolean;
  completion_percentage: number;
  updated_at: Date;
}

export interface LoanParametersRow {
  session_id: string;
  loan_amount: number | null;
  annual_income: number | null;
  employment_status: string | null;
  credit_score: number | null;
  loan_purpose: string | null;
  debt_to_income_ratio: number | null;
  employment_duration: number | null;
  updated_at: Date;
}

export interface MatchResultRow {
  id: number;
  session_id: string;
  lender_id: number;
  name: string;
  interest_rate: string;
  min_loan_amount: number;
  max_loan_amount: number;
  min_income: number;
  min_credit_score: number;
  employment_types: string[];
  loan_purpose: string;
  special_eligibility: string;
  processing_time_days: number;
  features: string[];
  eligibility_score: number;
  affordability_score: number;
  specialization_score: number;
  final_score: number;
  match_reasons: string[];
  created_at: Date;
}

export interface MessageCountRow {
  user_count: string;
  bot_count: string;
  total_count: string;
}

export interface ConversationSummaryRow {
  message_count: string;
  duration_minutes: string;
  last_activity: Date;
}

export interface RecentConversationRow {
  session_id: string;
  last_message: string;
  message_count: string;
  last_activity: Date;
}

export interface MatchingStatsRow {
  total_matches: string;
  average_score: string;
}

export interface LenderStatsRow {
  name: string;
  match_count: string;
}

// Type guard functions for runtime validation
export function isLenderRow(row: unknown): row is LenderRow {
  return typeof row === 'object' && row !== null && 
         'id' in row && 'name' in row && 'interest_rate' in row;
}

export function isConversationRow(row: unknown): row is ConversationRow {
  return typeof row === 'object' && row !== null && 
         'id' in row && 'session_id' in row && 'message_type' in row;
}

export function isSessionRow(row: unknown): row is SessionRow {
  return typeof row === 'object' && row !== null && 
         'id' in row && 'created_at' in row && 'status' in row;
}

export function isParameterTrackingRow(row: unknown): row is ParameterTrackingRow {
  return typeof row === 'object' && row !== null && 
         'session_id' in row && 'completion_percentage' in row;
}

export function isLoanParametersRow(row: unknown): row is LoanParametersRow {
  return typeof row === 'object' && row !== null && 
         'session_id' in row;
}
