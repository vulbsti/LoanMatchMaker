import express from 'express';
import { DatabaseService } from './config/database';
import { GeminiService } from './config/gemini';
declare class App {
    app: express.Application;
    database: DatabaseService;
    geminiService: GeminiService;
    private server?;
    constructor();
    private initializeMiddleware;
    private initializeRoutes;
    private initializeErrorHandling;
    private setupGracefulShutdown;
    start(): Promise<void>;
    stop(): Promise<void>;
}
declare const app: App;
export default app;
//# sourceMappingURL=app.d.ts.map