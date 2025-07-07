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
        const isSystemCall = message.startsWith("System:");
        const prompt = (0, gemini_1.buildLoanAdvisorPrompt)({
            conversationHistory: this.formatHistory([...conversationHistory, {
                    id: 0,
                    sessionId,
                    messageType: 'user',
                    content: isSystemCall ? "Continue conversation with updated parameters" : message,
                    createdAt: new Date()
                }]),
            collectedParameters: initialParameters,
            missingParameters,
        });
        const llmResponse = await this.geminiService.generateContent(JSON.stringify(prompt));
        const toolCallRegex = /```json\s*\{\s*"tool_call"\s*:\s*"extract_parameters"[\s\S]*?\}\s*```/g;
        const simpleToolCallRegex = /\{\s*"tool_call"\s*:\s*"extract_parameters"[\s\S]*?\}/g;
        let toolCallMatch = llmResponse.match(toolCallRegex) || llmResponse.match(simpleToolCallRegex);
        if (toolCallMatch) {
            try {
                const jsonString = toolCallMatch[0].replace(/```json\s*|\s*```/g, '');
                const toolCall = JSON.parse(jsonString);
                const contextForExtraction = conversationHistory
                    .slice(-5)
                    .map(msg => `${msg.messageType}: ${msg.content}`)
                    .join('\n') + `\nuser: ${message}`;
                const userMessageForExtraction = toolCall.user_message || contextForExtraction;
                const extractedParameters = await this.parameterService.extractParametersWithLLM(userMessageForExtraction);
                if (Object.keys(extractedParameters).length > 0) {
                    console.log('Extracted parameters:', extractedParameters);
                    for (const [param, value] of Object.entries(extractedParameters)) {
                        await this.parameterService.updateParameter(sessionId, param, value);
                    }
                    const updatedParameters = await this.parameterService.getParameters(sessionId);
                    const updatedMissing = await this.parameterService.getMissingParameters(sessionId);
                    const acknowledgmentPrompt = this.buildEnhancedAcknowledgmentPrompt(extractedParameters, updatedParameters, updatedMissing, conversationHistory, message);
                    const acknowledgmentResponse = await this.geminiService.generateContent(acknowledgmentPrompt);
                    return {
                        response: acknowledgmentResponse,
                        action: updatedMissing.length === 0 ? 'trigger_matching' : 'continue',
                        completionPercentage: Math.round(((5 - updatedMissing.length) / 5) * 100),
                    };
                }
            }
            catch (error) {
                console.error("Error parsing or executing tool call:", error);
            }
        }
        const finalMissingParams = await this.parameterService.getMissingParameters(sessionId);
        if (finalMissingParams.length === 0) {
            return {
                response: "Perfect! I have all the information I need. Let me find the best loan options for you.",
                action: 'trigger_matching',
                completionPercentage: 100,
            };
        }
        const cleanResponse = this.cleanToolCallsFromResponse(llmResponse);
        return {
            response: cleanResponse,
            action: 'continue',
            completionPercentage: Math.round(((5 - finalMissingParams.length) / 5) * 100),
        };
    }
    formatHistory(messages) {
        return messages.map(msg => ({
            role: msg.messageType === 'user' ? 'user' : 'assistant',
            parts: [{ text: msg.content }],
        }));
    }
    buildAcknowledgmentPrompt(extractedParameters, updatedParameters, updatedMissing, conversationHistory) {
        const extractedList = Object.entries(extractedParameters)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        const historyText = conversationHistory
            .slice(-10)
            .map(msg => `${msg.messageType === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');
        return `You are LoanBot. You just successfully extracted these parameters: ${extractedList}

Recent conversation (last 10 messages):
${historyText}

Current state:
- All collected parameters: ${JSON.stringify(updatedParameters)}
- Still missing: ${JSON.stringify(updatedMissing)}

Provide a natural, conversational response that:
1. Acknowledges what information you just understood/captured
2. If parameters are still missing, smoothly asks for the next most important one
3. If all parameters are collected, congratulate and prepare for matching
4. Keep the tone friendly and natural
5. Reference the conversation context appropriately

Respond directly (no JSON, no tool calls):`;
    }
    cleanToolCallsFromResponse(response) {
        return response
            .replace(/```json\s*\{\s*"tool_call"[\s\S]*?\}\s*```/g, '')
            .replace(/\{\s*"tool_call"[\s\S]*?\}/g, '')
            .replace(/^\s*[\n\r]+|[\n\r]+\s*$/g, '')
            .trim();
    }
    buildEnhancedAcknowledgmentPrompt(extractedParameters, updatedParameters, updatedMissing, conversationHistory, currentMessage) {
        const extractedList = Object.entries(extractedParameters)
            .map(([key, value]) => {
            if (key === 'loanAmount' || key === 'annualIncome') {
                return `${key}: ₹${value.toLocaleString('en-IN')}`;
            }
            return `${key}: ${value}`;
        })
            .join(', ');
        const historyText = conversationHistory
            .slice(-3)
            .map(msg => `${msg.messageType === 'user' ? 'User' : 'LoanBot'}: ${msg.content}`)
            .join('\n');
        return `You are LoanBot, a friendly loan advisor helping users find the best loan options in India.

CONTEXT: You just understood and captured these details from the user: ${extractedList}

RECENT CONVERSATION:
${historyText}
User: ${currentMessage}

CURRENT STATUS:
- All collected information: ${JSON.stringify(updatedParameters).replace(/(\d{7,})/g, '₹$1')}
- Still needed: ${JSON.stringify(updatedMissing)}

INSTRUCTIONS:
1. Acknowledge what you just understood in a natural, conversational way
2. If parameters are still missing, smoothly ask for the next most important one
3. If all parameters are collected, enthusiastically prepare for loan matching
4. Use Indian currency format (₹ and lakhs/crores) when discussing amounts
5. Be warm, helpful, and professional
6. DO NOT expose any technical details or JSON

Respond naturally:`;
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
//# sourceMappingURL=agentOrchestrator.js.map