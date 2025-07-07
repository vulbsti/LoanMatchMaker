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
    console.log(`Updating parameter ${parameter} = ${value} for session ${sessionId}`);
    
    try {
      // Start a transaction to ensure consistency
      await this.database.query('BEGIN');
      
      // Validate the parameter value
      this.validateParameterValue(parameter, value);
      
      // Update the loan_parameters table
      const updateQuery = `
        UPDATE loan_parameters 
        SET ${this.getColumnName(parameter)} = $1, collected_at = CURRENT_TIMESTAMP
        WHERE session_id = $2
      `;
      
      const updateResult = await this.database.query(updateQuery, [value, sessionId]);
      console.log(`Updated loan_parameters, affected rows: ${updateResult.rowCount}`);
      
      // Update the parameter tracking table
      const trackingColumn = this.getTrackingColumnName(parameter);
      const trackingQuery = `
        UPDATE parameter_tracking 
        SET ${trackingColumn} = true, updated_at = CURRENT_TIMESTAMP
        WHERE session_id = $1
      `;
      
      const trackingResult = await this.database.query(trackingQuery, [sessionId]);
      console.log(`Updated parameter_tracking for ${parameter}, affected rows: ${trackingResult.rowCount}`);
      
      // Update completion percentage
      await this.updateCompletionPercentage(sessionId);
      
      // Commit the transaction
      await this.database.query('COMMIT');
      
      console.log(`Successfully updated parameter ${parameter} for session ${sessionId}`);
      
    } catch (error) {
      // Rollback on error
      await this.database.query('ROLLBACK');
      console.error('Parameter update error:', error);
      throw new Error(`Failed to update parameter ${parameter}: ${error}`);
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
      console.log(`Getting missing parameters for session: ${sessionId}`);
      
      // Get the current tracking status
      const result = await this.database.query<ParameterTrackingRow>(
        `SELECT * FROM parameter_tracking WHERE session_id = $1`,
        [sessionId]
      );
      
      if (result.rows.length === 0) {
        console.log(`No tracking record found for session ${sessionId}, returning all parameters as missing`);
        return ['loanAmount', 'annualIncome', 'employmentStatus', 'creditScore', 'loanPurpose'];
      }
      
      // TypeScript-safe way to access the first row
      const trackingRow = result.rows[0];
      if (!trackingRow) {
        console.log(`Empty tracking record for session ${sessionId}, returning all parameters as missing`);
        return ['loanAmount', 'annualIncome', 'employmentStatus', 'creditScore', 'loanPurpose'];
      }
      
      const missing: (keyof LoanParameters)[] = [];
      
      if (!trackingRow.loan_amount_collected) missing.push('loanAmount');
      if (!trackingRow.annual_income_collected) missing.push('annualIncome');
      if (!trackingRow.employment_status_collected) missing.push('employmentStatus');
      if (!trackingRow.credit_score_collected) missing.push('creditScore');
      if (!trackingRow.loan_purpose_collected) missing.push('loanPurpose');
      
      console.log(`Missing parameters for session ${sessionId}:`, missing);
      return missing;
    } catch (error) {
      console.error('Get missing parameters error:', error);
      throw new Error('Failed to get missing parameters');
    }
  }

  async extractParametersWithLLM(userMessage: string): Promise<Partial<LoanParameters>> {
    try {
      console.log('Extracting parameters from message:', userMessage);
      
      const enhancedPrompt = this.buildEnhancedExtractionPrompt(userMessage);
      const response = await this.geminiService.generateContent(enhancedPrompt);
      
      console.log('LLM response for extraction:', response);
      
      // More robust JSON extraction with better error handling
      let jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (!jsonMatch) {
        jsonMatch = response.match(/(\{[\s\S]*?\})/);
      }
      
      if (jsonMatch) {
        try {
          const extractedText = jsonMatch[1] || jsonMatch[0];
          const extracted = JSON.parse(extractedText);
          console.log('Parsed extracted parameters:', extracted);
          
          // Enhanced validation and conversion
          const validatedParams = this.validateAndProcessExtracted(extracted);
          console.log('Validated parameters:', validatedParams);
          
          return validatedParams;
        } catch (parseError) {
          console.error('JSON parsing failed:', parseError);
          return {};
        }
      }
      
      console.log('No JSON found in LLM response, returning empty object');
      return {};
    } catch (error) {
      console.error('Enhanced LLM Parameter extraction error:', error);
      return {};
    }
  }

  private validateAndProcessExtracted(extracted: any): Partial<LoanParameters> {
    const validatedParams: Partial<LoanParameters> = {};
    
    // Process loan amount with enhanced conversion
    if (extracted.loanAmount !== undefined && extracted.loanAmount !== null) {
      const convertedAmount = this.convertToINRFormat(extracted.loanAmount);
      if (this.validateLoanAmount(convertedAmount)) {
        validatedParams.loanAmount = convertedAmount;
      } else {
        console.warn(`Invalid loan amount after conversion: ${convertedAmount}`);
      }
    }
    
    // Process annual income with enhanced conversion
    if (extracted.annualIncome !== undefined && extracted.annualIncome !== null) {
      const convertedIncome = this.convertToINRFormat(extracted.annualIncome);
      if (this.validateAnnualIncome(convertedIncome)) {
        validatedParams.annualIncome = convertedIncome;
      } else {
        console.warn(`Invalid annual income after conversion: ${convertedIncome}`);
      }
    }
    
    // Process credit score
    if (extracted.creditScore !== undefined && extracted.creditScore !== null) {
      const score = parseInt(String(extracted.creditScore));
      if (!isNaN(score) && this.validateCreditScore(score)) {
        validatedParams.creditScore = score;
      } else {
        console.warn(`Invalid credit score: ${extracted.creditScore}`);
      }
    }
    
    // Process employment status
    if (extracted.employmentStatus) {
      const status = String(extracted.employmentStatus).toLowerCase();
      if (this.validateEmploymentStatus(status)) {
        validatedParams.employmentStatus = status as any;
      } else {
        console.warn(`Invalid employment status: ${extracted.employmentStatus}`);
      }
    }
    
    // Process loan purpose
    if (extracted.loanPurpose) {
      const purpose = String(extracted.loanPurpose).toLowerCase();
      if (this.validateLoanPurpose(purpose)) {
        validatedParams.loanPurpose = purpose as any;
      } else {
        console.warn(`Invalid loan purpose: ${extracted.loanPurpose}`);
      }
    }
    
    return validatedParams;
  }

  private convertToINRFormat(amount: number | string): number {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Handle various input formats and convert to proper INR
    if (numAmount >= 10000000) {
      // Already in proper INR format (crores)
      return numAmount;
    } else if (numAmount >= 100000 && numAmount < 10000000) {
      // Likely in lakhs, already correct
      return numAmount;
    } else if (numAmount >= 1000 && numAmount < 100000) {
      // Likely in thousands, might need context
      return numAmount;
    } else if (numAmount < 1000 && numAmount > 0) {
      // Likely user specified in crores/lakhs without conversion
      if (numAmount <= 10) {
        // Treat as crores
        return numAmount * 10000000;
      } else if (numAmount <= 1000) {
        // Treat as lakhs
        return numAmount * 100000;
      }
    }
    
    return numAmount;
  }

  private buildEnhancedExtractionPrompt(userMessage: string): string {
    return `You are an expert parameter extraction agent for a loan advisor system in India.

TASK: Extract loan-related information from the user's message and return ONLY valid parameters found.

USER MESSAGE: "${userMessage}"

EXTRACTION RULES:
1. **Currency (All amounts in INR):**
   - When user says "93522 Rs" or "93522 rupees" → extract as 93522
   - When user says "1 lakh" → extract as 100000
   - When user says "1 crore" → extract as 10000000
   - When user says "2.5 lakh" → extract as 250000
   - Convert all amounts to full INR numbers

2. **Income Keywords:** Look for: "income", "earn", "salary", "per year", "annually", "Rs", "rupees"

3. **Employment Status Mapping:**
   - "software engineer", "employed", "job", "salaried employee", "salaried" → "salaried"
   - "business owner", "freelance", "self employed" → "self-employed"
   - "contractor", "gig worker" → "freelancer"
   - "student", "college", "university", "studying" → "student"
   - "unemployed", "jobless" → "unemployed"

4. **Loan Purpose Mapping:**
   - "car", "vehicle", "BMW", "auto" → "vehicle"
   - "house", "property", "home", "home loan" → "home"
   - "business", "startup" → "business"
   - "education", "study", "MBA" → "education"
   - "personal", "wedding", "medical" → "personal"

5. **Credit Score:** Look for numbers between 300-850 mentioned as "credit score" or "score"

6. **IMPORTANT:** Extract exactly what the user provides, don't make assumptions

OUTPUT FORMAT (JSON only):
\`\`\`json
{
  "loanAmount": <number_in_INR>,
  "annualIncome": <number_in_INR>,
  "creditScore": <number_300_to_850>,
  "employmentStatus": <"salaried"|"self-employed"|"freelancer"|"student"|"unemployed">,
  "loanPurpose": <"home"|"vehicle"|"education"|"business"|"personal">
}
\`\`\`

Examples:
- "My annual income is 93522" → {"annualIncome": 93522}
- "I need 1 lakh for car" → {"loanAmount": 100000, "loanPurpose": "vehicle"}
- "I'm salaried" → {"employmentStatus": "salaried"}`;
  }

  // Enhanced validation methods
  private validateLoanAmount(amount: number): boolean {
    return Number.isFinite(amount) && amount >= 100000 && amount <= 100000000; // 1 lakh to 10 crores
  }

  private validateAnnualIncome(income: number): boolean {
    return Number.isFinite(income) && income >= 100000 && income <= 50000000; // 1 lakh to 5 crores
  }

  private validateCreditScore(score: number): boolean {
    return Number.isInteger(score) && score >= 300 && score <= 850;
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
          throw createValidationError(`Invalid loan amount: ${value}`);
        }
        break;
      case 'annualIncome':
        if (!validateAnnualIncome(value)) {
          throw createValidationError(`Invalid annual income: ${value}`);
        }
        break;
      case 'creditScore':
        if (!validateCreditScore(value)) {
          throw createValidationError(`Invalid credit score: ${value}`);
        }
        break;
      case 'employmentStatus':
        if (!validateEmploymentStatus(value)) {
          throw createValidationError(`Invalid employment status: ${value}`);
        }
        break;
      case 'loanPurpose':
        if (!validateLoanPurpose(value)) {
          throw createValidationError(`Invalid loan purpose: ${value}`);
        }
        break;
      default:
        // Allow other parameters
        break;
    }
  }

  private getColumnName(parameter: keyof LoanParameters): string {
    const columnMap: Record<keyof LoanParameters, string> = {
      loanAmount: 'loan_amount',
      annualIncome: 'annual_income',
      employmentStatus: 'employment_status',
      creditScore: 'credit_score',
      loanPurpose: 'loan_purpose',
      debtToIncomeRatio: 'debt_to_income_ratio',
      employmentDuration: 'employment_duration',
    };
    return columnMap[parameter];
  }

  private getTrackingColumnName(parameter: keyof LoanParameters): string {
    const columnMap: Record<keyof LoanParameters, string> = {
      loanAmount: 'loan_amount_collected',
      annualIncome: 'annual_income_collected',
      employmentStatus: 'employment_status_collected',
      creditScore: 'credit_score_collected',
      loanPurpose: 'loan_purpose_collected',
      debtToIncomeRatio: 'debt_to_income_ratio_collected',
      employmentDuration: 'employment_duration_collected',
    };
    return columnMap[parameter];
  }

  private async updateCompletionPercentage(sessionId: string): Promise<void> {
    try {
      const result = await this.database.query<ParameterTrackingRow>(
        `SELECT * FROM parameter_tracking WHERE session_id = $1`,
        [sessionId]
      );
      
      if (result.rows.length === 0) {
        console.warn(`No tracking record found for session ${sessionId}`);
        return;
      }
      
      const tracking = result.rows[0];
      if (!tracking) {
        console.warn(`Empty tracking record for session ${sessionId}`);
        return;
      }
      
      // Count collected parameters (only core 5 required parameters)
      let collectedCount = 0;
      if (tracking.loan_amount_collected) collectedCount++;
      if (tracking.annual_income_collected) collectedCount++;
      if (tracking.employment_status_collected) collectedCount++;
      if (tracking.credit_score_collected) collectedCount++;
      if (tracking.loan_purpose_collected) collectedCount++;
      
      const completionPercentage = Math.round((collectedCount / 5) * 100);
      
      await this.database.query(
        `UPDATE parameter_tracking 
         SET completion_percentage = $1, updated_at = CURRENT_TIMESTAMP
         WHERE session_id = $2`,
        [completionPercentage, sessionId]
      );
      
      console.log(`Updated completion percentage to ${completionPercentage}% for session ${sessionId}`);
    } catch (error) {
      console.error('Error updating completion percentage:', error);
    }
  }
}