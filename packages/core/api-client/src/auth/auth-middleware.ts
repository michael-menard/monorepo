/**
 * Enhanced Authentication Middleware for Serverless API Client
 * Integrates Cognito authentication with retry logic, caching, and performance monitoring
 */

import { createLogger } from '@repo/logger'
import { getValidCognitoAuthToken, getCognitoTokenMetrics, isCognitoAuthenticationValid } from './cognito-integration'
import { withRetry } from '../retry/retry-logic'
import { performanceMonitor } from '../lib/performance'
import { getServerlessCacheManager } from '@repo/cache/utils/serverlessCacheManager'

const logger = createLogger('api-client:auth-middleware')

export interface AuthMiddlewareConfig {
  enableCaching?: boolean
  cacheKeyPrefix?: string
  cacheTTL?: number
  enablePerformanceMonitoring?: boolean
  enableRetryLogic?: boolean
  skipAuthForPaths?: string[]
  requireAuthForPaths?: string[]
}

export interface AuthContext {
  isAuthenticated: boolean
  token?: string
  userId?: string
  userRoles?: string[]
  tokenMetrics?: ReturnType<typeof getCognitoTokenMetrics>
}

/**
 * Enhanced authentication middleware class
 */
export class AuthMiddleware {
  private config: AuthMiddlewareConfig
  private cacheManager = getServerlessCacheManager()

  constructor(config: AuthMiddlewareConfig = {}) {
    this.config = {
      enableCaching: true,
      cacheKeyPrefix: 'auth_token_',
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      enablePerformanceMonitoring: true,
      enableRetryLogic: true,
      skipAuthForPaths: ['/health', '/status', '/public'],
      requireAuthForPaths: ['/api/protected', '/api/user', '/api/gallery', '/api/wishlist'],
      ...config,
    }

    logger.info('AuthMiddleware initialized', undefined, { config: this.config })
  }

  /**
   * Get authentication context with caching and performance monitoring
   */
  async getAuthContext(requestPath?: string): Promise<AuthContext> {
    const startTime = this.config.enablePerformanceMonitoring ? performance.now() : 0
    const cacheKey = `${this.config.cacheKeyPrefix}context`

    try {
      // Check if authentication is required for this path
      if (requestPath && this.shouldSkipAuth(requestPath)) {
        logger.debug('Skipping authentication for path', undefined, { path: requestPath })
        return { isAuthenticated: false }
      }

      // Try to get cached auth context first
      if (this.config.enableCaching) {
        const cachedContext = await this.cacheManager.get<AuthContext>(cacheKey)
        if (cachedContext && cachedContext.isAuthenticated) {
          logger.debug('Using cached authentication context')
          return cachedContext
        }
      }

      // Get fresh authentication context
      const authContext = await this.buildAuthContext()

      // Cache the context if authentication is successful
      if (this.config.enableCaching && authContext.isAuthenticated) {
        await this.cacheManager.set(cacheKey, authContext, this.config.cacheTTL)
      }

      if (this.config.enablePerformanceMonitoring) {
        const duration = performance.now() - startTime
        performanceMonitor.trackComponentRender(`auth-context-${Date.now()}`, duration)
        logger.debug('Authentication context retrieved', undefined, { 
          duration, 
          isAuthenticated: authContext.isAuthenticated 
        })
      }

      return authContext
    } catch (error) {
      logger.error('Failed to get authentication context', error instanceof Error ? error : new Error(String(error)))
      return { isAuthenticated: false }
    }
  }

  /**
   * Get authentication token with retry logic and caching
   */
  async getAuthToken(forceRefresh = false): Promise<string | undefined> {
    const cacheKey = `${this.config.cacheKeyPrefix}token`

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh && this.config.enableCaching) {
        const cachedToken = await this.cacheManager.get<string>(cacheKey)
        if (cachedToken) {
          logger.debug('Using cached authentication token')
          return cachedToken
        }
      }

      // Get token with retry logic
      const getTokenOperation = async (): Promise<string | undefined> => {
        const token = await getValidCognitoAuthToken()
        
        // Cache the token if successful
        if (token && this.config.enableCaching) {
          await this.cacheManager.set(cacheKey, token, this.config.cacheTTL)
        }
        
        return token
      }

