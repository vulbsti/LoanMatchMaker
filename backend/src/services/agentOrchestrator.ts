import { GeminiService, buildPCAPrompt, buildMCAPrompt } from '../config/gemini';
import { MessageContext, PCAGuidance, MCAResponse, AgentResponse, LoanParameters } from '../models/interfaces';
import { ParameterService } from './parameterService';

export class AgentOrchestrator {
  constructor(
    private geminiService: GeminiService,
    private parameterService: ParameterService
  ) {}

  async processMessage(context: MessageContext): Promise<AgentResponse> {
    try {
      // 1. Consult Parameter Collection Agent
      const pcaGuidance = await this.consultPCA(context);
      
      // 2. Process through Main Conversational Agent
      const mcaResponse = await this.processMCA(context, pcaGuidance);
      
      // 3. Combine responses and determine actions
      return this.orchestrateResponse(pcaGuidance, mcaResponse, context);
    } catch (error) {
      console.error('Agent orchestration error:', error);
      throw new Error('Failed to process message through agent system');
    }
  }

  private async consultPCA(context: MessageContext): Promise<PCAGuidance> {
    try {
      const prompt = buildPCAPrompt(context);
      const response = await this.geminiService.generatePCAResponse(prompt);
      return this.parsePCAResponse(response);
    } catch (error) {
      console.error('PCA consultation error:', error);
      // Fallback logic if PCA fails
      return this.getFallbackPCAGuidance(context);
    }
  }

  private async processMCA(context: MessageContext, guidance: PCAGuidance): Promise<MCAResponse> {
    try {
      const prompt = buildMCAPrompt(context, guidance);
      const response = await this.geminiService.generateMCAResponse(prompt);
      return this.parseMCAResponse(response);
    } catch (error) {
      console.error('MCA processing error:', error);
      // Fallback logic if MCA fails
      return this.getFallbackMCAResponse(guidance);
    }
  }

  private parsePCAResponse(response: string): PCAGuidance {
    try {
      // Try to parse JSON response from PCA
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
      
      // Fallback parsing if JSON format is not found
      return this.extractPCAGuidanceFromText(response);
    } catch (error) {
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

  private parseMCAResponse(response: string): MCAResponse {
    // Extract natural conversation response from MCA
    const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return {
      response: cleanResponse,
      tone: this.detectTone(cleanResponse),
      requiresInput: this.requiresUserInput(cleanResponse),
      suggestedReplies: this.extractSuggestedReplies(cleanResponse),
    };
  }

  private orchestrateResponse(
    pcaGuidance: PCAGuidance, 
    mcaResponse: MCAResponse, 
    context: MessageContext
  ): AgentResponse {
    return {
      response: mcaResponse.response,
      action: pcaGuidance.action,
      completionPercentage: pcaGuidance.completionPercentage,
      requiresInput: mcaResponse.requiresInput,
      parameterUpdate: pcaGuidance.parameterUpdate,
      suggestedReplies: mcaResponse.suggestedReplies,
    };
  }

  private extractPCAGuidanceFromText(response: string): PCAGuidance {
    // Extract action
    let action: PCAGuidance['action'] = 'collect_parameter';
    if (response.toLowerCase().includes('trigger_matching')) action = 'trigger_matching';
    else if (response.toLowerCase().includes('answer_question')) action = 'answer_question';
    else if (response.toLowerCase().includes('redirect')) action = 'redirect';

    // Extract next parameter
    const parameterPatterns = {
      loanAmount: /loan amount|loan.{0,10}amount|amount.{0,10}loan/i,
      annualIncome: /annual income|income|salary|earnings/i,
      creditScore: /credit score|credit rating|fico/i,
      employmentStatus: /employment|job|work status|occupation/i,
      loanPurpose: /purpose|reason|what.{0,10}for|use.{0,10}loan/i,
    };

    let nextParameter: keyof LoanParameters = 'loanAmount';
    for (const [param, pattern] of Object.entries(parameterPatterns)) {
      if (pattern.test(response)) {
        nextParameter = param as keyof LoanParameters;
        break;
      }
    }

    // Extract completion percentage
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

  private detectTone(response: string): MCAResponse['tone'] {
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

  private requiresUserInput(response: string): boolean {
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

  private extractSuggestedReplies(response: string): string[] | undefined {
    // Look for suggested replies in the response
    const suggestionPatterns = [
      /you could say:?\s*"([^"]+)"/gi,
      /for example:?\s*"([^"]+)"/gi,
      /try:?\s*"([^"]+)"/gi,
    ];
    
    const suggestions: string[] = [];
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

  private getFallbackPCAGuidance(context: MessageContext): PCAGuidance {
    // Determine what parameter to collect next based on current state
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

  private getFallbackMCAResponse(guidance: PCAGuidance): MCAResponse {
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

  private getFallbackParameterQuestion(parameter?: string): string {
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

