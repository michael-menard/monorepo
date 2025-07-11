import { useState, useEffect, useCallback } from 'react';
import { User, AuthTokens, AuthState } from '../types/auth';
import apiService from '../services/api';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Try to make a request to a protected endpoint to check if user is authenticated
        // This will automatically use the HTTP-only cookies
        const response = await apiService.healthCheck();
        
        // If we get here, the user is authenticated (cookies are valid)
        // We'll need to get user info from a separate endpoint or store it in memory
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          isLoading: false,
        }));
      } catch (error) {
        // User is not authenticated
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: false,
          isLoading: false,
        }));
      }
    };

    checkAuthStatus();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiService.login({ email, password });
      const { user } = response.data.data;

      // Tokens are now stored in HTTP-only cookies, not localStorage
      setAuthState({
        user,
        tokens: null, // We don't store tokens in memory anymore
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error: any) {
      const errorData = apiService.handleError(error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorData.message,
      }));
      return { success: false, error: errorData.message };
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiService.signup({ email, password, name });
      const { user } = response.data.data;

      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
      }));

      return { success: true, user };
    } catch (error: any) {
      const errorData = apiService.handleError(error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorData.message,
      }));
      return { success: false, error: errorData.message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear auth state - cookies are cleared by the server
      setAuthState({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await apiService.resetPassword({ email });
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: true };
    } catch (error: any) {
      const errorData = apiService.handleError(error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorData.message,
      }));
      return { success: false, error: errorData.message };
    }
  }, []);

  const confirmReset = useCallback(async (token: string, newPassword: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await apiService.confirmReset({ token, newPassword });
      setAuthState(prev => ({ ...prev, isLoading: false }));
      return { success: true };
    } catch (error: any) {
      const errorData = apiService.handleError(error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorData.message,
      }));
      return { success: false, error: errorData.message };
    }
  }, []);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...authState,
    login,
    signup,
    logout,
    resetPassword,
    confirmReset,
    clearError,
  };
}; 