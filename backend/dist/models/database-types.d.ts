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
export declare function isLenderRow(row: unknown): row is LenderRow;
export declare function isConversationRow(row: unknown): row is ConversationRow;
export declare function isSessionRow(row: unknown): row is SessionRow;
export declare function isParameterTrackingRow(row: unknown): row is ParameterTrackingRow;
export declare function isLoanParametersRow(row: unknown): row is LoanParametersRow;
//# sourceMappingURL=database-types.d.ts.map