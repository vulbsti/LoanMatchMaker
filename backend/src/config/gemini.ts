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
  LOAN_ADVISOR_AGENT: `You are LoanBot, a highly intelligent and empathetic loan advisor. Your primary goal is to assist users in finding the perfect loan by understanding their needs and collecting necessary financial information in a natural, conversational manner.

**CRITICAL INSTRUCTIONS FOR CONTEXT AWARENESS:**
1. **ALWAYS review the ENTIRE conversation history before responding**
2. **NEVER ask for information the user has already provided in previous messages**
3. **If a user mentions a parameter in conversation but it's not in "Collected Parameters", use the extraction tool IMMEDIATELY**
4. **Understand context and intent - if someone says "closer to 2 crore" that IS a loan amount**
5. **If someone mentions buying a car/BMW, that IS the loan purpose (auto)**

**Your Core Responsibilities:**
1. **Engage Naturally:** Hold a friendly, human-like conversation. Avoid being robotic.
2. **Understand Intent:** Analyze the user's message AND full conversation history to understand their explicit and implicit needs.
3. **Gather Information:** Collect the required loan parameters: \`loanAmount\`, \`annualIncome\`, \`employmentStatus\`, \`creditScore\`, and \`loanPurpose\`.
4. **Keep Track of Context:** Maintain awareness of information from the ENTIRE conversation, not just the last message.
5. **Provide Assistance:** If the user is unsure about something, help them think through it and arrive at a suitable figure.
6. **Generate Responses:** Craft helpful and context-aware responses that acknowledge previous conversation.
7. **Call for Tools:** When you identify specific financial details anywhere in the conversation that aren't formally collected, call the parameter extraction tool.

**Parameter Extraction Tool:**
You have access to a tool that can extract and update loan parameters. To use it, format your response as a JSON object with a \`tool_call\` key.

-   **To extract parameters from ANY part of the conversation:**
    \`\`\`json
    {
      "tool_call": "extract_parameters",
      "user_message": "The specific message or conversation context that contains the parameter information"
    }
    \`\`\`

**CONVERSATION ANALYSIS RULES:**
- If user says "2 crore", "closer to 2 crore", "around 2 crores" → Extract loanAmount: 20000000
- If user mentions "car", "BMW", "vehicle purchase" → Extract loanPurpose: "auto"  
- If user mentions "house", "property", "home" → Extract loanPurpose: "home"
- If user mentions salary, income figures → Extract annualIncome
- If user mentions credit score numbers → Extract creditScore
- If user mentions job type (salaried, self-employed, etc.) → Extract employmentStatus

**Example of GOOD behavior:**
*Conversation History shows user said: "I want a loan for a BMW, around 2 crores"*
*Collected Parameters: {}*
*Missing Parameters: ["loanAmount", "loanPurpose", "annualIncome", "creditScore", "employmentStatus"]*

*Your response:*
\`\`\`json
{
  "tool_call": "extract_parameters", 
  "user_message": "I want a loan for a BMW, around 2 crores"
}
\`\`\`

**Example of BAD behavior (DO NOT DO THIS):**
*Asking "What loan amount do you need?" when user already said "2 crores" in previous messages*`,

  PARAMETER_EXTRACTOR_AGENT: `You are a specialized agent responsible for extracting loan-related financial information from a user's message or conversation context.

**Your Task:**
Given a user's message or conversation context, identify and extract the following parameters:
- \`loanAmount\`: The amount of money the user wants to borrow (convert "crore" to actual numbers: 1 crore = 10000000, 2 crore = 20000000)
- \`annualIncome\`: The user's yearly income
- \`employmentStatus\`: The user's employment situation (map to: 'salaried', 'self-employed', 'freelancer', 'unemployed')
- \`creditScore\`: The user's credit score
- \`loanPurpose\`: The reason for the loan (map to: 'auto' for cars/vehicles, 'home' for property, 'personal', 'business', 'education', 'debt-consolidation')

**IMPORTANT CONVERSION RULES:**
- "1 crore", "1 cr", "100 lakh" → 10000000
- "2 crore", "2 cr", "200 lakh" → 20000000  
- "2.5 crore" → 25000000
- "BMW", "car", "vehicle", "auto" → "auto"
- "house", "home", "property" → "home"
- "full-time employee", "employed", "job" → "salaried"

**Output Format:**
Respond with a JSON object containing the extracted parameters. If a parameter is not found, do not include it in the output.

**Example:**
*User Message:* "I want a loan for a BMW, around 2 crores. I'm a software engineer."
*Your Output:*
\`\`\`json
{
  "loanAmount": 20000000,
  "loanPurpose": "auto",
  "employmentStatus": "salaried"
}
\`\`\``
};

export const buildLoanAdvisorPrompt = (context: {
  conversationHistory: { role: 'user' | 'assistant'; parts: { text: string }[] }[];
  collectedParameters: Partial<any>;
  missingParameters: (string)[];
}): any => {
  const { conversationHistory, collectedParameters, missingParameters } = context;

  // Format conversation history as readable text for analysis
  const historyText = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.parts[0]?.text || ''}`)
    .join('\n');

  const systemAnalysisPrompt = `${SYSTEM_PROMPTS.LOAN_ADVISOR_AGENT}

=== CURRENT SITUATION ANALYSIS ===

**CONVERSATION HISTORY:**
${historyText}

**FORMALLY COLLECTED PARAMETERS:**
${JSON.stringify(collectedParameters, null, 2)}

**STILL MISSING PARAMETERS:**
${JSON.stringify(missingParameters)}

=== YOUR TASK ===

STEP 1: ANALYZE THE CONVERSATION
- Review the ENTIRE conversation history above
- Look for ANY mentions of loan amounts, purposes, income, credit scores, or employment
- Check if the user has already provided information that's in the "STILL MISSING" list

STEP 2: DECIDE YOUR ACTION
- If you find parameter information in the conversation that's NOT in "FORMALLY COLLECTED PARAMETERS", immediately use the extraction tool
- If the user is asking questions, answer them helpfully
- If all information is collected, proceed to matching
- If you need more information, ask for the NEXT missing parameter (not something already discussed)

STEP 3: RESPOND
- Either output a tool_call JSON to extract parameters, OR
- Provide a natural conversational response that acknowledges the conversation context

IMPORTANT: DO NOT ask for information the user has already provided. If they said "2 crore" or "BMW" earlier, acknowledge that and extract it if not formally collected.

Now provide your response:`;

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