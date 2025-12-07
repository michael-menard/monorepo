/**
 * Enhanced RTK Query Authentication Integration
 * Provides cookie-based authentication with credentials: 'include'
 *
 * Story 3.1.4: Cookie-Based Auth for API Client
 * - All requests use HttpOnly cookie-based auth (credentials: 'include')
 * - No Bearer tokens in JS (no Authorization header injection)
 * - Default headers: Accept: application/json
 * - Optional CSRF token propagation for unsafe methods
 */

import { createLogger } from '@repo/logger'
import { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { withRetry } from '../retry/retry-logic'
import { performanceMonitor } from '../lib/performance'
import { getAuthMiddleware } from './auth-middleware'

const logger = createLogger('api-client:rtk-auth')

export interface AuthenticatedBaseQueryConfig {
  baseUrl: string
  enableRetryLogic?: boolean
  enablePerformanceMonitoring?: boolean
  enableAuthCaching?: boolean
  skipAuthForEndpoints?: string[]
  requireAuthForEndpoints?: string[]
  onAuthFailure?: (error: FetchBaseQueryError) => void
  /** @deprecated No longer used; cookie-based auth does not expose tokens to JS */
  onTokenRefresh?: (newToken: string) => void
  /** Enable CSRF token propagation for unsafe methods (POST/PUT/PATCH/DELETE) */
  enableCsrf?: boolean
  /** Function to retrieve CSRF token (e.g., from meta tag or cookie) */
  getCsrfToken?: () => string | undefined
}

/**
 * Create a cookie-based authenticated base query for RTK Query
 *
 * Story 3.1.4: Uses credentials: 'include' for all requests.
 * Does NOT inject Authorization headers (cookie-based auth only).
 */
export function createAuthenticatedBaseQuery(
  config: AuthenticatedBaseQueryConfig,
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  const {
    baseUrl,
    enableRetryLogic = true,
    enablePerformanceMonitoring = true,
    skipAuthForEndpoints = [],
    requireAuthForEndpoints = [],
    onAuthFailure,
    enableCsrf = false,
    getCsrfToken,
  } = config

  // Create base query with cookie-based auth
  const baseQuery = fetchBaseQuery({
    baseUrl,
    credentials: 'include', // Story 3.1.4: Always send cookies
    prepareHeaders: (headers, { endpoint }) => {
      const startTime = enablePerformanceMonitoring ? performance.now() : 0
      const method = typeof endpoint === 'string' ? 'GET' : 'GET' // Will be overridden by actual request

      try {
        // Story 3.1.4: Default headers - Accept: application/json
        // Do NOT set Content-Type here; let RTK/fetch handle it based on body type
        headers.set('Accept', 'application/json')
        headers.set('X-Client-Version', '1.0.0')
        headers.set('X-Request-ID', `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

        // Story 3.1.4: CSRF token for unsafe methods (feature-flagged)
        if (enableCsrf && getCsrfToken) {
          const csrfToken = getCsrfToken()
          if (csrfToken) {
            headers.set('X-CSRF-Token', csrfToken)
            logger.debug('CSRF token added to request', undefined, { endpoint })
          }
        }

        // Story 3.1.4: Do NOT inject Authorization header - cookie-based auth only
        logger.debug('Cookie-based auth request prepared', undefined, { endpoint })

        if (enablePerformanceMonitoring) {
          const duration = performance.now() - startTime
          performanceMonitor.trackComponentRender(`auth-header-prep-${Date.now()}`, duration)
        }

        return headers
      } catch (error) {
        logger.error(
          'Failed to prepare request headers',
          error instanceof Error ? error : new Error(String(error)),
          { endpoint },
        )
        return headers
      }
    },
  })

  /**
   * Cookie-based authenticated base query
   *
   * Story 3.1.4 Error handling semantics:
   * - 401 Unauthorized: surface distinctly for re-auth flow (do not retry)
   * - 403 Forbidden: surface distinctly for permission error UI (do not retry)
   * - 404 Not Found: surface distinctly for not-found UI (do not retry)
   */
  const authenticatedBaseQuery: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
  > = async (args, api, extraOptions) => {
    const startTime = enablePerformanceMonitoring ? performance.now() : 0
    const endpoint = typeof args === 'string' ? args : args.url

    try {
      // Execute the query
      const executeQuery = async () => {
        const result = await baseQuery(args, api, extraOptions)

        // Story 3.1.4: Handle auth/permission errors distinctly (no retry)
        if (result.error) {
          const status = result.error.status

          // 401 Unauthorized: trigger re-auth flow
          if (status === 401) {
            logger.warn('Received 401 Unauthorized - user not signed in', undefined, { endpoint })
            if (onAuthFailure) {
              onAuthFailure(result.error)
            }
            // Return immediately; do not retry 401
            return result
          }

          // 403 Forbidden: user signed in but not authorized (non-owner)
          if (status === 403) {
            logger.warn('Received 403 Forbidden - permission denied', undefined, { endpoint })
            if (onAuthFailure) {
              onAuthFailure(result.error)
            }
            // Return immediately; do not retry 403
            return result
          }

          // 404 Not Found: resource does not exist
          if (status === 404) {
            logger.debug('Received 404 Not Found', undefined, { endpoint })
            // Return immediately; do not retry 404
            return result
          }
        }

        return result
      }

      // Only retry for transient errors (5xx, timeouts, network issues)
      // Story 3.1.4: Do NOT retry 401/403/404
      let result
      if (enableRetryLogic) {
        result = await withRetry(
          executeQuery,
          {
            maxAttempts: 3,
            baseDelay: 1000,
          },
          `rtk-query-${endpoint}`,
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
          status: result.error ? (result.error as any).status : 'success',
        })
      }

      return result
    } catch (error) {
      logger.error(
        'RTK Query request failed',
        error instanceof Error ? error : new Error(String(error)),
        { endpoint },
      )

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
 * Helper function to determine if an endpoint requires authentication
 * Note: With cookie-based auth, cookies are always sent (credentials: 'include'),
 * but this helps identify public vs protected endpoints for logging/metrics.
 */
function isProtectedEndpoint(
  endpoint: string,
  skipAuthForEndpoints: string[],
  requireAuthForEndpoints: string[],
): boolean {
  // Check if explicitly skipped
  if (skipAuthForEndpoints.some(skip => endpoint.includes(skip))) {
    return false
  }

  // Check if explicitly required
  if (requireAuthForEndpoints.some(require => endpoint.includes(require))) {
    return true
  }

  // Default behavior: most endpoints are protected except public ones
  const publicEndpoints = ['/health', '/status', '/public', '/auth/login', '/auth/register']
  return !publicEndpoints.some(publicEndpoint => endpoint.includes(publicEndpoint))
}

/**
 * Create authentication middleware for RTK Query
 */
export function createAuthMiddleware() {
  return () => (next: any) => (action: any) => {
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
 *
 * Story 3.1.4: Cookie-based auth - no token injection needed
 */
export interface AuthQueryConfig {
  /** Indicates this query requires authentication (for logging/metrics) */
  requireAuth?: boolean
  /** Skip authentication checks for this query */
  skipAuth?: boolean
  /**
   * @deprecated Story 3.1.4: 401/403/404 are never retried.
   * Retry only applies to transient errors (5xx, timeouts).
   */
  retryOnAuthFailure?: boolean
  /** Cache auth context for this query */
  cacheAuthContext?: boolean
}

/**
 * Create enhanced query configuration with authentication
 *
 * Story 3.1.4: Cookie-based auth with proper error handling
 */
export function createAuthQueryConfig(config: AuthQueryConfig = {}) {
  const {
    requireAuth = true,
    skipAuth = false,
    // Deprecated: 401/403/404 are never retried
    retryOnAuthFailure = false,
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
