#!/usr/bin/env python3
"""
Test script for ML model integration
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from model_inference import LoanMatchingInference

def test_ml_integration():
    """Test the ML model with realistic scenarios"""
    print("🚀 Testing ML-based Loan Matching System")
    print("=" * 50)
    
    # Initialize inference engine
    try:
        inference = LoanMatchingInference()
        print("✅ Model loaded successfully!")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return
    
    # Test scenarios
    test_scenarios = [
        {
            "name": "High-income home buyer",
            "user": {
                'loanAmount': 200000,
                'annualIncome': 80000,
                'creditScore': 750,
                'employmentStatus': 'salaried',
                'loanPurpose': 'home'
            }
        },
        {
            "name": "Vehicle loan seeker",
            "user": {
                'loanAmount': 25000,
                'annualIncome': 45000,
                'creditScore': 680,
                'employmentStatus': 'salaried',
                'loanPurpose': 'vehicle'
            }
        },
        {
            "name": "Student education loan",
            "user": {
                'loanAmount': 15000,
                'annualIncome': 0,
                'creditScore': 600,
                'employmentStatus': 'student',
                'loanPurpose': 'education'
            }
        },
        {
            "name": "Business startup loan",
            "user": {
                'loanAmount': 100000,
                'annualIncome': 120000,
                'creditScore': 720,
                'employmentStatus': 'self-employed',
                'loanPurpose': 'startup'
            }
        }
    ]
    
    # Load all lenders (simplified version of the 15 from assignment)
    all_lenders = [
        {
            'id': 1, 'name': 'FastCash Inc.', 'minLoanAmount': 1000, 'maxLoanAmount': 50000,
            'minIncome': 20000, 'employmentTypes': ['salaried', 'self-employed'],
            'minCreditScore': 600, 'interestRate': 12.5, 'loanPurpose': 'any'
        },
        {
            'id': 2, 'name': 'HomeFund Bank', 'minLoanAmount': 50000, 'maxLoanAmount': 500000,
            'minIncome': 50000, 'employmentTypes': ['salaried'],
            'minCreditScore': 700, 'interestRate': 8.9, 'loanPurpose': 'home'
        },
        {
            'id': 3, 'name': 'EduFinance', 'minLoanAmount': 10000, 'maxLoanAmount': 200000,
            'minIncome': 0, 'employmentTypes': ['student'],
            'minCreditScore': 0, 'interestRate': 6.5, 'loanPurpose': 'education'
        },
        {
            'id': 6, 'name': 'CarCredit Bank', 'minLoanAmount': 30000, 'maxLoanAmount': 200000,
            'minIncome': 25000, 'employmentTypes': ['salaried'],
            'minCreditScore': 660, 'interestRate': 9.5, 'loanPurpose': 'vehicle'
        },
        {
            'id': 8, 'name': 'StartupFund', 'minLoanAmount': 50000, 'maxLoanAmount': 1000000,
            'minIncome': 0, 'employmentTypes': ['self-employed'],
            'minCreditScore': 0, 'interestRate': 12.0, 'loanPurpose': 'startup'
        }
    ]
    
    # Test each scenario
    for scenario in test_scenarios:
        print(f"\n🎯 Testing: {scenario['name']}")
        print(f"   User: {scenario['user']['loanPurpose']} loan of ${scenario['user']['loanAmount']:,}")
        print(f"   Income: ${scenario['user']['annualIncome']:,}, Credit: {scenario['user']['creditScore']}")
        
        try:
            # Get predictions
            results = inference.predict_with_eligibility(scenario['user'], all_lenders)
            
            # Show eligible matches
            eligible_matches = [r for r in results if r['is_eligible']]
            
            if eligible_matches:
                print(f"   ✅ Found {len(eligible_matches)} eligible lender(s):")
                for match in eligible_matches[:3]:  # Top 3
                    print(f"      • {match['lender_name']}: {match['match_score']:.1f}% match" + 
                          f" (Rate: {match['interest_rate']:.1f}%)")
            else:
                print("   ❌ No eligible lenders found")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 ML Integration Test Complete!")

if __name__ == "__main__":
    test_ml_integration()
