/**
 * API Client with Zod Validation
 * Provides type-safe API calls with runtime validation and error handling
 */
import { z } from 'zod'
import { config } from '@/config/env'
import { 
  ApiErrorSchema, 
  ApiSuccessSchema, 
  PaginatedResponseSchema
} from '@/types/schemas'

// =============================================================================
// API CLIENT CONFIGURATION
// =============================================================================

// Request configuration schema
const RequestConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  timeout: z.number().positive(),
  validateResponse: z.boolean(),
})

type RequestConfig = z.infer<typeof RequestConfigSchema>

// =============================================================================
// API ERROR CLASSES
// =============================================================================

export class ApiClientError extends Error {
  public readonly status: number
  public readonly code?: string
  public readonly details?: unknown
  public readonly timestamp: string

  constructor(error: z.infer<typeof ApiErrorSchema>) {
    super(error.message)
    this.name = 'ApiClientError'
    this.status = error.status
    this.code = error.code
    this.details = error.details
    this.timestamp = error.timestamp
  }
}

export class ValidationError extends Error {
  public readonly issues: z.ZodIssue[]

  constructor(error: z.ZodError) {
    super('Response validation failed')
    this.name = 'ValidationError'
    this.issues = error.issues
  }
}

export class NetworkError extends Error {
  public readonly cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)
    this.name = 'NetworkError'
    this.cause = cause
  }
}

// =============================================================================
// API CLIENT CLASS
// =============================================================================

class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || config.api.baseUrl).replace(/\/$/, '') // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  // Set authentication token
  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  // Remove authentication token
  clearAuthToken() {
    delete this.defaultHeaders['Authorization']
  }

  // Update base URL
  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  // Generic request method with validation
  async request<T extends z.ZodTypeAny>(
    endpoint: string,
    responseSchema: T,
    requestConfig: Partial<RequestConfig> = {}
  ): Promise<z.infer<T>> {
    // Validate and merge configuration
    const validConfig = RequestConfigSchema.parse({
      method: 'GET',
      timeout: config.api.timeout,
      validateResponse: true,
      ...requestConfig,
    })
    
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    
    // Create abort controller for timeout
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), validConfig.timeout)
    
    // Prepare request options
    const requestOptions: RequestInit = {
      method: validConfig.method,
      headers: {
        ...this.defaultHeaders,
        ...(validConfig.headers as Record<string, string>),
      },
      signal: abortController.signal,
    }

    // Add body for non-GET requests
    if (validConfig.body && validConfig.method !== 'GET') {
      requestOptions.body = JSON.stringify(validConfig.body)
    }

    try {
      // Make the request
      const response = await fetch(url, requestOptions)
      clearTimeout(timeoutId)
      
      // Parse response
      const responseData = await response.json()

      // Handle HTTP errors
      if (!response.ok) {
        // Try to parse as API error
        const errorParseResult = ApiErrorSchema.safeParse(responseData)
        if (errorParseResult.success) {
          throw new ApiClientError(errorParseResult.data)
        } else {
          // Fallback to generic error
          throw new ApiClientError({
            status: response.status,
            message: responseData.message || response.statusText || 'Unknown error',
            timestamp: new Date().toISOString(),
          })
        }
      }

      // Validate response if requested
      if (validConfig.validateResponse) {
        const parseResult = responseSchema.safeParse(responseData)
        if (!parseResult.success) {
          throw new ValidationError(parseResult.error)
        }
        return parseResult.data
      }

      return responseData as z.infer<T>
    } catch (error) {
      clearTimeout(timeoutId)
      
      // Handle network errors
      if (error instanceof TypeError || (error as Error).name === 'AbortError') {
        throw new NetworkError(
          (error as Error).name === 'AbortError' ? 'Request timeout' : 'Network error',
          error as Error
        )
      }

      // Re-throw known errors
      if (error instanceof ApiClientError || error instanceof ValidationError) {
        throw error
      }

      // Handle unknown errors
      throw new NetworkError('Unknown error occurred', error as Error)
    }
  }

  // Convenience methods for common HTTP verbs
  async get<T extends z.ZodTypeAny>(
    endpoint: string,
    responseSchema: T,
    requestConfig: Omit<Partial<RequestConfig>, 'method' | 'body'> = {}
  ) {
    return this.request(endpoint, responseSchema, { ...requestConfig, method: 'GET' })
  }

  async post<T extends z.ZodTypeAny>(
    endpoint: string,
    responseSchema: T,
    body?: unknown,
    requestConfig: Omit<Partial<RequestConfig>, 'method'> = {}
  ) {
    return this.request(endpoint, responseSchema, { ...requestConfig, method: 'POST', body })
  }

  async put<T extends z.ZodTypeAny>(
    endpoint: string,
    responseSchema: T,
    body?: unknown,
    requestConfig: Omit<Partial<RequestConfig>, 'method'> = {}
  ) {
    return this.request(endpoint, responseSchema, { ...requestConfig, method: 'PUT', body })
  }

  async patch<T extends z.ZodTypeAny>(
    endpoint: string,
    responseSchema: T,
    body?: unknown,
    requestConfig: Omit<Partial<RequestConfig>, 'method'> = {}
  ) {
    return this.request(endpoint, responseSchema, { ...requestConfig, method: 'PATCH', body })
  }

  async delete<T extends z.ZodTypeAny>(
    endpoint: string,
    responseSchema: T,
    requestConfig: Omit<Partial<RequestConfig>, 'method' | 'body'> = {}
  ) {
    return this.request(endpoint, responseSchema, { ...requestConfig, method: 'DELETE' })
  }

  // Helper methods for common response patterns
  async getSuccess<T extends z.ZodTypeAny>(
    endpoint: string,
    dataSchema: T,
    requestConfig: Omit<Partial<RequestConfig>, 'method' | 'body'> = {}
  ) {
    const responseSchema = ApiSuccessSchema(dataSchema)
    return this.get(endpoint, responseSchema, requestConfig)
  }

  async postSuccess<T extends z.ZodTypeAny>(
    endpoint: string,
    dataSchema: T,
    body?: unknown,
    requestConfig: Omit<Partial<RequestConfig>, 'method'> = {}
  ) {
    const responseSchema = ApiSuccessSchema(dataSchema)
    return this.post(endpoint, responseSchema, body, requestConfig)
  }

  async getPaginated<T extends z.ZodTypeAny>(
    endpoint: string,
    itemSchema: T,
    requestConfig: Omit<Partial<RequestConfig>, 'method' | 'body'> = {}
  ) {
    const responseSchema = ApiSuccessSchema(PaginatedResponseSchema(itemSchema))
    return this.get(endpoint, responseSchema, requestConfig)
  }

  // Raw request without validation (escape hatch)
  async requestRaw(
    endpoint: string,
    requestConfig: Partial<RequestConfig> = {}
  ): Promise<Response> {
    const validConfig = RequestConfigSchema.parse({
      method: 'GET',
      timeout: config.api.timeout,
      validateResponse: false,
      ...requestConfig,
    })
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    
    // Create abort controller for timeout
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), validConfig.timeout)
    
    const requestOptions: RequestInit = {
      method: validConfig.method,
      headers: {
        ...this.defaultHeaders,
        ...(validConfig.headers as Record<string, string>),
      },
      signal: abortController.signal,
    }

    if (validConfig.body && validConfig.method !== 'GET') {
      requestOptions.body = JSON.stringify(validConfig.body)
    }

    try {
      const response = await fetch(url, requestOptions)
      clearTimeout(timeoutId)
      return response
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof TypeError || (error as Error).name === 'AbortError') {
        throw new NetworkError(
          (error as Error).name === 'AbortError' ? 'Request timeout' : 'Network error',
          error as Error
        )
      }
      throw error
    }
  }
}

