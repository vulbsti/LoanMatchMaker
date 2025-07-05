// Loading Spinner Component
// Provides loading indicators with customizable sizes and messages

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const containerClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${containerClasses[size]} ${className}`}>
      {/* Spinner */}
      <div className="relative">
        <div
          className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
        />
      </div>

      {/* Message */}
      {message && (
        <p className={`text-gray-600 text-center ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
          {message}
        </p>
      )}
    </div>
  );
};

// Inline Loading Spinner for buttons and small spaces
export const InlineSpinner: React.FC<{ size?: 'xs' | 'sm'; className?: string }> = ({
  size = 'xs',
  className = '',
}) => {
  const sizeClass = size === 'xs' ? 'w-3 h-3' : 'w-4 h-4';
  
  return (
    <div
      className={`${sizeClass} border-2 border-current border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
};

// Loading overlay for full-screen loading
export const LoadingOverlay: React.FC<{
  isVisible: boolean;
  message?: string;
  className?: string;
}> = ({ isVisible, message, className = '' }) => {
  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
        <LoadingSpinner size="lg" message={message} />
      </div>
    </div>
  );
};

// Loading skeleton for content placeholders
export const LoadingSkeleton: React.FC<{
  className?: string;
  lines?: number;
}> = ({ className = '', lines = 3 }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 rounded h-4 mb-2 ${
            index === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};