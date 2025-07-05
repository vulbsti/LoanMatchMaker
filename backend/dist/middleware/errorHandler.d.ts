import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
export declare const errorHandler: (error: AppError | Error, req: Request, res: Response, next: NextFunction) => void;
export declare const notFoundHandler: (req: Request, res: Response) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const handleDatabaseError: (error: any) => AppError;
export declare const handleGeminiError: (error: any) => AppError;
export declare const handleSessionError: (error: any) => AppError;
export declare const handleValidationError: (error: any) => AppError;
export declare const handleShutdownError: (error: any) => void;
export declare const handleUnhandledRejection: (reason: any, promise: Promise<any>) => void;
export declare const handleUncaughtException: (error: Error) => void;
export declare const createValidationError: (message: string) => AppError;
export declare const createNotFoundError: (resource: string) => AppError;
export declare const createUnauthorizedError: (message?: string) => AppError;
export declare const createForbiddenError: (message?: string) => AppError;
export declare const createConflictError: (message: string) => AppError;
export declare const createServiceUnavailableError: (message: string) => AppError;
//# sourceMappingURL=errorHandler.d.ts.map