import { z } from 'zod';

// Validation schemas using Zod
export const LoanParameterSchema = z.object({
  loanAmount: z.number().min(1000).max(500000),
  annualIncome: z.number().positive(),
  employmentStatus: z.enum(['salaried', 'self-employed', 'freelancer', 'unemployed']),
  creditScore: z.number().min(300).max(850),
  loanPurpose: z.enum(['home', 'auto', 'personal', 'business', 'education', 'debt-consolidation']),
  debtToIncomeRatio: z.number().min(0).max(1).optional(),
  employmentDuration: z.number().min(0).optional(),
});

export const ChatMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1).max(1000),
  timestamp: z.date().optional(),
});

export const SessionCreateSchema = z.object({
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

export const ParameterUpdateSchema = z.object({
  sessionId: z.string().uuid(),
  parameter: z.enum(['loanAmount', 'annualIncome', 'employmentStatus', 'creditScore', 'loanPurpose', 'debtToIncomeRatio', 'employmentDuration']),
  value: z.union([z.number(), z.string()]),
});

export const MatchRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.date(),
  services: z.object({
    database: z.boolean(),
    gemini: z.boolean(),
  }),
  uptime: z.number(),
});

// Type inference from schemas
export type LoanParameterInput = z.infer<typeof LoanParameterSchema>;
export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;
export type SessionCreateInput = z.infer<typeof SessionCreateSchema>;
export type ParameterUpdateInput = z.infer<typeof ParameterUpdateSchema>;
export type MatchRequestInput = z.infer<typeof MatchRequestSchema>;
export type HealthCheckInput = z.infer<typeof HealthCheckSchema>;

// Common validation patterns
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const PHONE_REGEX = /^\+?[\d\s\-\(\)]{10,}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Parameter validation helpers
export const validateLoanAmount = (amount: number): boolean => {
  return amount >= 1000 && amount <= 500000;
};

export const validateCreditScore = (score: number): boolean => {
  return score >= 300 && score <= 850;
};

export const validateAnnualIncome = (income: number): boolean => {
  return income > 0 && income <= 10000000; // 10M max
};

export const validateEmploymentStatus = (status: string): boolean => {
  return ['salaried', 'self-employed', 'freelancer', 'unemployed'].includes(status);
};

export const validateLoanPurpose = (purpose: string): boolean => {
  return ['home', 'auto', 'personal', 'business', 'education', 'debt-consolidation'].includes(purpose);
};

// Error response schemas
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  statusCode: z.number().optional(),
});

export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any().optional(),
  message: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;