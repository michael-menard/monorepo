import { createRouter, createRootRoute, createRoute, redirect } from '@tanstack/react-router'
import { OTPVerificationPage } from '../pages/auth/OTPVerificationPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { LoadingPage } from './pages/LoadingPage'
import { RootLayout } from '@/components/Layout/RootLayout'
import { RouteGuards, ROUTE_METADATA_CONFIG } from '@/lib/route-guards'

// Root route with layout
const rootRoute = createRootRoute({
  component: RootLayout,
})

// Home route
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
  meta: () => [ROUTE_METADATA_CONFIG.home],
})

// Authentication routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
  beforeLoad: RouteGuards.guestOnly,
  meta: () => [ROUTE_METADATA_CONFIG.login],
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: SignupPage,
  beforeLoad: RouteGuards.guestOnly,
  meta: () => [ROUTE_METADATA_CONFIG.register],
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
  beforeLoad: RouteGuards.guestOnly,
  meta: () => [ROUTE_METADATA_CONFIG.forgotPassword],
})

// TODO: Implement ResetPasswordPage and VerifyEmailPage components
// const resetPasswordRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/reset-password',
//   component: () => import('./pages/ResetPasswordPage').then(m => m.ResetPasswordPage),
//   pendingComponent: LoadingPage,
//   beforeLoad: RouteGuards.guestOnly,
// })

// const verifyEmailRoute = createRoute({
//   getParentRoute: () => rootRoute,
//   path: '/verify-email',
//   component: () => import('./pages/VerifyEmailPage').then(m => m.VerifyEmailPage),
//   pendingComponent: LoadingPage,
//   beforeLoad: RouteGuards.protected,
// })

const otpVerificationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/otp-verification',
  component: OTPVerificationPage,
  beforeLoad: RouteGuards.guestOnly,
  meta: () => [{ title: 'Verify Code - LEGO MOC' }],
})

const wishlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wishlist',
  component: () => {
    // Lazy load wishlist module
    return import('./modules/WishlistModule').then(module => module.WishlistModule)
  },
  pendingComponent: LoadingPage,
  beforeLoad: ({ context }) => {
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
  beforeLoad: ({ context }) => {
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
  beforeLoad: ({ context }) => {
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
  otpVerificationRoute,
  wishlistRoute,
  instructionsRoute,
  dashboardRoute,
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
