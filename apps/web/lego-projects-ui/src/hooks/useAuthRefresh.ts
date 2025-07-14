import { useEffect, useCallback } from 'react';
import { useRefreshTokenMutation } from '@/services/authApi';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

export const useAuthRefresh = () => {
  const [refreshToken, { isLoading, error }] = useRefreshTokenMutation();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  const refreshAuth = useCallback(async () => {
    // Only attempt refresh if user appears to be authenticated
    if (!isAuthenticated) {
      return;
    }

    try {
      await refreshToken().unwrap();
      console.log('Token refreshed successfully');
    } catch (err) {
      console.error('Token refresh failed:', err);
      // Optionally redirect to login on refresh failure
      // window.location.href = '/auth/login';
    }
  }, [refreshToken, isAuthenticated]);

  // Auto-refresh on component mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshAuth();
    }
  }, [isAuthenticated, refreshAuth]);

  // Optional: Set up periodic refresh (every 10 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshAuth();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshAuth]);

  return {
    refreshAuth,
    isLoading,
    error,
  };
}; 