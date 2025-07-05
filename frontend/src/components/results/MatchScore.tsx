// Match Score Component
// Displays circular progress indicator for match scores

import React from 'react';

interface MatchScoreProps {
  score: number;
  maxScore?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export const MatchScore: React.FC<MatchScoreProps> = ({
  score,
  maxScore = 100,
  label,
  size = 'md',
  showPercentage = true,
}) => {
  // Calculate percentage
  const percentage = Math.min(Math.max((score / maxScore) * 100, 0), 100);
  
  // Size configurations
  const sizeConfig = {
    sm: {
      diameter: 48,
      strokeWidth: 4,
      fontSize: 'text-xs',
      labelSize: 'text-xs',
    },
    md: {
      diameter: 64,
      strokeWidth: 6,
      fontSize: 'text-sm',
      labelSize: 'text-sm',
    },
    lg: {
      diameter: 80,
      strokeWidth: 8,
      fontSize: 'text-base',
      labelSize: 'text-sm',
    },
  };

  const config = sizeConfig[size];
  const radius = (config.diameter - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on score
  const getColor = (score: number) => {
    if (score >= 80) return '#10B981'; // green-500
    if (score >= 60) return '#F59E0B'; // yellow-500
    if (score >= 40) return '#F97316'; // orange-500
    return '#EF4444'; // red-500
  };

  const color = getColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Circular Progress */}
      <div className="relative">
        <svg
          width={config.diameter}
          height={config.diameter}
          className="transform -rotate-90"
        >
          {/* Background Circle */}
          <circle
            cx={config.diameter / 2}
            cy={config.diameter / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={config.strokeWidth}
            fill="none"
          />
          
          {/* Progress Circle */}
          <circle
            cx={config.diameter / 2}
            cy={config.diameter / 2}
            r={radius}
            stroke={color}
            strokeWidth={config.strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.1))',
            }}
          />
        </svg>
        
        {/* Score Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={`font-bold ${config.fontSize}`} style={{ color }}>
              {Math.round(score)}
            </div>
            {showPercentage && (
              <div className="text-xs text-gray-500 -mt-1">
                / {maxScore}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Label */}
      {label && (
        <div className={`text-center text-gray-700 font-medium ${config.labelSize}`}>
          {label}
        </div>
      )}
    </div>
  );
};

// Simplified score badge for inline use
export const ScoreBadge: React.FC<{
  score: number;
  maxScore?: number;
  className?: string;
}> = ({ score, maxScore = 100, className = '' }) => {
  const percentage = Math.min(Math.max((score / maxScore) * 100, 0), 100);
  
  const getColorClasses = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getColorClasses(
        score
      )} ${className}`}
    >
      {Math.round(score)}/{maxScore}
    </span>
  );
};

// Linear progress bar alternative
export const ScoreBar: React.FC<{
  score: number;
  maxScore?: number;
  label?: string;
  height?: number;
  className?: string;
}> = ({ score, maxScore = 100, label, height = 8, className = '' }) => {
  const percentage = Math.min(Math.max((score / maxScore) * 100, 0), 100);
  
  const getColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between text-sm text-gray-700 mb-1">
          <span>{label}</span>
          <span className="font-medium">{Math.round(score)}/{maxScore}</span>
        </div>
      )}
      <div
        className="w-full bg-gray-200 rounded-full overflow-hidden"
        style={{ height: `${height}px` }}
      >
        <div
          className={`h-full ${getColor(score)} transition-all duration-1000 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};