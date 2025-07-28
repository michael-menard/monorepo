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

  describe('Login Mutation', () => {
    it('should handle successful login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock the API response
      const mockResponse = { data: mockAuthResponse };
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.login.initiate(loginData)
      );

      expect(result.data).toEqual(mockAuthResponse);
      expect(result.isSuccess).toBe(true);
    });

    it('should handle login error', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Mock the API error response
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(
        new Error('Invalid credentials')
      );

      const result = await store.dispatch(
        authApi.endpoints.login.initiate(loginData)
      );

      expect(result.error).toBeDefined();
      expect(result.isError).toBe(true);
    });
  });

  describe('Signup Mutation', () => {
    it('should handle successful signup', async () => {
      const signupData = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockResponse = { data: mockAuthResponse };
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.signup.initiate(signupData)
      );

      expect(result.data).toEqual(mockAuthResponse);
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Logout Mutation', () => {
    it('should handle successful logout', async () => {
      // Set initial auth state
      store.dispatch(authApi.util.upsertQueryData('checkAuth', undefined, mockAuthResponse));

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.logout.initiate()
      );

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Check Auth Query', () => {
    it('should handle successful auth check', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockAuthResponse }),
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.checkAuth.initiate()
      );

      expect(result.data).toEqual(mockAuthResponse);
      expect(result.isSuccess).toBe(true);
    });

    it('should handle failed auth check', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(
        new Error('Unauthorized')
      );

      const result = await store.dispatch(
        authApi.endpoints.checkAuth.initiate()
      );

      expect(result.error).toBeDefined();
      expect(result.isError).toBe(true);
    });
  });

  describe('Verify Email Mutation', () => {
    it('should handle successful email verification', async () => {
      const verifyData = {
        code: '123456',
      };

      const mockResponse = { data: mockAuthResponse };
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.verifyEmail.initiate(verifyData)
      );

      expect(result.data).toEqual(mockAuthResponse);
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Reset Password Mutation', () => {
    it('should handle successful password reset request', async () => {
      const resetData = {
        email: 'test@example.com',
      };

      const mockResponse = { data: { success: true, message: 'Reset email sent' } };
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.resetPassword.initiate(resetData)
      );

      expect(result.data).toEqual(mockResponse.data);
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Confirm Reset Mutation', () => {
    it('should handle successful password reset confirmation', async () => {
      const confirmData = {
        token: 'reset-token',
        newPassword: 'newpassword123',
      };

      const mockResponse = { data: { success: true, message: 'Password updated' } };
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.confirmReset.initiate(confirmData)
      );

      expect(result.data).toEqual(mockResponse.data);
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Social Login Mutation', () => {
    it('should handle successful social login', async () => {
      const socialData = {
        provider: 'google' as const,
      };

      const mockResponse = { data: mockAuthResponse };
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.socialLogin.initiate(socialData)
      );

      expect(result.data).toEqual(mockAuthResponse);
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Resend Verification Code Mutation', () => {
    it('should handle successful resend verification', async () => {
      const mockResponse = { data: { success: true, message: 'Verification code sent' } };
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.resendVerificationCode.initiate()
      );

      expect(result.data).toEqual(mockResponse.data);
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate auth cache on logout', async () => {
      // Set up some cached data
      store.dispatch(authApi.util.upsertQueryData('checkAuth', undefined, mockAuthResponse));

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await store.dispatch(authApi.endpoints.logout.initiate());

      // Check that auth cache is invalidated
      const authState = store.getState()[authApi.reducerPath];
      expect(authState.queries).toEqual({});
    });

    it('should provide tags for checkAuth query', () => {
      const checkAuthEndpoint = authApi.endpoints.checkAuth;
      expect(checkAuthEndpoint.providesTags).toEqual(['Auth', 'User']);
    });

    it('should invalidate tags on login', () => {
      const loginEndpoint = authApi.endpoints.login;
      expect(loginEndpoint.invalidatesTags).toEqual(['Auth', 'User']);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await store.dispatch(
        authApi.endpoints.login.initiate({
          email: 'test@example.com',
          password: 'password123',
        })
      );

      expect(result.error).toBeDefined();
      expect(result.isError).toBe(true);
    });

    it('should handle HTTP error responses', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Invalid credentials' }),
      } as Response);

      const result = await store.dispatch(
        authApi.endpoints.login.initiate({
          email: 'test@example.com',
          password: 'password123',
        })
      );

      expect(result.error).toBeDefined();
      expect(result.isError).toBe(true);
    });
  });
}); 