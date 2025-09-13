import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useAuth } from '../useAuth';
import { authApi } from '../../store/authApi';
import authReducer from '../../store/authSlice';
import type { ReactNode } from 'react';

// Mock the auth API
vi.mock('../../store/authApi', () => ({
  authApi: {
    reducer: vi.fn(),
    middleware: vi.fn(() => (next: any) => (action: any) => next(action)),
    reducerPath: 'authApi',
  },
  useLoginMutation: vi.fn(),
  useSignupMutation: vi.fn(),
  useLogoutMutation: vi.fn(),
  useVerifyEmailMutation: vi.fn(),
  useResendVerificationCodeMutation: vi.fn(),
  useCheckAuthQuery: vi.fn(),
  useForgotPasswordMutation: vi.fn(),
  useResetPasswordMutation: vi.fn(),
  useConfirmResetMutation: vi.fn(),
  useSocialLoginMutation: vi.fn(),
}));

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

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useAuth Hook', () => {
  let store: ReturnType<typeof createTestStore>;
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createTestStore();
    wrapper = createWrapper(store);
  });

  it('should provide auth state and actions', () => {
    // Mock the hook implementations
    const mockLoginMutation = vi.fn();
    const mockSignupMutation = vi.fn();
    const mockLogoutMutation = vi.fn();

    vi.mocked(require('../../store/authApi').useLoginMutation).mockReturnValue([
      mockLoginMutation,
      { isLoading: false, error: null },
    ]);

    vi.mocked(require('../../store/authApi').useSignupMutation).mockReturnValue([
      mockSignupMutation,
      { isLoading: false, error: null },
    ]);

    vi.mocked(require('../../store/authApi').useLogoutMutation).mockReturnValue([
      mockLogoutMutation,
      { isLoading: false },
    ]);

    vi.mocked(require('../../store/authApi').useCheckAuthQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    vi.mocked(require('../../store/authApi').useVerifyEmailMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);

    vi.mocked(require('../../store/authApi').useResendVerificationCodeMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ]);

    vi.mocked(require('../../store/authApi').useForgotPasswordMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);

    vi.mocked(require('../../store/authApi').useResetPasswordMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);

    vi.mocked(require('../../store/authApi').useConfirmResetMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);

    vi.mocked(require('../../store/authApi').useSocialLoginMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('isAuthenticated');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('login');
    expect(result.current).toHaveProperty('signup');
    expect(result.current).toHaveProperty('logout');
    expect(result.current).toHaveProperty('forgotPassword');
    expect(result.current).toHaveProperty('resetPassword');
    expect(result.current).toHaveProperty('verifyEmail');
    expect(result.current).toHaveProperty('resendVerificationCode');
    expect(result.current).toHaveProperty('confirmReset');
    expect(result.current).toHaveProperty('socialLogin');
    expect(result.current).toHaveProperty('clearMessage');
  });

  it('should return authenticated state when user exists', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      emailVerified: true,
      createdAt: '2023-01-01',
      updatedAt: '2023-01-01',
    };

    vi.mocked(require('../../store/authApi').useCheckAuthQuery).mockReturnValue({
      data: {
        data: {
          user: mockUser,
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: 3600,
          },
        },
      },
      isLoading: false,
      error: null,
    });

    // Mock other hooks
    vi.mocked(require('../../store/authApi').useLoginMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useSignupMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useLogoutMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ]);
    vi.mocked(require('../../store/authApi').useVerifyEmailMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useResendVerificationCodeMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ]);
    vi.mocked(require('../../store/authApi').useForgotPasswordMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useResetPasswordMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useConfirmResetMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useSocialLoginMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should return unauthenticated state when no user', () => {
    vi.mocked(require('../../store/authApi').useCheckAuthQuery).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    // Mock other hooks
    vi.mocked(require('../../store/authApi').useLoginMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useSignupMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useLogoutMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ]);
    vi.mocked(require('../../store/authApi').useVerifyEmailMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useResendVerificationCodeMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ]);
    vi.mocked(require('../../store/authApi').useForgotPasswordMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useResetPasswordMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useConfirmResetMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useSocialLoginMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should combine loading states correctly', () => {
    vi.mocked(require('../../store/authApi').useCheckAuthQuery).mockReturnValue({
      data: null,
      isLoading: true, // checkAuth is loading
      error: null,
    });

    vi.mocked(require('../../store/authApi').useLoginMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useSignupMutation).mockReturnValue([
      vi.fn(),
      { isLoading: true, error: null }, // signup is loading
    ]);
    vi.mocked(require('../../store/authApi').useLogoutMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ]);
    vi.mocked(require('../../store/authApi').useVerifyEmailMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useResendVerificationCodeMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ]);
    vi.mocked(require('../../store/authApi').useForgotPasswordMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useResetPasswordMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useConfirmResetMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);
    vi.mocked(require('../../store/authApi').useSocialLoginMutation).mockReturnValue([
      vi.fn(),
      { isLoading: false, error: null },
    ]);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });
});
