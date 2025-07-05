import { Request, Response } from 'express';
import { APIResponse, MessageContext } from '../models/interfaces';
import { SessionService } from '../services/sessionService';
import { ConversationService } from '../services/conversationService';
import { ParameterService } from '../services/parameterService';
import { AgentOrchestrator } from '../services/agentOrchestrator';
import { MatchmakingService } from '../services/matchmakingService';
import { GeminiService } from '../config/gemini';
import { DatabaseService } from '../config/database';
import { config } from '../config';

export class ChatController {
  private sessionService: SessionService;
  private conversationService: ConversationService;
  private parameterService: ParameterService;
  private agentOrchestrator: AgentOrchestrator;
  private matchmakingService: MatchmakingService;
  private geminiService: GeminiService;
  private database: DatabaseService;

  constructor() {
    // Initialize database connection
    this.database = new DatabaseService(config.database);
    
    // Initialize services
    this.sessionService = new SessionService(this.database);
    this.conversationService = new ConversationService(this.database);
    this.parameterService = new ParameterService(this.database);
    this.matchmakingService = new MatchmakingService(this.database);
    this.geminiService = new GeminiService(config.gemini);
    
    // Initialize agent orchestrator
    this.agentOrchestrator = new AgentOrchestrator(
      this.geminiService,
      this.parameterService
    );
  }

  async processMessage(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, message } = req.body;
      
      // Validate session
      const isValidSession = await this.sessionService.validateSession(sessionId);
      if (!isValidSession) {
        const errorResponse: APIResponse = {
          success: false,
          error: 'Invalid session',
          message: 'Session not found or expired',
        };
        res.status(404).json(errorResponse);
        return;
      }
      
      // Get current session data
      const sessionData = await this.sessionService.getSessionData(sessionId);
      
      // Store user message
      await this.conversationService.addMessage(sessionId, 'user', message);
      
      // Try to extract parameters from the message
      const extractedParam = await this.parameterService.extractParameterFromMessage(message);
      if (extractedParam) {
        await this.parameterService.updateParameter(
          sessionId,
          extractedParam.parameter,
          extractedParam.value
        );
        // Refresh session data after parameter update
        sessionData.parameters = await this.parameterService.getParameters(sessionId);
        sessionData.tracking = await this.parameterService.getTrackingStatus(sessionId);
      }
      
      // Create message context for agents
      const messageContext: MessageContext = {
        sessionId,
        message,
        parameters: sessionData.parameters,
        tracking: sessionData.tracking,
        conversationHistory: sessionData.conversationHistory.slice(-5), // Last 5 messages for context
      };
      
      // Process through dual-agent system
      const agentResponse = await this.agentOrchestrator.processMessage(messageContext);
      
      // Handle agent decisions
      if (agentResponse.action === 'trigger_matching') {
        // Check if all required parameters are collected
        const isComplete = await this.parameterService.isComplete(sessionId);
        if (isComplete) {
          const matches = await this.matchmakingService.findMatches(
            sessionId,
            sessionData.parameters as any
          );
          agentResponse.matches = matches;
          agentResponse.response = `Great! I found ${matches.length} excellent loan matches for you. Here are your top options based on your profile.`;
        } else {
          agentResponse.response = 'I need a bit more information before I can find your perfect loan matches. Let\'s continue with a few more questions.';
          agentResponse.action = 'collect_parameter';
        }
      }
      
      // Store bot response
      await this.conversationService.addMessage(
        sessionId,
        'bot',
        agentResponse.response,
        'mca',
        {
          action: agentResponse.action,
          completionPercentage: agentResponse.completionPercentage,
        }
      );
      
      // Update session
      await this.sessionService.updateSession(sessionId);
      
      const response: APIResponse = {
        success: true,
        data: {
          response: agentResponse.response,
          action: agentResponse.action,
          matches: agentResponse.matches,
          completionPercentage: agentResponse.completionPercentage,
          requiresInput: agentResponse.requiresInput,
          suggestedReplies: agentResponse.suggestedReplies,
          sessionId,
        },
        message: 'Message processed successfully',
      };
      
