import json
import numpy as np
import pandas as pd
import random
from typing import List, Dict, Tuple, Any
from dataclasses import dataclass
import os

@dataclass
class LenderData:
    id: int
    name: str
    minLoanAmount: int
    maxLoanAmount: int
    minIncome: int
    employmentTypes: List[str]
    minCreditScore: int
    interestRate: float
    loanPurpose: str = "any"
    specialEligibility: str = None

@dataclass
class UserProfile:
    loanAmount: int
    annualIncome: int
    employmentStatus: str
    creditScore: int
    loanPurpose: str

class LoanDataGenerator:
    def __init__(self):
        self.lenders = self._load_lenders()
        self.employment_types = ['salaried', 'self-employed', 'freelancer', 'student', 'unemployed']
        self.loan_purposes = ['home', 'vehicle', 'education', 'business', 'startup', 'eco', 'emergency', 'gold-backed', 'personal']
        
    def _load_lenders(self) -> List[LenderData]:
        """Load the 15 lenders from assignment data"""
        lenders_data = [
            {
                "id": 1, "name": "FastCash Inc.", "minLoanAmount": 1000, "maxLoanAmount": 5000,
                "minIncome": 20000, "employmentTypes": ["salaried", "self-employed"],
                "minCreditScore": 600, "interestRate": 12.5, "loanPurpose": "any"
            },
            {
                "id": 2, "name": "HomeFund Bank", "minLoanAmount": 50000, "maxLoanAmount": 500000,
                "minIncome": 50000, "employmentTypes": ["salaried"],
                "minCreditScore": 700, "interestRate": 8.9, "loanPurpose": "home"
            },
            {
                "id": 3, "name": "EduFinance", "minLoanAmount": 10000, "maxLoanAmount": 200000,
                "minIncome": 0, "employmentTypes": ["student"],
                "minCreditScore": 0, "interestRate": 6.5, "loanPurpose": "education"
            },
            {
                "id": 4, "name": "BizGrow Capital", "minLoanAmount": 25000, "maxLoanAmount": 1000000,
                "minIncome": 100000, "employmentTypes": ["self-employed"],
                "minCreditScore": 650, "interestRate": 10.5, "loanPurpose": "business"
            },
            {
                "id": 5, "name": "QuickPay Loans", "minLoanAmount": 500, "maxLoanAmount": 10000,
                "minIncome": 15000, "employmentTypes": ["salaried", "freelancer", "self-employed"],
                "minCreditScore": 580, "interestRate": 13.0, "loanPurpose": "any"
            },
            {
                "id": 6, "name": "CarCredit Bank", "minLoanAmount": 30000, "maxLoanAmount": 200000,
                "minIncome": 25000, "employmentTypes": ["salaried"],
                "minCreditScore": 660, "interestRate": 9.5, "loanPurpose": "vehicle"
            },
            {
                "id": 7, "name": "PersonalTrust", "minLoanAmount": 10000, "maxLoanAmount": 50000,
                "minIncome": 20000, "employmentTypes": ["salaried", "self-employed"],
                "minCreditScore": 620, "interestRate": 11.2, "loanPurpose": "any"
            },
            {
                "id": 8, "name": "StartupFund", "minLoanAmount": 50000, "maxLoanAmount": 1000000,
                "minIncome": 0, "employmentTypes": ["self-employed"],
                "minCreditScore": 0, "interestRate": 12.0, "loanPurpose": "startup"
            },
            {
                "id": 9, "name": "StudentLend", "minLoanAmount": 5000, "maxLoanAmount": 50000,
                "minIncome": 0, "employmentTypes": ["student"],
                "minCreditScore": 550, "interestRate": 7.0, "loanPurpose": "education"
            },
            {
                "id": 10, "name": "HouseEasy", "minLoanAmount": 100000, "maxLoanAmount": 1000000,
                "minIncome": 75000, "employmentTypes": ["salaried", "self-employed"],
                "minCreditScore": 720, "interestRate": 8.5, "loanPurpose": "home"
            },
            {
                "id": 11, "name": "FreelanceFlex", "minLoanAmount": 5000, "maxLoanAmount": 30000,
                "minIncome": 20000, "employmentTypes": ["freelancer"],
                "minCreditScore": 600, "interestRate": 12.7, "loanPurpose": "any"
            },
            {
                "id": 12, "name": "WomenEmpower Finance", "minLoanAmount": 10000, "maxLoanAmount": 100000,
                "minIncome": 10000, "employmentTypes": ["salaried", "self-employed"],
                "minCreditScore": 600, "interestRate": 9.8, "specialEligibility": "women"
            },
            {
                "id": 13, "name": "GreenLoan Co.", "minLoanAmount": 5000, "maxLoanAmount": 100000,
                "minIncome": 15000, "employmentTypes": ["salaried", "self-employed"],
                "minCreditScore": 640, "interestRate": 10.1, "loanPurpose": "eco"
            },
            {
                "id": 14, "name": "EmergencyFund", "minLoanAmount": 1000, "maxLoanAmount": 20000,
                "minIncome": 10000, "employmentTypes": ["any"],
                "minCreditScore": 550, "interestRate": 14.5, "loanPurpose": "emergency"
            },
            {
                "id": 15, "name": "GoldSecure Loans", "minLoanAmount": 25000, "maxLoanAmount": 150000,
                "minIncome": 30000, "employmentTypes": ["salaried", "self-employed"],
                "minCreditScore": 610, "interestRate": 9.2, "loanPurpose": "gold-backed"
            }
        ]
        
        return [LenderData(**data) for data in lenders_data]
    
    def generate_random_user(self) -> UserProfile:
        """Generate a realistic random user profile"""
        # Generate correlated user data
        employment = random.choice(self.employment_types)
        
        # Generate realistic income based on employment type
        if employment == 'student':
            income = random.randint(0, 30000)
        elif employment == 'unemployed':
            income = random.randint(0, 15000)
        elif employment == 'freelancer':
            income = random.randint(15000, 150000)
        elif employment == 'self-employed':
            income = random.randint(25000, 300000)
        else:  # salaried
            income = random.randint(20000, 200000)
        
        # Generate realistic credit score based on income and employment
        if employment in ['student', 'unemployed']:
            credit_score = random.randint(300, 650)
        elif income < 30000:
            credit_score = random.randint(550, 700)
        elif income < 75000:
            credit_score = random.randint(600, 750)
        else:
            credit_score = random.randint(650, 850)
        
        # Generate loan amount based on income and purpose
        purpose = random.choice(self.loan_purposes)
        
        if purpose in ['home']:
            loan_amount = random.randint(50000, max(100000, min(income * 5, 1000000)))
        elif purpose in ['vehicle']:
            loan_amount = random.randint(15000, max(30000, min(income * 3, 200000)))
        elif purpose in ['education']:
            loan_amount = random.randint(5000, max(25000, min(max(income, 50000), 200000)))
        elif purpose in ['business', 'startup']:
            loan_amount = random.randint(25000, max(50000, min(income * 4, 1000000)))
        else:  # personal, emergency, etc.
            loan_amount = random.randint(1000, max(10000, min(income * 2, 100000)))
        
        return UserProfile(
            loanAmount=loan_amount,
            annualIncome=income,
            employmentStatus=employment,
            creditScore=credit_score,
            loanPurpose=purpose
        )
    
    def check_eligibility(self, user: UserProfile, lender: LenderData) -> Dict[str, bool]:
        """Check if user meets lender's basic eligibility criteria"""
        return {
            'loanAmountInRange': lender.minLoanAmount <= user.loanAmount <= lender.maxLoanAmount,
            'incomeRequirement': user.annualIncome >= lender.minIncome,
            'creditScoreRequirement': user.creditScore >= lender.minCreditScore,
            'employmentTypeMatch': 'any' in lender.employmentTypes or user.employmentStatus in lender.employmentTypes,
            'purposeMatch': lender.loanPurpose == 'any' or lender.loanPurpose == user.loanPurpose
        }
    
    def calculate_quality_score(self, user: UserProfile, lender: LenderData) -> float:
        """Calculate quality score based on how good the match is"""
        score = 0.0
        max_score = 0.0
        
        # Interest rate competitiveness (25%)
        avg_rate = 10.5  # Market average
        if lender.interestRate < avg_rate:
            score += 25 * (avg_rate - lender.interestRate) / avg_rate
        max_score += 25
        
        # Purpose specialization (25%)
        if lender.loanPurpose == user.loanPurpose:
            score += 25
        elif lender.loanPurpose == 'any':
            score += 10  # Generic lenders get partial credit
        max_score += 25
        
        # Credit score buffer (25%)
        credit_buffer = user.creditScore - lender.minCreditScore
        if credit_buffer >= 100:
            score += 25
        elif credit_buffer >= 50:
            score += 20
        elif credit_buffer >= 20:
            score += 15
        elif credit_buffer >= 0:
            score += 10
        max_score += 25
        
        # Income buffer (25%)
        if lender.minIncome > 0:
            income_ratio = user.annualIncome / lender.minIncome
            if income_ratio >= 3.0:
                score += 25
            elif income_ratio >= 2.0:
                score += 20
            elif income_ratio >= 1.5:
                score += 15
            elif income_ratio >= 1.0:
                score += 10
        else:
            score += 15  # Partial credit for no income requirement
        max_score += 25
        
        return min(1.0, score / max_score)
    
    def determine_match_label(self, user: UserProfile, lender: LenderData) -> Tuple[int, float]:
        """Determine if this is a good match and calculate match score"""
        eligibility = self.check_eligibility(user, lender)
        
        # Must pass all eligibility checks
        if not all(eligibility.values()):
            return 0, 0.0
        
        # Calculate quality score
        quality_score = self.calculate_quality_score(user, lender)
        
        # Binary classification: good match if quality >= 0.6
        is_good_match = 1 if quality_score >= 0.6 else 0
        
        # Regression score: 0-100 based on quality
        match_score = quality_score * 100
        
        return is_good_match, match_score
    
    def extract_features(self, user: UserProfile, lender: LenderData) -> List[float]:
        """Extract normalized features for ML model"""
        return [
            # Normalized numerical features (0-1)
            min(user.loanAmount / 1000000, 1.0),  # loanAmountNorm
            min(user.annualIncome / 500000, 1.0),  # annualIncomeNorm
            user.creditScore / 850,  # creditScoreNorm
            lender.interestRate / 20,  # interestRateNorm
            
            # Binary features
            1.0 if ('any' in lender.employmentTypes or user.employmentStatus in lender.employmentTypes) else 0.0,  # employmentMatch
            1.0 if (lender.loanPurpose == 'any' or lender.loanPurpose == user.loanPurpose) else 0.0,  # purposeMatch
            1.0 if lender.specialEligibility else 0.0,  # specialEligibility
            
            # Ratio features
            user.loanAmount / lender.maxLoanAmount,  # loanToMaxRatio
            (user.annualIncome / lender.minIncome) if lender.minIncome > 0 else 1.0,  # incomeMultiple
            max(0, (user.creditScore - lender.minCreditScore) / 550),  # creditBuffer
        ]
    
    def generate_training_dataset(self, num_users: int = 2000) -> pd.DataFrame:
        """Generate complete training dataset"""
        training_data = []
        
        print(f"Generating training data for {num_users} users across {len(self.lenders)} lenders...")
        
        for user_id in range(num_users):
            if user_id % 200 == 0:
                print(f"Generated {user_id} users...")
            
            user = self.generate_random_user()
            
            # Evaluate this user against all lenders
            for lender in self.lenders:
                is_good_match, match_score = self.determine_match_label(user, lender)
                features = self.extract_features(user, lender)
                
                training_data.append({
                    'user_id': user_id,
                    'lender_id': lender.id,
                    'lender_name': lender.name,
                    'is_good_match': is_good_match,
                    'match_score': match_score,
                    'features': features,
                    # Store user and lender data for analysis
                    'user_loan_amount': user.loanAmount,
                    'user_income': user.annualIncome,
                    'user_credit_score': user.creditScore,
                    'user_employment': user.employmentStatus,
                    'user_purpose': user.loanPurpose,
                    'lender_interest_rate': lender.interestRate,
                    'lender_purpose': lender.loanPurpose
                })
        
        df = pd.DataFrame(training_data)
        
        # Add feature columns
        feature_names = [
            'loan_amount_norm', 'annual_income_norm', 'credit_score_norm', 'interest_rate_norm',
            'employment_match', 'purpose_match', 'special_eligibility',
            'loan_to_max_ratio', 'income_multiple', 'credit_buffer'
        ]
        
        features_df = pd.DataFrame(df['features'].tolist(), columns=feature_names)
        df = pd.concat([df, features_df], axis=1)
        
        print(f"Generated {len(df)} training records")
        print(f"Positive matches: {df['is_good_match'].sum()} ({df['is_good_match'].mean():.2%})")
        
        return df
    
    def save_dataset(self, df: pd.DataFrame, filename: str = "loan_training_data.csv"):
        """Save training dataset to file"""
        os.makedirs("../data", exist_ok=True)
        filepath = f"../data/{filename}"
        df.to_csv(filepath, index=False)
        print(f"Dataset saved to {filepath}")
        
        # Save summary statistics
        summary = {
            'total_records': len(df),
            'positive_matches': int(df['is_good_match'].sum()),
            'positive_rate': float(df['is_good_match'].mean()),
            'avg_match_score': float(df['match_score'].mean()),
            'feature_stats': {
                col: {
                    'mean': float(df[col].mean()),
                    'std': float(df[col].std()),
                    'min': float(df[col].min()),
                    'max': float(df[col].max())
                }
                for col in ['loan_amount_norm', 'annual_income_norm', 'credit_score_norm']
            }
        }
        
        with open(f"../data/dataset_summary.json", "w") as f:
            json.dump(summary, f, indent=2)
        
        return filepath

if __name__ == "__main__":
    generator = LoanDataGenerator()
    
    # Generate training dataset
    df = generator.generate_training_dataset(num_users=2000)
    
    # Save dataset
    filepath = generator.save_dataset(df)
    
    print(f"\nDataset generation complete!")
    print(f"Dataset saved to: {filepath}")
    print(f"Total records: {len(df)}")
    print(f"Positive match rate: {df['is_good_match'].mean():.2%}")
