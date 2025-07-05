-- PostgreSQL Database Schema for Loan Advisor Chatbot
-- This script initializes the database with all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    is_complete BOOLEAN DEFAULT FALSE,
    UNIQUE(session_id)
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

-- Database Indexes for Performance
CREATE INDEX idx_sessions_status ON user_sessions(status);
CREATE INDEX idx_conversation_session ON conversation_history(session_id, created_at);
CREATE INDEX idx_match_results_session ON match_results(session_id, final_score DESC);
CREATE INDEX idx_lenders_criteria ON lenders(min_loan_amount, max_loan_amount, min_income, min_credit_score);
CREATE INDEX idx_parameters_session ON loan_parameters(session_id);
CREATE INDEX idx_tracking_session ON parameter_tracking(session_id);

-- Insert sample lender data
INSERT INTO lenders (name, interest_rate, min_loan_amount, max_loan_amount, min_income, min_credit_score, employment_types, loan_purpose, special_eligibility, processing_time_days, features) VALUES
('QuickCash Personal Loans', 8.99, 1000, 50000, 25000, 650, ARRAY['salaried', 'self-employed'], 'personal', NULL, 3, ARRAY['Fast approval', 'No prepayment penalty']),
('HomeFirst Mortgage', 3.25, 50000, 500000, 50000, 700, ARRAY['salaried', 'self-employed'], 'home', NULL, 30, ARRAY['Low interest rates', 'Flexible terms']),
('AutoLoan Express', 4.5, 5000, 100000, 30000, 600, ARRAY['salaried', 'self-employed'], 'auto', NULL, 7, ARRAY['Same day approval', 'No down payment required']),
('StudentAid Finance', 5.5, 1000, 75000, 0, 550, ARRAY['salaried', 'self-employed', 'unemployed'], 'education', 'Students and graduates', 14, ARRAY['Deferred payment options', 'Low rates for students']),
('BusinessGrow Capital', 7.25, 10000, 250000, 75000, 680, ARRAY['self-employed'], 'business', 'Business owners', 21, ARRAY['Business-focused', 'Revenue-based approval']),
('DebtFree Solutions', 6.75, 5000, 100000, 40000, 620, ARRAY['salaried', 'self-employed'], 'debt-consolidation', NULL, 10, ARRAY['Debt consolidation specialist', 'Lower monthly payments']),
('FlexiLoan Bank', 9.5, 2000, 75000, 20000, 580, ARRAY['salaried', 'self-employed', 'freelancer'], 'personal', NULL, 5, ARRAY['Flexible eligibility', 'Quick processing']),
('PremiumHome Loans', 3.15, 100000, 500000, 80000, 750, ARRAY['salaried'], 'home', 'High-income earners', 45, ARRAY['Premium rates', 'Dedicated service']),
('EcoAuto Finance', 3.99, 10000, 80000, 35000, 640, ARRAY['salaried', 'self-employed'], 'auto', 'Eco-friendly vehicles', 10, ARRAY['Green vehicle incentives', 'Low rates']),
('StartupLoan Pro', 8.5, 15000, 200000, 60000, 700, ARRAY['self-employed'], 'business', 'Startups and SMEs', 30, ARRAY['Startup-friendly', 'Mentorship support']),
('GradSchool Finance', 4.25, 5000, 150000, 0, 600, ARRAY['salaried', 'unemployed'], 'education', 'Graduate students', 20, ARRAY['Graduate-focused', 'Flexible repayment']),
('CashAdvance Plus', 12.99, 500, 25000, 15000, 500, ARRAY['salaried', 'self-employed', 'freelancer'], 'personal', NULL, 1, ARRAY['Instant approval', 'No credit check']),
('LuxuryAuto Loans', 2.99, 25000, 150000, 100000, 750, ARRAY['salaried'], 'auto', 'Luxury vehicles', 14, ARRAY['Luxury vehicle specialist', 'Premium rates']),
('ConsolidateNow', 5.99, 10000, 150000, 50000, 650, ARRAY['salaried', 'self-employed'], 'debt-consolidation', NULL, 12, ARRAY['Debt management tools', 'Fixed rates']),
('VeteranLoan Services', 4.75, 5000, 100000, 30000, 580, ARRAY['salaried', 'self-employed'], 'personal', 'Veterans and military', 15, ARRAY['Veteran benefits', 'Reduced rates']);

-- Create function to update parameter tracking
CREATE OR REPLACE FUNCTION update_parameter_tracking()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate completion percentage
    NEW.completion_percentage := (
        (CASE WHEN NEW.loan_amount_collected THEN 1 ELSE 0 END) +
        (CASE WHEN NEW.annual_income_collected THEN 1 ELSE 0 END) +
        (CASE WHEN NEW.employment_status_collected THEN 1 ELSE 0 END) +
        (CASE WHEN NEW.credit_score_collected THEN 1 ELSE 0 END) +
        (CASE WHEN NEW.loan_purpose_collected THEN 1 ELSE 0 END)
    ) * 20; -- 5 parameters, each worth 20%
    
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for parameter tracking updates
CREATE TRIGGER trigger_update_parameter_tracking
    BEFORE UPDATE ON parameter_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_parameter_tracking();

-- Create function to auto-expire sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    UPDATE user_sessions 
    SET status = 'expired' 
    WHERE expires_at < CURRENT_TIMESTAMP AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX idx_lenders_rates ON lenders(interest_rate);
CREATE INDEX idx_lenders_loan_purpose ON lenders(loan_purpose);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_match_results_score ON match_results(final_score DESC);

COMMIT;