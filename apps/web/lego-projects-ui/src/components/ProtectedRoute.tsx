import { useAuthState } from '@/store/hooks';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean; // Optional: require email verification
}

export function ProtectedRoute({ children, requireVerification = true }: ProtectedRouteProps) {
  const { isAuthenticated, user, isCheckingAuth } = useAuthState();
  const location = useLocation();

  // Show loading while checking auth status
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Check if user is verified (if verification is required)
  if (requireVerification && user) {
    const isVerified = user.isVerified || user.emailVerified;
    
    if (!isVerified) {
      return <Navigate to="/auth/email-verification" state={{ from: location }} replace />;
    }
  }

  // User is authenticated and verified (if required) - render protected content
  return <>{children}</>;
} 