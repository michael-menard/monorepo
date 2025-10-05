// React Router specific components - only export components that use react-router-dom
// Note: Login component removed - use LoginForm instead
export { default as LoginForm } from './components/LoginForm/index';
export { SignupForm as Signup } from './components/SignupForm/index';
export { SignupForm } from './components/SignupForm/index';
export { default as ForgotPasswordForm } from './components/ForgotPasswordForm/index';
export { default as ResetPasswordForm } from './components/ResetPasswordForm/index';
export { default as ConfirmResetPasswordForm } from './components/ConfirmResetPasswordForm/index';
export { default as EmailVerificationForm } from './components/EmailVerificationForm/index';
// Note: RouteGuard component removed - use TanStackRouteGuard instead

// Re-export everything from main index that doesn't depend on react-router
// Note: Input, Button, Card, Label, LoadingSpinner now imported from @repo/ui
export { default as PasswordStrength } from './components/PasswordStrength/index';
export { default as FloatingShape } from './components/FloatingShape/index';
export { default as SocialLoginButtonGroup } from './components/SocialLoginButtonGroup/index';

// Hooks
export { useAuth } from './hooks/useAuth';

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

// Enhanced Schemas (from schemas directory)
export {
  UserSchema,
  AuthResponseSchema,
  LoginSchema,
  SignupSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  type LoginFormData,
  type SignupFormData,
} from './schemas';

// Utils
export * from './utils/date';
export { cn } from './lib/utils';

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
