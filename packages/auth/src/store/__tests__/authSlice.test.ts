import { describe, it, expect } from 'vitest';
import authReducer, {
  clearError,
  clearMessage,
  setUser,
  logoutSuccess,
  setLoading,
  setCheckingAuth,
  setError,
  setMessage,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectIsCheckingAuth,
  selectError,
  selectMessage,
} from '../authSlice.js';
import type { User } from '../../types/auth.js';

describe('authSlice', () => {
  const initialState = {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    isCheckingAuth: true,
    error: null,
    message: null,
  };

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    emailVerified: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  it('should return the initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle clearError', () => {
    const stateWithError = { ...initialState, error: 'Some error' };
    const state = authReducer(stateWithError, clearError(undefined));
    expect(state.error).toBeNull();
  });

  it('should handle clearMessage', () => {
    const stateWithMessage = { ...initialState, message: 'Some message' };
    const state = authReducer(stateWithMessage, clearMessage(undefined));
    expect(state.message).toBeNull();
  });

  it('should handle setUser', () => {
    const state = authReducer(initialState, setUser(mockUser));
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it('should handle logoutSuccess', () => {
    const stateWithUser = { ...initialState, user: mockUser, isAuthenticated: true };
    const state = authReducer(stateWithUser, logoutSuccess(undefined));
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBeNull();
  });

  it('should handle setLoading', () => {
    const state = authReducer(initialState, setLoading(true));
    expect(state.isLoading).toBe(true);
  });

  it('should handle setCheckingAuth', () => {
    const state = authReducer(initialState, setCheckingAuth(false));
    expect(state.isCheckingAuth).toBe(false);
  });

  it('should handle setError', () => {
    const state = authReducer(initialState, setError('Test error'));
    expect(state.error).toBe('Test error');
  });

  it('should handle setMessage', () => {
    const state = authReducer(initialState, setMessage('Test message'));
    expect(state.message).toBe('Test message');
  });

  // Selector tests
  describe('selectors', () => {
    const mockState = {
      auth: {
        user: mockUser,
        tokens: null,
        isAuthenticated: true,
        isLoading: false,
        isCheckingAuth: false,
        error: null,
        message: 'Success',
      },
    };

    it('should select user', () => {
      expect(selectUser(mockState)).toEqual(mockUser);
    });

    it('should select isAuthenticated', () => {
      expect(selectIsAuthenticated(mockState)).toBe(true);
    });

    it('should select isLoading', () => {
      expect(selectIsLoading(mockState)).toBe(false);
    });

    it('should select isCheckingAuth', () => {
      expect(selectIsCheckingAuth(mockState)).toBe(false);
    });

    it('should select error', () => {
      expect(selectError(mockState)).toBeNull();
    });

    it('should select message', () => {
      expect(selectMessage(mockState)).toBe('Success');
    });
  });
}); 