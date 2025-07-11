import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppSelector } from '@/store/hooks';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAppSelector((state) => state.user);
  
  if (!isAuthenticated) {
    // Redirect to login page with the current location as the return URL
    return <Navigate to="/auth/login" replace state={{ from: window.location.pathname }} />;
  }
  
  return <>{children}</>;
} 