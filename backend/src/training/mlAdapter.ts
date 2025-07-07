import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// Define interfaces locally since types.ts is not a module
interface MLPrediction {
  lenderId: number;
  lenderName: string;
  matchProbability: number;
  matchScore: number;
  confidence?: number;
  reasons?: string[];
  interestRate: number;
}

interface MLFeatures {
  loanAmountNorm: number;
  annualIncomeNorm: number;
  creditScoreNorm: number;
  interestRateNorm: number;
  employmentMatch: number;
  purposeMatch: number;
  specialEligibility: number;
  loanToMaxRatio: number;
  incomeMultiple: number;
  creditBuffer: number;
}

/**
 * TypeScript adapter for Python ML model inference
 * Bridges Node.js backend with Python ML model
 */
export class MLAdapter {
    private pythonPath: string;
    private scriptPath: string;
    private isModelLoaded: boolean = false;

    constructor() {
        this.pythonPath = path.join(__dirname, 'python');
        this.scriptPath = path.join(this.pythonPath, 'model_inference.py');
    }

    /**
     * Check if Python environment and model are set up
     */
    async checkSetup(): Promise<{ isReady: boolean; message: string }> {
        try {
            // Check if Python virtual environment exists
            const venvPath = path.join(this.pythonPath, 'venv');
            const modelPath = path.join(this.pythonPath, '..', 'models', 'loan_matching_model.pth');
            
            const venvExists = await this.pathExists(venvPath);
            const modelExists = await this.pathExists(modelPath);

            if (!venvExists) {
                return {
                    isReady: false,
                    message: 'Python virtual environment not found. Run setup.sh first.'
                };
            }

            if (!modelExists) {
                return {
                    isReady: false,
                    message: 'Trained model not found. Run training pipeline first.'
                };
            }

            return {
                isReady: true,
                message: 'ML environment ready'
            };
        } catch (error) {
            return {
                isReady: false,
                message: `Setup check failed: ${error}`
            };
        }
    }

    /**
     * Predict loan matches for a user against multiple lenders
     */
    async predictMatches(
        userProfile: any,
        lenders: any[]
    ): Promise<MLPrediction[]> {
        const setup = await this.checkSetup();
        if (!setup.isReady) {
            throw new Error(`ML setup not ready: ${setup.message}`);
        }

        return new Promise((resolve, reject) => {
            const pythonExecutable = path.join(this.pythonPath, 'venv', 'bin', 'python');
            
            // Prepare input data
            const inputData = {
                user_profile: userProfile,
                lenders: lenders
            };

            // Spawn Python process
            const pythonProcess = spawn(pythonExecutable, [
                '-c',
                `
import sys
import json
sys.path.append('${this.pythonPath}')
from model_inference import LoanMatchingInference

# Read input from stdin
input_data = json.loads(sys.stdin.read())
user_profile = input_data['user_profile']
lenders = input_data['lenders']

# Initialize inference engine
inference = LoanMatchingInference()

# Predict matches
results = inference.predict_with_eligibility(user_profile, lenders)

# Output results as JSON
print(json.dumps(results))
                `
            ]);

            let outputData = '';
            let errorData = '';

            pythonProcess.stdout.on('data', (data) => {
                outputData += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorData += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python process failed: ${errorData}`));
                    return;
                }

                try {
                    const results = JSON.parse(outputData);
                    resolve(results);
                } catch (error) {
                    reject(new Error(`Failed to parse Python output: ${error}`));
                }
            });

            // Send input data to Python process
            pythonProcess.stdin.write(JSON.stringify(inputData));
            pythonProcess.stdin.end();
        });
    }

    /**
     * Predict match for a single user-lender pair
     */
    async predictSingleMatch(
        userProfile: any,
        lenderData: any
    ): Promise<{ probability: number; isGoodMatch: boolean; matchScore: number }> {
        const results = await this.predictMatches(userProfile, [lenderData]);
        
        if (results.length === 0) {
            throw new Error('No prediction result returned');
        }

        const result = results[0];
        if (!result) {
            throw new Error('Invalid prediction result');
        }

        return {
            probability: result.matchProbability,
            isGoodMatch: result.matchScore > 50, // Convert score to boolean
            matchScore: result.matchScore
        };
    }

    /**
     * Get top K lender recommendations for a user
     */
    async getTopRecommendations(
        userProfile: any,
        lenders: any[],
        topK: number = 5
    ): Promise<MLPrediction[]> {
        const allPredictions = await this.predictMatches(userProfile, lenders);
        
        // Filter eligible matches and sort by score
        const eligibleMatches = allPredictions
            .filter(p => p.matchScore > 0) // Assuming eligible if score > 0
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, topK);

        // Add ranking
        return eligibleMatches.map((match, index) => ({
            ...match,
            rank: index + 1
        }));
    }

    /**
     * Extract features for logging/debugging
     */
    async extractFeatures(
        userProfile: any,
        lenderData: any
    ): Promise<MLFeatures> {
        return new Promise((resolve, reject) => {
            const pythonExecutable = path.join(this.pythonPath, 'venv', 'bin', 'python');
            
            const inputData = {
                user_profile: userProfile,
                lender_data: lenderData
            };

            const pythonProcess = spawn(pythonExecutable, [
                '-c',
                `
import sys
import json
sys.path.append('${this.pythonPath}')
from model_inference import LoanMatchingInference

input_data = json.loads(sys.stdin.read())
user_profile = input_data['user_profile']
lender_data = input_data['lender_data']

inference = LoanMatchingInference()
features = inference.extract_features(user_profile, lender_data)

feature_names = [
    'loan_amount_norm', 'annual_income_norm', 'credit_score_norm', 'interest_rate_norm',
    'employment_match', 'purpose_match', 'special_eligibility',
    'loan_to_max_ratio', 'income_multiple', 'credit_buffer'
]

result = dict(zip(feature_names, features))
print(json.dumps(result))
                `
            ]);

            let outputData = '';
            let errorData = '';

            pythonProcess.stdout.on('data', (data) => {
                outputData += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorData += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Feature extraction failed: ${errorData}`));
                    return;
                }

                try {
                    const features = JSON.parse(outputData);
                    resolve(features);
                } catch (error) {
                    reject(new Error(`Failed to parse feature output: ${error}`));
                }
            });

