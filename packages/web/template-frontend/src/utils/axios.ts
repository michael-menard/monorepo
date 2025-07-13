import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// CSRF token management
class CSRFManager {
  private token: string | null = null;

  getToken(): string | null {
    if (!this.token) {
      // Try to get token from meta tag
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      this.token = metaTag?.getAttribute('content') || null;
    }
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
  }
}

// Security headers configuration
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Create secure axios instance
const createSecureAxiosInstance = (baseURL?: string): AxiosInstance => {
  const csrfManager = new CSRFManager();
  
  const instance = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      ...securityHeaders,
    },
  });

  // Request interceptor for CSRF token
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = csrfManager.getToken();
      if (token) {
        config.headers = config.headers || {};
        config.headers['X-CSRF-Token'] = token;
      }
      
      // Add security headers to all requests
      Object.assign(config.headers, securityHeaders);

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // Update CSRF token if provided in response
      const newToken = response.headers['x-csrf-token'];
      if (newToken) {
        csrfManager.setToken(newToken);
      }
      return response;
    },
    (error) => {
      // Handle CSRF token expiration
      if (error.response?.status === 419) {
        csrfManager.clearToken();
        // Optionally redirect to login or refresh page
        window.location.reload();
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Export default secure instance
export const secureAxios = createSecureAxiosInstance();

// Export factory function for custom instances
export const createAxiosInstance = createSecureAxiosInstance;

// Export CSRF manager for manual token management
export { CSRFManager };

// Export types
export type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse }; 