// Custom hook for session management
// Handles session creation, tracking, and cleanup

import { useState, useCallback, useRef } from 'react';
import { apiService } from '../services/api';
import { UseSessionReturn, ApiError } from '../types';

export const useSession = (): UseSessionReturn => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const createSession = useCallback(async (): Promise<string> => {
    try {
      setError(null);
      console.log('[Session] Creating new session...');
      
      const response = await apiService.createSession();
      
      if (response.success && response.data) {
        const newSessionId = response.data.sessionId;
        setSessionId(newSessionId);
        setIsActive(true);
        
        // Set session timeout (23 hours - just before server timeout)
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
        }
        
        sessionTimeoutRef.current = setTimeout(() => {
          console.log('[Session] Session expired due to timeout');
          setIsActive(false);
          setSessionId(null);
        }, 23 * 60 * 60 * 1000); // 23 hours
        
        console.log('[Session] Session created successfully:', newSessionId);
        return newSessionId;
      } else {
        throw new Error(response.error || 'Failed to create session');
      }
    } catch (err) {
      const error = err as ApiError;
      console.error('[Session] Failed to create session:', error);
      setError(error);
      setIsActive(false);
      setSessionId(null);
      throw error;
    }
  }, []);

  const endSession = useCallback(async (): Promise<void> => {
    if (!sessionId) {
      console.log('[Session] No active session to end');
      return;
    }

    try {
      setError(null);
      console.log('[Session] Ending session:', sessionId);
      
      await apiService.endSession(sessionId);
      
      setSessionId(null);
      setIsActive(false);
      
      // Clear timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
      
      console.log('[Session] Session ended successfully');
    } catch (err) {
      const error = err as ApiError;
      console.error('[Session] Failed to end session:', error);
      setError(error);
      
      // Still mark as inactive locally even if server call failed
      setSessionId(null);
      setIsActive(false);
      
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }
    }
  }, [sessionId]);

  const validateSession = useCallback(async (): Promise<boolean> => {
    if (!sessionId) {
      return false;
    }

    try {
      // Try to get parameter status as a session validation check
      await apiService.getParameterStatus(sessionId);
      return true;
    } catch (err) {
      const error = err as ApiError;
      console.error('[Session] Session validation failed:', error);
      
      // If session is invalid, mark as inactive
      if (error.status === 404 || error.status === 401) {
        setIsActive(false);
        setSessionId(null);
        
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
      }
      
      return false;
    }
  }, [sessionId]);

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
  }, []);

  return {
    sessionId,
    isActive,
    createSession,
    endSession,
    error,
    validateSession,
    cleanup,
  };
};