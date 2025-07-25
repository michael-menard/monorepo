import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../store/store.js';
import { clearError, clearMessage } from '../store/authSlice.js';
import {
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectIsCheckingAuth,
  selectError,
  selectMessage,
} from '../store/authSlice.js';
import {
  useLoginMutation,
  useSignupMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useCheckAuthQuery,
  useResetPasswordMutation,
  useConfirmResetMutation,
} from '../store/authApi.js';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const isCheckingAuth = useSelector(selectIsCheckingAuth);
  const error = useSelector(selectError);
  const message = useSelector(selectMessage);

  // RTK Query hooks
  const [loginMutation, { isLoading: isLoginLoading }] = useLoginMutation();
  const [signupMutation, { isLoading: isSignupLoading }] = useSignupMutation();
  const [logoutMutation] = useLogoutMutation();
  const [verifyEmailMutation] = useVerifyEmailMutation();
  const [resetPasswordMutation] = useResetPasswordMutation();
  const [confirmResetMutation] = useConfirmResetMutation();
  const { isLoading: isCheckAuthLoading } = useCheckAuthQuery();

  return {
    // State
    user,
    isAuthenticated,
    isLoading: isLoading || isLoginLoading || isSignupLoading || isCheckAuthLoading,
    isCheckingAuth,
    error,
    message,
    
    // Actions
    signup: signupMutation,
    login: loginMutation,
    logout: logoutMutation,
    verifyEmail: verifyEmailMutation,
    checkAuth: () => {}, // This is handled by the query
    resetPassword: resetPasswordMutation,
    confirmReset: confirmResetMutation,
    clearError: () => dispatch(clearError(undefined)),
    clearMessage: () => dispatch(clearMessage(undefined)),
  };
}; 