import { redirect } from '@tanstack/react-router'
import { logger } from '@repo/logger'
import { isTokenExpired, getTokenScopes } from './jwt'
import type { AuthState } from '@/store/slices/authSlice'

export interface RouteGuardOptions {
  requireAuth?: boolean
  requireVerified?: boolean
  requireRoles?: string[]
  /** Required permissions/scopes from access token (e.g., ['openid', 'profile', 'custom:gallery.read']) */
  requirePermissions?: string[]
  /** If true, user must have ALL required roles/permissions (AND logic). If false, user needs at least ONE (OR logic). Default: false */
  requireAll?: boolean
  redirectTo?: string
  allowedPaths?: string[]
  blockedPaths?: string[]
  /** For guest-only routes: redirect authenticated users to this path */
  guestOnly?: boolean
  /** Check if access token is expired and redirect if so */
  checkTokenExpiry?: boolean
}

/**
 * Type for route guard functions (middleware)
 * Compatible with TanStack Router beforeLoad signature
 */
export type RouteGuard = (args: { context: any; location: any }) => void | undefined

/**
 * Create a TanStack Router guard function
 * Compatible with legacy auth-guard patterns from lego-moc-instructions-app
 *
 * Enhanced with token expiration checking (Story 1.26)
 */
export function createTanStackRouteGuard(
  options: RouteGuardOptions,
  redirectFn: typeof redirect = redirect,
): RouteGuard {
  return ({ context, location }: { context: any; location: any }) => {
    const auth: AuthState = context.auth || {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      tokens: null,
      error: null,
    }

    // Skip guard if still loading (AC 4: Returns early if auth loading)
    if (auth.isLoading) {
      return
    }

    // Check if path is explicitly allowed
    if (options.allowedPaths?.some(path => location.pathname.startsWith(path))) {
      return
    }

    // Check if path is explicitly blocked
    if (options.blockedPaths?.some(path => location.pathname.startsWith(path))) {
      throw redirectFn({ to: options.redirectTo || '/' })
    }

    // Guest-only routes: redirect authenticated users away
    if (options.guestOnly && auth.isAuthenticated) {
      throw redirectFn({ to: options.redirectTo || '/dashboard' })
    }

    // Check authentication requirement
    if (options.requireAuth && !auth.isAuthenticated) {
      throw redirectFn({
        to: options.redirectTo || '/login',
        search: { redirect: location.pathname },
      })
    }

    // AC 2: Check token validity if authenticated and token checking is enabled
    if (options.checkTokenExpiry !== false && auth.isAuthenticated && auth.tokens?.accessToken) {
      if (isTokenExpired(auth.tokens.accessToken)) {
        // Token expired - redirect to login with expired flag
        throw redirectFn({
          to: options.redirectTo || '/login',
          search: { redirect: location.pathname, expired: true },
        })
      }
    }

    // Check email verification requirement
    // NOTE: emailVerified is not currently in the User type - will be added with Amplify integration
    if (options.requireVerified && auth.isAuthenticated) {
      const isVerified = (auth.user as { emailVerified?: boolean })?.emailVerified ?? true
      if (!isVerified) {
        throw redirectFn({
          to: '/verify-email',
          search: { redirect: location.pathname },
        })
      }
    }

    // Check role and permission requirements (Story 1.27)
    if (
      auth.isAuthenticated &&
      (options.requireRoles?.length || options.requirePermissions?.length)
    ) {
      const userRoles = auth.user?.roles || []
      const userPermissions = auth.tokens?.accessToken
        ? getTokenScopes(auth.tokens.accessToken)
        : []

      const checks: boolean[] = []

      // Check roles
      if (options.requireRoles && options.requireRoles.length > 0) {
        const hasRole = options.requireAll
          ? options.requireRoles.every(role => userRoles.includes(role))
          : options.requireRoles.some(role => userRoles.includes(role))
        checks.push(hasRole)
      }

      // Check permissions (scopes from access token)
      if (options.requirePermissions && options.requirePermissions.length > 0) {
        const hasPermission = options.requireAll
          ? options.requirePermissions.every(perm => userPermissions.includes(perm))
          : options.requirePermissions.some(perm => userPermissions.includes(perm))
        checks.push(hasPermission)
      }

      // Determine if authorization passed
      // If requireAll is true, ALL checks must pass (AND logic across role and permission checks)
      // If requireAll is false, AT LEAST ONE check must pass (OR logic across role and permission checks)
      const passed = options.requireAll ? checks.every(Boolean) : checks.some(Boolean)

      if (!passed) {
        logger.warn('Unauthorized access attempt', {
          userId: auth.user?.id,
          path: location.pathname,
          requiredRoles: options.requireRoles,
          requiredPermissions: options.requirePermissions,
          userRoles,
          userPermissions,
        })
        throw redirectFn({ to: '/unauthorized' })
      }
    }

    // Guard passed
    return
  }
}

/**
 * Common route guard configurations
 * Based on legacy patterns from lego-moc-instructions-app
 *
 * Enhanced with token expiration checking by default (Story 1.26)
 */
