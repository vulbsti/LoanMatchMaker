import dotenv from 'dotenv';
import { AppConfig } from '../models/interfaces';
import { parseDatabaseUrl } from './database';

// Load environment variables
dotenv.config();

const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
};

const getEnvNumber = (name: string, defaultValue?: number): number => {
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

const getEnvBoolean = (name: string, defaultValue?: boolean): boolean => {
  const value = process.env[name];
  if (!value) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${name} is required`);
    }
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
};

// Application configuration
export const config: AppConfig = {
  port: getEnvNumber('PORT', 3001),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  
  database: parseDatabaseUrl(getEnvVar('DATABASE_URL')),
  
  gemini: {
    apiKey: getEnvVar('GEMINI_API_KEY'),
    model: getEnvVar('GEMINI_MODEL', 'gemini-2.5-flash'),
    temperature: getEnvNumber('GEMINI_TEMPERATURE', 0.7),
    maxTokens: getEnvNumber('GEMINI_MAX_TOKENS', 1000),
  },
  
  sessionSecret: getEnvVar('SESSION_SECRET_KEY'),
};

// Validation
export const validateConfig = (): void => {
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

  // Validate database connection
  if (!config.database.host || !config.database.database) {
    const error = new Error('Invalid database configuration');
    console.error('Database configuration validation failed:', error.message);
    throw error;
  }

  // Validate Gemini API key format
  if (!config.gemini.apiKey.startsWith('AI')) {
    console.warn('Warning: Gemini API key format may be incorrect. Expected format starts with "AI"');
  }

  // Validate session secret length
  if (config.sessionSecret.length < 32) {
    const error = new Error('Session secret key must be at least 32 characters long');
    console.error('Session secret validation failed:', error.message);
    throw error;
  }

  // Validate Gemini model name
  const validModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
  if (!validModels.includes(config.gemini.model)) {
    console.warn(`Warning: Using non-standard Gemini model "${config.gemini.model}". Recommended models: ${validModels.join(', ')}`);
  }

  console.log('✅ Configuration validation passed');
};

// Environment-specific configurations
export const isDevelopment = config.nodeEnv === 'development';
export const isProduction = config.nodeEnv === 'production';
export const isTest = config.nodeEnv === 'test';

// Rate limiting configuration
export const rateLimits = {
  chat: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
  },
  matching: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // 3 requests per 5 minutes
  },
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
  },
};

// CORS configuration
export const corsOptions = {
  origin: isDevelopment 
    ? ['http://localhost:3000', 'http://127.0.0.1:3000']
    : process.env.FRONTEND_URL?.split(',') || ['https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Logging configuration
export const logConfig = {
  level: isDevelopment ? 'debug' : 'info',
  format: isDevelopment ? 'dev' : 'combined',
  filename: isProduction ? 'app.log' : undefined,
};

// Security configuration
export const securityConfig = {
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