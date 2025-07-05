import { DatabaseService } from '../config/database';
import { LoanParameters, Lender, LenderMatch } from '../models/interfaces';
export declare class MatchmakingService {
    private database;
    constructor(database: DatabaseService);
    findMatches(sessionId: string, userParams: LoanParameters): Promise<LenderMatch[]>;
    getAllLenders(): Promise<Lender[]>;
    private calculateLenderScore;
    private calculateAffordabilityScore;
    private calculateSpecializationScore;
    private checkSpecialEligibility;
    private generateReasons;
    private calculateConfidence;
    private storeMatchResults;
    getMatchResults(sessionId: string): Promise<LenderMatch[]>;
    getLenderById(id: number): Promise<Lender | null>;
    getMatchingStats(): Promise<{
        totalMatches: number;
        averageScore: number;
        topLenders: Array<{
            name: string;
            matchCount: number;
        }>;
    }>;
}
//# sourceMappingURL=matchmakingService.d.ts.map