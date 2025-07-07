"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuccessResponseSchema = exports.ErrorResponseSchema = exports.validateLoanPurpose = exports.validateEmploymentStatus = exports.validateAnnualIncome = exports.validateCreditScore = exports.validateLoanAmount = exports.EMAIL_REGEX = exports.PHONE_REGEX = exports.UUID_REGEX = exports.HealthCheckSchema = exports.MatchRequestSchema = exports.ParameterUpdateSchema = exports.SessionCreateSchema = exports.ChatMessageSchema = exports.LoanParameterSchema = void 0;
const zod_1 = require("zod");
exports.LoanParameterSchema = zod_1.z.object({
    loanAmount: zod_1.z.number().min(100000).max(100000000),
    annualIncome: zod_1.z.number().positive(),
    employmentStatus: zod_1.z.enum(['salaried', 'self-employed', 'freelancer', 'student', 'unemployed']),
    creditScore: zod_1.z.number().min(300).max(850),
    loanPurpose: zod_1.z.enum(['home', 'vehicle', 'education', 'business', 'startup', 'eco', 'emergency', 'gold-backed', 'personal']),
    debtToIncomeRatio: zod_1.z.number().min(0).max(1).optional(),
    employmentDuration: zod_1.z.number().min(0).optional(),
});
exports.ChatMessageSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    message: zod_1.z.string().min(1).max(1000),
    timestamp: zod_1.z.date().optional(),
});
exports.SessionCreateSchema = zod_1.z.object({
    userAgent: zod_1.z.string().optional(),
    ipAddress: zod_1.z.string().optional(),
});
exports.ParameterUpdateSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
    parameter: zod_1.z.enum(['loanAmount', 'annualIncome', 'employmentStatus', 'creditScore', 'loanPurpose', 'debtToIncomeRatio', 'employmentDuration']),
    value: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]),
});
exports.MatchRequestSchema = zod_1.z.object({
    sessionId: zod_1.z.string().uuid(),
});
exports.HealthCheckSchema = zod_1.z.object({
    status: zod_1.z.enum(['healthy', 'unhealthy']),
    timestamp: zod_1.z.date(),
    services: zod_1.z.object({
        database: zod_1.z.boolean(),
        gemini: zod_1.z.boolean(),
    }),
    uptime: zod_1.z.number(),
});
exports.UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
exports.PHONE_REGEX = /^\+?[\d\s\-\(\)]{10,}$/;
exports.EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validateLoanAmount = (amount) => {
    return amount >= 100000 && amount <= 100000000;
};
exports.validateLoanAmount = validateLoanAmount;
const validateCreditScore = (score) => {
    return score >= 300 && score <= 850;
};
exports.validateCreditScore = validateCreditScore;
const validateAnnualIncome = (income) => {
    return income > 0 && income <= 10000000;
};
exports.validateAnnualIncome = validateAnnualIncome;
const validateEmploymentStatus = (status) => {
    return ['salaried', 'self-employed', 'freelancer', 'student', 'unemployed'].includes(status);
};
exports.validateEmploymentStatus = validateEmploymentStatus;
const validateLoanPurpose = (purpose) => {
    return ['home', 'vehicle', 'education', 'business', 'startup', 'eco', 'emergency', 'gold-backed', 'personal'].includes(purpose);
};
exports.validateLoanPurpose = validateLoanPurpose;
exports.ErrorResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    error: zod_1.z.string(),
    message: zod_1.z.string().optional(),
    statusCode: zod_1.z.number().optional(),
});
exports.SuccessResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    data: zod_1.z.any().optional(),
    message: zod_1.z.string().optional(),
});
//# sourceMappingURL=schemas.js.map