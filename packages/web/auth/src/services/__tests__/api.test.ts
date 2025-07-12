import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiService } from '../api';

// Shared mock instance
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

let apiService: ReturnType<typeof createApiService>;

describe('ApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mock methods
    Object.entries(mockAxiosInstance).forEach(([key, val]) => {
      if (typeof val === 'object' && val !== null) {
        Object.values(val).forEach((fn) => {
          if (typeof fn === 'function' && (fn as any).mockClear) (fn as any).mockClear();
        });
      } else if (typeof val === 'function' && val.mockClear) {
        val.mockClear();
      }
    });
    apiService = createApiService(mockAxiosInstance as any);
  });

  it('sets up response interceptor', () => {
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
  });

  it('calls health check endpoint', async () => {
    const mockResponse = { data: { status: 'ok' } };
    mockAxiosInstance.get.mockResolvedValue(mockResponse);

    const result = await apiService.healthCheck();

    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
    expect(result).toEqual(mockResponse);
  });

  it('calls signup endpoint with correct data', async () => {
    const mockResponse = { data: { success: true } };
    mockAxiosInstance.post.mockResolvedValue(mockResponse);

    const signupData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    const result = await apiService.signup(signupData);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/signup', signupData);
    expect(result).toEqual(mockResponse);
  });

  it('calls login endpoint with correct data', async () => {
    const mockResponse = { data: { success: true } };
    mockAxiosInstance.post.mockResolvedValue(mockResponse);

    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const result = await apiService.login(loginData);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/login', loginData);
    expect(result).toEqual(mockResponse);
  });

  it('calls refresh token endpoint with cookies', async () => {
    const mockResponse = { data: { success: true } };
    mockAxiosInstance.post.mockResolvedValue(mockResponse);

    const result = await apiService.refreshToken();

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/refresh');
    expect(result).toEqual(mockResponse);
  });

  it('calls logout endpoint', async () => {
    const mockResponse = { data: { success: true } };
    mockAxiosInstance.post.mockResolvedValue(mockResponse);

    const result = await apiService.logout();

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/logout');
    expect(result).toEqual(mockResponse);
  });

  it('calls reset password endpoint with correct data', async () => {
    const mockResponse = { data: { success: true } };
    mockAxiosInstance.post.mockResolvedValue(mockResponse);

    const resetData = {
      email: 'test@example.com',
    };

    const result = await apiService.resetPassword(resetData);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/reset-password', resetData);
    expect(result).toEqual(mockResponse);
  });

  it('calls confirm reset endpoint with correct data', async () => {
    const mockResponse = { data: { success: true } };
    mockAxiosInstance.post.mockResolvedValue(mockResponse);

    const confirmData = {
      token: 'reset-token-123',
      newPassword: 'newpassword123',
    };

    const result = await apiService.confirmReset(confirmData);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/confirm-reset', confirmData);
    expect(result).toEqual(mockResponse);
  });

  it('handles API errors with response data', () => {
    const mockError = {
      response: {
        data: {
          success: false,
          message: 'Invalid credentials',
          errors: [
            { field: 'email', message: 'Email is required' },
          ],
        },
      },
    };

    const result = apiService.handleError(mockError);

    expect(result).toEqual({
      success: false,
      message: 'Invalid credentials',
      errors: [
        { field: 'email', message: 'Email is required' },
      ],
    });
  });

  it('handles API errors without response data', () => {
    const mockError = {
      message: 'Network error',
    };

    const result = apiService.handleError(mockError);

    expect(result).toEqual({
      success: false,
      message: 'Network error',
    });
  });

  it('handles API errors with no message', () => {
    const mockError = {};

    const result = apiService.handleError(mockError);

    expect(result).toEqual({
      success: false,
      message: 'An unexpected error occurred',
    });
  });
}); 