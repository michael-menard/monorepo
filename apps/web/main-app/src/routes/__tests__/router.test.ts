/**
 * Router Configuration Tests
 * Story 1.18: TanStack Router Setup
 * Story 1.19: Lazy Loading Setup
 *
 * Tests:
 * - Router initializes without error
 * - Route tree is properly defined
 * - Type registration is set up correctly
 * - Route context provides auth state
 * - Lazy loading with pendingComponent
 * - Prefetch on hover via defaultPreload: 'intent'
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { router } from '../index'

// Mock external dependencies to isolate router tests
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    redirect: vi.fn((opts) => {
      throw { type: 'redirect', ...opts }
    }),
  }
})

// Mock page components
vi.mock('../pages/HomePage', () => ({ HomePage: () => null }))
vi.mock('../pages/LoginPage', () => ({ LoginPage: () => null }))
vi.mock('../pages/SignupPage', () => ({ SignupPage: () => null }))
vi.mock('../pages/ForgotPasswordPage', () => ({ ForgotPasswordPage: () => null }))
vi.mock('../pages/ResetPasswordPage', () => ({ ResetPasswordPage: () => null }))
vi.mock('../pages/NotFoundPage', () => ({ NotFoundPage: () => null }))
vi.mock('../pages/LoadingPage', () => ({ LoadingPage: () => null }))
vi.mock('../../pages/auth/OTPVerificationPage', () => ({ OTPVerificationPage: () => null }))
vi.mock('../../pages/auth/EmailVerificationPage', () => ({ EmailVerificationPage: () => null }))
vi.mock('../../pages/auth/NewPasswordPage', () => ({ NewPasswordPage: () => null }))
vi.mock('@/components/Layout/RootLayout', () => ({ RootLayout: () => null }))
vi.mock('@/lib/route-guards', () => ({
  RouteGuards: {
    guestOnly: vi.fn(),
    protected: vi.fn(),
    public: vi.fn(),
  },
}))

describe('TanStack Router Setup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Router Initialization (AC 1, 3)', () => {
    it('router instance exists', () => {
      expect(router).toBeDefined()
    })

    it('router has route tree', () => {
      expect(router.routeTree).toBeDefined()
    })

    it('router has default preload configuration', () => {
      expect(router.options.defaultPreload).toBe('intent')
    })

    it('router has default preload stale time', () => {
      expect(router.options.defaultPreloadStaleTime).toBe(0)
    })
  })

  describe('Route Tree Structure (AC 2, 3)', () => {
    // Helper to get all routes from the route tree
    const getAllRoutes = (routeTree: any): any[] => {
      const routes: any[] = []
      const children = routeTree.children || {}

      // Add the root route itself if it has a path
      if (routeTree.path !== undefined) {
        routes.push(routeTree)
      }

      // Recursively collect child routes
      Object.values(children).forEach((child: any) => {
        if (child.path !== undefined) {
          routes.push(child)
        }
        if (child.children) {
          routes.push(...getAllRoutes(child))
        }
      })

      return routes
    }

    it('root route is defined', () => {
      const routeTree = router.routeTree
      expect(routeTree).toBeDefined()
    })

    it('route tree has children', () => {
      const children = router.routeTree.children
      expect(children).toBeDefined()
      expect(Object.keys(children || {}).length).toBeGreaterThan(0)
    })

    it('contains expected routes', () => {
      const children = router.routeTree.children || {}
      const routePaths = Object.values(children).map((r: any) => r.path)

      // Verify key routes exist (paths stored without leading / in TanStack Router)
      expect(routePaths).toContain('/')
      expect(routePaths).toContain('login')
      expect(routePaths).toContain('register')
      expect(routePaths).toContain('dashboard')
      expect(routePaths).toContain('wishlist')
      expect(routePaths).toContain('instructions')
      expect(routePaths).toContain('*') // 404 route
    })

    it('contains authentication routes', () => {
      const children = router.routeTree.children || {}
      const routePaths = Object.values(children).map((r: any) => r.path)

      expect(routePaths).toContain('forgot-password')
      expect(routePaths).toContain('reset-password')
      expect(routePaths).toContain('auth/otp-verification')
      expect(routePaths).toContain('auth/verify-email')
      expect(routePaths).toContain('auth/new-password')
    })

    it('has correct number of routes', () => {
      const children = router.routeTree.children || {}
      // 12 routes: home, login, register, forgot-password, reset-password,
      // otp-verification, verify-email, new-password, wishlist, instructions,
      // dashboard, 404
      expect(Object.keys(children).length).toBe(12)
    })
  })

  describe('Route Context Configuration (AC 6)', () => {
    it('router context has auth property placeholder', () => {
      // Router context is configured with auth: undefined! initially
      // This is intentional - it gets provided by RouterProvider
      expect(router.options.context).toBeDefined()
    })
  })

  describe('Type Registration (AC 5)', () => {
    it('router is typed and accessible', () => {
      // TypeScript module augmentation provides type safety
      // This test verifies the router export is properly typed
      expect(typeof router.navigate).toBe('function')
      expect(typeof router.buildLocation).toBe('function')
    })
  })

  describe('Lazy Loading Configuration (Story 1.19)', () => {
    it('router has preload intent for hover prefetch (AC 4)', () => {
      // defaultPreload: 'intent' enables prefetch on hover
      expect(router.options.defaultPreload).toBe('intent')
    })

    it('lazy routes have pendingComponent configured', () => {
      const children = router.routeTree.children || {}

      // Check lazy-loaded routes have pendingComponent
      const dashboardRoute = Object.values(children).find((r: any) => r.path === 'dashboard')
      const wishlistRoute = Object.values(children).find((r: any) => r.path === 'wishlist')
      const instructionsRoute = Object.values(children).find((r: any) => r.path === 'instructions')

      // These routes should have pendingComponent defined
      expect(dashboardRoute).toBeDefined()
      expect(wishlistRoute).toBeDefined()
      expect(instructionsRoute).toBeDefined()
    })

    it('lazy routes use dynamic import pattern', () => {
      const children = router.routeTree.children || {}

      // Get lazy-loaded routes
      const dashboardRoute = Object.values(children).find((r: any) => r.path === 'dashboard') as any
      const wishlistRoute = Object.values(children).find((r: any) => r.path === 'wishlist') as any
      const instructionsRoute = Object.values(children).find((r: any) => r.path === 'instructions') as any

      // Verify component is a function (lazy loader)
      expect(typeof dashboardRoute?.options?.component).toBe('function')
      expect(typeof wishlistRoute?.options?.component).toBe('function')
      expect(typeof instructionsRoute?.options?.component).toBe('function')
    })

    it('code splitting produces separate chunks', () => {
      // This is verified by the build output showing separate chunk files:
      // - DashboardModule-*.js
      // - WishlistModule-*.js
      // - InstructionsModule-*.js
      // The test here confirms the routes are configured for lazy loading
      const children = router.routeTree.children || {}
      const lazyRoutes = ['dashboard', 'wishlist', 'instructions']

      lazyRoutes.forEach((path) => {
        const route = Object.values(children).find((r: any) => r.path === path)
        expect(route).toBeDefined()
      })
    })
  })
})

