import { AppConfig } from '../models/interfaces';
export declare const config: AppConfig;
export declare const validateConfig: () => void;
export declare const isDevelopment: boolean;
export declare const isProduction: boolean;
export declare const isTest: boolean;
export declare const rateLimits: {
    chat: {
        windowMs: number;
        max: number;
    };
    matching: {
        windowMs: number;
        max: number;
    };
    general: {
        windowMs: number;
        max: number;
    };
};
export declare const corsOptions: {
    origin: string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
};
export declare const logConfig: {
    level: string;
    format: string;
    filename: string | undefined;
};
export declare const securityConfig: {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: string[];
            styleSrc: string[];
            scriptSrc: string[];
            imgSrc: string[];
        };
    };
    hsts: {
        maxAge: number;
        includeSubDomains: boolean;
        preload: boolean;
    };
};
//# sourceMappingURL=index.d.ts.map