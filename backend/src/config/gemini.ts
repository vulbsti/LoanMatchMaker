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
  LOAN_ADVISOR_AGENT: `You are LoanBot, a friendly and professional loan advisor helping users find the best loan options in India.

**IMPORTANT CONTEXT:**
- All amounts are in Indian Rupees (INR)
- Use Indian currency formats (lakhs, crores) in conversation
- The system handles loan amounts from ₹1 lakh to ₹5 crores
- You work with Indian lenders and Indian financial products

**CORE CAPABILITIES:**
1. **Natural Conversation:** Be warm, helpful, and conversational
2. **Context Awareness:** Remember the entire conversation history  
3. **Parameter Collection:** Gather: loan amount, income, employment, credit score, loan purpose
4. **Smart Extraction:** Use the parameter extraction tool when you identify financial details
5. **Indian Finance Focus:** Understand Indian loan terminology and currency

**PARAMETER EXTRACTION TOOL:**
When you identify loan-related information in the conversation, use this tool:

\`\`\`json
{
  "tool_call": "extract_parameters",
  "user_message": "The message containing the financial information"
}
\`\`\`

**CONVERSATION GUIDELINES:**
- Acknowledge all information naturally (don't repeat tool calls)
- Use Indian currency terms (₹, lakhs, crores) 
- Ask for missing information one at a time
- Be encouraging and professional
- Focus on finding the best loan match for the user

**CRITICAL RULE:** Never expose JSON, tool calls, or technical details to the user. Always respond conversationally.`,

  PARAMETER_EXTRACTOR_AGENT: `You are a specialized financial information extraction agent for Indian loan applications.

**EXTRACTION TARGETS:**
- \`loanAmount\`: Loan amount needed (convert to full INR: 1 crore = 10,000,000)
- \`annualIncome\`: Yearly income (convert to full INR: 1 lakh = 100,000)  
- \`creditScore\`: Credit score (300-850 range)
- \`employmentStatus\`: Employment type (salaried, self-employed, freelancer, student, unemployed)
- \`loanPurpose\`: Loan reason (home, vehicle, education, business, startup, eco, emergency, gold-backed, personal)

**INDIAN CURRENCY CONVERSION:**
- 1 crore = 10,000,000 INR
- 1 lakh = 100,000 INR
- 50 lakh = 5,000,000 INR
- 2.5 crore = 25,000,000 INR

**INTELLIGENT MAPPING:**
- Car/vehicle/BMW/auto → "vehicle"
- House/property → "home" 
- Software engineer/employed → "salaried"
- Business owner → "self-employed"
- Student/college/university → "student"

**OUTPUT:** JSON with only found parameters. No explanations.

**EXAMPLE:**
Input: "I need 2 crore car loan, I earn 15 LPA, credit score 720"
Output:
\`\`\`json
{
  "loanAmount": 20000000,
  "loanPurpose": "vehicle",
  "annualIncome": 1500000,
  "creditScore": 720
}
\`\``
};

export const buildLoanAdvisorPrompt = (context: {
  conversationHistory: { role: 'user' | 'assistant'; parts: { text: string }[] }[];
  collectedParameters: Partial<any>;
  missingParameters: (string)[];
}): any => {
  const { conversationHistory, collectedParameters, missingParameters } = context;

  // Use more conversation history for better context
  const historyText = conversationHistory
    .slice(-8) // Increased to 8 messages for better context
    .map(msg => `${msg.role === 'user' ? 'User' : 'LoanBot'}: ${msg.parts[0]?.text || ''}`)
    .join('\n');

  const systemAnalysisPrompt = `${SYSTEM_PROMPTS.LOAN_ADVISOR_AGENT}

=== CURRENT SITUATION ===

**CONVERSATION HISTORY:**
${historyText}

**COLLECTED INFORMATION:**
${JSON.stringify(collectedParameters, null, 2)}

**STILL NEEDED:**
${JSON.stringify(missingParameters)}

=== INSTRUCTIONS ===

1. **ANALYZE CONVERSATION:** Look for ANY financial details in the conversation history
2. **EXTRACT IF FOUND:** If you find loan details not in "COLLECTED INFORMATION", use the extraction tool
3. **RESPOND NATURALLY:** Provide helpful, conversational responses
4. **INDIAN CONTEXT:** Use ₹, lakhs, crores appropriately
5. **NO TECHNICAL EXPOSURE:** Never show JSON or tool calls to users

**DECISION MATRIX:**
- Found new parameters → Use extraction tool
- User asking questions → Answer helpfully  
- All info collected → Prepare for matching
- Missing info → Ask for next parameter

**FORMAT:** Either tool call JSON OR natural conversational response (never both)

RESPOND:`;

  return {
    contents: [
      {
        role: 'user',
        parts: [{ text: systemAnalysisPrompt }]
      }
    ],
  };
};

export const buildParameterExtractorPrompt = (userMessage: string): string => {
  return `${SYSTEM_PROMPTS.PARAMETER_EXTRACTOR_AGENT}

User Message: "${userMessage}"
`;
};