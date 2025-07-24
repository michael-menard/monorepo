import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction, Slice } from '@reduxjs/toolkit';
import type { User, AuthState } from '../types/auth';

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  isCheckingAuth: true,
  error: null,
  message: null,
};

// Slice
export const authSlice: Slice<AuthState> = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.message = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    logoutSuccess: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setCheckingAuth: (state, action: PayloadAction<boolean>) => {
      state.isCheckingAuth = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setMessage: (state, action: PayloadAction<string | null>) => {
      state.message = action.payload;
    },
  },
});

export const {
  clearError,
  clearMessage,
  setUser,
  logoutSuccess,
  setLoading,
  setCheckingAuth,
  setError,
  setMessage,
} = authSlice.actions;

// Selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectIsCheckingAuth = (state: { auth: AuthState }) => state.auth.isCheckingAuth;
export const selectError = (state: { auth: AuthState }) => state.auth.error;
export const selectMessage = (state: { auth: AuthState }) => state.auth.message;

export default authSlice.reducer;