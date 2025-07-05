// Message Bubble Component
// Displays individual chat messages with proper styling and interaction

import React, { useState } from 'react';
import { QuickReply } from './QuickReply';
import { formatTime } from '../../utils/dateUtils';
import { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
  onQuickReply?: (reply: string) => Promise<void>;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onQuickReply,
}) => {
  const [isQuickReplyLoading, setIsQuickReplyLoading] = useState(false);
  
  const isBot = message.messageType === 'bot';
  const isUser = message.messageType === 'user';

  // Extract suggested replies from metadata
  const suggestedReplies = message.metadata?.suggestedReplies as string[] | undefined;

  // Handle quick reply selection
  const handleQuickReply = async (reply: string) => {
    if (!onQuickReply) return;
    
    try {
      setIsQuickReplyLoading(true);
      await onQuickReply(reply);
    } catch (error) {
      console.error('Failed to send quick reply:', error);
    } finally {
      setIsQuickReplyLoading(false);
    }
  };

  // Parse message content for better formatting
  const formatMessageContent = (content: string) => {
    // Convert line breaks to proper spacing
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) {
      return content;
    }

    return lines.map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-xs lg:max-w-md ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'}`}>
          {isBot && (
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">🤖</span>
            </div>
          )}
          {isUser && (
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">👤</span>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Message Bubble */}
          <div
            className={`px-4 py-2 rounded-lg break-words ${
              isUser
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            }`}
          >
            <div className="text-sm leading-relaxed">
              {formatMessageContent(message.content)}
            </div>

            {/* Bot message metadata display */}
            {isBot && message.metadata && (
              <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                {typeof message.metadata.action === 'string' && (
                  <div>Action: {String(message.metadata.action)}</div>
                )}
                {typeof message.metadata.completionPercentage === 'number' && (
                  <div>Progress: {Number(message.metadata.completionPercentage)}%</div>
                )}
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {formatTime(message.createdAt)}
            {message.agentType && (
              <span className="ml-1 text-xs text-gray-400">
                • {message.agentType.toUpperCase()}
              </span>
            )}
          </div>

          {/* Quick Reply Buttons */}
          {isBot && suggestedReplies && suggestedReplies.length > 0 && (
            <div className="mt-3 w-full">
              <QuickReply
                options={suggestedReplies}
                onSelect={handleQuickReply}
                disabled={isQuickReplyLoading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};