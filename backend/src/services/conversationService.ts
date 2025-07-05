import { DatabaseService } from '../config/database';
import { ChatMessage } from '../models/interfaces';
import { ConversationRow, MessageCountRow, ConversationSummaryRow, RecentConversationRow, ParameterTrackingRow } from '../models/database-types';
import { createNotFoundError } from '../middleware/errorHandler';

export class ConversationService {
  constructor(private database: DatabaseService) {}

  async addMessage(
    sessionId: string,
    messageType: 'user' | 'bot',
    content: string,
    agentType?: 'mca' | 'pca',
    metadata?: any
  ): Promise<ChatMessage> {
    try {
      const result = await this.database.query<ConversationRow>(
        `INSERT INTO conversation_history (session_id, message_type, content, agent_type, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [sessionId, messageType, content, agentType, metadata]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Failed to insert message');
      }
      
      const row = result.rows[0]!;
      return {
        id: row.id,
        sessionId: row.session_id,
        messageType: row.message_type,
        content: row.content,
        agentType: row.agent_type as 'mca' | 'pca' | undefined,
        metadata: row.metadata,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error('Add message error:', error);
      throw new Error('Failed to add message to conversation');
    }
  }

  async getConversationHistory(sessionId: string, limit?: number): Promise<ChatMessage[]> {
    try {
      const query = `
        SELECT * FROM conversation_history 
        WHERE session_id = $1 
        ORDER BY created_at ASC
        ${limit ? `LIMIT $2` : ''}
      `;
      
      const params = limit ? [sessionId, limit] : [sessionId];
      const result = await this.database.query<ConversationRow>(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        messageType: row.message_type,
        content: row.content,
        agentType: row.agent_type as 'mca' | 'pca' | undefined,
        metadata: row.metadata,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Get conversation history error:', error);
      throw new Error('Failed to retrieve conversation history');
    }
  }

  async getLastUserMessage(sessionId: string): Promise<ChatMessage | null> {
    try {
      const result = await this.database.query<ConversationRow>(
        `SELECT * FROM conversation_history 
         WHERE session_id = $1 AND message_type = 'user'
         ORDER BY created_at DESC
         LIMIT 1`,
        [sessionId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0]!;
      return {
        id: row.id,
        sessionId: row.session_id,
        messageType: row.message_type,
        content: row.content,
        agentType: row.agent_type as 'mca' | 'pca' | undefined,
        metadata: row.metadata,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error('Get last user message error:', error);
      throw new Error('Failed to retrieve last user message');
    }
  }

  async getLastBotMessage(sessionId: string): Promise<ChatMessage | null> {
    try {
      const result = await this.database.query<ConversationRow>(
        `SELECT * FROM conversation_history 
         WHERE session_id = $1 AND message_type = 'bot'
         ORDER BY created_at DESC
         LIMIT 1`,
        [sessionId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0]!;
      return {
        id: row.id,
        sessionId: row.session_id,
        messageType: row.message_type,
        content: row.content,
        agentType: row.agent_type as 'mca' | 'pca' | undefined,
        metadata: row.metadata,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error('Get last bot message error:', error);
      throw new Error('Failed to retrieve last bot message');
    }
  }

  async getMessageCount(sessionId: string): Promise<{ user: number; bot: number; total: number }> {
    try {
      const result = await this.database.query<MessageCountRow>(
        `SELECT 
           COUNT(CASE WHEN message_type = 'user' THEN 1 END) as user_count,
           COUNT(CASE WHEN message_type = 'bot' THEN 1 END) as bot_count,
           COUNT(*) as total_count
         FROM conversation_history 
         WHERE session_id = $1`,
        [sessionId]
      );
      
      const row = result.rows[0]!;
      return {
        user: parseInt(row.user_count || '0'),
        bot: parseInt(row.bot_count || '0'),
        total: parseInt(row.total_count || '0'),
      };
    } catch (error) {
      console.error('Get message count error:', error);
      throw new Error('Failed to retrieve message count');
    }
  }

  async searchMessages(sessionId: string, searchTerm: string): Promise<ChatMessage[]> {
    try {
      const result = await this.database.query<ConversationRow>(
        `SELECT * FROM conversation_history 
         WHERE session_id = $1 AND content ILIKE $2
         ORDER BY created_at DESC`,
        [sessionId, `%${searchTerm}%`]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        messageType: row.message_type,
        content: row.content,
        agentType: row.agent_type as 'mca' | 'pca' | undefined,
        metadata: row.metadata,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('Search messages error:', error);
      throw new Error('Failed to search messages');
    }
  }

  async deleteConversation(sessionId: string): Promise<void> {
    try {
      await this.database.query(
        `DELETE FROM conversation_history WHERE session_id = $1`,
        [sessionId]
      );
    } catch (error) {
      console.error('Delete conversation error:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  async getConversationSummary(sessionId: string): Promise<{
    messageCount: number;
    duration: number;
    parametersCollected: string[];
    lastActivity: Date;
  }> {
    try {
      const result = await this.database.query<ConversationSummaryRow>(
        `SELECT 
           COUNT(*) as message_count,
           EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))/60 as duration_minutes,
           MAX(created_at) as last_activity
         FROM conversation_history 
         WHERE session_id = $1`,
        [sessionId]
      );
      
      const row = result.rows[0]!;
      
      // Get collected parameters
      const paramsResult = await this.database.query<ParameterTrackingRow>(
        `SELECT 
           CASE WHEN loan_amount_collected THEN 'loanAmount' END,
           CASE WHEN annual_income_collected THEN 'annualIncome' END,
           CASE WHEN employment_status_collected THEN 'employmentStatus' END,
           CASE WHEN credit_score_collected THEN 'creditScore' END,
           CASE WHEN loan_purpose_collected THEN 'loanPurpose' END
         FROM parameter_tracking 
         WHERE session_id = $1`,
        [sessionId]
      );
      
      const parametersCollected = paramsResult.rows[0] 
        ? Object.values(paramsResult.rows[0]).filter(Boolean) as string[]
        : [];
      
      return {
        messageCount: parseInt(row.message_count || '0'),
        duration: parseFloat(row.duration_minutes || '0'),
        parametersCollected,
        lastActivity: row.last_activity,
      };
    } catch (error) {
      console.error('Get conversation summary error:', error);
      throw new Error('Failed to retrieve conversation summary');
    }
  }

  async exportConversation(sessionId: string): Promise<{
    sessionId: string;
    messages: ChatMessage[];
    summary: any;
    exportedAt: Date;
  }> {
    try {
      const messages = await this.getConversationHistory(sessionId);
      const summary = await this.getConversationSummary(sessionId);
      
      return {
        sessionId,
        messages,
        summary,
        exportedAt: new Date(),
      };
    } catch (error) {
      console.error('Export conversation error:', error);
      throw new Error('Failed to export conversation');
    }
  }

  async updateMessageMetadata(messageId: number, metadata: any): Promise<void> {
    try {
      await this.database.query(
        `UPDATE conversation_history SET metadata = $1 WHERE id = $2`,
        [JSON.stringify(metadata), messageId]
      );
    } catch (error) {
      console.error('Update message metadata error:', error);
      throw new Error('Failed to update message metadata');
    }
  }

  async getRecentConversations(limit: number = 10): Promise<{
    sessionId: string;
    lastMessage: string;
    messageCount: number;
    lastActivity: Date;
  }[]> {
    try {
      const result = await this.database.query<RecentConversationRow>(
        `SELECT 
           ch.session_id,
           ch.content as last_message,
           ch.created_at as last_activity,
           (SELECT COUNT(*) FROM conversation_history WHERE session_id = ch.session_id) as message_count
         FROM conversation_history ch
         INNER JOIN (
           SELECT session_id, MAX(created_at) as max_created_at
           FROM conversation_history
           GROUP BY session_id
         ) latest ON ch.session_id = latest.session_id AND ch.created_at = latest.max_created_at
         ORDER BY ch.created_at DESC
         LIMIT $1`,
        [limit]
      );
      
      return result.rows.map(row => ({
        sessionId: row.session_id,
        lastMessage: row.last_message,
        messageCount: parseInt(row.message_count),
        lastActivity: row.last_activity,
      }));
    } catch (error) {
      console.error('Get recent conversations error:', error);
      throw new Error('Failed to retrieve recent conversations');
    }
  }
}