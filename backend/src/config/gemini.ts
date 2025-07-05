import { GoogleGenAI } from '@google/genai';
import { GeminiConfig } from '../models/interfaces';

export class GeminiService {
  private genAI: GoogleGenAI;
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
    this.genAI = new GoogleGenAI({apiKey:config.apiKey});
  }

  async generateContent(prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }): Promise<string> {
    try {
      const response = await this.genAI.models.generateContent({
        model: options?.model || this.config.model,
        contents: prompt,
        config: {
          temperature: options?.temperature || this.config.temperature,
          maxOutputTokens: options?.maxTokens || this.config.maxTokens,
          thinkingConfig: { thinkingBudget: 0 },
        }
      });
      const text = response.text;
      
      if (!text || text.trim().length === 0) {
        console.log('Raw Gemini API response:', response); // Added logging
        throw new Error('Empty response from Gemini API');
      }

      return text;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Gemini API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.generateContent('I am doing Health check test ONLY SAY "HELLO"', {
        temperature: 0,
        maxTokens: 1000,
      });
      return response.length > 0;
    } catch (error) {
      console.error('Gemini health check failed:', error);
      return false;
    }
  }

  // Specialized methods for different agent types
  async generatePCAResponse(prompt: string): Promise<string> {
    return this.generateContent(prompt, {
      temperature: 0.1, // Lower temperature for more consistent parameter tracking
      maxTokens: 200,
    });
  }

  async generateMCAResponse(prompt: string): Promise<string> {
    return this.generateContent(prompt, {
      temperature: 0.7, // Higher temperature for more natural conversation
      maxTokens: 300,
    });
  }

  // Batch processing for multiple prompts
  async generateMultipleResponses(prompts: string[]): Promise<string[]> {
    const promises = prompts.map(prompt => this.generateContent(prompt));
    return Promise.all(promises);
  }
}

// Gemini service factory
export const createGeminiService = (config: GeminiConfig): GeminiService => {
  return new GeminiService(config);
};

// System prompts for different agents
export const SYSTEM_PROMPTS = {
  MCA: `You are LoanBot, a professional and friendly loan advisor assistant. Your primary goal is to help users find the best loan matches by collecting their financial information through natural conversation.

CORE RESPONSIBILITIES:
- Engage users in natural, helpful conversation about loans
- Answer financial questions related to loans, interest rates, credit scores, and loan processes
- Collect required loan parameters: loan amount, annual income, employment status, credit score, and loan purpose
- Guide users through the loan matching process

CONVERSATION BOUNDARIES:
- Stay strictly within financial and loan-related topics
- If users ask about unrelated topics (philosophy, politics, general life advice), politely redirect to loan assistance
- Do not provide specific financial advice - focus on education and loan matching
- Always maintain a professional, trustworthy tone

RESPONSE STYLE:
- Use encouraging, supportive language
- Ask one question at a time to avoid overwhelming users
- Acknowledge and validate user inputs before proceeding
- Show progress when appropriate ("Great! We're halfway through the process")

Remember: You work with a Parameter Collection Agent that tracks completion status. Always check with PCA before responding to ensure you're asking for the right information next.`,

  PCA: `You are the Parameter Collection Agent (PCA), a backend coordinator that ensures systematic collection of loan parameters. You work behind the scenes to guide the Main Conversational Agent.

CORE FUNCTION:
Track and manage the collection of required loan parameters:
1. loanAmount (number, $1,000 - $500,000)
2. annualIncome (number, positive value)
3. employmentStatus (enum: salaried, self-employed, freelancer, unemployed)
4. creditScore (number, 300-850)
5. loanPurpose (enum: home, auto, personal, business, education, debt-consolidation)

DECISION FRAMEWORK:
- Analyze current parameter collection status
- Identify the most important missing parameter
- Determine if user query is off-topic
- Trigger matching when all parameters collected
- Provide clear guidance to MCA

OUTPUT FORMAT:
Always respond with structured guidance including:
- Recommended action for MCA
- Next parameter to collect (if applicable)
- Current completion percentage
- Brief reasoning for the recommendation

PRIORITY ORDER for parameter collection:
1. loanAmount (establishes loan scope)
2. loanPurpose (determines lender fit)
3. annualIncome (income qualification)
4. creditScore (approval likelihood)
5. employmentStatus (employment verification)

Respond in JSON format with: {"action": "collect_parameter|trigger_matching|answer_question|redirect", "nextParameter": "parameter_name", "completionPercentage": number, "reasoning": "brief_explanation"}`,
};

// Prompt builders
export const buildPCAPrompt = (context: any): string => {
  return `${SYSTEM_PROMPTS.PCA}

CURRENT CONTEXT:
Session ID: ${context.sessionId}
User Message: "${context.message}"
Collected Parameters:
- Loan Amount: ${context.parameters.loanAmount || 'Not collected'}
- Annual Income: ${context.parameters.annualIncome || 'Not collected'}
- Employment Status: ${context.parameters.employmentStatus || 'Not collected'}
- Credit Score: ${context.parameters.creditScore || 'Not collected'}
- Loan Purpose: ${context.parameters.loanPurpose || 'Not collected'}

Parameter Collection Status:
- Loan Amount: ${context.tracking.loanAmountCollected}
- Annual Income: ${context.tracking.annualIncomeCollected}
- Employment Status: ${context.tracking.employmentStatusCollected}
- Credit Score: ${context.tracking.creditScoreCollected}
- Loan Purpose: ${context.tracking.loanPurposeCollected}
- Completion: ${context.tracking.completionPercentage}%

TASK: Analyze the current state and provide guidance for the next action.`;
};

export const buildMCAPrompt = (context: any, guidance: any): string => {
  return `${SYSTEM_PROMPTS.MCA}

CURRENT CONTEXT:
User Message: "${context.message}"
Parameter Collection Progress: ${context.tracking.completionPercentage}%

GUIDANCE FROM PCA:
Action: ${guidance.action}
Next Parameter: ${guidance.nextParameter || 'N/A'}
Reasoning: ${guidance.reasoning}

COLLECTED PARAMETERS:
${Object.entries(context.parameters)
  .filter(([_, value]) => value !== undefined)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

TASK: Respond naturally to the user based on PCA guidance. ${
  guidance.action === 'collect_parameter' 
    ? `Ask for the ${guidance.nextParameter} parameter in a conversational way.`
    : guidance.action === 'trigger_matching'
    ? 'Congratulate the user and inform them you\'re finding their best loan matches.'
    : guidance.action === 'answer_question'
    ? 'Answer their question while staying within loan-related topics.'
    : 'Politely redirect them back to loan assistance.'
}`;
};