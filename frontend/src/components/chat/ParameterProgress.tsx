// Parameter Progress Component
// Shows the progress of loan parameter collection

import React from 'react';
import { ParameterTracking } from '../../types';

interface ParameterProgressProps {
  tracking: ParameterTracking;
}

const PARAMETER_LABELS = {
  loanAmountCollected: 'Loan Amount',
  loanPurposeCollected: 'Loan Purpose',
  annualIncomeCollected: 'Annual Income',
  creditScoreCollected: 'Credit Score',
  employmentStatusCollected: 'Employment Status',
} as const;

export const ParameterProgress: React.FC<ParameterProgressProps> = ({ tracking }) => {
  const parameters = [
    { key: 'loanAmountCollected', label: PARAMETER_LABELS.loanAmountCollected, icon: '💰' },
    { key: 'loanPurposeCollected', label: PARAMETER_LABELS.loanPurposeCollected, icon: '🎯' },
    { key: 'annualIncomeCollected', label: PARAMETER_LABELS.annualIncomeCollected, icon: '💼' },
    { key: 'creditScoreCollected', label: PARAMETER_LABELS.creditScoreCollected, icon: '📊' },
    { key: 'employmentStatusCollected', label: PARAMETER_LABELS.employmentStatusCollected, icon: '👔' },
  ] as const;

  const completedCount = parameters.filter(param => tracking[param.key]).length;
  const totalCount = parameters.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 border-b border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-gray-700">
            Information Collection Progress
          </div>
          <div className="text-xs text-gray-500">
            ({completedCount}/{totalCount} completed)
          </div>
        </div>
        <div className="text-sm font-bold text-blue-600">
          {progressPercentage}%
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Parameter Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {parameters.map((param) => {
          const isCollected = tracking[param.key];
          
          return (
            <div
              key={param.key}
              className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                isCollected
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              <span className="text-sm">{param.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">
                  {param.label}
                </div>
              </div>
              <div className="flex-shrink-0">
                {isCollected ? (
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Message */}
      <div className="mt-3 text-center">
        {progressPercentage === 100 ? (
          <div className="text-sm text-green-700 font-medium">
            ✅ All information collected! Ready to find your loan matches.
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            Keep answering questions to complete your profile and get personalized loan recommendations.
          </div>
        )}
      </div>
    </div>
  );
};