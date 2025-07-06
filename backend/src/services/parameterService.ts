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
      const prompt = buildParameterExtractorPrompt(userMessage);
      const response = await this.geminiService.generateContent(prompt);
      const jsonMatch = response.match(/\{.*\}/s);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        
        // Validate extracted parameters before returning
        const validatedParams: Partial<LoanParameters> = {};
        
        if (extracted.loanAmount && validateLoanAmount(extracted.loanAmount)) {
          validatedParams.loanAmount = extracted.loanAmount;
        }
        if (extracted.annualIncome && validateAnnualIncome(extracted.annualIncome)) {
          validatedParams.annualIncome = extracted.annualIncome;
        }
        if (extracted.creditScore && validateCreditScore(extracted.creditScore)) {
          validatedParams.creditScore = extracted.creditScore;
        }
        if (extracted.employmentStatus && validateEmploymentStatus(extracted.employmentStatus)) {
          validatedParams.employmentStatus = extracted.employmentStatus;
        }
        if (extracted.loanPurpose && validateLoanPurpose(extracted.loanPurpose)) {
          validatedParams.loanPurpose = extracted.loanPurpose;
        }
        
        return validatedParams;
      }
      return {};
    } catch (error) {
      console.error('LLM Parameter extraction error:', error);
      // Fallback to regex-based extraction
      const fallbackParam = await this.extractParameterFromMessage(userMessage);
      if (fallbackParam) {
        return { [fallbackParam.parameter]: fallbackParam.value } as Partial<LoanParameters>;
      }
      return {};
    }
  }

  async extractParameterFromMessage(message: string): Promise<{ parameter: string; value: any } | null> {
    const lowerMessage = message.toLowerCase();
    
    // Extract loan amount
    const amountMatch = message.match(/\$?([\d,]+(?:\.\d{2})?)\s*(?:dollars?|k|thousand|million)?/i);
    if (amountMatch && amountMatch[1]) {
      let amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (lowerMessage.includes('k') || lowerMessage.includes('thousand')) {
        amount *= 1000;
      } else if (lowerMessage.includes('million')) {
        amount *= 1000000;
      }
      if (validateLoanAmount(amount)) {
        return { parameter: 'loanAmount', value: amount };
      }
    }
    
    // Extract annual income
    const incomePatterns = [
      /(?:make|earn|income|salary).*?\$?([\d,]+(?:\.\d{2})?)\s*(?:per year|annually|yearly|k|thousand)?/i,
      /annual income.*?\$?([\d,]+(?:\.\d{2})?)\s*(?:k|thousand)?/i,
    ];
    for (const pattern of incomePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        let income = parseFloat(match[1].replace(/,/g, ''));
        if (lowerMessage.includes('k') || lowerMessage.includes('thousand')) {
          income *= 1000;
        }
        if (validateAnnualIncome(income)) {
          return { parameter: 'annualIncome', value: income };
        }
      }
    }
    
    // Extract credit score
    const scoreMatch = message.match(/(?:credit score|fico|score).*?(\d{3})/i);
    if (scoreMatch && scoreMatch[1]) {
      const score = parseInt(scoreMatch[1]);
      if (validateCreditScore(score)) {
        return { parameter: 'creditScore', value: score };
      }
    }
    
    // Extract employment status
    const employmentPatterns = {
      salaried: /salaried|employed|full.?time|employee/i,
      'self-employed': /self.?employed|freelance|contractor|own business/i,
      freelancer: /freelance|freelancer|gig work|independent/i,
      unemployed: /unemployed|jobless|not working|between jobs/i,
    };
    for (const [status, pattern] of Object.entries(employmentPatterns)) {
      if (pattern.test(message)) {
        return { parameter: 'employmentStatus', value: status };
      }
    }
    
    // Extract loan purpose
    const purposePatterns = {
      home: /house|home|mortgage|property|real estate/i,
      auto: /car|auto|vehicle|truck|motorcycle/i,
      personal: /personal|vacation|wedding|medical|emergency/i,
      business: /business|startup|company|commercial/i,
      education: /education|school|college|student|tuition/i,
      'debt-consolidation': /debt consolidation|consolidate|refinance|pay off debt/i,
    };
    for (const [purpose, pattern] of Object.entries(purposePatterns)) {
      if (pattern.test(message)) {
        return { parameter: 'loanPurpose', value: purpose };
      }
    }
    
    return null;
  }

  private validateParameterValue(parameter: keyof LoanParameters, value: any): void {
    switch (parameter) {
      case 'loanAmount':
        if (!validateLoanAmount(value)) {
          throw createValidationError('Loan amount must be between $1,000 and $500,000');
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