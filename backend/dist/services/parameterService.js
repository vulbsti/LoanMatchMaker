"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParameterService = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const schemas_1 = require("../models/schemas");
const gemini_1 = require("../config/gemini");
const config_1 = require("../config");
class ParameterService {
    constructor(database) {
        this.database = database;
        this.geminiService = new gemini_1.GeminiService(config_1.config.gemini);
    }
    async updateParameter(sessionId, parameter, value) {
        try {
            this.validateParameterValue(parameter, value);
            const updateQuery = `
        UPDATE loan_parameters 
        SET ${this.getColumnName(parameter)} = $1, collected_at = CURRENT_TIMESTAMP
        WHERE session_id = $2
      `;
            await this.database.query(updateQuery, [value, sessionId]);
            const trackingColumn = this.getTrackingColumnName(parameter);
            await this.database.query(`UPDATE parameter_tracking 
         SET ${trackingColumn} = true, updated_at = CURRENT_TIMESTAMP
         WHERE session_id = $1`, [sessionId]);
            await this.updateCompletionPercentage(sessionId);
        }
        catch (error) {
            console.error('Parameter update error:', error);
            throw new Error('Failed to update parameter');
        }
    }
    async getParameters(sessionId) {
        try {
            const result = await this.database.query(`SELECT * FROM loan_parameters WHERE session_id = $1`, [sessionId]);
            if (result.rows.length === 0) {
                return {};
            }
            const row = result.rows[0];
            const parameters = {};
            if (row.loan_amount)
                parameters.loanAmount = row.loan_amount;
            if (row.annual_income)
                parameters.annualIncome = row.annual_income;
            if (row.employment_status)
                parameters.employmentStatus = row.employment_status;
            if (row.credit_score)
                parameters.creditScore = row.credit_score;
            if (row.loan_purpose)
                parameters.loanPurpose = row.loan_purpose;
            if (row.debt_to_income_ratio)
                parameters.debtToIncomeRatio = row.debt_to_income_ratio;
            if (row.employment_duration)
                parameters.employmentDuration = row.employment_duration;
            return parameters;
        }
        catch (error) {
            console.error('Get parameters error:', error);
            throw new Error('Failed to retrieve parameters');
        }
    }
    async getTrackingStatus(sessionId) {
        try {
            const result = await this.database.query(`SELECT * FROM parameter_tracking WHERE session_id = $1`, [sessionId]);
            if (result.rows.length === 0) {
                throw (0, errorHandler_1.createNotFoundError)('Parameter tracking');
            }
            const row = result.rows[0];
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
        }
        catch (error) {
            console.error('Get tracking status error:', error);
            throw new Error('Failed to retrieve tracking status');
        }
    }
    async isComplete(sessionId) {
        try {
            const result = await this.database.query(`SELECT completion_percentage FROM parameter_tracking WHERE session_id = $1`, [sessionId]);
            return result.rows.length > 0 && result.rows[0].completion_percentage === 100;
        }
        catch (error) {
            console.error('Check completion error:', error);
            return false;
        }
    }
    async getMissingParameters(sessionId) {
        try {
            const tracking = await this.getTrackingStatus(sessionId);
            const missing = [];
            if (!tracking.loanAmountCollected)
                missing.push('loanAmount');
            if (!tracking.annualIncomeCollected)
                missing.push('annualIncome');
            if (!tracking.employmentStatusCollected)
                missing.push('employmentStatus');
            if (!tracking.creditScoreCollected)
                missing.push('creditScore');
            if (!tracking.loanPurposeCollected)
                missing.push('loanPurpose');
            return missing;
        }
        catch (error) {
            console.error('Get missing parameters error:', error);
            throw new Error('Failed to get missing parameters');
        }
    }
    async extractParametersWithLLM(userMessage) {
        try {
            const enhancedPrompt = this.buildEnhancedExtractionPrompt(userMessage);
            const response = await this.geminiService.generateContent(enhancedPrompt);
            const jsonMatch = response.match(/```json\s*(\{[\s\S]*?\})\s*```/) ||
                response.match(/(\{[\s\S]*?\})/);
            if (jsonMatch) {
                const extracted = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                if (extracted.loanAmount) {
                    extracted.loanAmount = this.convertToINRFormat(extracted.loanAmount);
                }
                if (extracted.annualIncome) {
                    extracted.annualIncome = this.convertToINRFormat(extracted.annualIncome);
                }
                const validatedParams = {};
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
        }
        catch (error) {
            console.error('Enhanced LLM Parameter extraction error:', error);
            return {};
        }
    }
    convertToINRFormat(amount) {
        if (amount >= 10000000) {
            return amount;
        }
        else if (amount >= 100000 && amount < 10000000) {
            return amount;
        }
        else if (amount >= 1000 && amount < 100000) {
            return amount;
        }
        else if (amount < 1000 && amount > 0) {
            if (amount <= 10) {
                return amount * 10000000;
            }
            else if (amount <= 1000) {
                return amount * 100000;
            }
        }
        return amount;
    }
    buildEnhancedExtractionPrompt(userMessage) {
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
    validateLoanAmount(amount) {
        return amount >= 100000 && amount <= 100000000;
    }
    validateAnnualIncome(income) {
        return income >= 100000 && income <= 50000000;
    }
    validateCreditScore(score) {
        return score >= 300 && score <= 850;
    }
    validateEmploymentStatus(status) {
        const validStatuses = ['salaried', 'self-employed', 'freelancer', 'student', 'unemployed'];
        return validStatuses.includes(status);
    }
    validateLoanPurpose(purpose) {
        const validPurposes = ['home', 'vehicle', 'education', 'business', 'startup', 'eco', 'emergency', 'gold-backed', 'personal'];
        return validPurposes.includes(purpose);
    }
    async extractParameterFromMessage(message) {
        console.warn('extractParameterFromMessage is deprecated. Use extractParametersWithLLM instead.');
        return null;
    }
    validateParameterValue(parameter, value) {
        switch (parameter) {
            case 'loanAmount':
                if (!(0, schemas_1.validateLoanAmount)(value)) {
                    throw (0, errorHandler_1.createValidationError)('Loan amount must be between ₹1,00,000 and ₹10,00,00,000');
                }
                break;
            case 'annualIncome':
                if (!(0, schemas_1.validateAnnualIncome)(value)) {
                    throw (0, errorHandler_1.createValidationError)('Annual income must be a positive number');
                }
                break;
            case 'creditScore':
                if (!(0, schemas_1.validateCreditScore)(value)) {
                    throw (0, errorHandler_1.createValidationError)('Credit score must be between 300 and 850');
                }
                break;
            case 'employmentStatus':
                if (!(0, schemas_1.validateEmploymentStatus)(value)) {
                    throw (0, errorHandler_1.createValidationError)('Invalid employment status');
                }
                break;
            case 'loanPurpose':
                if (!(0, schemas_1.validateLoanPurpose)(value)) {
                    throw (0, errorHandler_1.createValidationError)('Invalid loan purpose');
                }
                break;
            default:
                throw (0, errorHandler_1.createValidationError)('Unknown parameter');
        }
    }
    getColumnName(parameter) {
        const columnMap = {
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
    getTrackingColumnName(parameter) {
        const trackingMap = {
            loanAmount: 'loan_amount_collected',
            annualIncome: 'annual_income_collected',
            employmentStatus: 'employment_status_collected',
            creditScore: 'credit_score_collected',
            loanPurpose: 'loan_purpose_collected',
        };
        return trackingMap[parameter] || `${parameter}_collected`;
    }
    async updateCompletionPercentage(sessionId) {
        try {
            const tracking = await this.getTrackingStatus(sessionId);
            const collectedCount = [
                tracking.loanAmountCollected,
                tracking.annualIncomeCollected,
                tracking.employmentStatusCollected,
                tracking.creditScoreCollected,
                tracking.loanPurposeCollected
            ].filter(Boolean).length;
            const totalCount = 5;
            const completionPercentage = Math.round((collectedCount / totalCount) * 100);
            await this.database.query(`UPDATE parameter_tracking SET completion_percentage = $1 WHERE session_id = $2`, [completionPercentage, sessionId]);
        }
        catch (error) {
            console.error('Update completion percentage error:', error);
        }
    }
    async checkCompletionStatus(sessionId) {
        try {
            const tracking = await this.getTrackingStatus(sessionId);
            if (tracking.completionPercentage === 100) {
                await this.database.query(`UPDATE loan_parameters SET is_complete = true WHERE session_id = $1`, [sessionId]);
            }
        }
        catch (error) {
            console.error('Check completion status error:', error);
        }
    }
}
exports.ParameterService = ParameterService;
//# sourceMappingURL=parameterService.js.map