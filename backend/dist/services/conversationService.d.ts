import { DatabaseService } from '../config/database';
import { ChatMessage } from '../models/interfaces';
export declare class ConversationService {
    private database;
    constructor(database: DatabaseService);
    addMessage(sessionId: string, messageType: 'user' | 'bot', content: string, agentType?: 'mca' | 'pca', metadata?: any): Promise<ChatMessage>;
    getConversationHistory(sessionId: string, limit?: number): Promise<ChatMessage[]>;
    getLastUserMessage(sessionId: string): Promise<ChatMessage | null>;
    getLastBotMessage(sessionId: string): Promise<ChatMessage | null>;
    getMessageCount(sessionId: string): Promise<{
        user: number;
        bot: number;
        total: number;
    }>;
    searchMessages(sessionId: string, searchTerm: string): Promise<ChatMessage[]>;
    deleteConversation(sessionId: string): Promise<void>;
    getConversationSummary(sessionId: string): Promise<{
        messageCount: number;
        duration: number;
        parametersCollected: string[];
        lastActivity: Date;
    }>;
    exportConversation(sessionId: string): Promise<{
        sessionId: string;
        messages: ChatMessage[];
        summary: any;
        exportedAt: Date;
    }>;
    updateMessageMetadata(messageId: number, metadata: any): Promise<void>;
    getRecentConversations(limit?: number): Promise<{
        sessionId: string;
        lastMessage: string;
        messageCount: number;
        lastActivity: Date;
    }[]>;
}
//# sourceMappingURL=conversationService.d.ts.map