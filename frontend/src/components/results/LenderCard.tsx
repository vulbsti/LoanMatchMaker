// Lender Card Component
// Displays individual lender information with match details

import React, { useState } from 'react';
import { MatchScore } from './MatchScore';
import { LenderMatch } from '../../types';

interface LenderCardProps {
  lender: LenderMatch;
  rank?: number;
  onSelect: (lender: LenderMatch) => void;
}

export const LenderCard: React.FC<LenderCardProps> = ({
  lender,
  rank,
  onSelect,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Format loan amount range
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get badge for top performers
  const getBadge = () => {
    if (rank === 1) return { text: 'Best Match', color: 'bg-green-100 text-green-800' };
    if (lender.interestRate === Math.min(...[lender.interestRate])) {
      return { text: 'Lowest Rate', color: 'bg-blue-100 text-blue-800' };
    }
    if (lender.processingTimeDays <= 3) {
      return { text: 'Fast Processing', color: 'bg-purple-100 text-purple-800' };
    }
    return null;
  };

  const badge = getBadge();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {rank && (
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                  #{rank}
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-900">{lender.name}</h3>
              {badge && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                  {badge.text}
                </span>
              )}
            </div>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {lender.interestRate}%
                </div>
                <div className="text-sm text-gray-600">Interest Rate</div>
              </div>
              
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatAmount(lender.minLoanAmount)} - {formatAmount(lender.maxLoanAmount)}
                </div>
                <div className="text-sm text-gray-600">Loan Range</div>
              </div>
              
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {lender.processingTimeDays} days
                </div>
                <div className="text-sm text-gray-600">Processing Time</div>
              </div>
              
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatAmount(lender.minIncome)}+
                </div>
                <div className="text-sm text-gray-600">Min Income</div>
              </div>
            </div>
          </div>

          {/* Match Score */}
          <div className="ml-6">
            <MatchScore score={lender.finalScore} size="lg" label="Match Score" />
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className={`text-lg font-bold ${getScoreColor(lender.eligibilityScore)}`}>
              {lender.eligibilityScore}
            </div>
            <div className="text-xs text-gray-600">Eligibility</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${getScoreColor(lender.affordabilityScore)}`}>
              {lender.affordabilityScore}
            </div>
            <div className="text-xs text-gray-600">Affordability</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${getScoreColor(lender.specializationScore)}`}>
              {lender.specializationScore}
            </div>
            <div className="text-xs text-gray-600">Specialization</div>
          </div>
        </div>

        {/* Why This Match */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Why this is a good match:</h4>
          <div className="space-y-1">
            {lender.reasons.slice(0, 3).map((reason, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-2 h-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>{reason}</span>
              </div>
            ))}
            {lender.reasons.length > 3 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                {showDetails ? 'Show less' : `+${lender.reasons.length - 3} more reasons`}
              </button>
            )}
          </div>
        </div>

        {/* Additional Reasons (Expandable) */}
        {showDetails && lender.reasons.length > 3 && (
          <div className="mb-4 space-y-1">
            {lender.reasons.slice(3).map((reason, index) => (
              <div key={index + 3} className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-2 h-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Features */}
        {lender.features && lender.features.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Features:</h4>
            <div className="flex flex-wrap gap-2">
              {lender.features.map((feature, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Special Eligibility */}
        {lender.specialEligibility && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-1">Special Eligibility:</div>
            <div className="text-sm text-blue-700">{lender.specialEligibility}</div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Credit Score Required: {lender.minCreditScore}+
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm"
          >
            {showDetails ? 'Less Details' : 'More Details'}
          </button>
          <button
            onClick={() => onSelect(lender)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Application
          </button>
        </div>
      </div>
    </div>
  );
};