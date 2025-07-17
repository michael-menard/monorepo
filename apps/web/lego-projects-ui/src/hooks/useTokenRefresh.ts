import { useEffect, useRef } from 'react';
import { useRefreshTokenMutation } from '@/services/authApi';
import { useAuthState } from '@/store/hooks';

interface UseTokenRefreshOptions {
  refreshThreshold?: number; // milliseconds before expiry to refresh
  enabled?: boolean;
}

export function useTokenRefresh(options: UseTokenRefreshOptions = {}) {
  const { refreshThreshold = 5 * 60 * 1000, enabled = true } = options; // 5 minutes default
  const { isAuthenticated, tokens } = useAuthState();
  const [refreshToken, { isLoading: isRefreshing }] = useRefreshTokenMutation();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Only set up refresh if enabled and user is authenticated
    if (!enabled || !isAuthenticated || !tokens) {
      return;
    }

    // For now, we'll implement a simple refresh mechanism
    // TODO: Implement proper token expiry checking when backend provides expiry info
    const refreshInterval = setInterval(() => {
      console.log('Refreshing token');
      refreshToken().catch(console.error);
    }, refreshThreshold);

    // Cleanup function
    return () => {
      clearInterval(refreshInterval);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isAuthenticated, tokens, refreshThreshold, enabled, refreshToken]);

  return {
    isRefreshing,
    refreshToken: () => refreshToken().catch(console.error),
  };
} 