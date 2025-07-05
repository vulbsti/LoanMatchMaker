import { DatabaseService } from '../config/database';
import { SessionData } from '../models/interfaces';
export declare class SessionService {
    private database;
    constructor(database: DatabaseService);
    createSession(userAgent?: string, ipAddress?: string): Promise<string>;
    getSessionData(sessionId: string): Promise<SessionData>;
    updateSession(sessionId: string): Promise<void>;
    endSession(sessionId: string): Promise<void>;
    cleanupExpiredSessions(): Promise<void>;
    validateSession(sessionId: string): Promise<boolean>;
    getSessionStats(): Promise<any>;
}
//# sourceMappingURL=sessionService.d.ts.map