// Chat Input Component
// Handles user message input with send functionality

import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { InlineSpinner } from '../common/LoadingSpinner';

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = "Type your message...",
  maxLength = 500,
}) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
      adjustTextareaHeight();
    }
  };

  // Handle send message
  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage || isLoading || disabled) {
      return;
    }

    try {
      setIsLoading(true);
      await onSendMessage(trimmedMessage);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Message stays in input on error so user can retry
    } finally {
      setIsLoading(false);
    }
  }, [message, onSendMessage, isLoading, disabled]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: New line (default behavior)
        return;
      } else {
        // Enter: Send message
        e.preventDefault();
        handleSend();
      }
    }
  };

  // Character count display
  const characterCount = message.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isAtLimit = characterCount >= maxLength;

  return (
    <div className="space-y-2">
      {/* Input Area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={`w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            disabled || isLoading
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : 'bg-white text-gray-900'
          } ${isAtLimit ? 'border-red-300 focus:ring-red-500' : ''}`}
          style={{
            minHeight: '48px',
            maxHeight: '120px',
          }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isLoading}
          className={`absolute right-2 bottom-2 p-2 rounded-lg transition-colors ${
            !message.trim() || disabled || isLoading
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-blue-600 hover:bg-blue-50 active:bg-blue-100'
          }`}
          title="Send message (Enter)"
        >
          {isLoading ? (
            <InlineSpinner size="sm" className="text-blue-600" />
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Input Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {/* Character Count */}
        <div className={`${isNearLimit ? (isAtLimit ? 'text-red-500' : 'text-yellow-600') : ''}`}>
          {characterCount}/{maxLength}
        </div>

        {/* Keyboard Shortcut Hint */}
        <div className="hidden sm:block">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>

      {/* Quick Action Buttons */}
      {!disabled && !isLoading && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMessage("I need help finding a loan")}
            disabled={isLoading}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            💡 Need help
          </button>
          <button
            onClick={() => setMessage("What information do you need from me?")}
            disabled={isLoading}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ❓ What info needed
          </button>
          <button
            onClick={() => setMessage("Show me my loan matches")}
            disabled={isLoading}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            🎯 Show matches
          </button>
        </div>
      )}
    </div>
  );
};