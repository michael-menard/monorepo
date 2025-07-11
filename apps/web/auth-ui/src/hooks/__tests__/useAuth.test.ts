import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../useAuth';

// Mock the API service
const mockApiService = {
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  resetPassword: vi.fn(),
  confirmReset: vi.fn(),
  handleError: vi.fn(),
  checkAuth: vi.fn(),
};

vi.mock('../../services/api', () => ({
  default: mockApiService,
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful auth check by default
    mockApiService.checkAuth.mockResolvedValue({
      data: {
        valid: true,
        user: { id: '1', email: 'test@example.com', name: 'Test User', createdAt: '2024-01-01T00:00:00.000Z' }
      }
    });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.tokens).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('initializes with existing user data from server', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', createdAt: '2024-01-01T00:00:00.000Z' };

    mockApiService.checkAuth.mockResolvedValue({
      data: {
        valid: true,
        user: mockUser
      }
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles login successfully', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', createdAt: '2024-01-01T00:00:00.000Z' };

    mockApiService.login.mockResolvedValue({
      data: {
        data: {
          user: mockUser,
        },
      },
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const loginResult = await result.current.login('test@example.com', 'password123');
      expect(loginResult).toEqual({ success: true });
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles login failure', async () => {
    const mockError = { response: { data: { message: 'Invalid credentials' } } };
    mockApiService.login.mockRejectedValue(mockError);
    mockApiService.handleError.mockReturnValue({ message: 'Invalid credentials' });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const loginResult = await result.current.login('test@example.com', 'wrongpassword');
      expect(loginResult).toEqual({ success: false, error: 'Invalid credentials' });
    });

    expect(result.current.user).toBeNull();
    expect(result.current.tokens).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('handles signup successfully', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User', createdAt: '2024-01-01T00:00:00.000Z' };

    mockApiService.signup.mockResolvedValue({
      data: {
        data: {
          user: mockUser,
        },
      },
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const signupResult = await result.current.signup('test@example.com', 'password123', 'Test User');
      expect(signupResult).toEqual({ success: true, user: mockUser });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles logout', async () => {
    mockApiService.logout.mockResolvedValue({});

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.tokens).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles password reset request', async () => {
    mockApiService.resetPassword.mockResolvedValue({});

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const resetResult = await result.current.resetPassword('test@example.com');
      expect(resetResult).toEqual({ success: true });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles password reset confirmation', async () => {
    mockApiService.confirmReset.mockResolvedValue({});

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      const confirmResult = await result.current.confirmReset('token123', 'newpassword123');
      expect(confirmResult).toEqual({ success: true });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('clears error when clearError is called', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('handles authentication check failure', async () => {
    mockApiService.checkAuth.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles authentication check with invalid token', async () => {
    mockApiService.checkAuth.mockResolvedValue({
      data: {
        valid: false,
        user: null
      }
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });
}); 