import { DatabaseService } from '../config/database';
import { LoanParameters, Lender, LenderMatch } from '../models/interfaces';
export declare class MatchmakingService {
    private database;
    private useMLPredictions;
    constructor(database: DatabaseService);
    findMatches(sessionId: string, userParams: LoanParameters): Promise<LenderMatch[]>;
    private findMatchesWithML;
    private findMatchesRuleBased;
    private generateMLReasons;
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