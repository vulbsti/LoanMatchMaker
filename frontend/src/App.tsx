// Main App Component for Loan Advisor Chatbot
// Handles global state, routing, and app-level error boundaries

import React, { useState, useEffect, useCallback } from 'react';
import { ChatWindow } from './components/chat/ChatWindow';
import { ResultsView } from './components/results/ResultsView';
import { DocumentUpload } from './components/simulation/DocumentUpload';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { useSession } from './hooks/useSession';
import { useChat } from './hooks/useChat';
import {
  AppState,
  LenderMatch,
  // ApiError,
} from './types';
import './App.css';

const App: React.FC = () => {
  // Global app state
  const [appState, setAppState] = useState<AppState>({
    sessionId: null,
    isSessionActive: false,
    messages: [],
    parameterProgress: null,
    matchResults: null,
    currentView: 'chat',
    isLoading: false,
    error: null,
    selectedLender: null,
  });

  // Custom hooks for session and chat management
  const { sessionId, isActive, createSession, endSession, error: sessionError } = useSession();
  const {
    messages,
    sendMessage,
    isLoading: chatLoading,
    error: chatError,
    parameterProgress,
    matchResults,
    clearError,
  } = useChat(sessionId);

  // Initialize session on app load
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setAppState(prev => ({ ...prev, isLoading: true }));
        const newSessionId = await createSession();
        
        setAppState(prev => ({
          ...prev,
          sessionId: newSessionId,
          isSessionActive: true,
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setAppState(prev => ({
          ...prev,
          error: 'Failed to start application. Please refresh the page.',
          isLoading: false,
        }));
      }
    };

    initializeApp();
  }, [createSession]);

  // Update app state when hooks provide new data
  useEffect(() => {
    setAppState(prev => ({
      ...prev,
      sessionId,
      isSessionActive: isActive,
      messages,
      parameterProgress,
      matchResults,
      isLoading: chatLoading,
      error: sessionError?.message || chatError?.message || null,
    }));
  }, [sessionId, isActive, messages, parameterProgress, matchResults, chatLoading, sessionError, chatError]);

  // Auto-switch to results view when matches are available
  useEffect(() => {
    if (matchResults && matchResults.length > 0 && appState.currentView === 'chat') {
      handleViewChange('results');
    }
  }, [matchResults, appState.currentView]);

  // Event handlers
  const handleSendMessage = useCallback(async (message: string) => {
    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [sendMessage]);

  const handleViewChange = useCallback((view: AppState['currentView']) => {
    setAppState(prev => ({ ...prev, currentView: view }));
  }, []);

  const handleLenderSelect = useCallback((lender: LenderMatch) => {
    setAppState(prev => ({ ...prev, selectedLender: lender }));
    handleViewChange('documents');
  }, [handleViewChange]);

  const handleDocumentComplete = useCallback(() => {
    // Simulate successful application submission
    setAppState(prev => ({ ...prev, selectedLender: null }));
    handleViewChange('chat');
    
    // Send a completion message to the chat
    if (appState.selectedLender) {
      const completionMessage = `Great! Your application with ${appState.selectedLender.name} has been submitted successfully. You should hear back within ${appState.selectedLender.processingTimeDays} business days.`;
      handleSendMessage(completionMessage);
    }
  }, [appState.selectedLender, handleViewChange, handleSendMessage]);

  const handleDocumentClose = useCallback(() => {
    setAppState(prev => ({ ...prev, selectedLender: null }));
    handleViewChange('results');
  }, [handleViewChange]);

  const handleClearError = useCallback(() => {
    clearError();
    setAppState(prev => ({ ...prev, error: null }));
  }, [clearError]);

  const handleRestartSession = useCallback(async () => {
    try {
      setAppState(prev => ({ ...prev, isLoading: true }));
      
      if (sessionId) {
        await endSession();
      }
      
      const newSessionId = await createSession();
      
      setAppState(prev => ({
        ...prev,
        sessionId: newSessionId,
        isSessionActive: true,
        messages: [],
        parameterProgress: null,
        matchResults: null,
        currentView: 'chat',
        isLoading: false,
        error: null,
        selectedLender: null,
      }));
    } catch (error) {
      console.error('Failed to restart session:', error);
      setAppState(prev => ({
        ...prev,
        error: 'Failed to restart session. Please refresh the page.',
        isLoading: false,
      }));
    }
  }, [sessionId, endSession, createSession]);

  // Render error state
  if (appState.error && !appState.isSessionActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 text-xl font-semibold mb-4">
            Application Error
          </div>
          <p className="text-gray-600 mb-4">{appState.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Render loading state
  if (appState.isLoading && !appState.isSessionActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Starting Loan Advisor..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">LA</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Loan Advisor</h1>
                  <p className="text-sm text-gray-500">
                    {appState.isSessionActive ? 'Session Active' : 'Connecting...'}
                  </p>
                </div>
              </div>
              
              {/* View Navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleViewChange('chat')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    appState.currentView === 'chat'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Chat
                </button>
                {matchResults && (
                  <button
                    onClick={() => handleViewChange('results')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      appState.currentView === 'results'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Results ({matchResults.length})
                  </button>
                )}
                <button
                  onClick={handleRestartSession}
                  className="px-3 py-1 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Restart
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-6">
          {/* Error Banner */}
          {appState.error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-red-400">
                    ⚠️
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{appState.error}</p>
                  </div>
                </div>
                <button
                  onClick={handleClearError}
                  className="text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* View Rendering */}
          {appState.currentView === 'chat' && (
            <ChatWindow
              sessionId={appState.sessionId}
              messages={appState.messages}
              onSendMessage={handleSendMessage}
              parameterProgress={appState.parameterProgress}
              isLoading={appState.isLoading}
              onViewResults={() => handleViewChange('results')}
              hasResults={!!matchResults && matchResults.length > 0}
            />
          )}

          {appState.currentView === 'results' && matchResults && (
            <ResultsView
              matches={matchResults}
              parameterProgress={appState.parameterProgress}
              onLenderSelect={handleLenderSelect}
              onBackToChat={() => handleViewChange('chat')}
            />
          )}

          {appState.currentView === 'documents' && appState.selectedLender && (
            <DocumentUpload
              lender={appState.selectedLender}
              onComplete={handleDocumentComplete}
              onClose={handleDocumentClose}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-8">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                Powered by Gemini AI • Secure & Private
              </div>
              <div>
                Session: {appState.sessionId ? `...${appState.sessionId.slice(-8)}` : 'Not connected'}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;