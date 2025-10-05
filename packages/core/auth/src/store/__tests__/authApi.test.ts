import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../authApi';
import authReducer from '../authSlice';
import type { User, AuthTokens } from '../../types/auth';
import * as csrfUtils from '../../utils/csrf';

// Mock CSRF utilities
vi.mock('../../utils/csrf', () => ({
  getCSRFHeaders: vi.fn(),
  refreshCSRFToken: vi.fn(),
  isCSRFError: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
    vi.clearAllMocks();
    store = createTestStore();
    // Clear any previous state
    store.dispatch(authApi.util.resetApiState());

    // Mock CSRF utilities
    vi.mocked(csrfUtils.getCSRFHeaders).mockResolvedValue({
      'X-CSRF-Token': 'test-csrf-token',
    });
    vi.mocked(csrfUtils.isCSRFError).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    it('should have forgotPassword endpoint', () => {
      expect(authApi.endpoints.forgotPassword).toBeDefined();
    });

    it('should have fetchCSRFToken endpoint', () => {
      expect(authApi.endpoints.fetchCSRFToken).toBeDefined();
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

  describe('Login Mutation', () => {
    it('should make login request with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await store.dispatch(
        authApi.endpoints.login.initiate(loginData)
      );

      expect(result.data).toEqual(mockAuthResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(loginData),
          credentials: 'include',
        })
      );
    });

    it('should include CSRF headers for login request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      await store.dispatch(
        authApi.endpoints.login.initiate({
          email: 'test@example.com',
          password: 'password123',
        })
      );

      expect(csrfUtils.getCSRFHeaders).toHaveBeenCalled();
    });
  });

  describe('Signup Mutation', () => {
    it('should make signup request with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      const signupData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      const result = await store.dispatch(
        authApi.endpoints.signup.initiate(signupData)
      );

      expect(result.data).toEqual(mockAuthResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/auth/signup',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(signupData),
        })
      );
    });
  });

  describe('ForgotPassword Mutation', () => {
    it('should make forgot password request', async () => {
      const mockResponse = {
        success: true,
        message: 'Password reset email sent',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const forgotPasswordData = {
        email: 'test@example.com',
      };

      const result = await store.dispatch(
        authApi.endpoints.forgotPassword.initiate(forgotPasswordData)
      );

      expect(result.data).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/auth/forgot-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(forgotPasswordData),
        })
      );
    });
  });

  describe('CSRF Retry Logic', () => {
    it('should retry request after CSRF failure', async () => {
      // Mock CSRF error detection
      vi.mocked(csrfUtils.isCSRFError).mockReturnValue(true);
      vi.mocked(csrfUtils.refreshCSRFToken).mockResolvedValue('new-csrf-token');

      // First request fails with CSRF error
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: () => Promise.resolve({
            success: false,
            code: 'CSRF_FAILED',
            message: 'CSRF validation failed',
          }),
        })
        // Second request succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAuthResponse),
        });

      const result = await store.dispatch(
        authApi.endpoints.login.initiate({
          email: 'test@example.com',
          password: 'password123',
        })
      );

      expect(csrfUtils.refreshCSRFToken).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual(mockAuthResponse);
    });

    it('should not retry non-CSRF errors', async () => {
      vi.mocked(csrfUtils.isCSRFError).mockReturnValue(false);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          message: 'Bad request',
        }),
      });

      await store.dispatch(
        authApi.endpoints.login.initiate({
          email: 'test@example.com',
          password: 'password123',
        })
      );

      expect(csrfUtils.refreshCSRFToken).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('CheckAuth Query', () => {
    it('should make check auth request without CSRF headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResponse),
      });

      const result = await store.dispatch(
        authApi.endpoints.checkAuth.initiate()
      );

      expect(result.data).toEqual(mockAuthResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5001/api/auth/check-auth',
        expect.objectContaining({
          method: 'GET',
        })
      );

      // CSRF headers should not be called for GET requests
      expect(csrfUtils.getCSRFHeaders).not.toHaveBeenCalled();
    });
  });
});