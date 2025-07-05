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
        try {
            const pcaGuidance = await this.consultPCA(context);
            const mcaResponse = await this.processMCA(context, pcaGuidance);
            return this.orchestrateResponse(pcaGuidance, mcaResponse, context);
        }
        catch (error) {
            console.error('Agent orchestration error:', error);
            throw new Error('Failed to process message through agent system');
        }
    }
    async consultPCA(context) {
        try {
            const prompt = (0, gemini_1.buildPCAPrompt)(context);
            const response = await this.geminiService.generatePCAResponse(prompt);
            return this.parsePCAResponse(response);
        }
        catch (error) {
            console.error('PCA consultation error:', error);
            return this.getFallbackPCAGuidance(context);
        }
    }
    async processMCA(context, guidance) {
        try {
            const prompt = (0, gemini_1.buildMCAPrompt)(context, guidance);
            const response = await this.geminiService.generateMCAResponse(prompt);
            return this.parseMCAResponse(response);
        }
        catch (error) {
            console.error('MCA processing error:', error);
            return this.getFallbackMCAResponse(guidance);
        }
    }
    parsePCAResponse(response) {
        try {
            const jsonMatch = response.match(/\{.*\}/s);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    action: parsed.action || 'collect_parameter',
                    nextParameter: parsed.nextParameter,
                    priority: parsed.priority || 'medium',
                    completionPercentage: parsed.completionPercentage || 0,
                    reasoning: parsed.reasoning || 'Processing user request',
                    parameterUpdate: parsed.parameterUpdate,
                };
            }
            return this.extractPCAGuidanceFromText(response);
        }
        catch (error) {
            console.error('PCA response parsing error:', error);
            return {
                action: 'collect_parameter',
                nextParameter: 'loanAmount',
                priority: 'high',
                completionPercentage: 0,
                reasoning: 'Failed to parse PCA response, using fallback',
            };
        }
    }
    parseMCAResponse(response) {
        const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return {
            response: cleanResponse,
            tone: this.detectTone(cleanResponse),
            requiresInput: this.requiresUserInput(cleanResponse),
            suggestedReplies: this.extractSuggestedReplies(cleanResponse),
        };
    }
    orchestrateResponse(pcaGuidance, mcaResponse, context) {
        return {
            response: mcaResponse.response,
            action: pcaGuidance.action,
            completionPercentage: pcaGuidance.completionPercentage,
            requiresInput: mcaResponse.requiresInput,
            parameterUpdate: pcaGuidance.parameterUpdate,
            suggestedReplies: mcaResponse.suggestedReplies,
        };
    }
    extractPCAGuidanceFromText(response) {
        let action = 'collect_parameter';
        if (response.toLowerCase().includes('trigger_matching'))
            action = 'trigger_matching';
        else if (response.toLowerCase().includes('answer_question'))
            action = 'answer_question';
        else if (response.toLowerCase().includes('redirect'))
            action = 'redirect';
        const parameterPatterns = {
            loanAmount: /loan amount|loan.{0,10}amount|amount.{0,10}loan/i,
            annualIncome: /annual income|income|salary|earnings/i,
            creditScore: /credit score|credit rating|fico/i,
            employmentStatus: /employment|job|work status|occupation/i,
            loanPurpose: /purpose|reason|what.{0,10}for|use.{0,10}loan/i,
        };
        let nextParameter = 'loanAmount';
        for (const [param, pattern] of Object.entries(parameterPatterns)) {
            if (pattern.test(response)) {
                nextParameter = param;
                break;
            }
        }
        const percentMatch = response.match(/(\d+)%/);
        const completionPercentage = percentMatch ? parseInt(percentMatch[1] || '0') : 0;
        return {
            action,
            nextParameter,
            priority: 'medium',
            completionPercentage,
            reasoning: 'Extracted from text analysis',
        };
    }
    detectTone(response) {
        const lowerResponse = response.toLowerCase();
        if (lowerResponse.includes('congratulations') || lowerResponse.includes('great job') || lowerResponse.includes('excellent')) {
            return 'congratulatory';
        }
        if (lowerResponse.includes('you can') || lowerResponse.includes('let me help') || lowerResponse.includes('here\'s how')) {
            return 'helpful';
        }
        if (lowerResponse.includes('keep going') || lowerResponse.includes('you\'re doing') || lowerResponse.includes('almost there')) {
            return 'encouraging';
        }
        return 'informative';
    }
    requiresUserInput(response) {
        const inputPatterns = [
            /what.{0,20}\?/i,
            /how much/i,
            /can you tell me/i,
            /please provide/i,
            /i need to know/i,
            /\?$/,
        ];
        return inputPatterns.some(pattern => pattern.test(response));
    }
    extractSuggestedReplies(response) {
        const suggestionPatterns = [
            /you could say:?\s*"([^"]+)"/gi,
            /for example:?\s*"([^"]+)"/gi,
            /try:?\s*"([^"]+)"/gi,
        ];
        const suggestions = [];
        for (const pattern of suggestionPatterns) {
            let match;
            while ((match = pattern.exec(response)) !== null) {
                if (typeof match[1] === 'string') {
                    suggestions.push(match[1]);
                }
            }
        }
        return suggestions.length > 0 ? suggestions : undefined;
    }
    getFallbackPCAGuidance(context) {
        const { tracking } = context;
        if (!tracking.loanAmountCollected) {
            return {
                action: 'collect_parameter',
                nextParameter: 'loanAmount',
                priority: 'high',
                completionPercentage: tracking.completionPercentage,
                reasoning: 'Fallback: Collecting loan amount',
            };
        }
        if (!tracking.loanPurposeCollected) {
            return {
                action: 'collect_parameter',
                nextParameter: 'loanPurpose',
                priority: 'high',
                completionPercentage: tracking.completionPercentage,
                reasoning: 'Fallback: Collecting loan purpose',
            };
        }
        if (!tracking.annualIncomeCollected) {
            return {
                action: 'collect_parameter',
                nextParameter: 'annualIncome',
                priority: 'high',
                completionPercentage: tracking.completionPercentage,
                reasoning: 'Fallback: Collecting annual income',
            };
        }
        if (!tracking.creditScoreCollected) {
            return {
                action: 'collect_parameter',
                nextParameter: 'creditScore',
                priority: 'high',
                completionPercentage: tracking.completionPercentage,
                reasoning: 'Fallback: Collecting credit score',
            };
        }
        if (!tracking.employmentStatusCollected) {
            return {
                action: 'collect_parameter',
                nextParameter: 'employmentStatus',
                priority: 'high',
                completionPercentage: tracking.completionPercentage,
                reasoning: 'Fallback: Collecting employment status',
            };
        }
        return {
            action: 'trigger_matching',
            priority: 'high',
            completionPercentage: 100,
            reasoning: 'Fallback: All parameters collected, triggering matching',
        };
    }
    getFallbackMCAResponse(guidance) {
        let response = '';
        switch (guidance.action) {
            case 'collect_parameter':
                response = this.getFallbackParameterQuestion(guidance.nextParameter);
                break;
            case 'trigger_matching':
                response = 'Perfect! I have all the information I need. Let me find the best loan matches for you.';
                break;
            case 'answer_question':
                response = 'I\'d be happy to help answer your question about loans. Could you please be more specific?';
                break;
            case 'redirect':
                response = 'I\'m here to help you with loan-related questions. How can I assist you with finding the right loan?';
                break;
            default:
                response = 'How can I help you with your loan needs today?';
        }
        return {
            response,
            tone: 'helpful',
            requiresInput: guidance.action === 'collect_parameter' || guidance.action === 'answer_question',
        };
    }
    getFallbackParameterQuestion(parameter) {
        switch (parameter) {
            case 'loanAmount':
                return 'To get started, how much would you like to borrow? Please provide the loan amount you\'re looking for.';
            case 'loanPurpose':
                return 'What will you be using this loan for? For example: home purchase, auto loan, personal expenses, business, education, or debt consolidation.';
            case 'annualIncome':
                return 'What\'s your annual income? This helps me find lenders that match your income requirements.';
            case 'creditScore':
                return 'What\'s your credit score? If you\'re not sure of the exact number, you can provide a range (like 650-700).';
            case 'employmentStatus':
                return 'What\'s your current employment status? Are you salaried, self-employed, freelancer, or currently unemployed?';
            default:
                return 'I need a bit more information to help you find the best loan options. What would you like to tell me next?';
        }
    }
}
exports.AgentOrchestrator = AgentOrchestrator;
//# sourceMappingURL=agentOrchestrator.js.map