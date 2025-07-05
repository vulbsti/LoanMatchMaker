// Chat Window Component
// Main chat interface with message display and input

import React, { useEffect, useRef, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ParameterProgress } from './ParameterProgress';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  ChatMessage,
  ParameterTracking,
} from '../../types';

interface ChatWindowProps {
  sessionId: string | null;
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  parameterProgress: ParameterTracking | null;
  isLoading: boolean;
  onViewResults?: () => void;
  hasResults: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  sessionId,
  messages,
  onSendMessage,
  parameterProgress,
  isLoading,
  onViewResults,
  hasResults,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isUserScrolling) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isUserScrolling]);

  // Handle scroll detection to prevent auto-scroll when user is reading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 50;

    if (!isAtBottom) {
      setIsUserScrolling(true);
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Reset scrolling flag after 3 seconds of no scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 3000);
    } else {
      setIsUserScrolling(false);
    }
  };

  // Welcome message for new sessions
  const shouldShowWelcome = messages.length === 0 && sessionId;

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">🤖</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">LoanBot</h3>
            <p className="text-sm text-gray-500">
              {isLoading ? 'Typing...' : 'Ready to help you find the perfect loan'}
            </p>
          </div>
        </div>
        
        {/* Results Button */}
        {hasResults && (
          <button
            onClick={onViewResults}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            View Results
          </button>
        )}
      </div>

      {/* Parameter Progress */}
      {parameterProgress && (
        <ParameterProgress tracking={parameterProgress} />
      )}

      {/* Messages Container */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        onScroll={handleScroll}
        style={{ maxHeight: 'calc(60vh - 200px)' }}
      >
        {/* Welcome Message */}
        {shouldShowWelcome && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👋</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to LoanBot!
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              I'm here to help you find the perfect loan by asking a few questions about your needs. 
              Let's get started!
            </p>
            <div className="mt-6 text-sm text-gray-500">
              Try saying: "I need a loan" or "Help me find a loan"
            </div>
          </div>
        )}

        {/* Message List */}
        {messages.map((message, index) => (
          <MessageBubble
            key={`${message.sessionId}-${message.id}-${index}`}
            message={message}
            onQuickReply={onSendMessage}
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
              <LoadingSpinner size="sm" message="Thinking..." />
            </div>
          </div>
        )}

        {/* Scroll to Bottom Button */}
        {isUserScrolling && (
          <div className="fixed bottom-24 right-6 z-10">
            <button
              onClick={() => {
                setIsUserScrolling(false);
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
        )}

        {/* Messages End Marker */}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-gray-200 p-4">
        <ChatInput
          onSendMessage={onSendMessage}
          disabled={!sessionId || isLoading}
          placeholder={
            !sessionId 
              ? "Connecting..."
              : isLoading
              ? "Waiting for response..."
              : "Type your message..."
          }
        />
        
        {/* Status Bar */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div>
            {sessionId ? `Session: ...${sessionId.slice(-8)}` : 'No session'}
          </div>
          <div>
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};