export const RouteGuards = {
  // Public routes - no authentication required
  public: createTanStackRouteGuard({
    requireAuth: false,
  }),

  // Protected routes - authentication required with token validation
  protected: createTanStackRouteGuard({
    requireAuth: true,
    redirectTo: '/login',
    checkTokenExpiry: true,
  }),

  // Verified routes - authentication and email verification required
  verified: createTanStackRouteGuard({
    requireAuth: true,
    requireVerified: true,
    redirectTo: '/login',
    checkTokenExpiry: true,
  }),

  // Admin routes - authentication and admin role required
  admin: createTanStackRouteGuard({
    requireAuth: true,
    requireVerified: true,
    requireRoles: ['admin'],
    redirectTo: '/unauthorized',
    checkTokenExpiry: true,
  }),

  // Moderator routes - authentication and admin OR moderator role required (Story 1.27)
  moderator: createTanStackRouteGuard({
    requireAuth: true,
    requireVerified: true,
    requireRoles: ['admin', 'moderator'],
    requireAll: false, // OR logic - user needs admin OR moderator
    redirectTo: '/unauthorized',
    checkTokenExpiry: true,
  }),

  // Guest only routes - redirect authenticated users to dashboard
  guestOnly: createTanStackRouteGuard({
    guestOnly: true,
    redirectTo: '/dashboard',
  }),
}

/**
 * Compose multiple route guards (middleware) into a single guard function
 * AC 5: Can be composed with other middleware
 *
 * Guards are executed in order. If any guard throws (redirects), execution stops.
 *
 * @param guards - Array of route guard functions to compose
 * @returns A single composed route guard function
 *
 * @example
 * ```typescript
 * const combinedGuard = composeMiddleware(
 *   RouteGuards.protected,
 *   createRoleGuard(['admin']),
 *   createFeatureFlagGuard('new-feature')
 * )
 *
 * export const Route = createFileRoute('/admin/dashboard')({
 *   beforeLoad: combinedGuard,
 *   component: AdminDashboard,
 * })
 * ```
 */
export const composeMiddleware = (...guards: RouteGuard[]): RouteGuard => {
  return (args: { context: any; location: any }) => {
    for (const guard of guards) {
      const result = guard(args)
      // If guard returns a value (e.g., redirect), propagate it
      if (result !== undefined) {
        return result
      }
    }
    // All guards passed
    return
  }
}

/**
 * Legacy route protection patterns for migration compatibility
 */
export const LegacyRoutePatterns = {
  // Profile page protection (from legacy app)
  profile: createTanStackRouteGuard({
    requireAuth: true,
    requireVerified: true,
    redirectTo: '/',
  }),

  // MOC detail page protection (from legacy app)
  mocDetail: createTanStackRouteGuard({
    requireAuth: true,
    requireVerified: true,
    redirectTo: '/',
  }),

  // Wishlist page protection (from legacy app)
  wishlist: createTanStackRouteGuard({
    requireAuth: true,
    requireVerified: true,
    redirectTo: '/',
  }),

  // Cache demo protection (from legacy app)
  cacheDemo: createTanStackRouteGuard({
    requireAuth: true,
    requireVerified: true,
    redirectTo: '/login',
  }),

  // Profile demos protection (from legacy app)
  profileDemo: createTanStackRouteGuard({
    requireAuth: true,
    requireVerified: true,
    redirectTo: '/login',
  }),
}

/**
 * Route metadata for navigation and breadcrumbs
 */
export interface RouteMetadata {
  title: string
  description?: string
  breadcrumb?: string
  icon?: string
  category?: 'primary' | 'secondary' | 'utility'
  isNew?: boolean
  isComingSoon?: boolean
  badge?: string
}

/**
 * Common route metadata configurations
 */
export const ROUTE_METADATA_CONFIG = {
  home: {
    title: 'Home - LEGO MOC Instructions',
    description: 'Discover and create amazing LEGO MOC instructions',
    breadcrumb: 'Home',
    icon: 'Home',
    category: 'primary' as const,
  },

  gallery: {
    title: 'Gallery - LEGO MOC Instructions',
    description: 'Browse and discover LEGO MOC creations',
    breadcrumb: 'Gallery',
    icon: 'Search',
    category: 'primary' as const,
  },

  wishlist: {
    title: 'Wishlist - LEGO MOC Instructions',
    description: 'Your saved LEGO MOC wishlist',
    breadcrumb: 'Wishlist',
    icon: 'Heart',
    category: 'primary' as const,
  },

  profile: {
    title: 'Profile - LEGO MOC Instructions',
    description: 'Your profile and account settings',
    breadcrumb: 'Profile',
    icon: 'User',
    category: 'secondary' as const,
  },

  login: {
    title: 'Sign In - LEGO MOC Instructions',
    description: 'Sign in to your account',
    breadcrumb: 'Sign In',
    icon: 'LogIn',
    category: 'utility' as const,
  },

  register: {
    title: 'Sign Up - LEGO MOC Instructions',
    description: 'Create your account',
    breadcrumb: 'Sign Up',
    icon: 'UserPlus',
    category: 'utility' as const,
  },
} as const
