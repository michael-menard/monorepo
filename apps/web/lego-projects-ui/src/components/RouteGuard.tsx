import { useAppSelector } from '@/store';
import { Navigate, useLocation } from 'react-router-dom';

interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function RouteGuard({ children, requireAuth = false }: RouteGuardProps) {
  const { isAuthenticated, isInitialized } = useAppSelector(state => state.auth);
  const location = useLocation();

  // Show loading while auth state is being initialized
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If auth is required but user is not authenticated, redirect to login
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthenticated && location.pathname.startsWith('/auth')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
} 