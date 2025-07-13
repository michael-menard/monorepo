import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import {
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectIsCheckingAuth,
  selectError,
  selectMessage,
  signup,
  login,
  logout,
  verifyEmail,
  checkAuth,
  forgotPassword,
  resetPassword,
  clearError,
  clearMessage,
} from '../store/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);
  const isCheckingAuth = useSelector(selectIsCheckingAuth);
  const error = useSelector(selectError);
  const message = useSelector(selectMessage);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    isCheckingAuth,
    error,
    message,
    
    // Actions
    signup: (email: string, password: string, name: string) => 
      dispatch(signup({ email, password, name })),
    login: (email: string, password: string) => 
      dispatch(login({ email, password })),
    logout: () => dispatch(logout()),
    verifyEmail: (code: string) => 
      dispatch(verifyEmail({ code })),
    checkAuth: () => dispatch(checkAuth()),
    forgotPassword: (email: string) => 
      dispatch(forgotPassword({ email })),
    resetPassword: (token: string, password: string) => 
      dispatch(resetPassword({ token, password })),
    clearError: () => dispatch(clearError(undefined)),
    clearMessage: () => dispatch(clearMessage(undefined)),
  };
}; 