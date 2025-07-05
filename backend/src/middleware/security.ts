import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { rateLimits } from '../config';
import { APIResponse } from '../models/interfaces';

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Rate limiting middleware for chat endpoints
export const chatRateLimit = rateLimit({
  windowMs: rateLimits.chat.windowMs,
  max: rateLimits.chat.max,
  keyGenerator: (req: Request) => req.body.sessionId || req.ip,
  handler: (req: Request, res: Response) => {
    const errorResponse: APIResponse = {
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many chat messages. Please slow down.',
    };
    res.status(429).json(errorResponse);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting middleware for matching endpoints
export const matchRateLimit = rateLimit({
  windowMs: rateLimits.matching.windowMs,
  max: rateLimits.matching.max,
  keyGenerator: (req: Request) => req.body.sessionId || req.ip,
  handler: (req: Request, res: Response) => {
    const errorResponse: APIResponse = {
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many match requests. Please wait before trying again.',
    };
    res.status(429).json(errorResponse);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiting middleware
export const generalRateLimit = rateLimit({
  windowMs: rateLimits.general.windowMs,
  max: rateLimits.general.max,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  handler: (req: Request, res: Response) => {
    const errorResponse: APIResponse = {
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP. Please try again later.',
    };
    res.status(429).json(errorResponse);
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// IP filtering middleware (for blocking malicious IPs)
export const ipFilter = (blockedIPs: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (clientIP && blockedIPs.includes(clientIP)) {
      const errorResponse: APIResponse = {
        success: false,
        error: 'Access denied',
        message: 'Your IP address has been blocked',
      };
      res.status(403).json(errorResponse);
      return;
    }
    
    next();
  };
};

// Request size limiting middleware
export const requestSizeLimit = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      const errorResponse: APIResponse = {
        success: false,
        error: 'Request too large',
        message: `Request body cannot exceed ${maxSize} bytes`,
      };
      res.status(413).json(errorResponse);
      return;
    }
    
    next();
  };
};

// Session security middleware
export const sessionSecurity = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers for session management
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store',
  });
  
  next();
};

// CORS security middleware
export const corsSecurityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.get('Origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://yourdomain.com', // Replace with your production domain
  ];
  
  if (process.env.NODE_ENV === 'production' && origin && !allowedOrigins.includes(origin)) {
    const errorResponse: APIResponse = {
      success: false,
      error: 'CORS violation',
      message: 'Origin not allowed',
    };
    res.status(403).json(errorResponse);
    return;
  }
  
  next();
};

// Input validation security middleware
export const inputSecurityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Check for suspicious patterns in request body
  const suspiciousPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i,
    /update\s+set/i,
    /delete\s+from/i,
    /<script.*?>.*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
  ];
  
  const checkSuspiciousContent = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.some(checkSuspiciousContent);
      }
      
      return Object.values(obj).some(checkSuspiciousContent);
    }
    
    return false;
  };
  
  if (req.body && checkSuspiciousContent(req.body)) {
    const errorResponse: APIResponse = {
      success: false,
      error: 'Suspicious input detected',
      message: 'Request contains potentially malicious content',
    };
    res.status(400).json(errorResponse);
    return;
  }
  
  next();
};

// API key validation middleware (for internal APIs)
export const apiKeyValidation = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.get('X-API-Key');
  const expectedApiKey = process.env.INTERNAL_API_KEY;
  
  if (!expectedApiKey) {
    return next(); // Skip validation if no API key is configured
  }
  
  if (!apiKey || apiKey !== expectedApiKey) {
    const errorResponse: APIResponse = {
      success: false,
      error: 'Invalid API key',
      message: 'A valid API key is required for this endpoint',
    };
    return res.status(401).json(errorResponse);
  }
  
  next();
};

// Request logging middleware for security monitoring
export const securityLogMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
    };
    
    // Log suspicious activity
    if (res.statusCode >= 400 || duration > 5000) {
      console.warn('Security log:', logData);
    }
  });
  
  next();
};