/**
 * @repo/auth-utils
 *
 * Shared authentication and authorization utilities for the monorepo.
 * Includes JWT token handling and TanStack Router guards.
 *
 * @example
 * ```typescript
 * // Import JWT utilities
 * import { decodeToken, isTokenExpired } from '@repo/auth-utils/jwt'
 *
 * // Import route guards
 * import { RouteGuards, createTanStackRouteGuard } from '@repo/auth-utils/guards'
 * ```
 */

// Re-export JWT utilities
export * from './jwt'

// Re-export route guard utilities
export * from './guards'
