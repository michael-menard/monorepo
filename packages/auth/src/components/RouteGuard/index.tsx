import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectIsAuthenticated, selectUser, selectIsCheckingAuth, setCheckingAuth, setUser } from '../../store/authSlice.js';
import { useCheckAuthQuery } from '../../store/authApi.js';
import { isTokenExpired, refreshToken, shouldRefreshToken, getTokenExpiry } from '../../utils/token.js';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
  unauthorizedTo?: string;
  requireVerified?: boolean;
}

const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requiredRole,
  redirectTo = '/login',
  unauthorizedTo = '/unauthorized',
  requireVerified = false,
}) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const isCheckingAuth = useSelector(selectIsCheckingAuth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use RTK Query to check auth status
  const { data: authData, isLoading: isCheckingAuthQuery, error } = useCheckAuthQuery(undefined, {
    skip: isAuthenticated, // Skip if already authenticated
  });

  useEffect(() => {
    // Update auth state based on RTK Query result
    if (authData?.data?.user) {
      dispatch(setUser(authData.data.user));
      dispatch(setCheckingAuth(false));
    } else if (error) {
      dispatch(setCheckingAuth(false));
    }
  }, [authData, error, dispatch]);

  useEffect(() => {
    // Automatic token refresh logic - only run once when user is authenticated
    const handleTokenRefresh = async () => {
      if (!isAuthenticated || isRefreshing) return;

      try {
        setIsRefreshing(true);
        // Attempt to refresh token silently
        await refreshToken();
        // Token was refreshed successfully
        console.log('Token refreshed successfully');
      } catch (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, redirect to login
        navigate(redirectTo, { replace: true });
      } finally {
        setIsRefreshing(false);
      }
    };

    // Only attempt refresh if user is authenticated and we haven't refreshed yet
    if (isAuthenticated && user && !isRefreshing) {
      handleTokenRefresh();
    }
  }, [isAuthenticated, user]); // Remove isRefreshing and navigate from dependencies to prevent loops

  // Show loading while checking auth
  if (isCheckingAuth || isCheckingAuthQuery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div 
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
          role="status"
          aria-label="Loading authentication status"
        />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    navigate(redirectTo, { replace: true });
    return null;
  }

  // Check email verification if required
  if (requireVerified && user && !user.emailVerified) {
    navigate('/verify-email', { replace: true });
    return null;
  }

  // Check role-based access
  if (requiredRole && user?.role !== requiredRole) {
    navigate(unauthorizedTo, { replace: true });
    return null;
  }

  return <>{children}</>;
};

export default RouteGuard; 