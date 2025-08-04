import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createRouter, redirect } from '@tanstack/react-router'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { authSlice } from '@repo/auth'
import { rootRoute } from '../main'
import { homeRoute } from '../routes/home'
import { mocGalleryRoute } from '../routes/moc-gallery'
import { profileRoute } from '../routes/profile'
import { wishlistRoute } from '../routes/wishlist'
import { loginRoute } from '../routes/auth/login'
import { signupRoute } from '../routes/auth/signup'
import { unauthorizedRoute } from '../routes/unauthorized'
import { notFoundRoute } from '../routes/not-found'

// Mock the auth package
vi.mock('@repo/auth', () => ({
  useAuth: vi.fn(),
  createTanStackRouteGuard: vi.fn((options, redirectFn) => {
    return async () => {
      // Mock implementation that calls redirectFn based on options
      if (options.requireAuth && !options.isAuthenticated) {
        throw redirectFn({ to: options.redirectTo || '/auth/login', replace: true })
      }
      if (options.requireGuest && options.isAuthenticated) {
        throw redirectFn({ to: '/', replace: true })
      }
      return undefined
    }
  }),
  authReducer: (state = { isAuthenticated: false, user: null, isLoading: false }, action: any) => state,
  authApi: {
    reducerPath: 'authApi',
    reducer: (state = {}, action: any) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
  authSlice: {
    name: 'auth',
    initialState: {
      isAuthenticated: false,
      user: null,
      isLoading: false,
    },
    reducers: {
      setAuthenticated: vi.fn(),
      setUser: vi.fn(),
      setLoading: vi.fn(),
    },
  },
}))

// Mock the redirect function
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    redirect: vi.fn(),
  }
})

// Mock the moc-instructions package
vi.mock('@repo/moc-instructions', () => ({
  instructionsApi: {
    reducerPath: 'instructionsApi',
    reducer: (state = {}, action: any) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
  instructionsReducer: (state = {}, action: any) => state,
}))

// Mock the api service
vi.mock('../services/api', () => ({
  api: {
    reducerPath: 'api',
    reducer: (state = {}, action: any) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}))

describe('Routing Configuration', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
      },
      preloadedState: {
        auth: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
        },
      },
    })
    vi.clearAllMocks()
    vi.mocked(redirect).mockClear()
  })

  const createTestRouter = (routes: Array<any>) => {
    const routeTree = rootRoute.addChildren(routes)
    return createRouter({
      routeTree,
      defaultPreload: 'intent',
    })
  }

  const renderWithRouter = (router: ReturnType<typeof createRouter>) => {
    return render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    )
  }

  describe('Public Routes', () => {
    it('should allow access to home route without authentication', () => {
      const router = createTestRouter([homeRoute])
      renderWithRouter(router)
      
      // Navigate to home
      router.navigate({ to: '/' })
      
      // Should render home page content
      expect(screen.getByText(/Welcome to the LEGO MOC Instructions application/i)).toBeInTheDocument()
    })

    it('should allow access to MOC gallery without authentication', () => {
      const router = createTestRouter([mocGalleryRoute])
      renderWithRouter(router)
      
      // Navigate to MOC gallery
      router.navigate({ to: '/moc-instructions' })
      
      // Should not redirect (no auth required)
      expect(vi.mocked(redirect)).not.toHaveBeenCalled()
    })

    it('should allow access to unauthorized page without authentication', () => {
      const router = createTestRouter([unauthorizedRoute])
      renderWithRouter(router)
      
      // Navigate to unauthorized page
      router.navigate({ to: '/unauthorized' })
      
      // Should render unauthorized page content
      expect(screen.getByText(/Access Denied/i)).toBeInTheDocument()
    })

    it('should render 404 page for unknown routes', () => {
      const router = createTestRouter([notFoundRoute])
      renderWithRouter(router)
      
      // Navigate to unknown route
      router.navigate({ to: '/unknown-route' })
      
      // Should render 404 page content
      expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument()
    })
  })

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users from profile route', () => {
      const router = createTestRouter([profileRoute])
      renderWithRouter(router)
      
      // Navigate to profile (protected route)
      router.navigate({ to: '/profile' })
      
      // Should redirect to login
      expect(vi.mocked(redirect)).toHaveBeenCalledWith({
        to: '/auth/login',
        replace: true,
      })
    })

    it('should redirect unauthenticated users from wishlist route', () => {
      const router = createTestRouter([wishlistRoute])
      renderWithRouter(router)
      
      // Navigate to wishlist (protected route)
      router.navigate({ to: '/wishlist' })
      
      // Should redirect to login
      expect(vi.mocked(redirect)).toHaveBeenCalledWith({
        to: '/auth/login',
        replace: true,
      })
    })
  })

  describe('Guest Routes', () => {
    it('should redirect authenticated users from login page', () => {
      // Set up authenticated state
      store = configureStore({
        reducer: {
          auth: authSlice.reducer,
        },
        preloadedState: {
          auth: {
            isAuthenticated: true,
            user: { id: '1', email: 'test@example.com', name: 'Test User' },
            isLoading: false,
          },
        },
      })

      const router = createTestRouter([loginRoute])
      renderWithRouter(router)
      
      // Navigate to login (guest route)
      router.navigate({ to: '/auth/login' })
      
      // Should redirect to home
      expect(vi.mocked(redirect)).toHaveBeenCalledWith({
        to: '/',
        replace: true,
      })
    })

    it('should redirect authenticated users from signup page', () => {
      // Set up authenticated state
      store = configureStore({
        reducer: {
          auth: authSlice.reducer,
        },
        preloadedState: {
          auth: {
            isAuthenticated: true,
            user: { id: '1', email: 'test@example.com', name: 'Test User' },
            isLoading: false,
          },
        },
      })

      const router = createTestRouter([signupRoute])
      renderWithRouter(router)
      
      // Navigate to signup (guest route)
      router.navigate({ to: '/auth/signup' })
      
      // Should redirect to home
      expect(vi.mocked(redirect)).toHaveBeenCalledWith({
        to: '/',
        replace: true,
      })
    })
  })

  describe('Route Structure', () => {
    it('should have all required routes configured', () => {
      const router = createTestRouter([
        homeRoute,
        mocGalleryRoute,
        profileRoute,
        wishlistRoute,
        loginRoute,
        signupRoute,
        unauthorizedRoute,
        notFoundRoute,
      ])

      // Check that all routes are registered
      const routePaths = Object.keys(router.routeTree.children)
      expect(routePaths).toContain('/')
      expect(routePaths).toContain('/moc-instructions')
      expect(routePaths).toContain('/profile')
      expect(routePaths).toContain('/wishlist')
      expect(routePaths).toContain('/auth/login')
      expect(routePaths).toContain('/auth/signup')
      expect(routePaths).toContain('/unauthorized')
      expect(routePaths).toContain('*') // 404 route
    })
  })
}) 