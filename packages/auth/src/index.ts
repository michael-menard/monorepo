// Components
export { default as Input } from './components/Input/index.js';
export { Button } from './components/ui/button.js';
export { Card } from './components/ui/card.js';
export { Label } from './components/ui/label.js';
export { default as LoadingSpinner } from './components/LoadingSpinner/index.js';
export { default as PasswordStrength } from './components/PasswordStrength/index.js';
export { default as FloatingShape } from './components/FloatingShape/index.js';

// Auth Components
export { default as Login } from './components/Login/index.js';
export { default as LoginForm } from './components/LoginForm/index.js';
export { SignupForm as Signup } from './components/SignupForm/index.js';
export { SignupForm } from './components/SignupForm/index.js';
export { default as ForgotPasswordForm } from './components/ForgotPasswordForm/index.js';
export { default as ResetPasswordForm } from './components/ResetPasswordForm/index.js';
export { default as ConfirmResetPasswordForm } from './components/ConfirmResetPasswordForm/index.js';
export { default as EmailVerificationForm } from './components/EmailVerificationForm/index.js';
export { default as SocialLoginButtonGroup } from './components/SocialLoginButtonGroup/index.js';
export { default as RouteGuard } from './components/RouteGuard/index.js';
export {
  createTanStackRouteGuard,
  createTanStackRouteGuardWithRedux,
  type TanStackRouteGuardOptions,
} from './components/TanStackRouteGuard/index.js';

// Hooks
export { useAuth } from './hooks/useAuth.js';

// Store
export { default as authReducer } from './store/authSlice.js';
export { authApi } from './store/authApi.js';
export { initialState as authInitialState } from './store/authSlice.js';
export type { RootState } from './store/store.js';

// Types
export * from './types/index.js';

// Zod Schemas
export {
  SignupRequestSchema,
  LoginRequestSchema,
  ResetPasswordRequestSchema,
  ConfirmResetRequestSchema,
  VerifyEmailRequestSchema,
} from './types/auth.js';

// Utils
export * from './utils/date.js';
export { authStateManager } from './utils/authState.js';

export {
  useLoginMutation,
  useSignupMutation,
  useLogoutMutation,
  useRefreshMutation,
  useResetPasswordMutation,
  useConfirmResetMutation,
  useCheckAuthQuery,
  useVerifyEmailMutation,
  useSocialLoginMutation,
} from './store/authApi.js'; 