"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServiceUnavailableError = exports.createConflictError = exports.createForbiddenError = exports.createUnauthorizedError = exports.createNotFoundError = exports.createValidationError = exports.handleUncaughtException = exports.handleUnhandledRejection = exports.handleShutdownError = exports.handleValidationError = exports.handleSessionError = exports.handleGeminiError = exports.handleDatabaseError = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = exports.AppError = void 0;
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let isOperational = false;
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
        isOperational = error.isOperational;
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
        isOperational = true;
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
        isOperational = true;
    }
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        isOperational = true;
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        isOperational = true;
    }
    else if (error.message.includes('duplicate key')) {
        statusCode = 409;
        message = 'Duplicate entry';
        isOperational = true;
    }
    else if (error.message.includes('foreign key')) {
        statusCode = 400;
        message = 'Invalid reference';
        isOperational = true;
    }
    const logData = {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        statusCode,
        isOperational,
        url: req.url,
        method: req.method,
        sessionId: req.headers['x-session-id'] ? '***redacted***' : undefined,
        timestamp: new Date().toISOString(),
    };
    if (process.env.NODE_ENV === 'development') {
        console.error('Error occurred:', logData);
    }
    else {
        console.error('Error occurred:', {
            ...logData,
            ip: req.ip ? req.ip.substring(0, req.ip.lastIndexOf('.')) + '.***' : undefined,
            userAgent: req.get('User-Agent') ? 'redacted' : undefined,
        });
    }
    const errorResponse = {
        success: false,
        error: message,
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    };
    if (process.env.NODE_ENV === 'production' && !isOperational) {
        errorResponse.error = 'Something went wrong';
        delete errorResponse.message;
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    const errorResponse = {
        success: false,
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
    };
    res.status(404).json(errorResponse);
};
exports.notFoundHandler = notFoundHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
const handleDatabaseError = (error) => {
    if (error.code === '23505') {
        return new AppError('Duplicate entry found', 409);
    }
    if (error.code === '23503') {
        return new AppError('Referenced record not found', 400);
    }
    if (error.code === '23502') {
        return new AppError('Required field missing', 400);
    }
    if (error.code === '42P01') {
        return new AppError('Database table not found', 500, false);
    }
    if (error.code === '28P01') {
        return new AppError('Database authentication failed', 500, false);
    }
    if (error.code === '3D000') {
        return new AppError('Database does not exist', 500, false);
    }
    return new AppError('Database operation failed', 500, false);
};
exports.handleDatabaseError = handleDatabaseError;
const handleGeminiError = (error) => {
    if (error.message.includes('API key')) {
        return new AppError('AI service configuration error', 500, false);
    }
    if (error.message.includes('quota')) {
        return new AppError('AI service quota exceeded', 503);
    }
    if (error.message.includes('rate limit')) {
        return new AppError('AI service rate limit exceeded', 429);
    }
    if (error.message.includes('timeout')) {
        return new AppError('AI service timeout', 504);
    }
    return new AppError('AI service error', 500);
};
exports.handleGeminiError = handleGeminiError;
const handleSessionError = (error) => {
    if (error.message.includes('session not found')) {
        return new AppError('Session not found', 404);
    }
    if (error.message.includes('session expired')) {
        return new AppError('Session expired', 401);
    }
    return new AppError('Session error', 500);
};
exports.handleSessionError = handleSessionError;
const handleValidationError = (error) => {
    if (error.name === 'ZodError') {
        const message = error.errors
            .map((err) => `${err.path.join('.')}: ${err.message}`)
            .join(', ');
        return new AppError(`Validation failed: ${message}`, 400);
    }
    return new AppError('Validation error', 400);
};
exports.handleValidationError = handleValidationError;
const handleShutdownError = (error) => {
    console.error('Shutdown error:', error);
    process.exit(1);
};
exports.handleShutdownError = handleShutdownError;
const handleUnhandledRejection = (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
    console.error('Promise:', promise);
    process.exit(1);
};
exports.handleUnhandledRejection = handleUnhandledRejection;
const handleUncaughtException = (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
};
exports.handleUncaughtException = handleUncaughtException;
const createValidationError = (message) => {
    return new AppError(message, 400);
};
exports.createValidationError = createValidationError;
const createNotFoundError = (resource) => {
    return new AppError(`${resource} not found`, 404);
};
exports.createNotFoundError = createNotFoundError;
const createUnauthorizedError = (message = 'Unauthorized') => {
    return new AppError(message, 401);
};
exports.createUnauthorizedError = createUnauthorizedError;
const createForbiddenError = (message = 'Forbidden') => {
    return new AppError(message, 403);
};
exports.createForbiddenError = createForbiddenError;
const createConflictError = (message) => {
    return new AppError(message, 409);
};
exports.createConflictError = createConflictError;
const createServiceUnavailableError = (message) => {
    return new AppError(message, 503);
};
exports.createServiceUnavailableError = createServiceUnavailableError;
//# sourceMappingURL=errorHandler.js.map