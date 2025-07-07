import torch
import torch.nn as nn
import numpy as np
import json
import joblib
from typing import List, Dict, Any, Tuple
import os

class LoanMatchingInference:
    """Inference engine for trained loan matching model"""
    
    def __init__(self, model_path: str = "../models"):
        self.model_path = model_path
        self.model = None
        self.scaler = None
        self.metadata = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        self._load_model_artifacts()
    
    def _load_model_artifacts(self):
        """Load trained model, scaler, and metadata"""
        try:
            # Load metadata
            with open(f"{self.model_path}/model_metadata.json", 'r') as f:
                self.metadata = json.load(f)
            
            # Load scaler
            self.scaler = joblib.load(f"{self.model_path}/feature_scaler.pkl")
            
            # Initialize and load model
            from train_model import LoanMatchingModel
            self.model = LoanMatchingModel(
                input_size=self.metadata['input_size'],
                hidden_size=self.metadata['model_config']['hidden_size'],
                dropout=0.0  # No dropout during inference
            )
            
            self.model.load_state_dict(torch.load(
                f"{self.model_path}/loan_matching_model.pth",
                map_location=self.device
            ))
            self.model.to(self.device)
            self.model.eval()
            
            print("Model artifacts loaded successfully!")
            
        except Exception as e:
            print(f"Error loading model artifacts: {e}")
            raise
    
    def extract_features(self, user_profile: Dict[str, Any], lender_data: Dict[str, Any]) -> List[float]:
        """Extract features for a user-lender pair"""
        return [
            # Normalized numerical features (0-1)
            min(user_profile['loanAmount'] / 1000000, 1.0),  # loanAmountNorm
            min(user_profile['annualIncome'] / 500000, 1.0),  # annualIncomeNorm
            user_profile['creditScore'] / 850,  # creditScoreNorm
            lender_data['interestRate'] / 20,  # interestRateNorm
            
            # Binary features
            1.0 if (
                'any' in lender_data.get('employmentTypes', []) or 
                user_profile['employmentStatus'] in lender_data.get('employmentTypes', [])
            ) else 0.0,  # employmentMatch
            
            1.0 if (
                lender_data.get('loanPurpose') == 'any' or 
                lender_data.get('loanPurpose') == user_profile['loanPurpose']
            ) else 0.0,  # purposeMatch
            
            1.0 if lender_data.get('specialEligibility') else 0.0,  # specialEligibility
            
            # Ratio features
            user_profile['loanAmount'] / lender_data['maxLoanAmount'],  # loanToMaxRatio
            (
                user_profile['annualIncome'] / lender_data['minIncome'] 
                if lender_data['minIncome'] > 0 else 1.0
            ),  # incomeMultiple
            max(0, (user_profile['creditScore'] - lender_data['minCreditScore']) / 550),  # creditBuffer
        ]
    
    def predict_single(self, user_profile: Dict[str, Any], lender_data: Dict[str, Any]) -> Tuple[float, bool]:
        """Predict match probability for a single user-lender pair"""
        # Extract features
        features = self.extract_features(user_profile, lender_data)
        
        # Normalize features
        features_array = np.array([features])
        features_scaled = self.scaler.transform(features_array)
        
        # Convert to tensor
        features_tensor = torch.FloatTensor(features_scaled).to(self.device)
        
        # Predict
        with torch.no_grad():
            probability = self.model(features_tensor).item()
        
        # Convert to binary prediction (threshold = 0.5)
        is_good_match = probability > 0.5
        
        return probability, is_good_match
    
    def predict_batch(self, user_profile: Dict[str, Any], lenders: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Predict match probabilities for a user against multiple lenders"""
        results = []
        
        for lender in lenders:
            probability, is_good_match = self.predict_single(user_profile, lender)
            
            results.append({
                'lender_id': lender['id'],
                'lender_name': lender['name'],
                'match_probability': probability,
                'is_good_match': is_good_match,
                'match_score': probability * 100,  # Convert to 0-100 score
                'interest_rate': lender['interestRate']
            })
        
        # Sort by match probability (descending)
        results.sort(key=lambda x: x['match_probability'], reverse=True)
        
        return results
    
    def rank_lenders(self, user_profile: Dict[str, Any], lenders: List[Dict[str, Any]], 
                    top_k: int = 5) -> List[Dict[str, Any]]:
        """Rank lenders for a user and return top K matches"""
        predictions = self.predict_batch(user_profile, lenders)
        
        # Add ranking and additional info
        ranked_results = []
        for i, result in enumerate(predictions[:top_k]):
            result['rank'] = i + 1
            result['explanation'] = self._generate_explanation(result, user_profile, lenders)
            ranked_results.append(result)
        
        return ranked_results
    
    def _generate_explanation(self, result: Dict[str, Any], user_profile: Dict[str, Any], 
                            lenders: List[Dict[str, Any]]) -> str:
        """Generate human-readable explanation for the match"""
        lender = next(l for l in lenders if l['id'] == result['lender_id'])
        
        explanations = []
        
        # Interest rate competitiveness
        avg_rate = 10.5  # Market average
        if lender['interestRate'] < avg_rate:
            explanations.append(f"Competitive interest rate of {lender['interestRate']:.1f}%")
        
        # Purpose match
        if lender.get('loanPurpose') == user_profile['loanPurpose']:
            explanations.append(f"Specializes in {user_profile['loanPurpose']} loans")
        elif lender.get('loanPurpose') == 'any':
            explanations.append("Offers flexible loan purposes")
        
        # Credit score buffer
        credit_buffer = user_profile['creditScore'] - lender['minCreditScore']
        if credit_buffer >= 100:
            explanations.append("Strong credit profile for this lender")
        elif credit_buffer >= 50:
            explanations.append("Good credit fit")
        
        # Income adequacy
        if lender['minIncome'] > 0:
            income_ratio = user_profile['annualIncome'] / lender['minIncome']
            if income_ratio >= 2.0:
                explanations.append("Income well exceeds minimum requirement")
            elif income_ratio >= 1.5:
                explanations.append("Income comfortably meets requirement")
        
        return "; ".join(explanations) if explanations else "Standard eligibility match"
    
    def check_eligibility(self, user_profile: Dict[str, Any], lender_data: Dict[str, Any]) -> Dict[str, bool]:
        """Check basic eligibility criteria"""
        return {
            'loanAmountInRange': lender_data['minLoanAmount'] <= user_profile['loanAmount'] <= lender_data['maxLoanAmount'],
            'incomeRequirement': user_profile['annualIncome'] >= lender_data['minIncome'],
            'creditScoreRequirement': user_profile['creditScore'] >= lender_data['minCreditScore'],
            'employmentTypeMatch': (
                'any' in lender_data.get('employmentTypes', []) or 
                user_profile['employmentStatus'] in lender_data.get('employmentTypes', [])
            ),
            'purposeMatch': (
                lender_data.get('loanPurpose') == 'any' or 
                lender_data.get('loanPurpose') == user_profile['loanPurpose']
            )
        }
    
    def predict_with_eligibility(self, user_profile: Dict[str, Any], lenders: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Predict matches with eligibility filtering"""
        results = []
        
        for lender in lenders:
            # Check eligibility first
            eligibility = self.check_eligibility(user_profile, lender)
            
            if all(eligibility.values()):
                # Only predict for eligible lenders
                probability, is_good_match = self.predict_single(user_profile, lender)
                
                results.append({
                    'lender_id': lender['id'],
                    'lender_name': lender['name'],
                    'match_probability': probability,
                    'is_good_match': is_good_match,
                    'match_score': probability * 100,
                    'interest_rate': lender['interestRate'],
                    'is_eligible': True,
                    'eligibility_details': eligibility
                })
            else:
                # Not eligible
                results.append({
                    'lender_id': lender['id'],
                    'lender_name': lender['name'],
                    'match_probability': 0.0,
                    'is_good_match': False,
                    'match_score': 0.0,
                    'interest_rate': lender['interestRate'],
                    'is_eligible': False,
                    'eligibility_details': eligibility
                })
        
        # Sort eligible matches by probability, then ineligible ones
        eligible_results = [r for r in results if r['is_eligible']]
        ineligible_results = [r for r in results if not r['is_eligible']]
        
        eligible_results.sort(key=lambda x: x['match_probability'], reverse=True)
        
        return eligible_results + ineligible_results

def main():
    """Test the inference engine"""
    try:
        # Initialize inference engine
        inference = LoanMatchingInference()
        
        # Test user profile
        test_user = {
            'loanAmount': 100000,
            'annualIncome': 60000,
            'creditScore': 720,
            'employmentStatus': 'salaried',
            'loanPurpose': 'home'
        }
        
        # Test lender data (simplified for testing)
        test_lenders = [
            {
                'id': 1, 'name': 'FastCash Inc.', 'minLoanAmount': 1000, 'maxLoanAmount': 5000,
                'minIncome': 20000, 'employmentTypes': ['salaried', 'self-employed'],
                'minCreditScore': 600, 'interestRate': 12.5, 'loanPurpose': 'any'
            },
            {
                'id': 2, 'name': 'HomeFund Bank', 'minLoanAmount': 50000, 'maxLoanAmount': 500000,
                'minIncome': 50000, 'employmentTypes': ['salaried'],
                'minCreditScore': 700, 'interestRate': 8.9, 'loanPurpose': 'home'
            }
        ]
        
        # Test predictions
        print("Testing loan matching inference...")
        print(f"User Profile: {test_user}")
        print()
        
        results = inference.predict_with_eligibility(test_user, test_lenders)
        
        for result in results:
            print(f"Lender: {result['lender_name']}")
            print(f"  Eligible: {result['is_eligible']}")
            if result['is_eligible']:
                print(f"  Match Score: {result['match_score']:.1f}")
                print(f"  Probability: {result['match_probability']:.3f}")
                print(f"  Good Match: {result['is_good_match']}")
            print()
        
        print("Inference engine test completed successfully!")
        
    except Exception as e:
        print(f"Error testing inference engine: {e}")

if __name__ == "__main__":
    main()
