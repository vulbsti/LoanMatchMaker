import { DatabaseService } from '../config/database';
import { LoanParameters, ParameterTracking } from '../models/interfaces';
export declare class ParameterService {
    private database;
    private geminiService;
    constructor(database: DatabaseService);
    updateParameter(sessionId: string, parameter: keyof LoanParameters, value: any): Promise<void>;
    getParameters(sessionId: string): Promise<Partial<LoanParameters>>;
    getTrackingStatus(sessionId: string): Promise<ParameterTracking>;
    isComplete(sessionId: string): Promise<boolean>;
    getMissingParameters(sessionId: string): Promise<(keyof LoanParameters)[]>;
    extractParametersWithLLM(userMessage: string): Promise<Partial<LoanParameters>>;
    private convertToINRFormat;
    private buildEnhancedExtractionPrompt;
    private validateLoanAmount;
    private validateAnnualIncome;
    private validateCreditScore;
    private validateEmploymentStatus;
    private validateLoanPurpose;
    extractParameterFromMessage(message: string): Promise<{
        parameter: string;
        value: any;
    } | null>;
    private validateParameterValue;
    private getColumnName;
    private getTrackingColumnName;
    private updateCompletionPercentage;
    private checkCompletionStatus;
}
//# sourceMappingURL=parameterService.d.ts.map