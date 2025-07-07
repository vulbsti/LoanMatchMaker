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

    // 1. Perform Parameter Extraction as the first, isolated step.
    const extractionResult = await this.performParameterExtraction(message, conversationHistory);

    // 2. Update the database if extraction was successful and returned new data.
    if (extractionResult.success && Object.keys(extractionResult.extracted).length > 0) {
      console.log('Extracted parameters:', extractionResult.extracted);
      for (const [param, value] of Object.entries(extractionResult.extracted)) {
        // The updateParameter method already handles the database transaction.
        await this.parameterService.updateParameter(sessionId, param as keyof LoanParameters, value);
      }
    }

    // 3. Get the *final* state after all updates are complete.
    const finalParameters = await this.parameterService.getParameters(sessionId);
    const finalMissing = await this.parameterService.getMissingParameters(sessionId);

    // 4. Generate a clean, conversational response for the user based on the final state.
    const userResponse = await this.generateConversationalResponse({
      message,
      conversationHistory,
      extractionResult, // Pass the whole result for more context
      currentParameters: finalParameters,
      missingParameters: finalMissing,
    });

    // 5. Determine the final action and completion status.
    const action = finalMissing.length === 0 ? 'trigger_matching' : 'continue';
    const completionPercentage = Math.round(((5 - finalMissing.length) / 5) * 100);

    return {
      response: userResponse,
      action,
      completionPercentage,
    };
  }

  private async performParameterExtraction(
    message: string,
    conversationHistory: MessageContext['conversationHistory']
  ): Promise<ExtractionResult> {
    try {
      const contextForExtraction = conversationHistory
        .slice(-4) // Use a bit more history for better context
        .map(msg => `${msg.messageType}: ${msg.content}`)
        .join('\n') + `\nuser: ${message}`;

      const extracted = await this.parameterService.extractParametersWithLLM(contextForExtraction);
      return { success: true, extracted };
    } catch (error: any) {
      console.error('Critical error during parameter extraction:', error);
      return { success: false, extracted: {}, error: error.message };
    }
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

    const historyText = conversationHistory.slice(-5).map(msg => `${msg.messageType === 'user' ? 'User' : 'LoanBot'}: ${msg.content}`).join('\n');
    
    let extractionSummary: string;
    if (!extractionResult.success) {
      extractionSummary = "My analysis of the last message failed. I need to ask the user to clarify.";
    } else if (Object.keys(extractionResult.extracted).length > 0) {
      extractionSummary = `I just understood these details: ${JSON.stringify(extractionResult.extracted)}. I will acknowledge this.`;
    } else {
      extractionSummary = "I didn't find any new loan details in the last message. I will continue the conversation based on what I still need.";
    }

    return `You are LoanBot, a professional and friendly loan advisor in India.

    INTERNAL STATE & CONTEXT:
    - Recent Conversation:
    ${historyText}
    - User's Last Message: "${message}"
    - My Internal Analysis Result: ${extractionSummary}
    - All Information Collected So Far: ${JSON.stringify(currentParameters)}
    - Information I Still Need: ${missingParameters.join(', ') || 'None. I am ready to find loans.'}

    YOUR TASK:
    Write a natural, conversational response to the user.
    
    RULES:
    1.  **Acknowledge & Confirm**: If you understood new details, confirm them naturally (e.g., "Okay, an annual income of ₹8 lakhs, got it.").
    2.  **Ask for Next Parameter**: If information is still missing, smoothly ask for the next most important one.
    3.  **Handle Errors Gracefully**: If your analysis failed, apologize briefly and ask the user to rephrase.
    4.  **Stay On Track**: Do not get sidetracked. Your goal is to collect the required parameters.
    5.  **NEVER Expose Internals**: Never mention JSON, tools, parameters, or your internal state. Your response must be pure, friendly text.
    6.  **Use Indian Formatting**: Refer to currency in lakhs and crores where appropriate.

    LoanBot's Response:`;
  }

  private ensureCleanResponse(response: string): string {
    // This function is critical as a final safeguard.
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