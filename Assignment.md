Assignment: Loan Advisor Chatbot Service
Overview
Build a web application (React frontend + Node.js/Express backend, all in TypeScript) that 
allows a borrower to:
1. Chat via a conversational UI,
2. Enter loan application details,
3. Receive a match score and top 3 lender suggestions based on ML-backed 
matchmaking,
4. View a smooth and intuitive interface.
Tech Stack & Requirements
● Frontend: React + TypeScript
● Backend: Node.js + Express + TypeScript + any DB (e.g., PostgreSQL or MongoDB)
● ML component: Simple model (logistic regression, decision tree, or any lightweight 
approach) to rank lenders
● UI: Smooth, chat-like flow for requesting/receiving inputs and displaying results
User Flow
1. Chatbot intro: “Hi, I’m LoanBot ready to find lenders for you!”
2. Collect inputs through chat:
○ Loan amount desired
○ Annual income
○ Employment status (salaried, self-employed, freelancer, student, etc.)
○ Credit score (if known)
○ Loan purpose (home, education, business, etc.)
3. Submit data to the backend API.
4. Backend ML matches lenders and returns:
○ A numeric match score (e.g., 0–100)
○ Top 3 lenders, each with:
■ Name
■ Interest rate
■ Why they were matched (alignment reason)
5. Frontend displays score + lender cards via chat UI.
Bonus Requirements (Optional)
● Explainability: Why each lender was picked (e.g., “Your income matches their 
range,” “Good credit score fit,” etc.).
● Rule-based fallback if ML confidence is low.
● Mobile-responsive UI design.
● Dockerized backend and startup script.
Lender Dataset
Use the 15 sample lenders provided (list them explicitly or include a JSON file). The 
candidate can load it in memory or store it in a DB.
Guidance on the ML Model
● Inputs: (loan amt, income, employment type, credit score, purpose)
● Output: Multi-label score or ranking across the 15 lenders
● Training data: Generate a synthetic dataset using rules (e.g., label “good match” 
when all criteria passed).
● Approach: Fit a simple classification/regression model or use distance-based 
scoring.
● Evaluation: Recommend top 3 with highest predicted scores.
Deliverables
1. Source code in a public git repo with:
○ frontend/ – React app
○ backend/ – Node.js REST API
2. Running instructions (README.md)
3. Screenshot/demo snippet of the chat flow
4. Code comments explaining:
○ Data flow through frontend → backend → ML → response
○ Scoring logic
Sample lenders data: 
[
 {
 "id": 1,
 "name": "FastCash Inc.",
 "minLoanAmount": 1000,
 "maxLoanAmount": 5000,
 "minIncome": 20000,
 "employmentTypes": ["salaried", "self-employed"],
 "minCreditScore": 600,
 "interestRate": 12.5
 },
 {
 "id": 2,
 "name": "HomeFund Bank",
 "minLoanAmount": 50000,
 "maxLoanAmount": 500000,
 "minIncome": 50000,
 "employmentTypes": ["salaried"],
 "minCreditScore": 700,
 "interestRate": 8.9,
 "loanPurpose": "home"
 },
 {
 "id": 3,
 "name": "EduFinance",
 "minLoanAmount": 10000,
 "maxLoanAmount": 200000,
 "minIncome": 0,
 "employmentTypes": ["student"],
 "minCreditScore": 0,
 "interestRate": 6.5,
 "loanPurpose": "education"
 },
 {
 "id": 4,
 "name": "BizGrow Capital",
 "minLoanAmount": 25000,
 "maxLoanAmount": 1000000,
 "minIncome": 100000,
 "employmentTypes": ["self-employed"],
 "minCreditScore": 650,
 "interestRate": 10.5,
 "loanPurpose": "business"
 },
 {
 "id": 5,
 "name": "QuickPay Loans",
 "minLoanAmount": 500,
 "maxLoanAmount": 10000,
 "minIncome": 15000,
 "employmentTypes": ["salaried", "freelancer", "self-employed"],
 "minCreditScore": 580,
 "interestRate": 13.0
 },
 {
 "id": 6,
 "name": "CarCredit Bank",
 "minLoanAmount": 30000,
 "maxLoanAmount": 200000,
 "minIncome": 25000,
 "employmentTypes": ["salaried"],
 "minCreditScore": 660,
 "interestRate": 9.5,
 "loanPurpose": "vehicle"
 },
 {
 "id": 7,
 "name": "PersonalTrust",
 "minLoanAmount": 10000,
 "maxLoanAmount": 50000,
 "minIncome": 20000,
 "employmentTypes": ["salaried", "self-employed"],
 "minCreditScore": 620,
 "interestRate": 11.2
 },
 {
 "id": 8,
 "name": "StartupFund",
 "minLoanAmount": 50000,
 "maxLoanAmount": 1000000,
 "minIncome": 0,
 "employmentTypes": ["self-employed"],
 "minCreditScore": 0,
 "interestRate": 12.0,
 "loanPurpose": "startup"
 },
 {
 "id": 9,
 "name": "StudentLend",
 "minLoanAmount": 5000,
 "maxLoanAmount": 50000,
 "minIncome": 0,
 "employmentTypes": ["student"],
 "minCreditScore": 550,
 "interestRate": 7.0,
 "loanPurpose": "education"
 },
 {
 "id": 10,
 "name": "HouseEasy",
 "minLoanAmount": 100000,
 "maxLoanAmount": 1000000,
 "minIncome": 75000,
 "employmentTypes": ["salaried", "self-employed"],
 "minCreditScore": 720,
 "interestRate": 8.5,
 "loanPurpose": "home"
 },
 {
 "id": 11,
 "name": "FreelanceFlex",
 "minLoanAmount": 5000,
 "maxLoanAmount": 30000,
 "minIncome": 20000,
 "employmentTypes": ["freelancer"],
 "minCreditScore": 600,
 "interestRate": 12.7
 },
 {
 "id": 12,
 "name": "WomenEmpower Finance",
 "minLoanAmount": 10000,
 "maxLoanAmount": 100000,
 "minIncome": 10000,
 "employmentTypes": ["salaried", "self-employed"],
 "minCreditScore": 600,
 "interestRate": 9.8,
 "specialEligibility": "women"
 },
 {
 "id": 13,
 "name": "GreenLoan Co.",
 "minLoanAmount": 5000,
 "maxLoanAmount": 100000,
 "minIncome": 15000,
 "employmentTypes": ["salaried", "self-employed"],
 "minCreditScore": 640,
 "interestRate": 10.1,
 "loanPurpose": "eco"
 },
 {
 "id": 14,
 "name": "EmergencyFund",
 "minLoanAmount": 1000,
 "maxLoanAmount": 20000,
 "minIncome": 10000,
 "employmentTypes": ["any"],
 "minCreditScore": 550,
 "interestRate": 14.5,
 "loanPurpose": "emergency"
 },
 {
 "id": 15,
 "name": "GoldSecure Loans",
 "minLoanAmount": 25000,
 "maxLoanAmount": 150000,
 "minIncome": 30000,
 "employmentTypes": ["salaried", "self-employed"],
 "minCreditScore": 610,
 "interestRate": 9.2,
 "loanPurpose": "gold-backed"
 }
]