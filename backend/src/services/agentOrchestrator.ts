import { GeminiService, buildLoanAdvisorPrompt } from '../config/gemini';
import { MessageContext, AgentResponse, LoanParameters } from '../models/interfaces';
import { ParameterService } from './parameterService';

export class AgentOrchestrator {
  constructor(
    private geminiService: GeminiService,
    private parameterService: ParameterService
  ) {}

  async processMessage(context: MessageContext): Promise<AgentResponse> {
    const { sessionId, message, conversationHistory } = context;

    // 1. Get the current state BEFORE calling the LLM
    const initialParameters = await this.parameterService.getParameters(sessionId);
    const missingParameters = await this.parameterService.getMissingParameters(sessionId);

    // 2. Build the prompt for the main conversational agent
    const prompt = buildLoanAdvisorPrompt({
      // Pass the full history including the latest user message
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

    // 3. Call the Loan Advisor LLM to get its response
    const llmResponse = await this.geminiService.generateContent(JSON.stringify(prompt));

    // 4. Check if the LLM's response is a request to call our extraction tool
    const toolCallMatch = llmResponse.match(/\{\s*"tool_call":\s*"extract_parameters"[\s\S]*?\}/);
    if (toolCallMatch) {
      try {
        const toolCall = JSON.parse(toolCallMatch[0]);
        const userMessageForExtraction = toolCall.user_message || message;
        
        // 5. If so, execute the parameter extraction using the specialized agent
        const extractedParameters = await this.parameterService.extractParametersWithLLM(userMessageForExtraction);

        // 6. Update the database with any newly found parameters
        if (Object.keys(extractedParameters).length > 0) {
          for (const [param, value] of Object.entries(extractedParameters)) {
            await this.parameterService.updateParameter(sessionId, param as keyof LoanParameters, value);
          }
        }
        
        // 7. After extraction, run the orchestrator again to get the next conversational response
        // This recursive call ensures the agent's next words are based on the newly updated state.
        return this.processMessage({ ...context, message: "System: Parameters extracted. Continue conversation." });

      } catch (error) {
        console.error("Error parsing or executing tool call:", error);
        // If tool call fails, just continue the conversation
      }
    }

    // 8. If not a tool call, check if we are ready for matching
    const finalMissingParams = await this.parameterService.getMissingParameters(sessionId);
    const finalTracking = await this.parameterService.getTrackingStatus(sessionId);

    if (finalMissingParams.length === 0) {
      return {
        response: "Great! I have all the information I need. I'm now finding the best loan matches for you.",
        action: 'trigger_matching',
        completionPercentage: 100,
      };
    }

    // 9. Otherwise, return the LLM's conversational response to the user
    return {
      response: llmResponse,
      action: 'continue',
      completionPercentage: finalTracking.completionPercentage,
    };
  }

  private formatHistory(messages: MessageContext['conversationHistory']): { role: 'user' | 'assistant'; parts: { text: string }[] }[] {
    return messages.map(msg => ({
      role: msg.messageType === 'user' ? 'user' : 'assistant',
      parts: [{ text: msg.content }],
    }));
  }
}

