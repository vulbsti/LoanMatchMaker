import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { APIResponse } from '../models/interfaces';

// Generic validation middleware factory
export const validateRequest = (schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      schema.parse(data);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse: APIResponse = {
          success: false,
          error: 'Validation failed',
          message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        };
        res.status(400).json(errorResponse);
        return;
      }
      
      const errorResponse: APIResponse = {
        success: false,
        error: 'Invalid request data',
        message: 'Request validation failed',
      };
      res.status(400).json(errorResponse);
      return;
    }
  };
};

// UUID validation middleware
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuid || !uuidRegex.test(uuid)) {
      const errorResponse: APIResponse = {
        success: false,
        error: 'Invalid UUID format',
        message: `Parameter ${paramName} must be a valid UUID`,
      };
      res.status(400).json(errorResponse);
      return;
    }
    
    next();
  };
};

// Session validation middleware
export const validateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionId = req.body.sessionId || req.params.sessionId;
    
    if (!sessionId) {
      const errorResponse: APIResponse = {
        success: false,
        error: 'Session ID required',
        message: 'Session ID is required for this operation',
      };
      res.status(400).json(errorResponse);
      return;
    }

    // UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      const errorResponse: APIResponse = {
        success: false,
        error: 'Invalid session ID format',
        message: 'Session ID must be a valid UUID',
      };
      res.status(400).json(errorResponse);
      return;
    }

    // Store validated session ID for use in controllers
    req.sessionId = sessionId;
    next();
  } catch (error) {
    const errorResponse: APIResponse = {
      success: false,
      error: 'Session validation failed',
      message: 'Failed to validate session',
    };
    res.status(500).json(errorResponse);
    return;
  }
};

// Parameter value validation
export const validateParameterValue = (req: Request, res: Response, next: NextFunction) => {
  const { parameter, value } = req.body;
  
  try {
    switch (parameter) {
      case 'loanAmount':
        if (typeof value !== 'number' || value < 1000 || value > 500000) {
          throw new Error('Loan amount must be between $1,000 and $500,000');
        }
        break;
      
      case 'annualIncome':
        if (typeof value !== 'number' || value <= 0) {
          throw new Error('Annual income must be a positive number');
        }
        break;
      
      case 'creditScore':
        if (typeof value !== 'number' || value < 300 || value > 850) {
          throw new Error('Credit score must be between 300 and 850');
        }
        break;
      
      case 'employmentStatus':
        if (!['salaried', 'self-employed', 'freelancer', 'unemployed'].includes(value)) {
          throw new Error('Invalid employment status');
        }
        break;
      
      case 'loanPurpose':
        if (!['home', 'auto', 'personal', 'business', 'education', 'debt-consolidation'].includes(value)) {
          throw new Error('Invalid loan purpose');
        }
        break;
      
      case 'debtToIncomeRatio':
        if (typeof value !== 'number' || value < 0 || value > 1) {
          throw new Error('Debt-to-income ratio must be between 0 and 1');
        }
        break;
      
      case 'employmentDuration':
        if (typeof value !== 'number' || value < 0) {
          throw new Error('Employment duration must be a positive number');
        }
        break;
      
      default:
        throw new Error('Unknown parameter');
    }
    
    next();
  } catch (error) {
    const errorResponse: APIResponse = {
      success: false,
      error: 'Parameter validation failed',
      message: error instanceof Error ? error.message : 'Invalid parameter value',
    };
    res.status(400).json(errorResponse);
  }
};

// Content length validation
export const validateContentLength = (maxLength: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxLength) {
      const errorResponse: APIResponse = {
        success: false,
        error: 'Request too large',
        message: `Request body cannot exceed ${maxLength} bytes`,
      };
      res.status(413).json(errorResponse);
      return;
    }
    
    next();
  };
};

// Sanitize input middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potential XSS attacks
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      }
      
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    
    return value;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
};

// Rate limiting validation
export const validateRateLimit = (windowMs: number, max: number, keyGenerator?: (req: Request) => string) => {
  const requests = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : (req.ip || 'unknown');
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean up old entries
    for (const [k, v] of requests.entries()) {
      if (v.resetTime < windowStart) {
        requests.delete(k);
      }
    }
    
    const record = requests.get(key);
    
    if (!record) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= max) {
      const errorResponse: APIResponse = {
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again later.`,
      };
      return res.status(429).json(errorResponse);
    }
    
    record.count++;
    next();
  };
};

// Custom type declaration for session ID
declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
    }
  }
}