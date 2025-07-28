import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectIsCheckingAuth, setCheckingAuth } from '../../store/authSlice.js';
import { refreshToken } from '../../utils/token.js';

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
  const isCheckingAuth = useSelector(selectIsCheckingAuth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get user and authentication state from Redux store
  const user = useSelector((state: any) => state.auth.user);
  const isAuthenticated = useSelector((state: any) => state.auth.isAuthenticated);

  useEffect(() => {
    // Update checking auth state when auth check completes
    if (!isCheckingAuth) {
      dispatch(setCheckingAuth(false));
    }
  }, [isCheckingAuth, dispatch]);

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
        console.error('Token refresh failed:');
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
  }, [isAuthenticated, user, isRefreshing, navigate, redirectTo]);

  // Handle navigation effects
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(redirectTo, { replace: true });
      return;
    }

    // Check email verification if required
    if (requireVerified && user && !user.emailVerified) {
      navigate('/verify-email', { replace: true });
      return;
    }

    // Check role-based access
    if (requiredRole && user?.role !== requiredRole) {
      navigate(unauthorizedTo, { replace: true });
      return;
    }
  }, [isAuthenticated, user, requireVerified, requiredRole, redirectTo, unauthorizedTo, navigate]);

  // Show loading while checking auth
  if (isCheckingAuth) {
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

  // Render children if authenticated and meets requirements
  if (
    isAuthenticated &&
    (!requireVerified || !user || user.emailVerified) &&
    (!requiredRole || user?.role === requiredRole)
  ) {
    return <>{children}</>;
  }

  // Don't render children if not authenticated or doesn't meet requirements
  return null;
};

export default RouteGuard; 