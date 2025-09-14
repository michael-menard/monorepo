// React Router specific components - only export components that use react-router-dom
export { default as Login } from './components/Login/index';
export { default as LoginForm } from './components/LoginForm/index';
export { SignupForm as Signup } from './components/SignupForm/index';
export { SignupForm } from './components/SignupForm/index';
export { default as ForgotPasswordForm } from './components/ForgotPasswordForm/index';
export { default as ResetPasswordForm } from './components/ResetPasswordForm/index';
export { default as ConfirmResetPasswordForm } from './components/ConfirmResetPasswordForm/index';
export { default as EmailVerificationForm } from './components/EmailVerificationForm/index';
export { default as RouteGuard } from './components/RouteGuard/index';

// Re-export everything from main index that doesn't depend on react-router
export { default as Input } from './components/Input/index';
export { Button } from './components/ui/button';
export { Card } from './components/ui/card';
export { Label } from './components/ui/label';
export { default as LoadingSpinner } from './components/LoadingSpinner/index';
export { default as PasswordStrength } from './components/PasswordStrength/index';
export { default as FloatingShape } from './components/FloatingShape/index';
export { default as SocialLoginButtonGroup } from './components/SocialLoginButtonGroup/index';

// Hooks
export { useAuth } from './hooks/useAuth';
export * from './hooks';

// Store
export { default as authReducer } from './store/authSlice';
export { authApi } from './store/authApi';
export { initialState as authInitialState } from './store/authSlice';
export type { RootState } from './store/store';

// Types
export * from './types';

// Zod Schemas
export {
  SignupRequestSchema,
  LoginRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
  ConfirmResetRequestSchema,
  VerifyEmailRequestSchema,
} from './types/auth';

// Utils
export * from './utils/date';

export {
  useLoginMutation,
  useSignupMutation,
  useLogoutMutation,
  useRefreshMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useConfirmResetMutation,
  useCheckAuthQuery,
  useVerifyEmailMutation,
  useResendVerificationCodeMutation,
  useFetchCSRFTokenQuery,
  useSocialLoginMutation,
} from './store/authApi';

// CSRF utilities
export {
  fetchCSRFToken,
  getCSRFToken,
  refreshCSRFToken,
  clearCSRFToken,
  hasCSRFToken,
  initializeCSRF,
  getCSRFHeaders,
  isCSRFError,
} from './utils/csrf';

// Token utilities
export {
  clearRefreshState,
  parseTokenPayload,
  isTokenExpired,
  getTokenExpiry,
  shouldRefreshToken,
  getTimeUntilExpiry,
  isTokenValid,
  getTokenSubject,
  getTokenIssuer,
  getTokenConfig,
  updateTokenConfig,
} from './utils/token';
