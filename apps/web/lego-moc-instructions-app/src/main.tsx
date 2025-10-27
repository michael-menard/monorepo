import './polyfills'
import '@repo/ui/globals.css'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { ThemeProvider } from '@repo/ui'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { initializeCSRF } from '@repo/auth'

// Import test auth utilities for development
if (import.meta.env.DEV) {
  import('./utils/testAuth.ts')
}
import { rootRoute } from './routes/root'
import TanStackQueryDemo from './routes/demo.tanstack-query.tsx'
import { homeRoute } from './routes/home.tsx'
import { mocDetailRoute } from './routes/moc-detail.tsx'
import { mocGalleryRoute } from './routes/moc-gallery.tsx'
import { inspirationGalleryRoute } from './routes/inspiration-gallery.tsx'
import { profileRoute } from './routes/profile.tsx'
import { profileDemoRoute } from './routes/profile-demo.tsx'
import { profileRTKDemoRoute } from './routes/profile-rtk-demo.tsx'
import { wishlistRoute } from './routes/wishlist.tsx'
import { settingsRoute } from './routes/settings.tsx'
import { cacheDemoRoute } from './routes/cache-demo.tsx'
import { loginRoute } from './routes/auth/login.tsx'
import { signupRoute } from './routes/auth/signup.tsx'
import { forgotPasswordRoute } from './routes/auth/forgot-password.tsx'
import { resetPasswordRoute } from './routes/auth/reset-password.tsx'
import { verifyEmailRoute } from './routes/auth/verify-email.tsx'
import { unauthorizedRoute } from './routes/unauthorized.tsx'
import { notFoundRoute } from './routes/not-found.tsx'
import { PerformanceProvider } from './providers/PerformanceProvider'
import { UserPreferencesProvider } from './providers/UserPreferencesProvider'
import { PWAProvider } from './components/PWAProvider'
import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'
import reportWebVitals from './reportWebVitals.ts'
import { store } from './store/store'
// Offline API disabled for now; will re-enable after full typing/integration
// import { offlineApi } from './services/offlineApi'

const routeTree = rootRoute.addChildren([
  homeRoute,
  TanStackQueryDemo(rootRoute),
  mocDetailRoute,
  mocGalleryRoute,
  inspirationGalleryRoute,
  profileRoute,
  profileDemoRoute,
  profileRTKDemoRoute,
  wishlistRoute,
  settingsRoute,
  cacheDemoRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  unauthorizedRoute,
  notFoundRoute,
])

const TanStackQueryProviderContext = TanStackQueryProvider.getContext()
const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProviderContext,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Initialize CSRF protection
initializeCSRF().catch(console.error)

const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <ThemeProvider>
        <UserPreferencesProvider>
          <Provider store={store}>
            <PerformanceProvider>
              <PWAProvider>
                <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
                  <RouterProvider router={router} />
                </TanStackQueryProvider.Provider>
              </PWAProvider>
            </PerformanceProvider>
          </Provider>
        </UserPreferencesProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
