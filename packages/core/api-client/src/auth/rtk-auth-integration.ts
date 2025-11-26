/**
 * Enhanced RTK Query Authentication Integration
 * Provides authentication-aware base queries and middleware for RTK Query
 */

import { createLogger } from '@repo/logger'
import { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { getAuthToken, validateAuthentication, getAuthMiddleware } from './auth-middleware'
import { withRetry } from '../retry/retry-logic'
import { performanceMonitor } from '../lib/performance'

const logger = createLogger('api-client:rtk-auth')

export interface AuthenticatedBaseQueryConfig {
  baseUrl: string
  enableRetryLogic?: boolean
  enablePerformanceMonitoring?: boolean
  enableAuthCaching?: boolean
  skipAuthForEndpoints?: string[]
  requireAuthForEndpoints?: string[]
  onAuthFailure?: (error: FetchBaseQueryError) => void
  onTokenRefresh?: (newToken: string) => void
}

/**
 * Create an authenticated base query for RTK Query with enhanced features
 */
export function createAuthenticatedBaseQuery(
  config: AuthenticatedBaseQueryConfig
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  const {
    baseUrl,
    enableRetryLogic = true,
    enablePerformanceMonitoring = true,
    enableAuthCaching = true,
    skipAuthForEndpoints = [],
    requireAuthForEndpoints = [],
    onAuthFailure,
    onTokenRefresh,
  } = config

  // Create base query
  const baseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: async (headers, { endpoint, getState }) => {
      const startTime = enablePerformanceMonitoring ? performance.now() : 0

      try {
        // Check if this endpoint needs authentication
        const needsAuth = shouldAddAuth(endpoint, skipAuthForEndpoints, requireAuthForEndpoints)
        
        if (needsAuth) {
          logger.debug('Adding authentication to request', undefined, { endpoint })
          
          // Get auth token with caching
          const token = await getAuthToken()
          
          if (token) {
            headers.set('Authorization', `Bearer ${token}`)
            
            if (onTokenRefresh) {
              onTokenRefresh(token)
            }
            
            logger.debug('Authentication header added', undefined, { endpoint, hasToken: true })
          } else {
            logger.warn('No authentication token available for protected endpoint', undefined, { endpoint })
          }
        }

        // Add common headers
        headers.set('Content-Type', 'application/json')
        headers.set('X-Client-Version', '1.0.0')
        headers.set('X-Request-ID', `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

        if (enablePerformanceMonitoring) {
          const duration = performance.now() - startTime
          performanceMonitor.trackComponentRender(`auth-header-prep-${Date.now()}`, duration)
        }

        return headers
      } catch (error) {
        logger.error('Failed to prepare authentication headers', error instanceof Error ? error : new Error(String(error)), { endpoint })
        return headers
      }
    },
  })

  // Enhanced base query with authentication handling
  const authenticatedBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
  ) => {
    const startTime = enablePerformanceMonitoring ? performance.now() : 0
    const endpoint = typeof args === 'string' ? args : args.url

    try {
      // Validate authentication if required
      const needsAuth = shouldAddAuth(endpoint, skipAuthForEndpoints, requireAuthForEndpoints)
      
      if (needsAuth) {
        const { isValid, context } = await validateAuthentication(endpoint)
        
        if (!isValid) {
          logger.warn('Authentication validation failed for endpoint', undefined, { 
            endpoint,
            isAuthenticated: context.isAuthenticated,
            hasToken: !!context.token
          })
          
          const authError: FetchBaseQueryError = {
            status: 401,
            data: {
              error: 'Authentication required',
              message: 'Valid authentication token is required for this endpoint',
            },
          }
          
          if (onAuthFailure) {
            onAuthFailure(authError)
          }
          
          return { error: authError }
        }
      }

      // Execute the query with retry logic if enabled
      const executeQuery = async () => {
        const result = await baseQuery(args, api, extraOptions)
        
        // Handle authentication errors
        if (result.error && result.error.status === 401) {
          logger.warn('Received 401 authentication error', undefined, { endpoint })
          
          // Try to refresh token and retry once
          const newToken = await getAuthToken(true) // Force refresh
          
          if (newToken) {
            logger.info('Token refreshed, retrying request', undefined, { endpoint })
            
            if (onTokenRefresh) {
              onTokenRefresh(newToken)
            }
            
            // Retry the request with new token
            return await baseQuery(args, api, extraOptions)
          } else {
            logger.error('Token refresh failed, authentication error persists', undefined, { endpoint })
            
            if (onAuthFailure) {
              onAuthFailure(result.error)
            }
          }
        }
        
        return result
      }

      let result
      if (enableRetryLogic) {
        result = await withRetry(
          executeQuery,
          {
            maxAttempts: 3,
            baseDelay: 1000,
            shouldRetry: (error) => {
              // Don't retry authentication errors (401) or client errors (4xx)
              if (error && typeof error === 'object' && 'status' in error) {
                const status = (error as any).status
                return status >= 500 || status === 0 // Only retry server errors or network errors
              }
              return true
            },
          },
          `rtk-query-${endpoint}`
        )
      } else {
        result = await executeQuery()
      }

      if (enablePerformanceMonitoring) {
        const duration = performance.now() - startTime
        performanceMonitor.trackComponentRender(`rtk-query-${endpoint}-${Date.now()}`, duration)
        
        logger.debug('RTK Query request completed', undefined, {
          endpoint,
          duration,
          success: !result.error,
          status: result.error ? (result.error as any).status : 'success'
        })
      }

      return result
    } catch (error) {
      logger.error('RTK Query request failed', error instanceof Error ? error : new Error(String(error)), { endpoint })
      
      return {
        error: {
          status: 'FETCH_ERROR',
          error: error instanceof Error ? error.message : String(error),
        } as FetchBaseQueryError,
      }
    }
  }

  return authenticatedBaseQuery
}

/**
 * Helper function to determine if authentication should be added to a request
 */
function shouldAddAuth(
  endpoint: string,
  skipAuthForEndpoints: string[],
  requireAuthForEndpoints: string[]
): boolean {
  // Check if explicitly skipped
  if (skipAuthForEndpoints.some(skip => endpoint.includes(skip))) {
    return false
  }

  // Check if explicitly required
  if (requireAuthForEndpoints.some(require => endpoint.includes(require))) {
    return true
  }

  // Default behavior: add auth for most endpoints except public ones
  const publicEndpoints = ['/health', '/status', '/public', '/auth/login', '/auth/register']
  return !publicEndpoints.some(publicEndpoint => endpoint.includes(publicEndpoint))
}

/**
 * Create authentication middleware for RTK Query
 */
export function createAuthMiddleware() {
  return (api: any) => (next: any) => (action: any) => {
    // Add authentication context to RTK Query actions
    if (action.type?.endsWith('/pending')) {
      const authMiddleware = getAuthMiddleware()

      // Add auth context to the action meta
      action.meta = {
        ...action.meta,
        authContext: authMiddleware.getMetrics(),
      }
    }

    return next(action)
  }
}

/**
 * Authentication-aware query configuration
 */
export interface AuthQueryConfig {
  requireAuth?: boolean
  skipAuth?: boolean
  retryOnAuthFailure?: boolean
  cacheAuthContext?: boolean
}

/**
 * Create enhanced query configuration with authentication
 */
export function createAuthQueryConfig(config: AuthQueryConfig = {}) {
  const {
    requireAuth = true,
    skipAuth = false,
    retryOnAuthFailure = true,
    cacheAuthContext = true,
  } = config

  return {
    // Standard RTK Query options
    keepUnusedDataFor: 5 * 60, // 5 minutes
    refetchOnMountOrArgChange: 30, // 30 seconds
    refetchOnFocus: false,
    refetchOnReconnect: true,

    // Custom auth options
    meta: {
      requireAuth,
      skipAuth,
      retryOnAuthFailure,
      cacheAuthContext,
    },
  }
}

/**
 * Utility to create authenticated API slice
 */
export function createAuthenticatedApiSlice(config: {
  reducerPath: string
  baseUrl: string
  tagTypes?: string[]
  authConfig?: Partial<AuthenticatedBaseQueryConfig>
}) {
  const { reducerPath, baseUrl, tagTypes = [], authConfig = {} } = config

  const baseQuery = createAuthenticatedBaseQuery({
    baseUrl,
    enableRetryLogic: true,
    enablePerformanceMonitoring: true,
    enableAuthCaching: true,
    ...authConfig,
  })

  return {
    reducerPath,
    baseQuery,
    tagTypes,
    endpoints: () => ({}),
  }
}

/**
 * Authentication status query for RTK Query
 */
export const authStatusQuery = {
  query: () => ({
    url: '/auth/status',
    method: 'GET',
  }),
  ...createAuthQueryConfig({ requireAuth: true }),
}

/**
 * Token refresh mutation for RTK Query
 */
export const tokenRefreshMutation = {
  query: () => ({
    url: '/auth/refresh',
    method: 'POST',
  }),
  ...createAuthQueryConfig({ requireAuth: true, retryOnAuthFailure: false }),
}
