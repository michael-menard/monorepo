import { createRouter, createRootRoute, createRoute, redirect } from '@tanstack/react-router'
import { OTPVerificationPage } from '../pages/auth/OTPVerificationPage'
import { EmailVerificationPage } from '../pages/auth/EmailVerificationPage'
import { NewPasswordPage } from '../pages/auth/NewPasswordPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { LoadingPage } from './pages/LoadingPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { InstructionsNewPage } from './pages/InstructionsNewPage'
import { RootLayout } from '@/components/Layout/RootLayout'
import { RouteErrorComponent } from '@/components/ErrorBoundary/ErrorBoundary'
import { RouteGuards } from '@/lib/route-guards'
import type { AuthState } from '@/store/slices/authSlice'

// Route context type
interface RouteContext {
  auth?: AuthState
}

// Root route with layout and error handling
const rootRoute = createRootRoute({
  component: RootLayout,
  errorComponent: RouteErrorComponent,
})

// Home route
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

// Authentication routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: RouteGuards.guestOnly,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: SignupPage,
  beforeLoad: RouteGuards.guestOnly,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
  beforeLoad: RouteGuards.guestOnly,
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
  beforeLoad: RouteGuards.guestOnly,
})

const otpVerificationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/otp-verification',
  component: OTPVerificationPage,
  beforeLoad: RouteGuards.guestOnly,
})

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/verify-email',
  component: EmailVerificationPage,
  beforeLoad: RouteGuards.guestOnly,
})

const newPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/new-password',
  component: NewPasswordPage,
  beforeLoad: RouteGuards.guestOnly,
})

const wishlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wishlist',
  component: () => {
    // Lazy load wishlist module
    return import('./modules/WishlistModule').then(module => module.WishlistModule)
  },
  pendingComponent: LoadingPage,
  beforeLoad: ({ context }: { context: RouteContext }) => {
    // Check authentication
    if (!context.auth?.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
})

const instructionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/instructions',
  component: () => {
    // Lazy load MOC instructions module
    return import('./modules/InstructionsModule').then(module => module.InstructionsModule)
  },
  pendingComponent: LoadingPage,
  beforeLoad: ({ context }: { context: RouteContext }) => {
    // Check authentication
    if (!context.auth?.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
})

// Story 3.1.4: Instructions Detail Page
const instructionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/instructions/$instructionId',
  component: () => {
    // Lazy load instructions detail module
    return import('./modules/InstructionsDetailModule').then(module => module.InstructionsDetail)
  },
  pendingComponent: LoadingPage,
  beforeLoad: ({ context }: { context: RouteContext }) => {
    // Check authentication
    if (!context.auth?.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: () => {
    // Lazy load dashboard module
    return import('./modules/DashboardModule').then(module => module.DashboardModule)
  },
  pendingComponent: LoadingPage,
  beforeLoad: ({ context }: { context: RouteContext }) => {
    // Check authentication
    if (!context.auth?.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
})

// Legacy routes (migrated from lego-moc-instructions-app)
// TODO: Implement missing page components for Sprint 2 Task 3
// const mocGalleryRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/moc-gallery',
//   component: () => import('./pages/MocGalleryPage').then(m => m.MocGalleryPage),
//   pendingComponent: LoadingPage,
// })

// const inspirationGalleryRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/inspiration',
//   component: () => import('./pages/InspirationGalleryPage').then(m => m.InspirationGalleryPage),
//   pendingComponent: LoadingPage,
// })

// const mocDetailRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/moc-detail/$id',
//   component: () => import('./pages/MocDetailPage').then(m => m.MocDetailPage),
//   pendingComponent: LoadingPage,
//   beforeLoad: LegacyRoutePatterns.mocDetail,
// })

// const profileRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/profile',
//   component: () => import('./pages/ProfilePage').then(m => m.ProfilePage),
//   pendingComponent: LoadingPage,
//   beforeLoad: LegacyRoutePatterns.profile,
//   meta: () => [ROUTE_METADATA_CONFIG.profile],
// })

// const settingsRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/settings',
//   component: () => import('./pages/SettingsPage').then(m => m.SettingsPage),
//   pendingComponent: LoadingPage,
//   beforeLoad: RouteGuards.protected,
// })

// Stub routes for planned features
const galleryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gallery',
  component: PlaceholderPage,
})

const galleryDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gallery/$mocId',
  component: PlaceholderPage,
})

const inspirationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/inspiration',
  component: PlaceholderPage,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: PlaceholderPage,
  beforeLoad: ({ context }: { context: RouteContext }) => {
    if (!context.auth?.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: PlaceholderPage,
  beforeLoad: ({ context }: { context: RouteContext }) => {
    if (!context.auth?.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
})

const helpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/help',
  component: PlaceholderPage,
})

const contactRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contact',
  component: PlaceholderPage,
})

const feedbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/feedback',
  component: PlaceholderPage,
})

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: PlaceholderPage,
})

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: PlaceholderPage,
})

const cookiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cookies',
  component: PlaceholderPage,
})

// Story 3.1.9: Instructions uploader with session persistence
const instructionsNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/instructions/new',
  component: InstructionsNewPage,
  beforeLoad: ({
    context,
    location,
  }: {
    context: RouteContext
    location: { pathname: string }
  }) => {
    // Story 3.1.9: Redirect unauthenticated users with redirect param for return
    if (!context.auth?.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { redirect: location.pathname },
      })
    }
  },
})

// Story 3.1.9: Alias route for /dashboard/mocs/upload
const dashboardMocsUploadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard/mocs/upload',
  beforeLoad: () => {
    // Redirect to canonical path
    throw redirect({ to: '/instructions/new' })
  },
})

// 403 Unauthorized route
const unauthorizedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unauthorized',
  component: UnauthorizedPage,
})

// 404 route
const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundPage,
})

// Create route tree
const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  otpVerificationRoute,
  verifyEmailRoute,
  newPasswordRoute,
  wishlistRoute,
  instructionsRoute,
  instructionDetailRoute,
  instructionsNewRoute,
  dashboardMocsUploadRoute, // Story 3.1.9: Alias route
  dashboardRoute,
  // Stub routes for planned features
  galleryRoute,
  galleryDetailRoute,
  inspirationRoute,
  profileRoute,
  settingsRoute,
  helpRoute,
  contactRoute,
  feedbackRoute,
  privacyRoute,
  termsRoute,
  cookiesRoute,
  unauthorizedRoute,
  notFoundRoute,
])

// Create router with context
export const router = createRouter({
  routeTree,
  context: {
    auth: undefined!, // Will be provided by AuthProvider
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// Type registration for type-safe routing
// This enables autocomplete and type-checking for Link, useNavigate, etc.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
