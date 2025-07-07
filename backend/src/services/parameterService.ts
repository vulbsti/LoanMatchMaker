import { DatabaseService } from '../config/database';
import { LoanParameters, ParameterTracking } from '../models/interfaces';
import { LoanParametersRow, ParameterTrackingRow } from '../models/database-types';
import { createNotFoundError, createValidationError } from '../middleware/errorHandler';
import { validateLoanAmount, validateCreditScore, validateAnnualIncome, validateEmploymentStatus, validateLoanPurpose } from '../models/schemas';
import { GeminiService, buildParameterExtractorPrompt } from '../config/gemini';
import { config } from '../config';

export class ParameterService {
  private geminiService: GeminiService;

  constructor(private database: DatabaseService) {
    this.geminiService = new GeminiService(config.gemini);
  }

  async updateParameter(sessionId: string, parameter: keyof LoanParameters, value: any): Promise<void> {
    try {
      // Validate the parameter value
      this.validateParameterValue(parameter, value);
      
      // Update the loan_parameters table
      const updateQuery = `
        UPDATE loan_parameters 
        SET ${this.getColumnName(parameter)} = $1, collected_at = CURRENT_TIMESTAMP
        WHERE session_id = $2
      `;
      
      await this.database.query(updateQuery, [value, sessionId]);
      
      // Update the parameter tracking table
      const trackingColumn = this.getTrackingColumnName(parameter);
      await this.database.query(
        `UPDATE parameter_tracking 
         SET ${trackingColumn} = true, updated_at = CURRENT_TIMESTAMP
         WHERE session_id = $1`,
        [sessionId]
      );
      
      // Update completion percentage
      await this.updateCompletionPercentage(sessionId);
      
    } catch (error) {
      console.error('Parameter update error:', error);
      throw new Error('Failed to update parameter');
    }
  }

  async getParameters(sessionId: string): Promise<Partial<LoanParameters>> {
    try {
      const result = await this.database.query<LoanParametersRow>(
        `SELECT * FROM loan_parameters WHERE session_id = $1`,
        [sessionId]
      );
      
      if (result.rows.length === 0) {
        return {};
      }
      
      const row = result.rows[0]!;
      const parameters: Partial<LoanParameters> = {};
      
      if (row.loan_amount) parameters.loanAmount = row.loan_amount;
      if (row.annual_income) parameters.annualIncome = row.annual_income;
      if (row.employment_status) parameters.employmentStatus = row.employment_status as any;
      if (row.credit_score) parameters.creditScore = row.credit_score;
      if (row.loan_purpose) parameters.loanPurpose = row.loan_purpose as any;
      if (row.debt_to_income_ratio) parameters.debtToIncomeRatio = row.debt_to_income_ratio;
      if (row.employment_duration) parameters.employmentDuration = row.employment_duration;
      
      return parameters;
    } catch (error) {
      console.error('Get parameters error:', error);
      throw new Error('Failed to retrieve parameters');
    }
  }

