"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityConfig = exports.logConfig = exports.corsOptions = exports.rateLimits = exports.isTest = exports.isProduction = exports.isDevelopment = exports.validateConfig = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./database");
dotenv_1.default.config();
const getEnvVar = (name, defaultValue) => {
    const value = process.env[name];
    if (!value && !defaultValue) {
        throw new Error(`Environment variable ${name} is required`);
    }
    return value || defaultValue;
};
const getEnvNumber = (name, defaultValue) => {
    const value = process.env[name];
    if (!value) {
        if (defaultValue === undefined) {
            throw new Error(`Environment variable ${name} is required`);
        }
        return defaultValue;
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Environment variable ${name} must be a number`);
    }
    return parsed;
};
const getEnvBoolean = (name, defaultValue) => {
    const value = process.env[name];
    if (!value) {
        if (defaultValue === undefined) {
            throw new Error(`Environment variable ${name} is required`);
        }
        return defaultValue;
    }
    return value.toLowerCase() === 'true';
};
exports.config = {
    port: getEnvNumber('PORT', 3001),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
    database: (0, database_1.parseDatabaseUrl)(getEnvVar('DATABASE_URL')),
    gemini: {
        apiKey: getEnvVar('GEMINI_API_KEY'),
        model: getEnvVar('GEMINI_MODEL', 'gemini-2.5-flash'),
        temperature: getEnvNumber('GEMINI_TEMPERATURE', 0.7),
        maxTokens: getEnvNumber('GEMINI_MAX_TOKENS', 1000),
    },
    sessionSecret: getEnvVar('SESSION_SECRET_KEY'),
};
const validateConfig = () => {
    const requiredVars = [
        'DATABASE_URL',
        'GEMINI_API_KEY',
        'SESSION_SECRET_KEY',
    ];
    const missing = requiredVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        const error = new Error(`Missing required environment variables: ${missing.join(', ')}`);
        console.error('Configuration validation failed:', error.message);
        throw error;
    }
    if (!exports.config.database.host || !exports.config.database.database) {
        const error = new Error('Invalid database configuration');
        console.error('Database configuration validation failed:', error.message);
        throw error;
    }
    if (!exports.config.gemini.apiKey.startsWith('AI')) {
        console.warn('Warning: Gemini API key format may be incorrect. Expected format starts with "AI"');
    }
    if (exports.config.sessionSecret.length < 32) {
        const error = new Error('Session secret key must be at least 32 characters long');
        console.error('Session secret validation failed:', error.message);
        throw error;
    }
    const validModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
    if (!validModels.includes(exports.config.gemini.model)) {
        console.warn(`Warning: Using non-standard Gemini model "${exports.config.gemini.model}". Recommended models: ${validModels.join(', ')}`);
    }
    console.log('✅ Configuration validation passed');
};
exports.validateConfig = validateConfig;
exports.isDevelopment = exports.config.nodeEnv === 'development';
exports.isProduction = exports.config.nodeEnv === 'production';
exports.isTest = exports.config.nodeEnv === 'test';
exports.rateLimits = {
    chat: {
        windowMs: 1 * 60 * 1000,
        max: 20,
    },
    matching: {
        windowMs: 5 * 60 * 1000,
        max: 3,
    },
    general: {
        windowMs: 15 * 60 * 1000,
        max: 100,
    },
};
exports.corsOptions = {
    origin: exports.isDevelopment
        ? ['http://localhost:3000', 'http://127.0.0.1:3000']
        : process.env.FRONTEND_URL?.split(',') || ['https://yourdomain.com'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
exports.logConfig = {
    level: exports.isDevelopment ? 'debug' : 'info',
    format: exports.isDevelopment ? 'dev' : 'combined',
    filename: exports.isProduction ? 'app.log' : undefined,
};
exports.securityConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
};
//# sourceMappingURL=index.js.map