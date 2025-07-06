"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentOrchestrator = void 0;
const gemini_1 = require("../config/gemini");
class AgentOrchestrator {
    constructor(geminiService, parameterService) {
        this.geminiService = geminiService;
        this.parameterService = parameterService;
    }
    async processMessage(context) {
        const { sessionId, message, conversationHistory } = context;
        const initialParameters = await this.parameterService.getParameters(sessionId);
        const missingParameters = await this.parameterService.getMissingParameters(sessionId);
        const prompt = (0, gemini_1.buildLoanAdvisorPrompt)({
            conversationHistory: this.formatHistory([...conversationHistory, {
                    id: 0,
                    sessionId,
                    messageType: 'user',
                    content: message,
                    createdAt: new Date()
                }]),
            collectedParameters: initialParameters,
            missingParameters,
        });
        const llmResponse = await this.geminiService.generateContent(JSON.stringify(prompt));
        const toolCallMatch = llmResponse.match(/\{\s*"tool_call":\s*"extract_parameters"[\s\S]*?\}/);
        if (toolCallMatch) {
            try {
                const toolCall = JSON.parse(toolCallMatch[0]);
                const userMessageForExtraction = toolCall.user_message || message;
                const extractedParameters = await this.parameterService.extractParametersWithLLM(userMessageForExtraction);
                if (Object.keys(extractedParameters).length > 0) {
                    for (const [param, value] of Object.entries(extractedParameters)) {
                        await this.parameterService.updateParameter(sessionId, param, value);
                    }
                }
                return this.processMessage({ ...context, message: "System: Parameters extracted. Continue conversation." });
            }
            catch (error) {
                console.error("Error parsing or executing tool call:", error);
            }
        }
        const finalMissingParams = await this.parameterService.getMissingParameters(sessionId);
        const finalTracking = await this.parameterService.getTrackingStatus(sessionId);
        if (finalMissingParams.length === 0) {
            return {
                response: "Great! I have all the information I need. I'm now finding the best loan matches for you.",
                action: 'trigger_matching',
                completionPercentage: 100,
            };
        }
        return {
            response: llmResponse,
            action: 'continue',
            completionPercentage: finalTracking.completionPercentage,
        };
    }
    formatHistory(messages) {
        return messages.map(msg => ({
            role: msg.messageType === 'user' ? 'user' : 'assistant',
            parts: [{ text: msg.content }],
        }));
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
//# sourceMappingURL=agentOrchestrator.js.map