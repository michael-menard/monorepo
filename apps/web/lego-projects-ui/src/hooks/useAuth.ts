import { useAuthState } from '@/store/hooks';
import { useAppDispatch } from '@/store/hooks';
import { useNavigate } from 'react-router-dom';
import { performLogout, forceLogout, updateLastActivity, getLastActivity } from '@/utils/authUtils';
import { useEffect } from 'react';

/**
 * Enhanced auth hook that provides auth state and actions
 */
export function useAuth() {
  const authState = useAuthState();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Update last activity on user interaction
  useEffect(() => {
    const handleUserActivity = () => {
      updateLastActivity();
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, []);

  const handleLogout = async () => {
    await performLogout(dispatch);
    navigate('/auth/login');
  };

  const handleForceLogout = async () => {
    await forceLogout();
    navigate('/auth/login');
  };

  return {
    // State
    ...authState,
    
    // Actions
    logout: handleLogout,
    forceLogout: handleForceLogout,
    
    // Utilities
    updateLastActivity,
    getLastActivity,
  };
}

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const { isAuthenticated } = useAuthState();
  return isAuthenticated;
}

/**
 * Hook to get current user
 */
export function useUser() {
  const { user } = useAuthState();
  return user;
}

/**
 * Hook to check if user is verified
 */
export function useIsVerified() {
  const { user } = useAuthState();
  return user ? (user.isVerified || user.emailVerified) : false;
}

/**
 * Hook to check if auth is loading
 */
export function useAuthLoading() {
  const { isLoading, isCheckingAuth } = useAuthState();
  return isLoading || isCheckingAuth;
}

/**
 * Hook to get auth error
 */
export function useAuthError() {
  const { error } = useAuthState();
  return error;
} 