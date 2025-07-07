import * as ort from 'onnxruntime-node';
import * as fs from 'fs';
import * as path from 'path';
import { UserProfile, LenderData, MLPrediction, ScalerParams, ONNXInferenceResult } from './types';

export class ONNXMLAdapter {
  private session: ort.InferenceSession | null = null;
  private scalerParams: ScalerParams | null = null;
  private metadata: any = null;
  private isLoaded = false;

  constructor(private modelsPath: string = path.join(__dirname, 'models')) {}

  async initialize(): Promise<void> {
    try {
      console.log('Initializing ONNX ML Adapter...');
      
      // Load metadata
      const metadataPath = path.join(this.modelsPath, 'model_metadata.json');
      if (!fs.existsSync(metadataPath)) {
        throw new Error(`Model metadata not found at: ${metadataPath}`);
      }
      this.metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

      // Load scaler parameters
      const scalerPath = path.join(this.modelsPath, 'scaler_params.json');
      if (!fs.existsSync(scalerPath)) {
        throw new Error(`Scaler parameters not found at: ${scalerPath}`);
      }
      this.scalerParams = JSON.parse(fs.readFileSync(scalerPath, 'utf8'));

      // Load ONNX model
      const modelPath = path.join(this.modelsPath, 'loan_matching_model.onnx');
      if (!fs.existsSync(modelPath)) {
        throw new Error(`ONNX model not found at: ${modelPath}`);
      }
      this.session = await ort.InferenceSession.create(modelPath);

      this.isLoaded = true;
      console.log('✅ ONNX model loaded successfully!');
      
      if (this.scalerParams) {
        console.log(`📊 Input size: ${this.scalerParams.input_size}`);
        if (this.scalerParams.feature_names) {
          console.log(`🔧 Features: ${this.scalerParams.feature_names.join(', ')}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load ONNX model:', error);
      throw error;
    }
  }

  async checkSetup(): Promise<{ isReady: boolean; message: string }> {
    try {
      const modelPath = path.join(this.modelsPath, 'loan_matching_model.onnx');
      const metadataPath = path.join(this.modelsPath, 'model_metadata.json');
      const scalerPath = path.join(this.modelsPath, 'scaler_params.json');

      if (!fs.existsSync(modelPath)) {
        return {
          isReady: false,
          message: 'ONNX model not found. Run export_onnx.py first.'
        };
      }

      if (!fs.existsSync(metadataPath)) {
        return {
          isReady: false,
          message: 'Model metadata not found.'
        };
      }

      if (!fs.existsSync(scalerPath)) {
        return {
          isReady: false,
          message: 'Scaler parameters not found.'
        };
      }

      return {
        isReady: true,
        message: 'ONNX model setup is complete.'
      };
    } catch (error) {
      return {
        isReady: false,
        message: `Setup check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private extractFeatures(userProfile: UserProfile, lenderData: LenderData): number[] {
    return [
      // Normalized numerical features (0-1)
      Math.min(userProfile.loanAmount / 1000000, 1.0),  // loanAmountNorm
      Math.min(userProfile.annualIncome / 500000, 1.0),  // annualIncomeNorm
      userProfile.creditScore / 850,  // creditScoreNorm
      lenderData.interestRate / 20,  // interestRateNorm
      
      // Binary features
      (
        lenderData.employmentTypes.includes('any') || 
        lenderData.employmentTypes.includes(userProfile.employmentStatus)
      ) ? 1.0 : 0.0,  // employmentMatch
      
      (
        lenderData.loanPurpose === 'any' || 
        lenderData.loanPurpose === userProfile.loanPurpose
      ) ? 1.0 : 0.0,  // purposeMatch
      
      (lenderData.specialEligibility ? 1.0 : 0.0),  // specialEligibility
      
      // Ratio features
      userProfile.loanAmount / lenderData.maxLoanAmount,  // loanToMaxRatio
      lenderData.minIncome > 0 ? userProfile.annualIncome / lenderData.minIncome : 1.0,  // incomeMultiple
      Math.max(0, (userProfile.creditScore - lenderData.minCreditScore) / 550),  // creditBuffer
    ];
  }

  private normalizeFeatures(features: number[]): number[] {
    if (!this.scalerParams) {
      throw new Error('Scaler parameters not loaded');
    }

    if (!this.scalerParams.mean || !this.scalerParams.std) {
      throw new Error('Scaler parameters mean or std not available');
    }

    const normalized: number[] = [];
    const { mean, std } = this.scalerParams!;
    
    for (let i = 0; i < features.length; i++) {
      if (i >= mean.length || i >= std.length) {
        throw new Error(`Feature index ${i} out of bounds for scaler parameters`);
      }
      const meanVal = mean[i];
      const stdVal = std[i];
      const featureVal = features[i];
      
      if (meanVal === undefined || stdVal === undefined || featureVal === undefined) {
        throw new Error(`Parameter undefined at index ${i}`);
      }
      
      const normalizedValue = (featureVal - meanVal) / stdVal;
      normalized.push(normalizedValue);
    }
    return normalized;
  }

  async predict(userProfile: UserProfile, lenderData: LenderData): Promise<ONNXInferenceResult> {
    if (!this.session) {
      throw new Error('Model not loaded. Call initialize() first.');
    }

    if (!this.scalerParams) {
      throw new Error('Scaler parameters not loaded. Call initialize() first.');
    }

    try {
      // Extract and normalize features
      const features = this.extractFeatures(userProfile, lenderData);
      const normalizedFeatures = this.normalizeFeatures(features);

      // Create input tensor - ONNX expects Float32Array
      const inputTensor = new ort.Tensor('float32', new Float32Array(normalizedFeatures), [1, normalizedFeatures.length]);

      // Run inference
      const feeds = { input: inputTensor };
      const results = await this.session.run(feeds);
      
      // Get output (probability) - handle all possible output formats
      const outputKey = this.session.outputNames?.[0];
      if (!outputKey) {
        throw new Error('ONNX model output name is undefined.');
      }
      
      const output = results[outputKey];
      
      if (!output?.data || output.data.length === 0) {
        throw new Error('ONNX model output is undefined or empty.');
      }

      let probability: number;
      
      // Handle different output shapes
      if (output.data.length === 1) {
        probability = Number(output.data[0]);
      } else if (Array.isArray(output.data) && output.data.length > 0) {
        probability = Number(output.data[0]);
      } else {
        throw new Error(`Unexpected output format: ${typeof output.data}, length: ${output.data.length}`);
      }

      // Ensure probability is a valid number between 0 and 1
      if (typeof probability !== 'number' || isNaN(probability)) {
        throw new Error(`Invalid probability value: ${probability}`);
      }

      probability = Math.max(0, Math.min(1, probability));

      return {
        probability,
        isGoodMatch: probability > 0.5,
        matchScore: probability * 100,
        features,
        normalizedFeatures
      };

    } catch (error) {
      console.error('Error during ONNX prediction:', error);
      throw new Error(`ONNX prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTopRecommendations(
    userProfile: UserProfile, 
    lenders: LenderData[], 
    topK: number = 3
  ): Promise<MLPrediction[]> {
    if (!this.isLoaded) {
      throw new Error('Model not loaded. Call initialize() first.');
    }

    const predictions: MLPrediction[] = [];

    for (const lender of lenders) {
      try {
        const result = await this.predict(userProfile, lender);
        
        predictions.push({
          lenderId: lender.id,
          lenderName: lender.name,
          matchProbability: result.probability,
          matchScore: result.matchScore,
          confidence: result.probability,
          reasons: this.generateReasons(userProfile, lender, result)
        });

      } catch (error) {
        console.warn(`Failed to predict for lender ${lender.id}:`, error);
        // Add a default prediction with 0 score
        predictions.push({
          lenderId: lender.id,
          lenderName: lender.name,
          matchProbability: 0,
          matchScore: 0,
          confidence: 0,
          reasons: ['Prediction failed']
        });
      }
    }

    // Sort by match score (descending) and return top K
    return predictions
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, topK);
  }

  private generateReasons(userProfile: UserProfile, lender: LenderData, result: ONNXInferenceResult): string[] {
    const reasons: string[] = [];

    // Basic eligibility checks
    if (userProfile.creditScore >= lender.minCreditScore) {
      const buffer = userProfile.creditScore - lender.minCreditScore;
      if (buffer >= 100) {
        reasons.push('Strong credit profile');
      } else if (buffer >= 50) {
        reasons.push('Good credit fit');
      } else {
        reasons.push('Meets credit requirement');
      }
    }

    if (userProfile.annualIncome >= lender.minIncome) {
      const ratio = userProfile.annualIncome / lender.minIncome;
      if (ratio >= 2.0) {
        reasons.push('Income well exceeds requirement');
      } else if (ratio >= 1.5) {
        reasons.push('Income comfortably meets requirement');
      } else {
        reasons.push('Meets income requirement');
      }
    }

    // Interest rate competitiveness
    if (lender.interestRate < 10) {
      reasons.push('Competitive interest rate');
    } else if (lender.interestRate < 12) {
      reasons.push('Reasonable interest rate');
    }

    // Purpose match
    if (lender.loanPurpose === userProfile.loanPurpose) {
      reasons.push(`Specializes in ${userProfile.loanPurpose} loans`);
    } else if (lender.loanPurpose === 'any') {
      reasons.push('Flexible loan purposes');
    }

    // Employment match
    if (lender.employmentTypes.includes(userProfile.employmentStatus)) {
      reasons.push('Employment type match');
    } else if (lender.employmentTypes.includes('any')) {
      reasons.push('Accepts all employment types');
    }

    if (lender.specialEligibility) {
      reasons.push('Special eligibility programs available');
    }

    return reasons.length > 0 ? reasons : ['Standard eligibility match'];
  }

  getModelInfo(): any {
    return {
      isLoaded: this.isLoaded,
      hasMetadata: !!this.metadata,
      hasScaler: !!this.scalerParams,
      hasSession: !!this.session,
      inputSize: this.scalerParams?.input_size,
      featureNames: this.scalerParams?.feature_names
    };
  }
}

// Create singleton instance
export const onnxMLAdapter = new ONNXMLAdapter();