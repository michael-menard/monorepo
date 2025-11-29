import { redirect } from '@tanstack/react-router'
import type { AuthState } from '@/store/slices/authSlice'

export interface RouteGuardOptions {
  requireAuth?: boolean
  requireVerified?: boolean
  requireRoles?: string[]
  redirectTo?: string
  allowedPaths?: string[]
  blockedPaths?: string[]
  /** For guest-only routes: redirect authenticated users to this path */
  guestOnly?: boolean
}

/**
 * Create a TanStack Router guard function
 * Compatible with legacy auth-guard patterns from lego-moc-instructions-app
 */
export function createTanStackRouteGuard(
  options: RouteGuardOptions,
  redirectFn: typeof redirect = redirect,
) {
  return ({ context, location }: { context: any; location: any }) => {
    const auth: AuthState = context.auth || {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      tokens: null,
      error: null,
    }

    // Skip guard if still loading
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

    // Check role requirements
    if (options.requireRoles && options.requireRoles.length > 0 && auth.isAuthenticated) {
      const userRoles = auth.user?.roles || []
      const hasRequiredRole = options.requireRoles.some(role => userRoles.includes(role))

      if (!hasRequiredRole) {
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
 */
export const RouteGuards = {
  // Public routes - no authentication required
  public: createTanStackRouteGuard({
    requireAuth: false,
  }),

  // Protected routes - authentication required
  protected: createTanStackRouteGuard({
    requireAuth: true,
    redirectTo: '/login',
  }),

  // Verified routes - authentication and email verification required
  verified: createTanStackRouteGuard({
    requireAuth: true,
    requireVerified: true,
    redirectTo: '/login',
  }),

  // Admin routes - authentication and admin role required
  admin: createTanStackRouteGuard({
    requireAuth: true,
    requireVerified: true,
    requireRoles: ['admin'],
    redirectTo: '/unauthorized',
  }),

  // Guest only routes - redirect authenticated users to dashboard
  guestOnly: createTanStackRouteGuard({
    guestOnly: true,
    redirectTo: '/dashboard',
  }),
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
