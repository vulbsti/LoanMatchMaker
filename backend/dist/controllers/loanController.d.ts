import { Request, Response } from 'express';
export declare class LoanController {
    private sessionService;
    private parameterService;
    private matchmakingService;
    private database;
    constructor();
    getStatus(req: Request, res: Response): Promise<void>;
    findMatches(req: Request, res: Response): Promise<void>;
    getResults(req: Request, res: Response): Promise<void>;
    updateParameter(req: Request, res: Response): Promise<void>;
    getAllLenders(req: Request, res: Response): Promise<void>;
    getLenderById(req: Request, res: Response): Promise<void>;
    getMatchingStats(req: Request, res: Response): Promise<void>;
    validateParameters(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=loanController.d.ts.map