import { GeminiService } from '../config/gemini';
import { MessageContext, AgentResponse } from '../models/interfaces';
import { ParameterService } from './parameterService';
export declare class AgentOrchestrator {
    private geminiService;
    private parameterService;
    constructor(geminiService: GeminiService, parameterService: ParameterService);
    processMessage(context: MessageContext): Promise<AgentResponse>;
    private formatHistory;
    private buildAcknowledgmentPrompt;
    private cleanToolCallsFromResponse;
    private buildEnhancedAcknowledgmentPrompt;
}
//# sourceMappingURL=agentOrchestrator.d.ts.map