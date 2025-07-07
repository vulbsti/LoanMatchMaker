-- Update lenders table to match Assignment.md data and align with UserProfile types
-- This script updates the lender data to be consistent with the ML training types

-- First, clear existing lender data
DELETE FROM lenders;

-- Insert the 15 lenders from Assignment.md with correct loan purpose mappings
INSERT INTO lenders (id, name, interest_rate, min_loan_amount, max_loan_amount, min_income, min_credit_score, employment_types, loan_purpose, special_eligibility, processing_time_days, features) VALUES
(1, 'FastCash Inc.', 12.5, 1000, 5000, 20000, 600, ARRAY['salaried', 'self-employed'], NULL, NULL, 3, ARRAY['Fast approval', 'No prepayment penalty']),
(2, 'HomeFund Bank', 8.9, 50000, 500000, 50000, 700, ARRAY['salaried'], 'home', NULL, 30, ARRAY['Low interest rates', 'Flexible terms']),
(3, 'EduFinance', 6.5, 10000, 200000, 0, 0, ARRAY['student'], 'education', NULL, 14, ARRAY['Student-friendly', 'Deferred payment options']),
(4, 'BizGrow Capital', 10.5, 25000, 1000000, 100000, 650, ARRAY['self-employed'], 'business', NULL, 21, ARRAY['Business-focused', 'Revenue-based approval']),
(5, 'QuickPay Loans', 13.0, 500, 10000, 15000, 580, ARRAY['salaried', 'freelancer', 'self-employed'], NULL, NULL, 5, ARRAY['Flexible eligibility', 'Quick processing']),
(6, 'CarCredit Bank', 9.5, 30000, 200000, 25000, 660, ARRAY['salaried'], 'vehicle', NULL, 7, ARRAY['Vehicle specialist', 'Same day approval']),
(7, 'PersonalTrust', 11.2, 10000, 50000, 20000, 620, ARRAY['salaried', 'self-employed'], 'personal', NULL, 10, ARRAY['Personal loan specialist', 'Flexible terms']),
(8, 'StartupFund', 12.0, 50000, 1000000, 0, 0, ARRAY['self-employed'], 'startup', NULL, 30, ARRAY['Startup-focused', 'Mentorship support']),
(9, 'StudentLend', 7.0, 5000, 50000, 0, 550, ARRAY['student'], 'education', NULL, 20, ARRAY['Student loans', 'Low rates for students']),
(10, 'HouseEasy', 8.5, 100000, 1000000, 75000, 720, ARRAY['salaried', 'self-employed'], 'home', NULL, 45, ARRAY['Home loan specialist', 'Premium rates']),
(11, 'FreelanceFlex', 12.7, 5000, 30000, 20000, 600, ARRAY['freelancer'], NULL, NULL, 15, ARRAY['Freelancer-friendly', 'Flexible income verification']),
(12, 'WomenEmpower Finance', 9.8, 10000, 100000, 10000, 600, ARRAY['salaried', 'self-employed'], NULL, 'women', 12, ARRAY['Women-focused', 'Special rates']),
(13, 'GreenLoan Co.', 10.1, 5000, 100000, 15000, 640, ARRAY['salaried', 'self-employed'], 'eco', NULL, 25, ARRAY['Eco-friendly projects', 'Green incentives']),
(14, 'EmergencyFund', 14.5, 1000, 20000, 10000, 550, ARRAY['salaried', 'self-employed', 'freelancer', 'student', 'unemployed'], 'emergency', NULL, 1, ARRAY['Emergency loans', 'Instant approval']),
(15, 'GoldSecure Loans', 9.2, 25000, 150000, 30000, 610, ARRAY['salaried', 'self-employed'], 'gold-backed', NULL, 7, ARRAY['Gold-backed loans', 'Low rates']);

-- Reset sequence for the ID column
SELECT setval('lenders_id_seq', 15, true);

-- Verify the data
SELECT id, name, loan_purpose, employment_types FROM lenders ORDER BY id;
