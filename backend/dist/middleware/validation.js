"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRateLimit = exports.sanitizeInput = exports.validateContentLength = exports.validateParameterValue = exports.validateSession = exports.validateUUID = exports.validateRequest = void 0;
const zod_1 = require("zod");
const validateRequest = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            const data = req[source];
            schema.parse(data);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const errorResponse = {
                    success: false,
                    error: 'Validation failed',
                    message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
                };
                res.status(400).json(errorResponse);
                return;
            }
            const errorResponse = {
                success: false,
                error: 'Invalid request data',
                message: 'Request validation failed',
            };
            res.status(400).json(errorResponse);
            return;
        }
    };
};
exports.validateRequest = validateRequest;
const validateUUID = (paramName) => {
    return (req, res, next) => {
        const uuid = req.params[paramName];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuid || !uuidRegex.test(uuid)) {
            const errorResponse = {
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
exports.validateUUID = validateUUID;
const validateSession = async (req, res, next) => {
    try {
        const sessionId = req.body.sessionId || req.params.sessionId;
        if (!sessionId) {
            const errorResponse = {
                success: false,
                error: 'Session ID required',
                message: 'Session ID is required for this operation',
            };
            res.status(400).json(errorResponse);
            return;
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(sessionId)) {
            const errorResponse = {
                success: false,
                error: 'Invalid session ID format',
                message: 'Session ID must be a valid UUID',
            };
            res.status(400).json(errorResponse);
            return;
        }
        req.sessionId = sessionId;
        next();
    }
    catch (error) {
        const errorResponse = {
            success: false,
            error: 'Session validation failed',
            message: 'Failed to validate session',
        };
        res.status(500).json(errorResponse);
        return;
    }
};
exports.validateSession = validateSession;
const validateParameterValue = (req, res, next) => {
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
    }
    catch (error) {
        const errorResponse = {
            success: false,
            error: 'Parameter validation failed',
            message: error instanceof Error ? error.message : 'Invalid parameter value',
        };
        res.status(400).json(errorResponse);
    }
};
exports.validateParameterValue = validateParameterValue;
const validateContentLength = (maxLength) => {
    return (req, res, next) => {
        const contentLength = req.get('content-length');
        if (contentLength && parseInt(contentLength) > maxLength) {
            const errorResponse = {
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
exports.validateContentLength = validateContentLength;
const sanitizeInput = (req, res, next) => {
    const sanitizeValue = (value) => {
        if (typeof value === 'string') {
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
            const sanitized = {};
            for (const [key, val] of Object.entries(value)) {
                sanitized[key] = sanitizeValue(val);
            }
            return sanitized;
        }
        return value;
    };
    if (req.body) {
        req.body = sanitizeValue(req.body);
    }
    if (req.query) {
        req.query = sanitizeValue(req.query);
    }
    next();
};
exports.sanitizeInput = sanitizeInput;
const validateRateLimit = (windowMs, max, keyGenerator) => {
    const requests = new Map();
    return (req, res, next) => {
        const key = keyGenerator ? keyGenerator(req) : (req.ip || 'unknown');
        const now = Date.now();
        const windowStart = now - windowMs;
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
            const errorResponse = {
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
exports.validateRateLimit = validateRateLimit;
//# sourceMappingURL=validation.js.map