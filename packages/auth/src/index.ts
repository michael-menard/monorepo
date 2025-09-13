// Components (router-agnostic)
export { default as Input } from './components/Input/index';
export { Button } from './components/ui/button';
export { Card } from './components/ui/card';
export { Label } from './components/ui/label';
export { default as LoadingSpinner } from './components/LoadingSpinner/index';
export { default as PasswordStrength } from './components/PasswordStrength/index';
export { default as FloatingShape } from './components/FloatingShape/index';
export { default as SocialLoginButtonGroup } from './components/SocialLoginButtonGroup/index';

// TanStack Router Components (default)
export {
  createTanStackRouteGuard,
  type TanStackRouteGuardOptions,
} from './components/TanStackRouteGuard/index';

// Note: For React Router components, import from '@repo/auth/react-router'

// Hooks
export { useAuth } from './hooks/useAuth';
export * from './hooks';

// Store
export { default as authReducer, authSlice } from './store/authSlice';
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
