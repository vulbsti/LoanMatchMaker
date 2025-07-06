"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildParameterExtractorPrompt = exports.buildLoanAdvisorPrompt = exports.SYSTEM_PROMPTS = exports.createGeminiService = exports.GeminiService = void 0;
const genai_1 = require("@google/genai");
class GeminiService {
    constructor(config) {
        this.config = config;
        this.genAI = new genai_1.GoogleGenAI({ apiKey: config.apiKey });
    }
    async generateContent(prompt, options) {
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
                console.log('Raw Gemini API response:', response);
                throw new Error('Empty response from Gemini API');
            }
            return text;
        }
        catch (error) {
            console.error('Gemini API error:', error);
            throw new Error(`Gemini API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async healthCheck() {
        try {
            const response = await this.generateContent('I am doing Health check test ONLY SAY "HELLO"', {
                temperature: 0,
                maxTokens: 1000,
            });
            return response.length > 0;
        }
        catch (error) {
            console.error('Gemini health check failed:', error);
            return false;
        }
    }
    async generatePCAResponse(prompt) {
        return this.generateContent(prompt, {
            temperature: 0.1,
            maxTokens: 200,
        });
    }
    async generateMCAResponse(prompt) {
        return this.generateContent(prompt, {
            temperature: 0.7,
            maxTokens: 300,
        });
    }
    async generateMultipleResponses(prompts) {
        const promises = prompts.map(prompt => this.generateContent(prompt));
        return Promise.all(promises);
    }
}
exports.GeminiService = GeminiService;
const createGeminiService = (config) => {
    return new GeminiService(config);
};
exports.createGeminiService = createGeminiService;
exports.SYSTEM_PROMPTS = {
    LOAN_ADVISOR_AGENT: `You are LoanBot, a highly intelligent and empathetic loan advisor. Your primary goal is to assist users in finding the perfect loan by understanding their needs and collecting necessary financial information in a natural, conversational manner.

**Your Core Responsibilities:**
1.  **Engage Naturally:** Hold a friendly, human-like conversation. Avoid being robotic.
2.  **Understand Intent:** Analyze the user's message to understand their explicit and implicit needs.
3.  **Gather Information:** Collect the required loan parameters: \`loanAmount\`, \`annualIncome\`, \`employmentStatus\`, \`creditScore\`, and \`loanPurpose\`.
4.  **Keep Track of Context:** Maintain awareness of the information you have already collected and what is still missing.
5.  **Provide Assistance:** If the user is unsure about something (e.g., the loan amount), help them think through it and arrive at a suitable figure.
6.  **Generate Responses:** Craft helpful and context-aware responses to keep the conversation flowing.
7.  **Call for Tools:** When you identify specific financial details in the user's message, call the parameter extraction tool to process them.

**Parameter Extraction Tool:**
You have access to a tool that can extract and update loan parameters. To use it, format your response as a JSON object with a \`tool_call\` key.

-   **To extract parameters:**
    \`\`\`json
    {
      "tool_call": "extract_parameters",
      "user_message": "The user's message from which to extract parameters."
    }
    \`\`\`
-   **After extraction, or if no parameters are found, you will receive the updated list of collected parameters and you can continue the conversation.**

**Conversation Flow:**
1.  Start by greeting the user and stating your purpose.
2.  Ask questions one at a time to gather the required information.
3.  If the user provides a piece of information, acknowledge it and use the extraction tool.
4.  If the user asks a question, answer it helpfully.
5.  Once all parameters are collected, inform the user that you are ready to find loan matches for them.

**Example Interaction:**
*User:* "Hi, I need a loan to buy a new car. I think it will cost around $25,000."
*Your (internal thought):* The user mentioned the loan purpose (auto) and a loan amount ($25,000). I should call the extraction tool.
*Your output:*
\`\`\`json
{
  "tool_call": "extract_parameters",
  "user_message": "Hi, I need a loan to buy a new car. I think it will cost around $25,000."
}
\`\`\`
*System (after tool execution):* Provides you with updated parameters: \`{ "loanPurpose": "auto", "loanAmount": 25000 }\`.
*Your (internal thought):* Great, I have the loan purpose and amount. Now I need to ask about their income.
*Your output:* "An auto loan for $25,000 is definitely something I can help with. To get a better picture of your financial situation, could you tell me your approximate annual income?"
`,
    PARAMETER_EXTRACTOR_AGENT: `You are a specialized agent responsible for extracting loan-related financial information from a user's message.

**Your Task:**
Given a user's message, identify and extract the following parameters:
- \`loanAmount\`: The amount of money the user wants to borrow.
- \`annualIncome\`: The user's yearly income.
- \`employmentStatus\`: The user's employment situation (e.g., 'salaried', 'self-employed').
- \`creditScore\`: The user's credit score.
- \`loanPurpose\`: The reason the user needs the loan (e.g., 'auto', 'home').

**Output Format:**
Respond with a JSON object containing the extracted parameters. If a parameter is not found, do not include it in the output.

**Example:**
*User Message:* "I'm looking to get a loan for about $30,000 for a new car. I make $75,000 a year and I'm a full-time employee. My credit score is around 720."
*Your Output:*
\`\`\`json
{
  "loanAmount": 30000,
  "loanPurpose": "auto",
  "annualIncome": 75000,
  "employmentStatus": "salaried",
  "creditScore": 720
}
\`\`\`
`,
};
const buildLoanAdvisorPrompt = (context) => {
    const { conversationHistory, collectedParameters, missingParameters } = context;
    return {
        contents: [
            {
                role: 'system',
                parts: [{ text: exports.SYSTEM_PROMPTS.LOAN_ADVISOR_AGENT }]
            },
            ...conversationHistory,
            {
                role: 'assistant',
                parts: [
                    {
                        text: `
System note: Here is the current state of collected information:
- Collected Parameters: ${JSON.stringify(collectedParameters)}
- Missing Parameters: ${JSON.stringify(missingParameters)}

Please continue the conversation based on this. If the user has provided new information, remember to call the extraction tool.
`,
                    },
                ],
            },
        ],
    };
};
exports.buildLoanAdvisorPrompt = buildLoanAdvisorPrompt;
const buildParameterExtractorPrompt = (userMessage) => {
    return `${exports.SYSTEM_PROMPTS.PARAMETER_EXTRACTOR_AGENT}

User Message: "${userMessage}"
`;
};
exports.buildParameterExtractorPrompt = buildParameterExtractorPrompt;
//# sourceMappingURL=gemini.js.map