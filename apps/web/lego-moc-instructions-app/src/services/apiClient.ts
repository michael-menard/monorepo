// Centralized API client configuration for different environments
import { config, getApiUrl, getAuthUrl, isDevelopment } from '../config/environment.js'

/**
 * API Client Configuration
 * Adapts to different environments (development, staging, production)
 */
export class ApiClient {
  private static instance: ApiClient

  public readonly baseURL: string
  public readonly authURL: string
  public readonly timeout: number
  public readonly retryAttempts: number

  private constructor() {
    this.baseURL = config.api.baseUrl
    this.authURL = config.api.authUrl
    this.timeout = config.api.timeout
    this.retryAttempts = config.api.retryAttempts

    if (isDevelopment) {
      // API client configuration logging removed
    }
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient()
    }
    return ApiClient.instance
  }

  /**
   * Build full API URL for LEGO Projects API
   */
  public getLegoApiUrl(path: string = ''): string {
    return getApiUrl(path)
  }

  /**
   * Build full URL for Auth Service API
   */
  public getAuthApiUrl(path: string = ''): string {
    return getAuthUrl(path)
  }

  /**
   * Get default headers for API requests
   */
  public getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    // Add environment-specific headers
    if (!isDevelopment) {
      headers['X-Requested-With'] = 'XMLHttpRequest'
    }

    return headers
  }

  /**
   * Get fetch configuration for different environments
   */
  public getFetchConfig(): RequestInit {
    const baseConfig: RequestInit = {
      headers: this.getDefaultHeaders(),
      credentials: 'include', // Include cookies for auth
    }

    // Environment-specific configurations
    if (isDevelopment) {
      // Development: More lenient CORS, detailed errors
      return {
        ...baseConfig,
        mode: 'cors',
      }
    } else {
      // Production: Stricter security
      return {
        ...baseConfig,
        mode: 'cors',
        cache: 'no-cache',
      }
    }
  }
}

// Export singleton instance
export const apiClient = ApiClient.getInstance()

/**
 * API Endpoints Configuration
 * Centralized endpoint definitions that adapt to environment
 */
export const API_ENDPOINTS = {
  // Auth Service Endpoints
  auth: {
    login: () => apiClient.getAuthApiUrl('/login'),
    register: () => apiClient.getAuthApiUrl('/register'),
    logout: () => apiClient.getAuthApiUrl('/logout'),
    refresh: () => apiClient.getAuthApiUrl('/refresh'),
    profile: () => apiClient.getAuthApiUrl('/profile'),
    verify: (token: string) => apiClient.getAuthApiUrl(`/verify/${token}`),
    resetPassword: () => apiClient.getAuthApiUrl('/reset-password'),
    changePassword: () => apiClient.getAuthApiUrl('/change-password'),
  },

  // LEGO Projects API Endpoints
  lego: {
    // MOC Instructions
    mocs: {
      list: () => apiClient.getLegoApiUrl('/api/mocs'),
      create: () => apiClient.getLegoApiUrl('/api/mocs'),
      get: (id: string) => apiClient.getLegoApiUrl(`/api/mocs/${id}`),
      update: (id: string) => apiClient.getLegoApiUrl(`/api/mocs/${id}`),
      delete: (id: string) => apiClient.getLegoApiUrl(`/api/mocs/${id}`),
      upload: (id: string) => apiClient.getLegoApiUrl(`/api/mocs/${id}/files`),
    },

    // Sets
    sets: {
      list: () => apiClient.getLegoApiUrl('/api/sets'),
      get: (id: string) => apiClient.getLegoApiUrl(`/api/sets/${id}`),
      search: () => apiClient.getLegoApiUrl('/api/sets/search'),
    },

    // Instructions
    instructions: {
      list: () => apiClient.getLegoApiUrl('/api/instructions'),
      get: (id: string) => apiClient.getLegoApiUrl(`/api/instructions/${id}`),
      download: (id: string) => apiClient.getLegoApiUrl(`/api/instructions/${id}/download`),
    },

    // Search
    search: {
      global: () => apiClient.getLegoApiUrl('/api/search'),
      mocs: () => apiClient.getLegoApiUrl('/api/search/mocs'),
      sets: () => apiClient.getLegoApiUrl('/api/search/sets'),
    },

    // File Upload
    upload: {
      single: () => apiClient.getLegoApiUrl('/api/upload'),
      multiple: () => apiClient.getLegoApiUrl('/api/upload/multiple'),
      presigned: () => apiClient.getLegoApiUrl('/api/upload/presigned'),
    },

    // Wishlist
    wishlist: {
      list: () => apiClient.getLegoApiUrl('/api/wishlist'),
      add: () => apiClient.getLegoApiUrl('/api/wishlist'),
      remove: (id: string) => apiClient.getLegoApiUrl(`/api/wishlist/${id}`),
    },

    // Health Check
    health: () => apiClient.getLegoApiUrl('/health'),
  },
} as const

/**
 * Utility function to handle API errors consistently
 */
export const handleApiError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string') {
    return new Error(error)
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message))
  }

  return new Error('An unknown API error occurred')
}

/**
 * Retry configuration for different environments
 */
export const getRetryConfig = () => {
  return {
    attempts: apiClient.retryAttempts,
    delay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    retryCondition: (error: any) => {
      // Retry on network errors and 5xx server errors
      if (!error.response) return true // Network error
      if (error.response.status >= 500) return true // Server error
      if (error.response.status === 429) return true // Rate limit
      return false
    },
  }
}

/**
 * Environment-specific request interceptor
 */
export const requestInterceptor = (config: RequestInit): RequestInit => {
  // Add environment-specific request modifications
  if (isDevelopment && config.headers) {
    // Add development headers
    ;(config.headers as Record<string, string>)['X-Development'] = 'true'
  }

  return config
}

/**
 * Environment-specific response interceptor
 */
export const responseInterceptor = (response: Response): Response => {
  // Log responses in development
  if (isDevelopment && config.api.enableLogging) {
  }

  return response
}

// Export types for TypeScript
export type ApiEndpoints = typeof API_ENDPOINTS
export type LegoApiEndpoints = typeof API_ENDPOINTS.lego
export type AuthApiEndpoints = typeof API_ENDPOINTS.auth
