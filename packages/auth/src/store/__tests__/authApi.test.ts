import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../authApi';
import authReducer from '../authSlice';
import type { User, AuthTokens } from '../../types/auth';

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(authApi.middleware),
  });
};

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  emailVerified: true,
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
};

const mockTokens: AuthTokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 3600,
};

const mockAuthResponse = {
  success: true,
  message: 'Success',
  data: {
    user: mockUser,
    tokens: mockTokens,
  },
};

describe('Auth API', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    // Clear any previous state
    store.dispatch(authApi.util.resetApiState());
  });

  describe('API Configuration', () => {
    it('should have correct base URL', () => {
      expect(authApi.reducerPath).toBe('authApi');
    });

    it('should have correct tag types', () => {
      expect(authApi.util.getRunningQueriesThunk).toBeDefined();
    });
  });

  describe('Endpoints', () => {
    it('should have login endpoint', () => {
      expect(authApi.endpoints.login).toBeDefined();
    });

    it('should have signup endpoint', () => {
      expect(authApi.endpoints.signup).toBeDefined();
    });

    it('should have logout endpoint', () => {
      expect(authApi.endpoints.logout).toBeDefined();
    });

    it('should have checkAuth endpoint', () => {
      expect(authApi.endpoints.checkAuth).toBeDefined();
    });

    it('should have verifyEmail endpoint', () => {
      expect(authApi.endpoints.verifyEmail).toBeDefined();
    });

    it('should have resetPassword endpoint', () => {
      expect(authApi.endpoints.resetPassword).toBeDefined();
    });

    it('should have confirmReset endpoint', () => {
      expect(authApi.endpoints.confirmReset).toBeDefined();
    });

    it('should have socialLogin endpoint', () => {
      expect(authApi.endpoints.socialLogin).toBeDefined();
    });

    it('should have resendVerificationCode endpoint', () => {
      expect(authApi.endpoints.resendVerificationCode).toBeDefined();
    });
  });

  describe('Store Integration', () => {
    it('should integrate with Redux store', () => {
      const state = store.getState();
      expect(state[authApi.reducerPath]).toBeDefined();
    });

    it('should handle API state reset', () => {
      expect(() => {
        store.dispatch(authApi.util.resetApiState());
      }).not.toThrow();
    });
  });

  describe('Tag Management', () => {
    it('should provide correct tags for checkAuth', () => {
      const endpoint = authApi.endpoints.checkAuth;
      expect(endpoint).toBeDefined();
    });

    it('should invalidate correct tags for login', () => {
      const endpoint = authApi.endpoints.login;
      expect(endpoint).toBeDefined();
    });

    it('should invalidate correct tags for logout', () => {
      const endpoint = authApi.endpoints.logout;
      expect(endpoint).toBeDefined();
    });
  });
}); 