            pythonProcess.stdin.write(JSON.stringify(inputData));
            pythonProcess.stdin.end();
        });
    }

    /**
     * Train a new model (calls Python training script)
     */
    async trainModel(): Promise<{ success: boolean; message: string }> {
        return new Promise((resolve) => {
            const pythonExecutable = path.join(this.pythonPath, 'venv', 'bin', 'python');
            const trainingScript = path.join(this.pythonPath, 'train_model.py');
            
            const pythonProcess = spawn(pythonExecutable, [trainingScript], {
                cwd: this.pythonPath
            });

            let outputData = '';
            let errorData = '';

            pythonProcess.stdout.on('data', (data) => {
                outputData += data.toString();
                console.log(`Training: ${data.toString().trim()}`);
            });

            pythonProcess.stderr.on('data', (data) => {
                errorData += data.toString();
                console.error(`Training Error: ${data.toString().trim()}`);
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        message: 'Model training completed successfully'
                    });
                } else {
                    resolve({
                        success: false,
                        message: `Training failed with code ${code}: ${errorData}`
                    });
                }
            });
        });
    }

    /**
     * Generate training data (calls Python data generation script)
     */
    async generateTrainingData(numUsers: number = 2000): Promise<{ success: boolean; message: string }> {
        return new Promise((resolve) => {
            const pythonExecutable = path.join(this.pythonPath, 'venv', 'bin', 'python');
            const dataScript = path.join(this.pythonPath, 'data_generation.py');
            
            const pythonProcess = spawn(pythonExecutable, [dataScript], {
                cwd: this.pythonPath
            });

            let outputData = '';
            let errorData = '';

            pythonProcess.stdout.on('data', (data) => {
                outputData += data.toString();
                console.log(`Data Generation: ${data.toString().trim()}`);
            });

            pythonProcess.stderr.on('data', (data) => {
                errorData += data.toString();
                console.error(`Data Generation Error: ${data.toString().trim()}`);
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        success: true,
                        message: 'Training data generated successfully'
                    });
                } else {
                    resolve({
                        success: false,
                        message: `Data generation failed with code ${code}: ${errorData}`
                    });
                }
            });
        });
    }

    /**
     * Utility method to check if a path exists
     */
    private async pathExists(path: string): Promise<boolean> {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }
}

// Singleton instance
export const mlAdapter = new MLAdapter();
