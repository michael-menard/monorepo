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
export { default as Signup } from './components/Signup/index.js';
export { default as ForgotPassword } from './components/ForgotPassword/index.js';
export { default as ResetPassword } from './components/ResetPassword/index.js';
export { default as EmailVerification } from './components/EmailVerification/index.js';

// Hooks
export { useAuth } from './hooks/useAuth.js';

// Store
export { default as authReducer } from './store/authSlice.js';
export { authApi } from './store/authApi.js';
export { initialState as authInitialState } from './store/authSlice.js';
export type { RootState } from './store/store.js';

// Types
export type { User, AuthState, AuthTokens, AuthResponse, AuthError, LoginRequest, SignupRequest, ResetPasswordRequest, ConfirmResetRequest } from './types/auth.js';

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