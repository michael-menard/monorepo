import { useAuthState } from '@/store/hooks';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireVerified?: boolean;
  requireAdmin?: boolean; // For future use when backend supports roles
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requireVerified = true,
  requireAdmin = false,
  redirectTo
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isCheckingAuth, isLoading } = useAuthState();
  const location = useLocation();

  // Show loading while checking auth status or during auth operations
  if (isCheckingAuth || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If auth is not required, render children directly
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    const loginPath = redirectTo || '/auth/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Check if user exists (should exist if authenticated)
  if (!user) {
    console.error('User is authenticated but user object is null');
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check if user is verified (if verification is required)
  if (requireVerified) {
    const isVerified = user.isVerified || user.emailVerified;
    
    if (!isVerified) {
      return <Navigate to="/auth/email-verification" state={{ from: location, email: user.email }} replace />;
    }
  }

  // Check admin role (for future use)
  if (requireAdmin) {
    // TODO: Implement when backend supports roles
    // For now, we'll assume no admin users exist
    const isAdmin = false; // user.role === 'ADMIN';
    
    if (!isAdmin) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
            <p className="text-gray-400 mb-4">You don't have permission to access this page.</p>
            <button 
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // User is authenticated and meets all requirements - render protected content
  return <>{children}</>;
} 