      if (this.config.enableRetryLogic) {
        return await withRetry(
          getTokenOperation,
          {
            maxAttempts: 3,
            baseDelay: 1000,
          },
          'auth-token-retrieval'
        )
      } else {
        return await getTokenOperation()
      }
    } catch (error) {
      logger.error('Failed to get authentication token', error instanceof Error ? error : new Error(String(error)))
      return undefined
    }
  }

  /**
   * Validate authentication for a request
   */
  async validateAuth(requestPath?: string): Promise<{ isValid: boolean; context: AuthContext }> {
    const context = await this.getAuthContext(requestPath)
    
    // If path doesn't require auth, consider it valid
    if (requestPath && this.shouldSkipAuth(requestPath)) {
      return { isValid: true, context }
    }

    // Check if authentication is required and valid
    const isValid = context.isAuthenticated && !!context.token
    
    if (!isValid && requestPath && this.requiresAuth(requestPath)) {
      logger.warn('Authentication required but not valid', undefined, { 
        path: requestPath,
        isAuthenticated: context.isAuthenticated,
        hasToken: !!context.token
      })
    }

    return { isValid, context }
  }

  /**
   * Clear authentication cache
   */
  async clearAuthCache(): Promise<void> {
    const contextKey = `${this.config.cacheKeyPrefix}context`
    const tokenKey = `${this.config.cacheKeyPrefix}token`
    
    this.cacheManager.delete(contextKey)
    this.cacheManager.delete(tokenKey)
    
    logger.debug('Authentication cache cleared')
  }

  /**
   * Build authentication context from current tokens
   */
  private async buildAuthContext(): Promise<AuthContext> {
    try {
      const isAuthenticated = await isCognitoAuthenticationValid()

      if (!isAuthenticated) {
        return { isAuthenticated: false }
      }

      const token = await getValidCognitoAuthToken()
      const tokenMetrics = getCognitoTokenMetrics()

      // Decode token to get user info (client-side only, not for security)
      let userId: string | undefined
      let userRoles: string[] | undefined

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          userId = payload.sub
          userRoles = payload['cognito:groups'] || []
        } catch (error) {
          logger.warn('Failed to decode token for user info', error instanceof Error ? error : new Error(String(error)))
        }
      }

      return {
        isAuthenticated: true,
        token,
        userId,
        userRoles,
        tokenMetrics,
      }
    } catch (error) {
      logger.error('Failed to build authentication context', error instanceof Error ? error : new Error(String(error)))
      return { isAuthenticated: false }
    }
  }

  /**
   * Check if authentication should be skipped for a path
   */
  private shouldSkipAuth(path: string): boolean {
    return this.config.skipAuthForPaths?.some(skipPath =>
      path.startsWith(skipPath)
    ) || false
  }

  /**
   * Check if authentication is required for a path
   */
  private requiresAuth(path: string): boolean {
    return this.config.requireAuthForPaths?.some(requirePath =>
      path.startsWith(requirePath)
    ) || false
  }

  /**
   * Get authentication metrics
   */
  getMetrics() {
    return getCognitoTokenMetrics()
  }

  /**
   * Update middleware configuration
   */
  updateConfig(newConfig: Partial<AuthMiddlewareConfig>): void {
    this.config = { ...this.config, ...newConfig }
    logger.info('AuthMiddleware configuration updated', undefined, { config: this.config })
  }
}

/**
 * Global authentication middleware instance
 */
let globalAuthMiddleware: AuthMiddleware | null = null

/**
 * Get or create global authentication middleware
 */
export function getAuthMiddleware(config?: AuthMiddlewareConfig): AuthMiddleware {
  if (!globalAuthMiddleware) {
    globalAuthMiddleware = new AuthMiddleware(config)
  } else if (config) {
    globalAuthMiddleware.updateConfig(config)
  }
  return globalAuthMiddleware
}

/**
 * Reset global authentication middleware (useful for testing)
 */
export function resetAuthMiddleware(): void {
  globalAuthMiddleware = null
  logger.info('Global AuthMiddleware reset')
}

/**
 * Convenience function to get auth token
 */
export async function getAuthToken(forceRefresh = false): Promise<string | undefined> {
  const middleware = getAuthMiddleware()
  return middleware.getAuthToken(forceRefresh)
}

/**
 * Convenience function to validate authentication
 */
export async function validateAuthentication(requestPath?: string): Promise<{ isValid: boolean; context: AuthContext }> {
  const middleware = getAuthMiddleware()
  return middleware.validateAuth(requestPath)
}