      res.json(response);
    } catch (error) {
      console.error('Process message error:', error);
      const errorResponse: APIResponse = {
        success: false,
        error: 'Failed to process message',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(errorResponse);
    }
  }

  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      // Validate sessionId parameter
      if (!sessionId) {
        const errorResponse: APIResponse = {
          success: false,
          error: 'Missing session ID',
          message: 'Session ID is required',
        };
        res.status(400).json(errorResponse);
        return;
      }
      
      // Validate session
      const isValidSession = await this.sessionService.validateSession(sessionId);
      if (!isValidSession) {
        const errorResponse: APIResponse = {
          success: false,
          error: 'Invalid session',
          message: 'Session not found or expired',
        };
        res.status(404).json(errorResponse);
        return;
      }
      
      const conversationHistory = await this.conversationService.getConversationHistory(sessionId);
      const conversationSummary = await this.conversationService.getConversationSummary(sessionId);
      
      const response: APIResponse = {
        success: true,
        data: {
          sessionId,
          messages: conversationHistory,
          summary: conversationSummary,
        },
        message: 'Conversation history retrieved successfully',
      };
      
      res.json(response);
    } catch (error) {
      console.error('Get history error:', error);
      const errorResponse: APIResponse = {
        success: false,
        error: 'Failed to retrieve conversation history',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(errorResponse);
    }
  }

  async createSession(req: Request, res: Response): Promise<void> {
    try {
      const { userAgent, ipAddress } = req.body;
      
      const sessionId = await this.sessionService.createSession(
        userAgent || req.get('User-Agent'),
        ipAddress || req.ip
      );
      
      // Add welcome message
      await this.conversationService.addMessage(
        sessionId,
        'bot',
        'Hello! I\'m your personal loan advisor. I\'m here to help you find the best loan options based on your specific needs. To get started, could you tell me how much you\'re looking to borrow?',
        'mca',
        { action: 'collect_parameter', nextParameter: 'loanAmount' }
      );
      
      const response: APIResponse = {
        success: true,
        data: {
          sessionId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          message: 'Welcome to your loan advisor service!',
        },
        message: 'Session created successfully',
      };
      
      res.json(response);
    } catch (error) {
      console.error('Create session error:', error);
      const errorResponse: APIResponse = {
        success: false,
        error: 'Failed to create session',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(errorResponse);
    }
  }

  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      
      // Validate sessionId parameter
      if (!sessionId) {
        const errorResponse: APIResponse = {
          success: false,
          error: 'Missing session ID',
          message: 'Session ID is required',
        };
        res.status(400).json(errorResponse);
        return;
      }
      
      // End the session
      await this.sessionService.endSession(sessionId);
      
      // Add goodbye message
      await this.conversationService.addMessage(
        sessionId,
        'bot',
        'Thank you for using our loan advisor service! Your session has been ended. Feel free to start a new session anytime if you need help finding loan options.',
        'mca',
        { action: 'session_ended' }
      );
      
      const response: APIResponse = {
        success: true,
        data: {
          sessionId,
          status: 'ended',
          message: 'Your session has been successfully ended.',
        },
        message: 'Session ended successfully',
      };
      
      res.json(response);
    } catch (error) {
      console.error('End session error:', error);
      const errorResponse: APIResponse = {
        success: false,
        error: 'Failed to end session',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(errorResponse);
    }
  }

  async getRecentConversations(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const conversations = await this.conversationService.getRecentConversations(limit);
      
      const response: APIResponse = {
        success: true,
        data: {
          conversations,
          total: conversations.length,
        },
        message: 'Recent conversations retrieved successfully',
      };
      
      res.json(response);
    } catch (error) {
      console.error('Get recent conversations error:', error);
      const errorResponse: APIResponse = {
        success: false,
        error: 'Failed to retrieve recent conversations',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(500).json(errorResponse);
    }
  }
}