  async getTrackingStatus(sessionId: string): Promise<ParameterTracking> {
    try {
      const result = await this.database.query<ParameterTrackingRow>(
        `SELECT * FROM parameter_tracking WHERE session_id = $1`,
        [sessionId]
      );
      
      if (result.rows.length === 0) {
        throw createNotFoundError('Parameter tracking');
      }
      
      const row = result.rows[0]!;
      return {
        sessionId: row.session_id,
        loanAmountCollected: row.loan_amount_collected,
        annualIncomeCollected: row.annual_income_collected,
        employmentStatusCollected: row.employment_status_collected,
        creditScoreCollected: row.credit_score_collected,
        loanPurposeCollected: row.loan_purpose_collected,
        completionPercentage: row.completion_percentage,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      console.error('Get tracking status error:', error);
      throw new Error('Failed to retrieve tracking status');
    }
  }

  async isComplete(sessionId: string): Promise<boolean> {
    try {
      const result = await this.database.query<{ completion_percentage: number }>(
        `SELECT completion_percentage FROM parameter_tracking WHERE session_id = $1`,
        [sessionId]
      );
      
      return result.rows.length > 0 && result.rows[0]!.completion_percentage === 100;
    } catch (error) {
      console.error('Check completion error:', error);
      return false;
    }
  }

  async getMissingParameters(sessionId: string): Promise<(keyof LoanParameters)[]> {
    try {
      const tracking = await this.getTrackingStatus(sessionId);
      const missing: (keyof LoanParameters)[] = [];
      
      if (!tracking.loanAmountCollected) missing.push('loanAmount');
      if (!tracking.annualIncomeCollected) missing.push('annualIncome');
      if (!tracking.employmentStatusCollected) missing.push('employmentStatus');
      if (!tracking.creditScoreCollected) missing.push('creditScore');
      if (!tracking.loanPurposeCollected) missing.push('loanPurpose');
      
      return missing;
    } catch (error) {
      console.error('Get missing parameters error:', error);
      throw new Error('Failed to get missing parameters');
    }
  }

  async extractParametersWithLLM(userMessage: string): Promise<Partial<LoanParameters>> {
    try {
      const enhancedPrompt = this.buildEnhancedExtractionPrompt(userMessage);
      const response = await this.geminiService.generateContent(enhancedPrompt);
      
      // More robust JSON extraction
      const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/) || 
                       response.match(/(\{[\s\S]*?\})/);
      
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        
        // Convert all amounts to INR format for ML model compatibility
        if (extracted.loanAmount) {
          extracted.loanAmount = this.convertToINRFormat(extracted.loanAmount);
        }
        if (extracted.annualIncome) {
          extracted.annualIncome = this.convertToINRFormat(extracted.annualIncome);
        }
        
        // Validate extracted parameters before returning
        const validatedParams: Partial<LoanParameters> = {};
        
        if (extracted.loanAmount && this.validateLoanAmount(extracted.loanAmount)) {
          validatedParams.loanAmount = extracted.loanAmount;
        }
        if (extracted.annualIncome && this.validateAnnualIncome(extracted.annualIncome)) {
          validatedParams.annualIncome = extracted.annualIncome;
        }
        if (extracted.creditScore && this.validateCreditScore(extracted.creditScore)) {
          validatedParams.creditScore = extracted.creditScore;
        }
        if (extracted.employmentStatus && this.validateEmploymentStatus(extracted.employmentStatus)) {
          validatedParams.employmentStatus = extracted.employmentStatus;
        }
        if (extracted.loanPurpose && this.validateLoanPurpose(extracted.loanPurpose)) {
          validatedParams.loanPurpose = extracted.loanPurpose;
        }
        
        return validatedParams;
      }
      return {};
    } catch (error) {
      console.error('Enhanced LLM Parameter extraction error:', error);
      return {};
    }
  }

  private convertToINRFormat(amount: number): number {
    // Handle various input formats and convert to proper INR
    if (amount >= 10000000) {
      // Already in proper INR format (crores)
      return amount;
    } else if (amount >= 100000 && amount < 10000000) {
      // Likely in lakhs, already correct
      return amount;
    } else if (amount >= 1000 && amount < 100000) {
      // Likely in thousands, might need context
      return amount;
    } else if (amount < 1000 && amount > 0) {
      // Likely user specified in crores/lakhs without conversion
      if (amount <= 10) {
        // Treat as crores
        return amount * 10000000;
      } else if (amount <= 1000) {
        // Treat as lakhs
        return amount * 100000;
      }
    }
    
    return amount;
  }

  private buildEnhancedExtractionPrompt(userMessage: string): string {
    return `You are an expert parameter extraction agent for a loan advisor system in India.

TASK: Extract loan-related information from the user's message and return ONLY valid parameters found.

USER MESSAGE: "${userMessage}"

EXTRACTION RULES:
1. **Currency (All amounts in INR):**
   - 1 crore = 10,000,000 INR
   - 1 lakh = 100,000 INR  
   - 2.5 crore = 25,000,000 INR
   - Convert all amounts to full INR format

2. **Employment Status Mapping:**
   - "software engineer", "employed", "job", "salaried employee" → "salaried"
   - "business owner", "freelance", "self employed" → "self-employed"
   - "contractor", "gig worker" → "freelancer"
   - "student", "college", "university", "studying" → "student"
   - "unemployed", "jobless" → "unemployed"

3. **Loan Purpose Mapping:**
   - "car", "vehicle", "BMW", "auto" → "vehicle"
   - "house", "property", "home" → "home"
   - "business", "startup" → "startup"
   - "education", "study", "MBA" → "education"
   - "personal", "wedding", "medical" → "personal"
   - "emergency", "urgent" → "emergency"
   - "gold", "gold loan" → "gold-backed"
   - "eco", "solar", "green" → "eco"

4. **Only extract explicitly mentioned information**
5. **Return empty object if no valid parameters found**

OUTPUT FORMAT (JSON only):
\`\`\`json
{
  "loanAmount": <number_in_full_INR>,
  "annualIncome": <number_in_full_INR>,
  "creditScore": <number_300_to_850>,
  "employmentStatus": <"salaried"|"self-employed"|"freelancer"|"student"|"unemployed">,
  "loanPurpose": <"home"|"vehicle"|"education"|"business"|"startup"|"eco"|"emergency"|"gold-backed"|"personal">
}
\`\`\`

Example:
User: "I need 2 crore for buying a car, I'm a software engineer earning 15 lakhs"
Response:
\`\`\`json
{
  "loanAmount": 20000000,
  "loanPurpose": "vehicle", 
  "employmentStatus": "salaried",
  "annualIncome": 1500000
}
\`\`\``;
  }

  // Enhanced validation methods
  private validateLoanAmount(amount: number): boolean {
    return amount >= 100000 && amount <= 100000000; // 1 lakh to 10 crores
  }

  private validateAnnualIncome(income: number): boolean {
    return income >= 100000 && income <= 50000000; // 1 lakh to 5 crores
  }

  private validateCreditScore(score: number): boolean {
    return score >= 300 && score <= 850;
  }

  private validateEmploymentStatus(status: string): boolean {
    const validStatuses = ['salaried', 'self-employed', 'freelancer', 'student', 'unemployed'];
    return validStatuses.includes(status);
  }

  private validateLoanPurpose(purpose: string): boolean {
    const validPurposes = ['home', 'vehicle', 'education', 'business', 'startup', 'eco', 'emergency', 'gold-backed', 'personal'];
    return validPurposes.includes(purpose);
  }

  async extractParameterFromMessage(message: string): Promise<{ parameter: string; value: any } | null> {
    // This method is deprecated and should not be used
    // All parameter extraction should go through extractParametersWithLLM
    console.warn('extractParameterFromMessage is deprecated. Use extractParametersWithLLM instead.');
    return null;
  }

  private validateParameterValue(parameter: keyof LoanParameters, value: any): void {
    switch (parameter) {
      case 'loanAmount':
        if (!validateLoanAmount(value)) {
          throw createValidationError('Loan amount must be between ₹1,00,000 and ₹10,00,00,000');
        }
        break;
      case 'annualIncome':
        if (!validateAnnualIncome(value)) {
          throw createValidationError('Annual income must be a positive number');
        }
        break;
      case 'creditScore':
        if (!validateCreditScore(value)) {
          throw createValidationError('Credit score must be between 300 and 850');
        }
        break;
      case 'employmentStatus':
        if (!validateEmploymentStatus(value)) {
          throw createValidationError('Invalid employment status');
        }
        break;
      case 'loanPurpose':
        if (!validateLoanPurpose(value)) {
          throw createValidationError('Invalid loan purpose');
        }
        break;
      default:
        throw createValidationError('Unknown parameter');
    }
  }

  private getColumnName(parameter: keyof LoanParameters): string {
    const columnMap: { [key: string]: string } = {
      loanAmount: 'loan_amount',
      annualIncome: 'annual_income',
      employmentStatus: 'employment_status',
      creditScore: 'credit_score',
      loanPurpose: 'loan_purpose',
      debtToIncomeRatio: 'debt_to_income_ratio',
      employmentDuration: 'employment_duration',
    };
    
    return columnMap[parameter] || parameter;
  }

  private getTrackingColumnName(parameter: keyof LoanParameters): string {
    const trackingMap: { [key: string]: string } = {
      loanAmount: 'loan_amount_collected',
      annualIncome: 'annual_income_collected',
      employmentStatus: 'employment_status_collected',
      creditScore: 'credit_score_collected',
      loanPurpose: 'loan_purpose_collected',
    };
    
    return trackingMap[parameter] || `${parameter}_collected`;
  }

  private async updateCompletionPercentage(sessionId: string): Promise<void> {
    try {
      const tracking = await this.getTrackingStatus(sessionId);
      const collectedCount = [
        tracking.loanAmountCollected,
        tracking.annualIncomeCollected,
        tracking.employmentStatusCollected,
        tracking.creditScoreCollected,
        tracking.loanPurposeCollected
      ].filter(Boolean).length;
      
      const totalCount = 5; // Total number of required parameters
      const completionPercentage = Math.round((collectedCount / totalCount) * 100);

      await this.database.query(
        `UPDATE parameter_tracking SET completion_percentage = $1 WHERE session_id = $2`,
        [completionPercentage, sessionId]
      );
    } catch (error) {
      console.error('Update completion percentage error:', error);
    }
  }

  private async checkCompletionStatus(sessionId: string): Promise<void> {
    try {
      const tracking = await this.getTrackingStatus(sessionId);
      
      if (tracking.completionPercentage === 100) {
        // Mark parameters as complete
        await this.database.query(
          `UPDATE loan_parameters SET is_complete = true WHERE session_id = $1`,
          [sessionId]
        );
      }
    } catch (error) {
      console.error('Check completion status error:', error);
    }
  }
}