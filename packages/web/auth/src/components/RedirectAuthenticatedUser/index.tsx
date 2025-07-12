import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface RedirectAuthenticatedUserProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function RedirectAuthenticatedUser({ 
  children, 
  redirectTo = '/' 
}: RedirectAuthenticatedUserProps) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user?.isVerified) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
} 