import { Request, Response, NextFunction } from 'express';
import { APIResponse } from '../models/interfaces';

// Custom error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export const errorHandler = (
  error: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    isOperational = true;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
    isOperational = true;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;
  } else if (error.message.includes('duplicate key')) {
    statusCode = 409;
    message = 'Duplicate entry';
    isOperational = true;
  } else if (error.message.includes('foreign key')) {
    statusCode = 400;
    message = 'Invalid reference';
    isOperational = true;
  }

  // Log error details (sanitized for security)
  const logData = {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    statusCode,
    isOperational,
    url: req.url,
    method: req.method,
    // Remove sensitive data from logs
    sessionId: req.headers['x-session-id'] ? '***redacted***' : undefined,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('Error occurred:', logData);
  } else {
    // In production, use structured logging without sensitive data
    console.error('Error occurred:', {
      ...logData,
      ip: req.ip ? req.ip.substring(0, req.ip.lastIndexOf('.')) + '.***' : undefined,
      userAgent: req.get('User-Agent') ? 'redacted' : undefined,
    });
  }

  // Send error response
  const errorResponse: APIResponse = {
    success: false,
    error: message,
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  };

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && !isOperational) {
    errorResponse.error = 'Something went wrong';
    delete errorResponse.message;
  }

  res.status(statusCode).json(errorResponse);
};

// 404 Not Found handler
export const notFoundHandler = (req: Request, res: Response) => {
  const errorResponse: APIResponse = {
    success: false,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  };
  res.status(404).json(errorResponse);
};

// Async error catcher wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Database error handler
export const handleDatabaseError = (error: any): AppError => {
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

// Gemini API error handler
export const handleGeminiError = (error: any): AppError => {
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

// Session error handler
export const handleSessionError = (error: any): AppError => {
  if (error.message.includes('session not found')) {
    return new AppError('Session not found', 404);
  }
  
  if (error.message.includes('session expired')) {
    return new AppError('Session expired', 401);
  }
  
  return new AppError('Session error', 500);
};

// Validation error handler
export const handleValidationError = (error: any): AppError => {
  if (error.name === 'ZodError') {
    const message = error.errors
      .map((err: any) => `${err.path.join('.')}: ${err.message}`)
      .join(', ');
    return new AppError(`Validation failed: ${message}`, 400);
  }
  
  return new AppError('Validation error', 400);
};

// Graceful shutdown error handler
export const handleShutdownError = (error: any): void => {
  console.error('Shutdown error:', error);
  process.exit(1);
};

// Unhandled promise rejection handler
export const handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
  console.error('Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);
  
  // Close server gracefully
  process.exit(1);
};

// Uncaught exception handler
export const handleUncaughtException = (error: Error): void => {
  console.error('Uncaught Exception:', error);
  
  // Close server gracefully
  process.exit(1);
};

// Error factory functions
export const createValidationError = (message: string): AppError => {
  return new AppError(message, 400);
};

export const createNotFoundError = (resource: string): AppError => {
  return new AppError(`${resource} not found`, 404);
};

export const createUnauthorizedError = (message: string = 'Unauthorized'): AppError => {
  return new AppError(message, 401);
};

export const createForbiddenError = (message: string = 'Forbidden'): AppError => {
  return new AppError(message, 403);
};

export const createConflictError = (message: string): AppError => {
  return new AppError(message, 409);
};

export const createServiceUnavailableError = (message: string): AppError => {
  return new AppError(message, 503);
};