// Components
export { default as LoadingSpinner } from './components/LoadingSpinner';
export { default as Input } from './components/Input';
export { default as PasswordStrength } from './components/PasswordStrength';
export { default as FloatingShape } from './components/FloatingShape';
export { default as ProtectedRoute } from './components/ProtectedRoute';
export { default as RedirectAuthenticatedUser } from './components/RedirectAuthenticatedUser';
export { default as AuthLayout } from './components/AuthLayout';
export { default as AuthApp } from './components/AuthApp';

// Hooks
export { useAuth } from './hooks/useAuth';

// Pages
export { default as LoginPage } from './pages/Login';
export { default as SignUpPage } from './pages/SignUp';
export { default as ForgotPasswordPage } from './pages/ForgotPassword';
export { default as ResetPasswordPage } from './pages/ResetPassword';
export { default as EmailVerificationPage } from './pages/EmailVerification';
export { default as DashboardPage } from './pages/Dashboard';
export { default as HomePage } from './pages/Home';

// Store
export * from './store/authSlice';
export { store } from './store/store';
export type { RootState, AppDispatch } from './store/store';

// Export default apiService as authApi for compatibility
export { default as authApi } from './services/api';

// Utils
export * from './utils/date'; 