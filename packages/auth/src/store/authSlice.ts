import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction, Slice } from '@reduxjs/toolkit';

// Simplified auth state - only UI-specific state
interface AuthState {
  isCheckingAuth: boolean;
  lastActivity: number | null;
  sessionTimeout: number;
  message: string | null;
}

const initialState: AuthState = {
  isCheckingAuth: true,
  lastActivity: null,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes in milliseconds
  message: null,
};

// Async thunks
export const updateLastActivity = createAsyncThunk('auth/updateLastActivity', async () => {
  return Date.now();
});

export const checkSessionTimeout = createAsyncThunk('auth/checkSessionTimeout', async (_, { getState }) => {
  const state = getState() as { auth: AuthState };
  const { lastActivity, sessionTimeout } = state.auth;

  if (lastActivity && sessionTimeout) {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivity;

    if (timeSinceLastActivity > sessionTimeout) {
      throw new Error('Session expired');
    }
  }

  return Date.now();
});

// Slice
export const authSlice: Slice<AuthState> = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearMessage: (state) => {
      state.message = null;
    },
    setCheckingAuth: (state, action: PayloadAction<boolean>) => {
      state.isCheckingAuth = action.payload;
    },
    setMessage: (state, action: PayloadAction<string | null>) => {
      state.message = action.payload;
    },
    updateSessionTimeout: (state, action: PayloadAction<number>) => {
      state.sessionTimeout = action.payload;
    },
    resetAuthState: () => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateLastActivity.fulfilled, (state, action) => {
        state.lastActivity = action.payload;
      })
      .addCase(checkSessionTimeout.fulfilled, (state, action) => {
        state.lastActivity = action.payload;
      })
      .addCase(checkSessionTimeout.rejected, (state) => {
        state.lastActivity = null;
        state.message = 'Session expired';
      });
  },
});

export const {
  clearMessage,
  setCheckingAuth,
  setMessage,
  updateSessionTimeout,
  resetAuthState,
} = authSlice.actions;

export { initialState };

// Selectors
export const selectIsCheckingAuth = (state: { auth: AuthState }) => state.auth.isCheckingAuth;
export const selectMessage = (state: { auth: AuthState }) => state.auth.message;
export const selectLastActivity = (state: { auth: AuthState }) => state.auth.lastActivity;
export const selectSessionTimeout = (state: { auth: AuthState }) => state.auth.sessionTimeout;

// Computed selectors
export const selectIsSessionExpired = (state: { auth: AuthState }) => {
  const { lastActivity, sessionTimeout } = state.auth;
  if (!lastActivity || !sessionTimeout) return false;
  
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivity;
  return timeSinceLastActivity > sessionTimeout;
};

export const selectTimeUntilSessionExpiry = (state: { auth: AuthState }) => {
  const { lastActivity, sessionTimeout } = state.auth;
  if (!lastActivity || !sessionTimeout) return null;
  
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivity;
  const timeRemaining = sessionTimeout - timeSinceLastActivity;
  
  return timeRemaining > 0 ? timeRemaining : 0;
};

export default authSlice.reducer;