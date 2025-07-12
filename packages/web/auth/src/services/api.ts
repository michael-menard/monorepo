import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  LoginRequest, 
  SignupRequest, 
  ResetPasswordRequest, 
  ConfirmResetRequest,
  AuthResponse,
  AuthError 
} from '../types/auth';

export class ApiService {
  private api: AxiosInstance;

  constructor(apiInstance?: AxiosInstance) {
    this.api = apiInstance || axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'https://your-api-id.execute-api.region.amazonaws.com/dev/auth',
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Enable sending cookies with requests
    });

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh the token using the refresh token cookie
            const response = await this.refreshToken();
            // If refresh successful, retry the original request
            return this.api(originalRequest);
          } catch (refreshError) {
            // Refresh token failed, redirect to login
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Health check
  async healthCheck(): Promise<AxiosResponse> {
    return this.api.get('/health');
  }

  // User registration
  async signup(data: SignupRequest): Promise<AxiosResponse<AuthResponse>> {
    return this.api.post('/signup', data);
  }

  // User login
  async login(data: LoginRequest): Promise<AxiosResponse<AuthResponse>> {
    return this.api.post('/login', data);
  }

  // Token refresh (no longer needs refresh token parameter)
  async refreshToken(): Promise<AxiosResponse<AuthResponse>> {
    return this.api.post('/refresh');
  }

  // User logout
  async logout(): Promise<AxiosResponse> {
    return this.api.post('/logout');
  }

  // Password reset request
  async resetPassword(data: ResetPasswordRequest): Promise<AxiosResponse> {
    return this.api.post('/reset-password', data);
  }

  // Password reset confirmation
  async confirmReset(data: ConfirmResetRequest): Promise<AxiosResponse> {
    return this.api.post('/confirm-reset', data);
  }

  // Helper method to handle API errors
  handleError(error: any): AuthError {
    if (error.response?.data) {
      return error.response.data;
    }
    
    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
    };
  }
}

export function createApiService(apiInstance?: AxiosInstance) {
  return new ApiService(apiInstance);
} 