// =============================================================================
// API CLIENT INSTANCE
// =============================================================================

// Create and export the API client instance
export const apiClient = new ApiClient()

// =============================================================================
// AUTHENTICATION HELPERS
// =============================================================================

// Token management
export const tokenManager = {
  setToken: (token: string) => {
    apiClient.setAuthToken(token)
    localStorage.setItem(config.auth.tokenKey, token)
  },
  
  getToken: (): string | null => {
    return localStorage.getItem(config.auth.tokenKey)
  },
  
  clearToken: () => {
    apiClient.clearAuthToken()
    localStorage.removeItem(config.auth.tokenKey)
    localStorage.removeItem(config.auth.refreshTokenKey)
  },
  
  setRefreshToken: (refreshToken: string) => {
    localStorage.setItem(config.auth.refreshTokenKey, refreshToken)
  },
  
  getRefreshToken: (): string | null => {
    return localStorage.getItem(config.auth.refreshTokenKey)
  },
}

// Initialize token on startup
const savedToken = tokenManager.getToken()
if (savedToken) {
  apiClient.setAuthToken(savedToken)
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Type guard for API errors
export const isApiError = (error: unknown): error is ApiClientError => {
  return error instanceof ApiClientError
}

// Type guard for validation errors
export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError
}

// Type guard for network errors
export const isNetworkError = (error: unknown): error is NetworkError => {
  return error instanceof NetworkError
}

// Format error message for display
export const formatErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    return error.message
  }
  
  if (isValidationError(error)) {
    return 'Invalid response from server'
  }
  
  if (isNetworkError(error)) {
    return error.message
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return 'An unexpected error occurred'
}

// =============================================================================
// EXPORTS
// =============================================================================

export default apiClient
export { ApiClient }
export type { RequestConfig }
// Alias for backward compatibility
export { ApiClientError as ApiError } 