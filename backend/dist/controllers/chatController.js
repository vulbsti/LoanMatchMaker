"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const sessionService_1 = require("../services/sessionService");
const conversationService_1 = require("../services/conversationService");
const parameterService_1 = require("../services/parameterService");
const agentOrchestrator_1 = require("../services/agentOrchestrator");
const matchmakingService_1 = require("../services/matchmakingService");
const gemini_1 = require("../config/gemini");
const database_1 = require("../config/database");
const config_1 = require("../config");
class ChatController {
    constructor() {
        this.database = new database_1.DatabaseService(config_1.config.database);
        this.sessionService = new sessionService_1.SessionService(this.database);
        this.conversationService = new conversationService_1.ConversationService(this.database);
        this.parameterService = new parameterService_1.ParameterService(this.database);
        this.matchmakingService = new matchmakingService_1.MatchmakingService(this.database);
        this.geminiService = new gemini_1.GeminiService(config_1.config.gemini);
        this.agentOrchestrator = new agentOrchestrator_1.AgentOrchestrator(this.geminiService, this.parameterService);
    }
    async processMessage(req, res) {
        try {
            const { sessionId, message } = req.body;
            const isValidSession = await this.sessionService.validateSession(sessionId);
            if (!isValidSession) {
                const errorResponse = {
                    success: false,
                    error: 'Invalid session',
                    message: 'Session not found or expired',
                };
                res.status(404).json(errorResponse);
                return;
            }
            const sessionData = await this.sessionService.getSessionData(sessionId);
            await this.conversationService.addMessage(sessionId, 'user', message);
            const extractedParam = await this.parameterService.extractParameterFromMessage(message);
            if (extractedParam) {
                await this.parameterService.updateParameter(sessionId, extractedParam.parameter, extractedParam.value);
                sessionData.parameters = await this.parameterService.getParameters(sessionId);
                sessionData.tracking = await this.parameterService.getTrackingStatus(sessionId);
            }
            const messageContext = {
                sessionId,
                message,
                parameters: sessionData.parameters,
                tracking: sessionData.tracking,
                conversationHistory: sessionData.conversationHistory.slice(-5),
            };
            const agentResponse = await this.agentOrchestrator.processMessage(messageContext);
            if (agentResponse.action === 'trigger_matching') {
                const isComplete = await this.parameterService.isComplete(sessionId);
                if (isComplete) {
                    const matches = await this.matchmakingService.findMatches(sessionId, sessionData.parameters);
                    agentResponse.matches = matches;
                    agentResponse.response = `Great! I found ${matches.length} excellent loan matches for you. Here are your top options based on your profile.`;
                }
                else {
                    agentResponse.response = 'I need a bit more information before I can find your perfect loan matches. Let\'s continue with a few more questions.';
                    agentResponse.action = 'collect_parameter';
                }
            }
            await this.conversationService.addMessage(sessionId, 'bot', agentResponse.response, 'mca', {
                action: agentResponse.action,
                completionPercentage: agentResponse.completionPercentage,
            });
            await this.sessionService.updateSession(sessionId);
            const response = {
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
        }
        catch (error) {
            console.error('Process message error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to process message',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
    async getHistory(req, res) {
        try {
            const { sessionId } = req.params;
            if (!sessionId) {
                const errorResponse = {
                    success: false,
                    error: 'Missing session ID',
                    message: 'Session ID is required',
                };
                res.status(400).json(errorResponse);
                return;
            }
            const isValidSession = await this.sessionService.validateSession(sessionId);
            if (!isValidSession) {
                const errorResponse = {
                    success: false,
                    error: 'Invalid session',
                    message: 'Session not found or expired',
                };
                res.status(404).json(errorResponse);
                return;
            }
            const conversationHistory = await this.conversationService.getConversationHistory(sessionId);
            const conversationSummary = await this.conversationService.getConversationSummary(sessionId);
            const response = {
                success: true,
                data: {
                    sessionId,
                    messages: conversationHistory,
                    summary: conversationSummary,
                },
                message: 'Conversation history retrieved successfully',
            };
            res.json(response);
        }
        catch (error) {
            console.error('Get history error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to retrieve conversation history',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
    async createSession(req, res) {
        try {
            const { userAgent, ipAddress } = req.body;
            const sessionId = await this.sessionService.createSession(userAgent || req.get('User-Agent'), ipAddress || req.ip);
            await this.conversationService.addMessage(sessionId, 'bot', 'Hello! I\'m your personal loan advisor. I\'m here to help you find the best loan options based on your specific needs. To get started, could you tell me how much you\'re looking to borrow?', 'mca', { action: 'collect_parameter', nextParameter: 'loanAmount' });
            const response = {
                success: true,
                data: {
                    sessionId,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    message: 'Welcome to your loan advisor service!',
                },
                message: 'Session created successfully',
            };
            res.json(response);
        }
        catch (error) {
            console.error('Create session error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to create session',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
    async endSession(req, res) {
        try {
            const { sessionId } = req.params;
            if (!sessionId) {
                const errorResponse = {
                    success: false,
                    error: 'Missing session ID',
                    message: 'Session ID is required',
                };
                res.status(400).json(errorResponse);
                return;
            }
            await this.sessionService.endSession(sessionId);
            await this.conversationService.addMessage(sessionId, 'bot', 'Thank you for using our loan advisor service! Your session has been ended. Feel free to start a new session anytime if you need help finding loan options.', 'mca', { action: 'session_ended' });
            const response = {
                success: true,
                data: {
                    sessionId,
                    status: 'ended',
                    message: 'Your session has been successfully ended.',
                },
                message: 'Session ended successfully',
            };
            res.json(response);
        }
        catch (error) {
            console.error('End session error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to end session',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
    async getRecentConversations(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const conversations = await this.conversationService.getRecentConversations(limit);
            const response = {
                success: true,
                data: {
                    conversations,
                    total: conversations.length,
                },
                message: 'Recent conversations retrieved successfully',
            };
            res.json(response);
        }
        catch (error) {
            console.error('Get recent conversations error:', error);
            const errorResponse = {
                success: false,
                error: 'Failed to retrieve recent conversations',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
            res.status(500).json(errorResponse);
        }
    }
}
exports.ChatController = ChatController;
//# sourceMappingURL=chatController.js.map