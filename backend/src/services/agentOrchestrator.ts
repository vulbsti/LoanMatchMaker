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

    // 2. Check if this is a recursive call (system message)
    const isSystemCall = message.startsWith("System:");

    // 3. Build the prompt for the main conversational agent
    const prompt = buildLoanAdvisorPrompt({
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

    // 4. Call the Loan Advisor LLM to get its response
    const llmResponse = await this.geminiService.generateContent(JSON.stringify(prompt));

    // 5. Check if the LLM's response is a request to call our extraction tool
    const toolCallMatch = llmResponse.match(/\{\s*"tool_call":\s*"extract_parameters"[\s\S]*?\}/);
    if (toolCallMatch) {
      try {
        const toolCall = JSON.parse(toolCallMatch[0]);
        const userMessageForExtraction = toolCall.user_message || message;
        
        // 6. Execute the parameter extraction using the specialized agent
        const extractedParameters = await this.parameterService.extractParametersWithLLM(userMessageForExtraction);

        // 7. Update the database with any newly found parameters
        if (Object.keys(extractedParameters).length > 0) {
          console.log('Extracted parameters:', extractedParameters);
          for (const [param, value] of Object.entries(extractedParameters)) {
            await this.parameterService.updateParameter(sessionId, param as keyof LoanParameters, value);
          }

          // 8. Get updated state and provide acknowledgment
          const updatedParameters = await this.parameterService.getParameters(sessionId);
          const updatedMissing = await this.parameterService.getMissingParameters(sessionId);
          
          // Create a context-aware response acknowledging what was extracted
          const acknowledgmentPrompt = this.buildAcknowledgmentPrompt(
            extractedParameters, 
            updatedParameters, 
            updatedMissing,
            conversationHistory
          );
          
          const acknowledgmentResponse = await this.geminiService.generateContent(acknowledgmentPrompt);
          
          return {
            response: acknowledgmentResponse,
            action: updatedMissing.length === 0 ? 'trigger_matching' : 'continue',
            completionPercentage: Math.round(((5 - updatedMissing.length) / 5) * 100),
          };
        }
        
        // If no parameters extracted, continue with normal conversation
        
      } catch (error) {
        console.error("Error parsing or executing tool call:", error);
        // If tool call fails, just continue the conversation
      }
    }

    // 9. If not a tool call, check if we are ready for matching
    const finalMissingParams = await this.parameterService.getMissingParameters(sessionId);
    const finalTracking = await this.parameterService.getTrackingStatus(sessionId);

    if (finalMissingParams.length === 0) {
      return {
        response: "Great! I have all the information I need. I'm now finding the best loan matches for you.",
        action: 'trigger_matching',
        completionPercentage: 100,
      };
    }

    // 10. Otherwise, return the LLM's conversational response to the user
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

  private buildAcknowledgmentPrompt(
    extractedParameters: Partial<LoanParameters>, 
    updatedParameters: Partial<LoanParameters>, 
    updatedMissing: (keyof LoanParameters)[],
    conversationHistory: MessageContext['conversationHistory']
  ): string {
    const extractedList = Object.entries(extractedParameters)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    const historyText = conversationHistory
      .slice(-3) // Last 3 messages for context
      .map(msg => `${msg.messageType === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    return `You are LoanBot. You just successfully extracted these parameters: ${extractedList}

Recent conversation:
${historyText}

Current state:
- All collected parameters: ${JSON.stringify(updatedParameters)}
- Still missing: ${JSON.stringify(updatedMissing)}

Provide a natural, conversational response that:
1. Acknowledges what information you just understood/captured
2. If parameters are still missing, smoothly asks for the next most important one
3. If all parameters are collected, congratulate and prepare for matching
4. Keep the tone friendly and natural

Respond directly (no JSON, no tool calls):`;
  }
}

