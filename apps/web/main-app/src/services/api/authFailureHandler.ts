/**
 * Global Auth Failure Handler for RTK Query APIs
 * Handles 401 responses by clearing auth state and redirecting to login
 */

import { logger } from '@repo/logger'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import type { AppDispatch, RootState } from '@/store'
import { setUnauthenticated } from '@/store/slices/authSlice'

/**
 * Store reference for accessing API slices
 * Set by initializeAuthFailureHandler
 */
let storeInstance: { dispatch: AppDispatch; getState: () => RootState } | null = null

/**
 * Auth pages that should not trigger redirect on 401
 */
const AUTH_PAGES = [
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
 * Check if current path is an auth page
 */
const isAuthPage = (path: string): boolean => {
  return AUTH_PAGES.some(authPath => path.startsWith(authPath))
}

/**
 * Create auth failure handler for RTK Query APIs
 *
 * This handler is called when API requests receive 401 Unauthorized responses
 * after token refresh has already been attempted and failed.
 *
 * @returns Auth failure handler function
 */
export function createAuthFailureHandler() {
  return (error: FetchBaseQueryError) => {
    // Only handle 401 errors
    if (error.status !== 401) {
      logger.warn('Auth failure handler called with non-401 error', undefined, { error })
      return
    }

    const currentPath = window.location.pathname

    // Don't redirect if already on auth pages
    if (isAuthPage(currentPath)) {
      logger.debug('Skipping redirect - already on auth page', undefined, { currentPath })
      return
    }

    logger.info('401 Unauthorized - clearing auth state and redirecting to login', undefined, {
      currentPath,
      error,
    })

    if (!storeInstance) {
      logger.error('Store not initialized - cannot clear auth state')
      return
    }

    // Clear auth state from Redux
    storeInstance.dispatch(setUnauthenticated())

    // Clear RTK Query cache for all API slices
    // This is imported dynamically to avoid circular dependencies
    import('@/store')
      .then(({ enhancedGalleryApi, enhancedWishlistApi, dashboardApi }) => {
        logger.debug('Clearing RTK Query cache for all API slices')
        storeInstance?.dispatch(enhancedGalleryApi.util.resetApiState())
        storeInstance?.dispatch(enhancedWishlistApi.util.resetApiState())
        storeInstance?.dispatch(dashboardApi.util.resetApiState())
      })
      .catch(err => {
        logger.error('Failed to clear RTK Query cache', err)
      })

    // Redirect to login with return URL and expired flag
    const redirectUrl = `/login?redirect=${encodeURIComponent(currentPath)}&expired=true`

    logger.info('Redirecting to login', undefined, { redirectUrl })

    // Use window.location for hard redirect to ensure clean state
    window.location.href = redirectUrl
  }
}

/**
 * Singleton instance of auth failure handler
 * Set by App.tsx during initialization
 */
let authFailureHandlerInstance: ((error: FetchBaseQueryError) => void) | null = null

/**
 * Initialize the global auth failure handler
 * Should be called once during app initialization
 *
 * @param store - Redux store instance
 */
export function initializeAuthFailureHandler(store: {
  dispatch: AppDispatch
  getState: () => RootState
}): void {
  storeInstance = store
  authFailureHandlerInstance = createAuthFailureHandler()
  logger.info('Auth failure handler initialized')
}

/**
 * Get the global auth failure handler instance
 * Used by RTK Query API configurations
 *
 * Returns a wrapper function that defers handler lookup until invocation time.
 * This solves the initialization order problem where the store is created
 * before initializeAuthFailureHandler is called.
 *
 * @returns Auth failure handler function that delegates to the initialized handler
 */
export function getAuthFailureHandler(): (error: FetchBaseQueryError) => void {
  // Return a wrapper that looks up the handler at invocation time, not import time
  return (error: FetchBaseQueryError) => {
    if (!authFailureHandlerInstance) {
      logger.warn('Auth failure occurred but handler not initialized', undefined, { error })
      return
    }
    authFailureHandlerInstance(error)
  }
}
