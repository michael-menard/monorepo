import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiService from '../api';

// Mock axios
const mockAxios = {
  create: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

vi.mock('axios', () => ({
  default: mockAxios,
}));

describe('ApiService', () => {
  let mockApiInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockApiInstance = {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };

    mockAxios.create.mockReturnValue(mockApiInstance);
  });

  it('creates axios instance with correct configuration', () => {
    // Re-import to trigger the constructor
    vi.resetModules();
    require('../api');

    expect(mockAxios.create).toHaveBeenCalledWith({
      baseURL: expect.any(String),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  it('sets up request interceptor', () => {
    vi.resetModules();
    require('../api');

    expect(mockApiInstance.interceptors.request.use).toHaveBeenCalled();
  });

  it('sets up response interceptor', () => {
    vi.resetModules();
    require('../api');

    expect(mockApiInstance.interceptors.response.use).toHaveBeenCalled();
  });

  it('calls health check endpoint', async () => {
    const mockResponse = { data: { status: 'ok' } };
    mockApiInstance.get.mockResolvedValue(mockResponse);

    const result = await apiService.healthCheck();

    expect(mockApiInstance.get).toHaveBeenCalledWith('/health');
    expect(result).toEqual(mockResponse);
  });

  it('calls signup endpoint with correct data', async () => {
    const mockResponse = { data: { success: true } };
    mockApiInstance.post.mockResolvedValue(mockResponse);

    const signupData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    const result = await apiService.signup(signupData);

    expect(mockApiInstance.post).toHaveBeenCalledWith('/signup', signupData);
    expect(result).toEqual(mockResponse);
  });

  it('calls login endpoint with correct data', async () => {
    const mockResponse = { data: { success: true } };
    mockApiInstance.post.mockResolvedValue(mockResponse);

    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const result = await apiService.login(loginData);

    expect(mockApiInstance.post).toHaveBeenCalledWith('/login', loginData);
    expect(result).toEqual(mockResponse);
  });

  it('calls refresh token endpoint with cookies', async () => {
    const mockResponse = { data: { success: true } };
    mockApiInstance.post.mockResolvedValue(mockResponse);

    const result = await apiService.refreshToken();

    expect(mockApiInstance.post).toHaveBeenCalledWith('/refresh', {});
    expect(result).toEqual(mockResponse);
  });

  it('calls logout endpoint', async () => {
    const mockResponse = { data: { success: true } };
    mockApiInstance.post.mockResolvedValue(mockResponse);

    const result = await apiService.logout();

    expect(mockApiInstance.post).toHaveBeenCalledWith('/logout');
    expect(result).toEqual(mockResponse);
  });

  it('calls reset password endpoint with correct data', async () => {
    const mockResponse = { data: { success: true } };
    mockApiInstance.post.mockResolvedValue(mockResponse);

    const resetData = {
      email: 'test@example.com',
    };

    const result = await apiService.resetPassword(resetData);

    expect(mockApiInstance.post).toHaveBeenCalledWith('/reset-password', resetData);
    expect(result).toEqual(mockResponse);
  });

  it('calls confirm reset endpoint with correct data', async () => {
    const mockResponse = { data: { success: true } };
    mockApiInstance.post.mockResolvedValue(mockResponse);

    const confirmData = {
      token: 'reset-token-123',
      newPassword: 'newpassword123',
    };

    const result = await apiService.confirmReset(confirmData);

    expect(mockApiInstance.post).toHaveBeenCalledWith('/confirm-reset', confirmData);
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