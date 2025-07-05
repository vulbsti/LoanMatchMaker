import { GeminiService } from '../config/gemini';
import { MessageContext, AgentResponse } from '../models/interfaces';
import { ParameterService } from './parameterService';
export declare class AgentOrchestrator {
    private geminiService;
    private parameterService;
    constructor(geminiService: GeminiService, parameterService: ParameterService);
    processMessage(context: MessageContext): Promise<AgentResponse>;
    private consultPCA;
    private processMCA;
    private parsePCAResponse;
    private parseMCAResponse;
    private orchestrateResponse;
    private extractPCAGuidanceFromText;
    private detectTone;
    private requiresUserInput;
    private extractSuggestedReplies;
    private getFallbackPCAGuidance;
    private getFallbackMCAResponse;
    private getFallbackParameterQuestion;
}
//# sourceMappingURL=agentOrchestrator.d.ts.map