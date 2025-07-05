import { DatabaseService } from '../config/database';
import { LoanParameters, ParameterTracking } from '../models/interfaces';
export declare class ParameterService {
    private database;
    constructor(database: DatabaseService);
    updateParameter(sessionId: string, parameter: string, value: any): Promise<void>;
    getParameters(sessionId: string): Promise<Partial<LoanParameters>>;
    getTrackingStatus(sessionId: string): Promise<ParameterTracking>;
    isComplete(sessionId: string): Promise<boolean>;
    getMissingParameters(sessionId: string): Promise<string[]>;
    extractParameterFromMessage(message: string): Promise<{
        parameter: string;
        value: any;
    } | null>;
    private validateParameterValue;
    private getColumnName;
    private getTrackingColumnName;
    private checkCompletionStatus;
}
//# sourceMappingURL=parameterService.d.ts.map