import { RouterProvider } from '@tanstack/react-router'
import { Provider, useSelector } from 'react-redux'
import { ThemeProvider, Toaster, TooltipProvider } from '@repo/app-component-library'
import { initializeCognitoTokenManager } from '@repo/api-client/auth/cognito-integration'
import { router } from './routes'
import { store } from './store'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import { selectAuth } from './store/slices/authSlice'

// Initialize enhanced Cognito token manager
// This will be configured with actual tokens from the auth provider
// The enhanced version includes automatic token refresh and caching
initializeCognitoTokenManager()

/**
 * Inner app component that connects auth state to router context
 * This enables route guards to access authentication state
 *
 * Note: AuthProvider is inside RootLayout (the root route component)
 * so it has access to TanStack Router's navigation context.
 * useTokenRefresh is also inside RootLayout since it requires AuthProvider.
 * useNavigationSync is also inside RootLayout since it requires RouterProvider context.
 *
 * Auth failure handler is created during store initialization (Story REPA-019)
 * using dependency injection pattern to avoid Redux coupling in @repo/api-client.
 */
function InnerApp() {
  const auth = useSelector(selectAuth)

  return <RouterProvider router={router} context={{ auth }} />
}

export function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider defaultTheme="system" storageKey="main-app-theme">
          <TooltipProvider>
            <InnerApp />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  )
}
