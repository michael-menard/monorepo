/**
 * Global Auth Failure Handler for RTK Query APIs
 * Handles 401 responses by clearing auth state and redirecting to login
 *
 * This module uses dependency injection to avoid coupling to specific Redux stores or routers.
 * Consumers provide callbacks for authentication and navigation logic.
 */

import { logger } from '@repo/logger'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'

/**
 * Auth pages that should not trigger redirect on 401
 * Exported for reference/documentation
 */
export const AUTH_PAGES = [
  '/login',
  '/register',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/otp-verification',
  '/auth/verify-email',
  '/auth/new-password',
]

/**
 * Configuration options for auth failure handler
 */
export interface AuthFailureHandlerOptions {
  /**
   * Callback to navigate to login page
   * Called when 401 occurs on non-auth pages
   *
   * @param currentPath - The path where 401 occurred (for redirect after login)
   *
   * @example
   * onAuthFailure: (path) => {
   *   window.location.href = `/login?redirect=${encodeURIComponent(path)}&expired=true`
   * }
   */
  onAuthFailure: (currentPath: string) => void

  /**
   * Callback to check if current path is an auth page
   * Auth pages should not trigger redirect on 401
   *
   * @param path - Current path to check
   * @returns true if path is an auth page
   *
   * @example
   * isAuthPage: (path) => {
   *   return AUTH_PAGES.some(authPath => path.startsWith(authPath))
   * }
   */
  isAuthPage: (path: string) => boolean

  /**
   * Optional callback to reset API state
   * Called to clear RTK Query cache after auth failure
   *
   * @example
   * resetApiState: () => {
   *   store.dispatch(enhancedGalleryApi.util.resetApiState())
   *   store.dispatch(enhancedWishlistApi.util.resetApiState())
   * }
   */
  resetApiState?: () => void
}

/**
 * Check if error is an auth error (401)
 */
function isAuthError(error: FetchBaseQueryError): boolean {
  return error.status === 401 || error.status === 'PARSING_ERROR'
}

/**
 * Create auth failure handler for RTK Query APIs
 *
 * This handler is called when API requests receive 401 Unauthorized responses
 * after token refresh has already been attempted and failed.
 *
 * Uses dependency injection pattern to avoid coupling to specific Redux stores,
 * routers, or navigation libraries.
 *
 * @param options - Configuration callbacks for auth and navigation
 * @returns Auth failure handler function
 *
 * @example
 * // In main-app/src/store/index.ts
 * import { createAuthFailureHandler } from '@repo/api-client/errors/auth-failure'
 *
 * const authFailureHandler = createAuthFailureHandler({
 *   onAuthFailure: (path) => {
 *     store.dispatch(setUnauthenticated())
 *     window.location.href = `/login?redirect=${encodeURIComponent(path)}&expired=true`
 *   },
 *   isAuthPage: (path) => {
 *     const AUTH_PAGES = ['/login', '/register', '/signup']
 *     return AUTH_PAGES.some(authPath => path.startsWith(authPath))
 *   },
 *   resetApiState: () => {
 *     store.dispatch(enhancedGalleryApi.util.resetApiState())
 *     store.dispatch(enhancedWishlistApi.util.resetApiState())
 *   }
 * })
 *
 * // Use in RTK Query base query config
 * const baseQuery = enhancedBaseQuery({
 *   ...,
 *   authFailureHandler: () => authFailureHandler
 * })
 */
export function createAuthFailureHandler(
  options: AuthFailureHandlerOptions,
): (error: FetchBaseQueryError) => void {
  return (error: FetchBaseQueryError) => {
    // Only handle 401 errors
    if (!isAuthError(error)) {
      logger.warn('Auth failure handler called with non-401 error', undefined, { error })
      return
    }

    const currentPath = window.location.pathname

    // Don't redirect if already on auth pages
    if (options.isAuthPage(currentPath)) {
      logger.debug('Skipping redirect - already on auth page', undefined, { currentPath })
      return
    }

    logger.info('401 Unauthorized - clearing auth state and redirecting to login', undefined, {
      currentPath,
      error,
    })

    // Clear API state if callback provided
    if (options.resetApiState) {
      try {
        logger.debug('Clearing RTK Query cache for all API slices')
        options.resetApiState()
      } catch (err) {
        logger.error('Failed to clear RTK Query cache', err)
      }
    }

    // Trigger auth failure callback (redirect, update store, etc.)
    try {
      options.onAuthFailure(currentPath)
    } catch (err) {
      logger.error('Auth failure callback failed', err)
    }
  }
}
