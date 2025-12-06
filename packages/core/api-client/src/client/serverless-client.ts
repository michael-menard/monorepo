/**
 * Serverless API Client
 * Optimized HTTP client for serverless APIs with retry logic and error handling
 */

import { getServerlessApiConfig, type ServerlessApiConfig } from '../config/environments'
import { withRetry, type RetryConfig } from '../retry/retry-logic'
import { ServerlessApiError, handleServerlessError } from '../retry/error-handling'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retryConfig?: Partial<RetryConfig>
  skipRetry?: boolean
}

export interface ServerlessClientOptions {
  authToken?: string
  customHeaders?: Record<string, string>
  timeout?: number
  retryConfig?: Partial<RetryConfig>
}

/**
 * Serverless-optimized HTTP client
 */
export class ServerlessApiClient {
  private config: ServerlessApiConfig
  private authToken?: string
  private customHeaders: Record<string, string>
  private defaultTimeout: number
  private defaultRetryConfig: Partial<RetryConfig>

  constructor(options: ServerlessClientOptions = {}) {
    this.config = getServerlessApiConfig()
    this.authToken = options.authToken
    this.customHeaders = options.customHeaders || {}
    this.defaultTimeout = options.timeout || this.config.timeout
    this.defaultRetryConfig = options.retryConfig || {
      maxAttempts: this.config.retryAttempts,
      baseDelay: this.config.retryDelay,
      maxDelay: this.config.maxRetryDelay,
    }
  }

  /**
   * Update authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token
  }

  /**
   * Update custom headers
   */
  setCustomHeaders(headers: Record<string, string>): void {
    this.customHeaders = { ...this.customHeaders, ...headers }
  }

  /**
   * Build request headers
   */
  private buildHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...this.customHeaders,
      ...customHeaders,
    }

    // Add authentication header if token is available
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    return headers
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.defaultTimeout,
      retryConfig = this.defaultRetryConfig,
      skipRetry = false,
    } = options

    const url = `${this.config.baseUrl}${endpoint}`
    const requestHeaders = this.buildHeaders(headers)

    const makeRequest = async (): Promise<T> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw await ServerlessApiError.fromResponse(response)
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          return {} as T
        }

        return await response.json()
      } catch (error) {
        clearTimeout(timeoutId)
        throw handleServerlessError(error)
      }
    }

    // Use retry logic unless explicitly skipped
    if (skipRetry) {
      return await makeRequest()
    }

    return await withRetry(makeRequest, retryConfig)
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body })
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    options: Omit<RequestOptions, 'method'> = {},
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    body?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body })
  }

  /**
   * Health check endpoint for connection warming
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/api/v2/health', { skipRetry: true, timeout: 5000 })
  }

  /**
   * Get current configuration
   */
  getConfig(): ServerlessApiConfig {
    return { ...this.config }
  }
}
