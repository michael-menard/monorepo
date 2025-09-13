import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../store/store.js';
import { clearMessage, setCheckingAuth } from '../store/authSlice.js';
import {
  selectIsCheckingAuth,
  selectMessage,
  selectLastActivity,
  selectSessionTimeout,
} from '../store/authSlice.js';
import {
  useLoginMutation,
  useSignupMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useResendVerificationCodeMutation,
  useCheckAuthQuery,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useConfirmResetMutation,
  useSocialLoginMutation,
} from '../store/authApi.js';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Get auth data from RTK Query cache
  const { data: authData, isLoading: isCheckAuthLoading, error: checkAuthError } = useCheckAuthQuery();
  const user = authData?.data?.user || null;
  const tokens = authData?.data?.tokens || null;
  const isAuthenticated = !!user;

  // Auth slice state (UI-specific)
  const isCheckingAuth = useSelector(selectIsCheckingAuth);
  const message = useSelector(selectMessage);
  const lastActivity = useSelector(selectLastActivity);
  const sessionTimeout = useSelector(selectSessionTimeout);

  // RTK Query hooks
  const [loginMutation, { isLoading: isLoginLoading, error: loginError }] = useLoginMutation();
  const [signupMutation, { isLoading: isSignupLoading, error: signupError }] = useSignupMutation();
  const [logoutMutation, { isLoading: isLogoutLoading }] = useLogoutMutation();
  const [verifyEmailMutation, { isLoading: isVerifyLoading, error: verifyError }] = useVerifyEmailMutation();
  const [resendVerificationCodeMutation, { isLoading: isResendLoading }] = useResendVerificationCodeMutation();
  const [forgotPasswordMutation, { isLoading: isForgotLoading, error: forgotError }] = useForgotPasswordMutation();
  const [resetPasswordMutation, { isLoading: isResetLoading, error: resetError }] = useResetPasswordMutation();
  const [confirmResetMutation, { isLoading: isConfirmLoading, error: confirmError }] = useConfirmResetMutation();
  const [socialLoginMutation, { isLoading: isSocialLoading, error: socialError }] = useSocialLoginMutation();

  // Combine all loading states
  const isLoading = isCheckAuthLoading || isLoginLoading || isSignupLoading || isLogoutLoading ||
    isVerifyLoading || isResendLoading || isForgotLoading || isResetLoading || isConfirmLoading ||
    isSocialLoading;

  // Combine all errors (RTK Query errors take precedence)
  const error = loginError || signupError || verifyError || forgotError || resetError ||
    confirmError || socialError || checkAuthError;

  // Update checking auth state when checkAuth query completes
  React.useEffect(() => {
    if (!isCheckAuthLoading) {
      dispatch(setCheckingAuth(false));
    }
  }, [isCheckAuthLoading, dispatch]);

  return {
    // State from RTK Query
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    
    // State from auth slice (UI-specific)
    isCheckingAuth,
    message,
    lastActivity,
    sessionTimeout,
    
    // Actions
    signup: signupMutation,
    login: loginMutation,
    logout: logoutMutation,
    verifyEmail: verifyEmailMutation,
    resendVerificationCode: resendVerificationCodeMutation,
    checkAuth: () => {}, // This is handled by the query
    forgotPassword: forgotPasswordMutation,
    resetPassword: resetPasswordMutation,
    confirmReset: confirmResetMutation,
    socialLogin: socialLoginMutation,
    clearMessage: () => dispatch(clearMessage(undefined)),
  };
}; 