import { Request, Response, NextFunction } from 'express';
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare const chatRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const matchRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const generalRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const ipFilter: (blockedIPs?: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requestSizeLimit: (maxSize: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const sessionSecurity: (req: Request, res: Response, next: NextFunction) => void;
export declare const corsSecurityMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const inputSecurityMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const apiKeyValidation: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const securityLogMiddleware: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=security.d.ts.map