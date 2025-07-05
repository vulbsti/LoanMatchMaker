// Custom hook for chat functionality
// Handles message sending, conversation history, and state management

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiService } from '../services/api';
import {
  UseChatReturn,
  ChatMessage,
  ParameterTracking,
  LenderMatch,
  ApiError,
  AgentResponse,
} from '../types';

export const useChat = (sessionId: string | null): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [parameterProgress, setParameterProgress] = useState<ParameterTracking | null>(null);
  const [matchResults, setMatchResults] = useState<LenderMatch[] | null>(null);
  
  // Track if we've loaded initial history to avoid duplicates
  const hasLoadedHistory = useRef(false);
  const lastMessageId = useRef<number>(0);

  // Load conversation history when session changes
  useEffect(() => {
    if (sessionId && !hasLoadedHistory.current) {
      loadConversationHistory();
    } else if (!sessionId) {
      // Reset state when session is cleared
      setMessages([]);
      setParameterProgress(null);
      setMatchResults(null);
      hasLoadedHistory.current = false;
      lastMessageId.current = 0;
    }
  }, [sessionId]);

  const loadConversationHistory = useCallback(async () => {
    if (!sessionId) return;

    try {
      setError(null);
      console.log('[Chat] Loading conversation history for session:', sessionId);
      
      const response = await apiService.getConversationHistory(sessionId);
      
      if (response.success && response.data) {
        const { messages: historyMessages } = response.data;
        
        // Convert string dates to Date objects
        const processedMessages: ChatMessage[] = historyMessages.map(msg => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }));
        
        setMessages(processedMessages);
        hasLoadedHistory.current = true;
        
        // Track the last message ID to avoid duplicates
        if (processedMessages.length > 0) {
          lastMessageId.current = Math.max(...processedMessages.map(m => m.id));
        }
        
        console.log('[Chat] Loaded', processedMessages.length, 'messages from history');
        
        // Also load current parameter status
        await loadParameterStatus();
      }
    } catch (err) {
      const error = err as ApiError;
      console.error('[Chat] Failed to load conversation history:', error);
      setError(error);
    }
  }, [sessionId]);

  const loadParameterStatus = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await apiService.getParameterStatus(sessionId);
      
      if (response.success && response.data) {
        setParameterProgress(response.data.tracking);
        
        // If parameters are complete, try to load match results
        if (response.data.isComplete) {
          await loadMatchResults();
        }
      }
    } catch (err) {
      console.error('[Chat] Failed to load parameter status:', err);
      // Don't set error here as this is a background operation
    }
  }, [sessionId]);

  const loadMatchResults = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await apiService.getMatchResults(sessionId);
      
      if (response.success && response.data) {
        setMatchResults(response.data.matches);
        console.log('[Chat] Loaded', response.data.matches.length, 'match results');
      }
    } catch (err) {
      console.error('[Chat] Failed to load match results:', err);
      // Don't set error here as this might be expected if no matches exist yet
    }
  }, [sessionId]);

  const sendMessage = useCallback(async (message: string): Promise<void> => {
    if (!sessionId) {
      throw new Error('No active session');
    }

    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[Chat] Sending message:', message);
      
      // Add user message to local state immediately for better UX
      const userMessage: ChatMessage = {
        id: lastMessageId.current + 1,
        sessionId,
        messageType: 'user',
        content: message.trim(),
        createdAt: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      lastMessageId.current += 1;
      
      // Send message to backend
      const response = await apiService.sendMessage(sessionId, message.trim());
      
      if (response.success && response.data) {
        const agentResponse: AgentResponse = response.data;
        
        // Add bot response to messages
        const botMessage: ChatMessage = {
          id: lastMessageId.current + 1,
          sessionId,
          messageType: 'bot',
          content: agentResponse.response,
          agentType: 'mca', // Assume MCA for user-facing responses
          metadata: {
            action: agentResponse.action,
            completionPercentage: agentResponse.completionPercentage,
            suggestedReplies: agentResponse.suggestedReplies,
          },
          createdAt: new Date(),
        };
        
        setMessages(prev => [...prev, botMessage]);
        lastMessageId.current += 1;
        
        // Update parameter progress if provided
        if (agentResponse.completionPercentage !== undefined) {
          setParameterProgress(prev => prev ? {
            ...prev,
            completionPercentage: agentResponse.completionPercentage,
          } : null);
        }
        
        // Handle match results if provided
        if (agentResponse.matches && agentResponse.matches.length > 0) {
          setMatchResults(agentResponse.matches);
          console.log('[Chat] Received', agentResponse.matches.length, 'match results');
        }
        
        // If matching was triggered, reload parameter status
        if (agentResponse.action === 'trigger_matching') {
          await loadParameterStatus();
        }
        
        console.log('[Chat] Message sent successfully, action:', agentResponse.action);
      } else {
        throw new Error(response.error || 'Failed to send message');
      }
    } catch (err) {
      const error = err as ApiError;
      console.error('[Chat] Failed to send message:', error);
      
      // Remove the optimistically added user message if sending failed
      setMessages(prev => prev.slice(0, -1));
      lastMessageId.current -= 1;
      
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, loadParameterStatus]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshData = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      await Promise.all([
        loadParameterStatus(),
        loadMatchResults(),
      ]);
    } catch (err) {
      console.error('[Chat] Failed to refresh data:', err);
    }
  }, [sessionId, loadParameterStatus, loadMatchResults]);

  // Auto-refresh parameter status periodically when loading
  useEffect(() => {
    if (!sessionId || !isLoading) return;

    const interval = setInterval(() => {
      loadParameterStatus();
    }, 5000); // Check every 5 seconds while loading

    return () => clearInterval(interval);
  }, [sessionId, isLoading, loadParameterStatus]);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    sessionId,
    parameterProgress,
    matchResults,
    clearError,
    refreshData,
    loadConversationHistory,
  };
};