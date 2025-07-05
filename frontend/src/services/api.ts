// API Service Layer for Loan Advisor Chatbot Frontend
// Handles all backend communication with proper error handling and type safety

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  APIResponse,
  ChatMessageRequest,
  ChatMessageResponse,
  SessionCreateResponse,
  ParameterStatusResponse,
  MatchResultsResponse,
  ConversationHistoryResponse,
  LendersResponse,
  ApiError,
  API_ENDPOINTS,
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        // Add timestamp for cache busting
        config.params = {
          ...config.params,
          _t: Date.now(),
        };

        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          params: config.params,
        });

        return config;
      },
      (error) => {
        console.error('[API] Request error:', error);
        return Promise.reject(this.formatError(error));
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => {
        console.log(`[API] ${response.status} ${response.config.url}`, {
          data: response.data,
        });
        return response;
      },
      (error) => {
        console.error('[API] Response error:', error);
        return Promise.reject(this.formatError(error));
      }
    );
  }

  private formatError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const responseData = error.response.data as APIResponse;
      return {
        message: responseData?.error || responseData?.message || 'Server error occurred',
        status: error.response.status,
        code: error.code,
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Unable to connect to server. Please check your connection.',
        status: 0,
        code: error.code,
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
        code: error.code,
      };
    }
  }

  // Chat API methods
  async createSession(): Promise<SessionCreateResponse> {
    try {
      const response = await this.api.post<SessionCreateResponse>(
        API_ENDPOINTS.CHAT.SESSION,
        {}
      );
      return response.data;
    } catch (error) {
      console.error('[API] Failed to create session:', error);
      throw error;
    }
  }

  async sendMessage(sessionId: string, message: string): Promise<ChatMessageResponse> {
    try {
      const payload: ChatMessageRequest = { sessionId, message };
      const response = await this.api.post<ChatMessageResponse>(
        API_ENDPOINTS.CHAT.MESSAGE,
        payload
      );
      return response.data;
    } catch (error) {
      console.error('[API] Failed to send message:', error);
      throw error;
    }
  }

  async getConversationHistory(sessionId: string): Promise<ConversationHistoryResponse> {
    try {
      const response = await this.api.get<ConversationHistoryResponse>(
        `${API_ENDPOINTS.CHAT.HISTORY}/${sessionId}`
      );
      return response.data;
    } catch (error) {
      console.error('[API] Failed to get conversation history:', error);
      throw error;
    }
  }

  async endSession(sessionId: string): Promise<APIResponse> {
    try {
      const response = await this.api.delete<APIResponse>(
        `${API_ENDPOINTS.CHAT.SESSION}/${sessionId}`
      );
      return response.data;
    } catch (error) {
      console.error('[API] Failed to end session:', error);
      throw error;
    }
  }

  // Loan API methods
  async getParameterStatus(sessionId: string): Promise<ParameterStatusResponse> {
    try {
      const response = await this.api.get<ParameterStatusResponse>(
        `${API_ENDPOINTS.LOAN.STATUS}/${sessionId}`
      );
      return response.data;
    } catch (error) {
      console.error('[API] Failed to get parameter status:', error);
      throw error;
    }
  }

  async triggerMatching(sessionId: string): Promise<MatchResultsResponse> {
    try {
      const response = await this.api.post<MatchResultsResponse>(
        API_ENDPOINTS.LOAN.MATCH,
        { sessionId }
      );
      return response.data;
    } catch (error) {
      console.error('[API] Failed to trigger matching:', error);
      throw error;
    }
  }

  async getMatchResults(sessionId: string): Promise<MatchResultsResponse> {
    try {
      const response = await this.api.get<MatchResultsResponse>(
        `${API_ENDPOINTS.LOAN.RESULTS}/${sessionId}`
      );
      return response.data;
    } catch (error) {
      console.error('[API] Failed to get match results:', error);
      throw error;
    }
  }

  async updateParameter(
    sessionId: string,
    parameter: string,
    value: string | number
  ): Promise<APIResponse> {
    try {
      const response = await this.api.put<APIResponse>(
        `${API_ENDPOINTS.LOAN.PARAMETERS}/${sessionId}`,
        { parameter, value }
      );
      return response.data;
    } catch (error) {
      console.error('[API] Failed to update parameter:', error);
      throw error;
    }
  }

  async getAllLenders(): Promise<LendersResponse> {
    try {
      const response = await this.api.get<LendersResponse>(
        API_ENDPOINTS.LOAN.LENDERS
      );
      return response.data;
    } catch (error) {
      console.error('[API] Failed to get lenders:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<APIResponse> {
    try {
      const response = await this.api.get<APIResponse>(API_ENDPOINTS.HEALTH);
      return response.data;
    } catch (error) {
      console.error('[API] Health check failed:', error);
      throw error;
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.api.defaults.baseURL !== undefined;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  // Update base URL if needed (for environment switching)
  updateBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL;
    this.api.defaults.baseURL = newBaseURL;
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Export individual methods for easier testing and tree-shaking
export const {
  createSession,
  sendMessage,
  getConversationHistory,
  endSession,
  getParameterStatus,
  triggerMatching,
  getMatchResults,
  updateParameter,
  getAllLenders,
  healthCheck,
} = apiService;

export default apiService;