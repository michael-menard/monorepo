import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import AuthLayout from '../AuthLayout';
import ProtectedRoute from '../ProtectedRoute';
import RedirectAuthenticatedUser from '../RedirectAuthenticatedUser';
import LoadingSpinner from '../LoadingSpinner';

// Import pages
import LoginPage from '../../pages/Login';
import SignUpPage from '../../pages/SignUp';
import EmailVerificationPage from '../../pages/EmailVerification';
import DashboardPage from '../../pages/Dashboard';
import ForgotPasswordPage from '../../pages/ForgotPassword';
import ResetPasswordPage from '../../pages/ResetPassword';

interface AuthAppProps {
  onAuthCheck?: () => void;
}

export default function AuthApp({ onAuthCheck }: AuthAppProps) {
  const { isCheckingAuth, checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
    onAuthCheck?.();
  }, [checkAuth, onAuthCheck]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <AuthLayout>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <RedirectAuthenticatedUser>
              <SignUpPage />
            </RedirectAuthenticatedUser>
          }
        />
        <Route
          path="/login"
          element={
            <RedirectAuthenticatedUser>
              <LoginPage />
            </RedirectAuthenticatedUser>
          }
        />
        <Route path="/verify-email" element={<EmailVerificationPage />} />
        <Route
          path="/forgot-password"
          element={
            <RedirectAuthenticatedUser>
              <ForgotPasswordPage />
            </RedirectAuthenticatedUser>
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            <RedirectAuthenticatedUser>
              <ResetPasswordPage />
            </RedirectAuthenticatedUser>
          }
        />
        {/* catch all routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </AuthLayout>
  );
} 