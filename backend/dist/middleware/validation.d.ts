import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare const validateRequest: (schema: z.ZodSchema, source?: "body" | "query" | "params") => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateUUID: (paramName: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const validateParameterValue: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateContentLength: (maxLength: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateRateLimit: (windowMs: number, max: number, keyGenerator?: (req: Request) => string) => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
declare global {
    namespace Express {
        interface Request {
            sessionId?: string;
        }
    }
}
//# sourceMappingURL=validation.d.ts.map