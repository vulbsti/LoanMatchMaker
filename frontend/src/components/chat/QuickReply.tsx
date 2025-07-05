// Quick Reply Component
// Displays clickable quick reply buttons for common responses

import React from 'react';
import { InlineSpinner } from '../common/LoadingSpinner';

interface QuickReplyProps {
  options: string[];
  onSelect: (option: string) => Promise<void> | void;
  disabled?: boolean;
  maxOptions?: number;
}

export const QuickReply: React.FC<QuickReplyProps> = ({
  options,
  onSelect,
  disabled = false,
  maxOptions = 4,
}) => {
  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);

  const handleSelect = async (option: string) => {
    if (disabled || selectedOption) return;

    try {
      setSelectedOption(option);
      await onSelect(option);
    } catch (error) {
      console.error('Failed to send quick reply:', error);
      setSelectedOption(null);
    }
  };

  // Limit the number of options displayed
  const displayOptions = options.slice(0, maxOptions);

  if (displayOptions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-gray-500 font-medium">
        Quick replies:
      </div>
      <div className="flex flex-wrap gap-2">
        {displayOptions.map((option, index) => {
          const isSelected = selectedOption === option;
          const isLoading = isSelected;

          return (
            <button
              key={index}
              onClick={() => handleSelect(option)}
              disabled={disabled || !!selectedOption}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : disabled || selectedOption
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100'
              }`}
            >
              {isLoading && <InlineSpinner size="xs" />}
              <span className={isLoading ? 'opacity-75' : ''}>{option}</span>
            </button>
          );
        })}
      </div>
      
      {options.length > maxOptions && (
        <div className="text-xs text-gray-400">
          +{options.length - maxOptions} more options available
        </div>
      )}
    </div>
  );
};