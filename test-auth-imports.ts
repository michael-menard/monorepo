// Test file to verify auth package imports
import { 
  Login, 
  Signup, 
  ForgotPassword, 
  ResetPassword, 
  EmailVerification,
  Input,
  LoadingSpinner,
  PasswordStrength,
  FloatingShape,
  useAuth,
  authReducer,
  type User,
  type AuthState
} from '@repo/auth';

// Test that all imports work
console.log('Auth components imported successfully:', {
  Login: typeof Login,
  Signup: typeof Signup,
  ForgotPassword: typeof ForgotPassword,
  ResetPassword: typeof ResetPassword,
  EmailVerification: typeof EmailVerification,
  Input: typeof Input,
  LoadingSpinner: typeof LoadingSpinner,
  PasswordStrength: typeof PasswordStrength,
  FloatingShape: typeof FloatingShape,
  useAuth: typeof useAuth,
  authReducer: typeof authReducer
});

export {
  Login,
  Signup,
  ForgotPassword,
  ResetPassword,
  EmailVerification,
  Input,
  LoadingSpinner,
  PasswordStrength,
  FloatingShape,
  useAuth,
  authReducer,
  type User,
  type AuthState
}; 