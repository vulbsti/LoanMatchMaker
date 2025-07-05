// Results View Component
// Displays loan match results with detailed information

import React, { useState } from 'react';
import { LenderCard } from './LenderCard';
import { MatchScore } from './MatchScore';
import { LenderMatch, ParameterTracking } from '../../types';

interface ResultsViewProps {
  matches: LenderMatch[];
  parameterProgress: ParameterTracking | null;
  onLenderSelect: (lender: LenderMatch) => void;
  onBackToChat: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  matches,
  parameterProgress,
  onLenderSelect,
  onBackToChat,
}) => {
  const [sortBy, setSortBy] = useState<'score' | 'rate' | 'processing'>('score');
  const [showComparison, setShowComparison] = useState(false);

  // Sort matches based on selected criteria
  const sortedMatches = [...matches].sort((a, b) => {
    switch (sortBy) {
      case 'rate':
        return a.interestRate - b.interestRate;
      case 'processing':
        return a.processingTimeDays - b.processingTimeDays;
      case 'score':
      default:
        return b.finalScore - a.finalScore;
    }
  });

  // Calculate statistics
  const averageScore = Math.round(matches.reduce((sum, match) => sum + match.finalScore, 0) / matches.length);
  const bestRate = Math.min(...matches.map(m => m.interestRate));
  const fastestProcessing = Math.min(...matches.map(m => m.processingTimeDays));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Loan Matches</h2>
            <p className="text-gray-600 mt-1">
              Found {matches.length} lender{matches.length !== 1 ? 's' : ''} that match your criteria
            </p>
          </div>
          <button
            onClick={onBackToChat}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Chat
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{averageScore}</div>
            <div className="text-sm text-blue-700">Average Match Score</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{bestRate}%</div>
            <div className="text-sm text-green-700">Best Interest Rate</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{fastestProcessing}</div>
            <div className="text-sm text-purple-700">Fastest Processing (days)</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Sort Controls */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="score">Match Score</option>
              <option value="rate">Interest Rate</option>
              <option value="processing">Processing Time</option>
            </select>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                showComparison
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showComparison ? '📋 List View' : '📊 Compare'}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {parameterProgress && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-green-800">Profile Complete!</div>
              <div className="text-sm text-green-700">
                Based on your {parameterProgress.completionPercentage}% complete profile
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {showComparison ? (
        /* Comparison Table View */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interest Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Processing Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedMatches.map((match, index) => (
                  <tr key={match.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{match.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <MatchScore score={match.finalScore} size="sm" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{match.interestRate}%</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{match.processingTimeDays} days</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => onLenderSelect(match)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        Apply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card List View */
        <div className="grid gap-6">
          {sortedMatches.map((match, index) => (
            <LenderCard
              key={match.id}
              lender={match}
              rank={index + 1}
              onSelect={onLenderSelect}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {matches.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Matches Found</h3>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            We couldn't find any lenders that match your criteria. Try adjusting your requirements or 
            continuing the conversation to provide more information.
          </p>
          <button
            onClick={onBackToChat}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue Conversation
          </button>
        </div>
      )}
    </div>
  );
};