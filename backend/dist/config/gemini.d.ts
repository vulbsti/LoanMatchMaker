import { GeminiConfig } from '../models/interfaces';
export declare class GeminiService {
    private genAI;
    private config;
    constructor(config: GeminiConfig);
    generateContent(prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
        model?: string;
    }): Promise<string>;
    healthCheck(): Promise<boolean>;
    generatePCAResponse(prompt: string): Promise<string>;
    generateMCAResponse(prompt: string): Promise<string>;
    generateMultipleResponses(prompts: string[]): Promise<string[]>;
}
export declare const createGeminiService: (config: GeminiConfig) => GeminiService;
export declare const SYSTEM_PROMPTS: {
    LOAN_ADVISOR_AGENT: string;
    PARAMETER_EXTRACTOR_AGENT: string;
};
export declare const buildLoanAdvisorPrompt: (context: {
    conversationHistory: {
        role: "user" | "assistant";
        parts: {
            text: string;
        }[];
    }[];
    collectedParameters: Partial<any>;
    missingParameters: (string)[];
}) => any;
export declare const buildParameterExtractorPrompt: (userMessage: string) => string;
//# sourceMappingURL=gemini.d.ts.map