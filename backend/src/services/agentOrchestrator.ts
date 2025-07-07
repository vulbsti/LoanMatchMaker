import { GeminiService } from '../config/gemini';
import { MessageContext, AgentResponse, LoanParameters } from '../models/interfaces';
import { ParameterService } from './parameterService';

// Define a more structured result for the extraction step
interface ExtractionResult {
  success: boolean;
  extracted: Partial<LoanParameters>;
  error?: string;
}

export class AgentOrchestrator {
  constructor(
    private geminiService: GeminiService,
    private parameterService: ParameterService
  ) {}

  async processMessage(context: MessageContext): Promise<AgentResponse> {
    const { sessionId, message, conversationHistory } = context;

    console.log('Processing message for session:', sessionId);
    console.log('User message:', message);

    // 1. Perform Parameter Extraction as the first, isolated step.
    const extractionResult = await this.performParameterExtraction(message, conversationHistory);
    console.log('Extraction result:', JSON.stringify(extractionResult, null, 2));

    // 2. Update the database if extraction was successful and returned new data.
    if (extractionResult.success && Object.keys(extractionResult.extracted).length > 0) {
      console.log('Updating parameters:', extractionResult.extracted);
      
      // Use a transaction to ensure all parameters are updated atomically
      await this.updateParametersAtomically(sessionId, extractionResult.extracted);
    }

    // 3. Get the *final* state after all updates are complete.
    const finalParameters = await this.parameterService.getParameters(sessionId);
    const finalMissing = await this.parameterService.getMissingParameters(sessionId);
    
    console.log('Final parameters after update:', JSON.stringify(finalParameters, null, 2));
    console.log('Final missing parameters:', finalMissing);

    // 4. Determine the final action and completion status FIRST
    const action = finalMissing.length === 0 ? 'trigger_matching' : 'continue';
    const completionPercentage = Math.round(((5 - finalMissing.length) / 5) * 100);

    console.log('Action determined:', action, 'Completion:', completionPercentage + '%');

    
    const userResponse = await this.generateConversationalResponse({
      message,
      conversationHistory,
      extractionResult,
      currentParameters: finalParameters,
      missingParameters: finalMissing,
    });
  

    return {
      response: userResponse,
      action,
      completionPercentage,
    };
  }

  private async updateParametersAtomically(sessionId: string, extracted: Partial<LoanParameters>): Promise<void> {
    const updatePromises = Object.entries(extracted).map(([param, value]) => 
      this.parameterService.updateParameter(sessionId, param as keyof LoanParameters, value)
    );
    
    try {
      await Promise.all(updatePromises);
      console.log('All parameters updated successfully');
    } catch (error) {
      console.error('Failed to update parameters atomically:', error);
      throw error;
    }
  }

  private async performParameterExtraction(
    message: string,
    conversationHistory: MessageContext['conversationHistory']
  ): Promise<ExtractionResult> {
    try {
      // Build more comprehensive context for extraction
      const contextForExtraction = this.buildExtractionContext(message, conversationHistory);
      
      const extracted = await this.parameterService.extractParametersWithLLM(contextForExtraction);
      console.log('LLM extracted parameters:', JSON.stringify(extracted, null, 2));
      
      return { success: true, extracted };
    } catch (error: any) {
      console.error('Critical error during parameter extraction:', error);
      return { success: false, extracted: {}, error: error.message };
    }
  }

  private buildExtractionContext(message: string, conversationHistory: MessageContext['conversationHistory']): string {
    // Include more context for better extraction
    const recentHistory = conversationHistory
      .slice(-6) // Increased context window
      .map(msg => `${msg.messageType}: ${msg.content}`)
      .join('\n');
    
    return `${recentHistory}\nuser: ${message}`;
  }

  private async generateConversationalResponse(params: {
    message: string;
    conversationHistory: MessageContext['conversationHistory'];
    extractionResult: ExtractionResult;
    currentParameters: Partial<LoanParameters>;
    missingParameters: (keyof LoanParameters)[];
  }): Promise<string> {
    const conversationalPrompt = this.buildPureConversationalPrompt(params);
    const response = await this.geminiService.generateContent(conversationalPrompt);
    return this.ensureCleanResponse(response);
  }

  private buildPureConversationalPrompt(params: {
    message: string;
    conversationHistory: MessageContext['conversationHistory'];
    extractionResult: ExtractionResult;
    currentParameters: Partial<LoanParameters>;
    missingParameters: (keyof LoanParameters)[];
  }): string {
    const { extractionResult, currentParameters, missingParameters, conversationHistory, message } = params;

    const historyText = conversationHistory.slice(-5).map(msg => 
      `${msg.messageType === 'user' ? 'User' : 'LoanBot'}: ${msg.content}`
    ).join('\n');
    
    // Build a clearer status of what we have and what we need
    const collectedInfo = Object.entries(currentParameters)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    const stillNeed = missingParameters.length > 0 ? missingParameters.join(', ') : 'Nothing more';
    
    let extractionSummary: string;
    if (!extractionResult.success) {
      extractionSummary = "I had trouble understanding the last message. I should ask for clarification.";
    } else if (Object.keys(extractionResult.extracted).length > 0) {
      const newlyExtracted = Object.entries(extractionResult.extracted)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      extractionSummary = `I just understood: ${newlyExtracted}. I should acknowledge this clearly.`;
    } else {
      extractionSummary = "No new loan information found in the last message. I should continue asking for what's missing.";
    }

    return `You are LoanBot, a professional and friendly loan advisor in India.

    CONVERSATION CONTEXT:
    ${historyText}
    
    USER'S CURRENT MESSAGE: "${message}"

    CURRENT STATUS:
    - Information I've collected: ${collectedInfo || 'None yet'}
    - Information I still need: ${stillNeed}
    - My understanding of the last message: ${extractionSummary}

    YOUR TASK:
    Write a natural, conversational response that:
    
    1. **ACKNOWLEDGES NEW INFO**: If I understood new information, confirm it naturally
    2. **ASKS FOR NEXT**: If information is missing, ask for the most important missing parameter
    3. **AVOIDS REPETITION**: Never ask for information I already have
    4. **STAYS FOCUSED**: Don't get sidetracked from collecting the 5 required parameters
    
    REQUIRED PARAMETERS (ask for these in order of importance):
    1. loanAmount - How much money they need
    2. loanPurpose - What the loan is for (home, vehicle, education, business, etc.)
    3. annualIncome - Their yearly income
    4. employmentStatus - Whether they're salaried, self-employed, etc.
    5. creditScore - Their credit score (300-850)

    RESPONSE RULES:
    - Use Indian currency format (lakhs, crores)
    - Be conversational and friendly
    - Never mention JSON, parameters, or internal processes
    - Keep responses concise but warm
    
    LoanBot's Response:`;
  }

  private ensureCleanResponse(response: string): string {
    return response
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/\{"tool_code"[\s\S]*?\}/g, '')
      .replace(/\{"tool_call"[\s\S]*?\}/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/Action:.*$/gm, '')
      .replace(/Progress:.*$/gm, '')
      .replace(/^\s*[\n\r]+|[\n\r]+\s*$/g, '')
      .trim();
  }
}