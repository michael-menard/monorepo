import { describe, it, expect } from 'vitest';
import reducer, {
  clearError,
  clearMessage,
  setUser,
  logoutSuccess,
  signup,
  login,
  logout,
  verifyEmail,
  checkAuth,
  forgotPassword,
  resetPassword,
} from '../authSlice';

const initialState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  isCheckingAuth: true,
  error: null,
  message: null,
};

const fullUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test',
  createdAt: '',
  updatedAt: '',
  role: 'user',
};

describe('authSlice', () => {
  it('should return the initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('should handle clearError', () => {
    const state = { ...initialState, error: 'Some error' };
    expect(reducer(state, clearError(state))).toEqual({ ...state, error: null });
  });

  it('should handle clearMessage', () => {
    const state = { ...initialState, message: 'Some message' };
    expect(reducer(state, clearMessage(state))).toEqual({ ...state, message: null });
  });

  it('should handle setUser', () => {
    const state = reducer(initialState, setUser(fullUser));
    expect(state.user).toEqual(fullUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should handle logoutSuccess', () => {
    const state = { ...initialState, user: fullUser, isAuthenticated: true, error: 'err' };
    const newState = reducer(state, logoutSuccess(state));
    expect(newState.user).toBeNull();
    expect(newState.isAuthenticated).toBe(false);
    expect(newState.error).toBeNull();
  });

  it('should handle signup.pending', () => {
    const state = reducer(initialState, { type: signup.pending.type });
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should handle signup.fulfilled', () => {
    const state = reducer(initialState, { type: signup.fulfilled.type, payload: { user: fullUser } });
    expect(state.isLoading).toBe(false);
    expect(state.user).toEqual(fullUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.error).toBeNull();
  });

  it('should handle signup.rejected', () => {
    const state = reducer(initialState, { type: signup.rejected.type, error: { message: 'Signup error' } });
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Signup error');
  });

  // Repeat similar tests for login, logout, verifyEmail, checkAuth, forgotPassword, resetPassword thunks
  // For brevity, only signup is shown in full detail here
}); 