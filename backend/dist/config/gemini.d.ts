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
    MCA: string;
    PCA: string;
};
export declare const buildPCAPrompt: (context: any) => string;
export declare const buildMCAPrompt: (context: any, guidance: any) => string;
//# sourceMappingURL=gemini.d.ts.map