/**
 * Enhanced AWS Cognito Integration for Serverless API Client
 * Utilities for integrating with AWS Cognito JWT authentication with retry logic and performance monitoring
 */

import { createLogger } from '@repo/logger'
import { withPriorityRetry } from '../retry/retry-logic'
import { performanceMonitor } from '../lib/performance'

const logger = createLogger('api-client:cognito')

export interface CognitoTokens {
  accessToken: string
  idToken?: string
  refreshToken?: string
}

export interface CognitoUser {
  sub: string
  email?: string
  name?: string
  roles?: string[]
  [key: string]: any
}

export interface TokenRefreshMetrics {
  totalRefreshAttempts: number
  successfulRefreshes: number
  failedRefreshes: number
  averageRefreshTime: number
  lastRefreshTime?: number
  consecutiveFailures: number
}

export interface CognitoTokenManagerConfig {
  enableRetryLogic?: boolean
  enablePerformanceMonitoring?: boolean
  maxRefreshRetries?: number
  refreshRetryDelay?: number
  tokenExpirationBuffer?: number // seconds before expiry to refresh
  enableCircuitBreaker?: boolean
}

/**
 * Enhanced JWT token utilities for Cognito integration with retry logic and performance monitoring
 */
export class CognitoTokenManager {
  private tokens: CognitoTokens | null = null
  private tokenRefreshCallback?: () => Promise<CognitoTokens>
  private refreshPromise: Promise<CognitoTokens> | null = null
  private config: CognitoTokenManagerConfig
  private metrics: TokenRefreshMetrics = {
    totalRefreshAttempts: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    averageRefreshTime: 0,
    consecutiveFailures: 0,
  }

  constructor(
    initialTokens?: CognitoTokens,
    refreshCallback?: () => Promise<CognitoTokens>,
    config: CognitoTokenManagerConfig = {},
  ) {
    this.tokens = initialTokens || null
    this.tokenRefreshCallback = refreshCallback
    this.config = {
      enableRetryLogic: true,
      enablePerformanceMonitoring: true,
      maxRefreshRetries: 3,
      refreshRetryDelay: 1000,
      tokenExpirationBuffer: 300, // 5 minutes
      enableCircuitBreaker: true,
      ...config,
    }

    logger.info('CognitoTokenManager initialized', undefined, {
      hasInitialTokens: !!initialTokens,
      hasRefreshCallback: !!refreshCallback,
      config: this.config,
    })
  }

