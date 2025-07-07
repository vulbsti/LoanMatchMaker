// Types for ML Training and Inference System

export interface LenderData {
  id: number;
  name: string;
  minLoanAmount: number;
  maxLoanAmount: number;
  minIncome: number;
  employmentTypes: string[];
  minCreditScore: number;
  interestRate: number;
  loanPurpose?: string | undefined;
  specialEligibility?: boolean | undefined;
}

export interface UserProfile {
  loanAmount: number;
  annualIncome: number;
  employmentStatus: 'salaried' | 'self-employed' | 'freelancer' | 'student' | 'unemployed';
  creditScore: number;
  loanPurpose: 'home' | 'vehicle' | 'education' | 'business' | 'startup' | 'eco' | 'emergency' | 'gold-backed' | 'personal';
}

export interface MLFeatures {
  // Normalized numerical features (0-1)
  loanAmountNorm: number;      // loanAmount / 1000000
  annualIncomeNorm: number;    // annualIncome / 500000
  creditScoreNorm: number;     // creditScore / 850
  interestRateNorm: number;    // interestRate / 20
  
  // Binary features
  employmentMatch: number;     // 1 if employment type matches, 0 otherwise
  purposeMatch: number;        // 1 if loan purpose matches, 0 otherwise
  specialEligibility: number;  // 1 if special eligibility applies, 0 otherwise
  
  // Ratio features
  loanToMaxRatio: number;      // loanAmount / maxLoanAmount
  incomeMultiple: number;      // annualIncome / minIncome
  creditBuffer: number;        // (creditScore - minCreditScore) / 550
}

export interface MLTrainingRecord {
  userId: number;
  lenderId: number;
  features: MLFeatures;
  isGoodMatch: number;         // 0 or 1 (binary classification target)
  matchScore: number;          // 0-100 (regression target for ranking)
  user: UserProfile;
  lender: LenderData;
}

export interface MLPrediction {
  lenderId: number;
  lenderName: string;
  matchProbability: number;    // 0-1 from model
  matchScore: number;          // 0-100 for display
  confidence: number;          // Model confidence
  reasons: string[];           // Explainable reasons for the match
}

export interface TrainingConfig {
  numUsers: number;           // Number of synthetic users to generate
  trainTestSplit: number;     // Proportion for training (e.g., 0.8)
  modelType: 'logistic' | 'mlp' | 'decision_tree';
  epochs: number;
  learningRate: number;
  batchSize: number;
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  trainingLoss: number[];
  validationLoss: number[];
}

// Business logic types for synthetic data generation
export interface EligibilityCheck {
  loanAmountInRange: boolean;
  incomeRequirement: boolean;
  creditScoreRequirement: boolean;
  employmentTypeMatch: boolean;
  purposeMatch: boolean;
}

export interface QualityFactors {
  competitiveRate: boolean;
  purposeSpecialization: boolean;
  creditScoreBuffer: boolean;
  incomeBuffer: boolean;
  specialEligibilityBonus: boolean;
}

export interface MatchExplanation {
  eligibilityReasons: string[];
  qualityReasons: string[];
  warningReasons: string[];
  overallRating: 'excellent' | 'good' | 'fair' | 'poor';
}

// ONNX Runtime types
export interface ScalerParams {
  mean: number[];
  std: number[];
  feature_names: string[];
  input_size: number;
}

export interface ONNXInferenceResult {
  probability: number;
  isGoodMatch: boolean;
  matchScore: number;
  features: number[];
  normalizedFeatures: number[];
}