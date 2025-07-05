import { Request, Response } from 'express';
export declare class ChatController {
    private sessionService;
    private conversationService;
    private parameterService;
    private agentOrchestrator;
    private matchmakingService;
    private geminiService;
    private database;
    constructor();
    processMessage(req: Request, res: Response): Promise<void>;
    getHistory(req: Request, res: Response): Promise<void>;
    createSession(req: Request, res: Response): Promise<void>;
    endSession(req: Request, res: Response): Promise<void>;
    getRecentConversations(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=chatController.d.ts.map