  /**
   * Set authentication tokens
   */
  setTokens(tokens: CognitoTokens): void {
    this.tokens = tokens
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | undefined {
    return this.tokens?.accessToken
  }

  /**
   * Get current ID token
   */
  getIdToken(): string | undefined {
    return this.tokens?.idToken
  }

  /**
   * Check if tokens are available
   */
  hasTokens(): boolean {
    return !!this.tokens?.accessToken
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.tokens = null
  }

  /**
   * Set token refresh callback
   */
  setTokenRefreshCallback(callback: () => Promise<CognitoTokens>): void {
    this.tokenRefreshCallback = callback
  }

  /**
   * Enhanced token refresh with retry logic and performance monitoring
   */
  async refreshTokens(): Promise<CognitoTokens | null> {
    if (!this.tokenRefreshCallback) {
      throw new Error('Token refresh callback not set')
    }

    // Prevent concurrent refresh attempts
    if (this.refreshPromise) {
      logger.debug('Token refresh already in progress, waiting for completion')
      return this.refreshPromise
    }

    const startTime = this.config.enablePerformanceMonitoring ? performance.now() : 0
    this.metrics.totalRefreshAttempts++

    const refreshOperation = async (): Promise<CognitoTokens> => {
      logger.debug('Starting token refresh operation')

      try {
        const newTokens = await this.tokenRefreshCallback!()
        this.setTokens(newTokens)

        // Update success metrics
        this.metrics.successfulRefreshes++
        this.metrics.consecutiveFailures = 0
        this.metrics.lastRefreshTime = Date.now()

        if (this.config.enablePerformanceMonitoring) {
          const duration = performance.now() - startTime
          this.metrics.averageRefreshTime =
            (this.metrics.averageRefreshTime * (this.metrics.successfulRefreshes - 1) + duration) /
            this.metrics.successfulRefreshes

          performanceMonitor.trackComponentRender(`token-refresh-${Date.now()}`, duration)

          logger.info('Token refresh completed successfully', undefined, {
            duration,
            totalRefreshes: this.metrics.successfulRefreshes,
          })
        }

        return newTokens
      } catch (error) {
        // Update failure metrics
        this.metrics.failedRefreshes++
        this.metrics.consecutiveFailures++

        logger.error(
          'Token refresh failed',
          error instanceof Error ? error : new Error(String(error)),
          {
            consecutiveFailures: this.metrics.consecutiveFailures,
            totalAttempts: this.metrics.totalRefreshAttempts,
          },
        )

        // Clear tokens on failure
        this.clearTokens()
        throw error
      }
    }

    try {
      if (this.config.enableRetryLogic) {
        this.refreshPromise = withPriorityRetry(
          refreshOperation,
          'high', // Authentication is high priority
          {
            maxAttempts: this.config.maxRefreshRetries,
            baseDelay: this.config.refreshRetryDelay,
          },
          'cognito-token-refresh',
        )
      } else {
        this.refreshPromise = refreshOperation()
      }

      const result = await this.refreshPromise
      return result
    } catch (error) {
      logger.error(
        'Token refresh failed after all retries',
        error instanceof Error ? error : new Error(String(error)),
      )
      return null
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * Get token with automatic refresh if needed and intelligent expiration checking
   */
  async getValidAccessToken(): Promise<string | undefined> {
    if (!this.tokens?.accessToken) {
      logger.debug('No access token available')
      return undefined
    }

    // Check if token is expired or will expire soon
    if (this.isTokenExpiredOrExpiringSoon(this.tokens.accessToken)) {
      logger.info('Access token expired or expiring soon, attempting refresh...', undefined, {
        hasRefreshCallback: !!this.tokenRefreshCallback,
        consecutiveFailures: this.metrics.consecutiveFailures,
      })

      // Check circuit breaker logic
      if (this.config.enableCircuitBreaker && this.metrics.consecutiveFailures >= 3) {
        logger.warn('Token refresh circuit breaker open, skipping refresh attempt', undefined, {
          consecutiveFailures: this.metrics.consecutiveFailures,
        })
        return undefined
      }

      const refreshedTokens = await this.refreshTokens()
      return refreshedTokens?.accessToken
    }

    return this.tokens.accessToken
  }

  /**
   * Enhanced JWT expiration check with buffer time
   */
  private isTokenExpiredOrExpiringSoon(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      const expirationTime = payload.exp
      const bufferTime = this.config.tokenExpirationBuffer || 300 // 5 minutes default

      // Check if token is expired or will expire within buffer time
      const isExpiredOrExpiringSoon = expirationTime < currentTime + bufferTime

      if (isExpiredOrExpiringSoon) {
        const timeUntilExpiry = expirationTime - currentTime
        logger.debug('Token expiration check', undefined, {
          timeUntilExpiry,
          bufferTime,
          isExpiredOrExpiringSoon,
        })
      }

      return isExpiredOrExpiringSoon
    } catch (error) {
      // If we can't parse the token, assume it's expired
      logger.warn(
        'Failed to parse JWT token for expiration check',
        error instanceof Error ? error : new Error(String(error)),
      )
      return true
    }
  }

  /**
   * Decode JWT token payload (client-side only, not for security)
   */
  decodeToken(token?: string): CognitoUser | null {
    const tokenToUse = token || this.tokens?.accessToken
    if (!tokenToUse) return null

    try {
      const payload = JSON.parse(atob(tokenToUse.split('.')[1]))
      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.given_name,
        roles: payload['cognito:groups'] || [],
        ...payload,
      }
    } catch (error) {
      logger.error('Failed to decode token', error as Error)
      return null
    }
  }

  /**
   * Get current user information from tokens
   */
  getCurrentUser(): CognitoUser | null {
    return this.decodeToken()
  }

  /**
   * Get token refresh metrics
   */
  getMetrics(): TokenRefreshMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset metrics (useful for testing or monitoring)
   */
  resetMetrics(): void {
    this.metrics = {
      totalRefreshAttempts: 0,
      successfulRefreshes: 0,
      failedRefreshes: 0,
      averageRefreshTime: 0,
      consecutiveFailures: 0,
    }
    logger.debug('Token refresh metrics reset')
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitBreakerOpen(): boolean {
    return (this.config.enableCircuitBreaker ?? false) && this.metrics.consecutiveFailures >= 3
  }

  /**
   * Get token expiration info
   */
  getTokenExpirationInfo(): {
    isExpired: boolean
    isExpiringSoon: boolean
    timeUntilExpiry?: number
    expirationTime?: number
  } | null {
    if (!this.tokens?.accessToken) {
      return null
    }

    try {
      const payload = JSON.parse(atob(this.tokens.accessToken.split('.')[1]))
      const currentTime = Math.floor(Date.now() / 1000)
      const expirationTime = payload.exp
      const bufferTime = this.config.tokenExpirationBuffer || 300
      const timeUntilExpiry = expirationTime - currentTime

      return {
        isExpired: expirationTime < currentTime,
        isExpiringSoon: expirationTime < currentTime + bufferTime,
        timeUntilExpiry,
        expirationTime,
      }
    } catch (error) {
      logger.warn(
        'Failed to get token expiration info',
        error instanceof Error ? error : new Error(String(error)),
      )
      return {
        isExpired: true,
        isExpiringSoon: true,
      }
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CognitoTokenManagerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    logger.info('CognitoTokenManager configuration updated', undefined, { config: this.config })
  }
}

/**
 * Global token manager instance
 */
let globalTokenManager: CognitoTokenManager | null = null

/**
 * Initialize global Cognito token manager with enhanced configuration
 */
export function initializeCognitoTokenManager(
  initialTokens?: CognitoTokens,
  refreshCallback?: () => Promise<CognitoTokens>,
  config?: CognitoTokenManagerConfig,
): CognitoTokenManager {
  if (!globalTokenManager) {
    globalTokenManager = new CognitoTokenManager(initialTokens, refreshCallback, config)
    logger.info('Global CognitoTokenManager initialized', undefined, {
      hasInitialTokens: !!initialTokens,
      hasRefreshCallback: !!refreshCallback,
      config,
    })
  } else {
    if (initialTokens) {
      globalTokenManager.setTokens(initialTokens)
    }
    if (refreshCallback) {
      globalTokenManager.setTokenRefreshCallback(refreshCallback)
    }
    if (config) {
      globalTokenManager.updateConfig(config)
    }
    logger.debug('Global CognitoTokenManager updated')
  }
  return globalTokenManager
}

/**
 * Get global token manager
 */
export function getCognitoTokenManager(): CognitoTokenManager | null {
  return globalTokenManager
}

/**
 * Helper function to get auth token for serverless API client
 */
export function getCognitoAuthToken(): string | undefined {
  return globalTokenManager?.getAccessToken()
}

/**
 * Helper function to get auth token with automatic refresh
 */
export async function getValidCognitoAuthToken(): Promise<string | undefined> {
  return await globalTokenManager?.getValidAccessToken()
}

/**
 * Get token refresh metrics from global manager
 */
export function getCognitoTokenMetrics(): TokenRefreshMetrics | null {
  return globalTokenManager?.getMetrics() || null
}

/**
 * Check if authentication is available and valid
 */
export async function isCognitoAuthenticationValid(): Promise<boolean> {
  if (!globalTokenManager) {
    return false
  }

  try {
    const token = await globalTokenManager.getValidAccessToken()
    return !!token
  } catch (error) {
    logger.warn(
      'Authentication validation failed',
      error instanceof Error ? error : new Error(String(error)),
    )
    return false
  }
}

/**
 * Get current user from global token manager
 */
export function getCurrentCognitoUser(): CognitoUser | null {
  return globalTokenManager?.getCurrentUser() || null
}

/**
 * Reset global token manager (useful for testing)
 */
export function resetCognitoTokenManager(): void {
  if (globalTokenManager) {
    globalTokenManager.clearTokens()
    globalTokenManager.resetMetrics()
  }
  globalTokenManager = null
  logger.info('Global CognitoTokenManager reset')
}

/**
 * Get token expiration information
 */
export function getCognitoTokenExpirationInfo() {
  return globalTokenManager?.getTokenExpirationInfo() || null
}
