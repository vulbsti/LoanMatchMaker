"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityLogMiddleware = exports.apiKeyValidation = exports.inputSecurityMiddleware = exports.corsSecurityMiddleware = exports.sessionSecurity = exports.requestSizeLimit = exports.ipFilter = exports.generalRateLimit = exports.matchRateLimit = exports.chatRateLimit = exports.securityHeaders = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const helmet_1 = __importDefault(require("helmet"));
const config_1 = require("../config");
exports.securityHeaders = (0, helmet_1.default)({
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
exports.chatRateLimit = (0, express_rate_limit_1.default)({
    windowMs: config_1.rateLimits.chat.windowMs,
    max: config_1.rateLimits.chat.max,
    keyGenerator: (req) => req.body.sessionId || req.ip,
    handler: (req, res) => {
        const errorResponse = {
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many chat messages. Please slow down.',
        };
        res.status(429).json(errorResponse);
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.matchRateLimit = (0, express_rate_limit_1.default)({
    windowMs: config_1.rateLimits.matching.windowMs,
    max: config_1.rateLimits.matching.max,
    keyGenerator: (req) => req.body.sessionId || req.ip,
    handler: (req, res) => {
        const errorResponse = {
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many match requests. Please wait before trying again.',
        };
        res.status(429).json(errorResponse);
    },
    standardHeaders: true,
    legacyHeaders: false,
});
exports.generalRateLimit = (0, express_rate_limit_1.default)({
    windowMs: config_1.rateLimits.general.windowMs,
    max: config_1.rateLimits.general.max,
    keyGenerator: (req) => req.ip || 'unknown',
    handler: (req, res) => {
        const errorResponse = {
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many requests from this IP. Please try again later.',
        };
        res.status(429).json(errorResponse);
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const ipFilter = (blockedIPs = []) => {
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        if (clientIP && blockedIPs.includes(clientIP)) {
            const errorResponse = {
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
exports.ipFilter = ipFilter;
const requestSizeLimit = (maxSize) => {
    return (req, res, next) => {
        const contentLength = req.get('content-length');
        if (contentLength && parseInt(contentLength) > maxSize) {
            const errorResponse = {
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
exports.requestSizeLimit = requestSizeLimit;
const sessionSecurity = (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
    });
    next();
};
exports.sessionSecurity = sessionSecurity;
const corsSecurityMiddleware = (req, res, next) => {
    const origin = req.get('Origin');
    const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://yourdomain.com',
    ];
    if (process.env.NODE_ENV === 'production' && origin && !allowedOrigins.includes(origin)) {
        const errorResponse = {
            success: false,
            error: 'CORS violation',
            message: 'Origin not allowed',
        };
        res.status(403).json(errorResponse);
        return;
    }
    next();
};
exports.corsSecurityMiddleware = corsSecurityMiddleware;
const inputSecurityMiddleware = (req, res, next) => {
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
    const checkSuspiciousContent = (obj) => {
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
        const errorResponse = {
            success: false,
            error: 'Suspicious input detected',
            message: 'Request contains potentially malicious content',
        };
        res.status(400).json(errorResponse);
        return;
    }
    next();
};
exports.inputSecurityMiddleware = inputSecurityMiddleware;
const apiKeyValidation = (req, res, next) => {
    const apiKey = req.get('X-API-Key');
    const expectedApiKey = process.env.INTERNAL_API_KEY;
    if (!expectedApiKey) {
        return next();
    }
    if (!apiKey || apiKey !== expectedApiKey) {
        const errorResponse = {
            success: false,
            error: 'Invalid API key',
            message: 'A valid API key is required for this endpoint',
        };
        return res.status(401).json(errorResponse);
    }
    next();
};
exports.apiKeyValidation = apiKeyValidation;
const securityLogMiddleware = (req, res, next) => {
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
        if (res.statusCode >= 400 || duration > 5000) {
            console.warn('Security log:', logData);
        }
    });
    next();
};
exports.securityLogMiddleware = securityLogMiddleware;
//# sourceMappingURL=security.js.map