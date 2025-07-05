import { z } from 'zod';
export declare const LoanParameterSchema: z.ZodObject<{
    loanAmount: z.ZodNumber;
    annualIncome: z.ZodNumber;
    employmentStatus: z.ZodEnum<["salaried", "self-employed", "freelancer", "unemployed"]>;
    creditScore: z.ZodNumber;
    loanPurpose: z.ZodEnum<["home", "auto", "personal", "business", "education", "debt-consolidation"]>;
    debtToIncomeRatio: z.ZodOptional<z.ZodNumber>;
    employmentDuration: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    loanAmount: number;
    annualIncome: number;
    employmentStatus: "salaried" | "self-employed" | "freelancer" | "unemployed";
    creditScore: number;
    loanPurpose: "home" | "auto" | "personal" | "business" | "education" | "debt-consolidation";
    debtToIncomeRatio?: number | undefined;
    employmentDuration?: number | undefined;
}, {
    loanAmount: number;
    annualIncome: number;
    employmentStatus: "salaried" | "self-employed" | "freelancer" | "unemployed";
    creditScore: number;
    loanPurpose: "home" | "auto" | "personal" | "business" | "education" | "debt-consolidation";
    debtToIncomeRatio?: number | undefined;
    employmentDuration?: number | undefined;
}>;
export declare const ChatMessageSchema: z.ZodObject<{
    sessionId: z.ZodString;
    message: z.ZodString;
    timestamp: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    message: string;
    sessionId: string;
    timestamp?: Date | undefined;
}, {
    message: string;
    sessionId: string;
    timestamp?: Date | undefined;
}>;
export declare const SessionCreateSchema: z.ZodObject<{
    userAgent: z.ZodOptional<z.ZodString>;
    ipAddress: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userAgent?: string | undefined;
    ipAddress?: string | undefined;
}, {
    userAgent?: string | undefined;
    ipAddress?: string | undefined;
}>;
export declare const ParameterUpdateSchema: z.ZodObject<{
    sessionId: z.ZodString;
    parameter: z.ZodEnum<["loanAmount", "annualIncome", "employmentStatus", "creditScore", "loanPurpose", "debtToIncomeRatio", "employmentDuration"]>;
    value: z.ZodUnion<[z.ZodNumber, z.ZodString]>;
}, "strip", z.ZodTypeAny, {
    value: string | number;
    sessionId: string;
    parameter: "loanAmount" | "annualIncome" | "employmentStatus" | "creditScore" | "loanPurpose" | "debtToIncomeRatio" | "employmentDuration";
}, {
    value: string | number;
    sessionId: string;
    parameter: "loanAmount" | "annualIncome" | "employmentStatus" | "creditScore" | "loanPurpose" | "debtToIncomeRatio" | "employmentDuration";
}>;
export declare const MatchRequestSchema: z.ZodObject<{
    sessionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sessionId: string;
}, {
    sessionId: string;
}>;
export declare const HealthCheckSchema: z.ZodObject<{
    status: z.ZodEnum<["healthy", "unhealthy"]>;
    timestamp: z.ZodDate;
    services: z.ZodObject<{
        database: z.ZodBoolean;
        gemini: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        database: boolean;
        gemini: boolean;
    }, {
        database: boolean;
        gemini: boolean;
    }>;
    uptime: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    status: "healthy" | "unhealthy";
    timestamp: Date;
    services: {
        database: boolean;
        gemini: boolean;
    };
    uptime: number;
}, {
    status: "healthy" | "unhealthy";
    timestamp: Date;
    services: {
        database: boolean;
        gemini: boolean;
    };
    uptime: number;
}>;
export type LoanParameterInput = z.infer<typeof LoanParameterSchema>;
export type ChatMessageInput = z.infer<typeof ChatMessageSchema>;
export type SessionCreateInput = z.infer<typeof SessionCreateSchema>;
export type ParameterUpdateInput = z.infer<typeof ParameterUpdateSchema>;
export type MatchRequestInput = z.infer<typeof MatchRequestSchema>;
export type HealthCheckInput = z.infer<typeof HealthCheckSchema>;
export declare const UUID_REGEX: RegExp;
export declare const PHONE_REGEX: RegExp;
export declare const EMAIL_REGEX: RegExp;
export declare const validateLoanAmount: (amount: number) => boolean;
export declare const validateCreditScore: (score: number) => boolean;
export declare const validateAnnualIncome: (income: number) => boolean;
export declare const validateEmploymentStatus: (status: string) => boolean;
export declare const validateLoanPurpose: (purpose: string) => boolean;
export declare const ErrorResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodString;
    message: z.ZodOptional<z.ZodString>;
    statusCode: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    error: string;
    success: false;
    message?: string | undefined;
    statusCode?: number | undefined;
}, {
    error: string;
    success: false;
    message?: string | undefined;
    statusCode?: number | undefined;
}>;
export declare const SuccessResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodOptional<z.ZodAny>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: true;
    message?: string | undefined;
    data?: any;
}, {
    success: true;
    message?: string | undefined;
    data?: any;
}>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
//# sourceMappingURL=schemas.d.ts.map