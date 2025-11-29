import { RouterProvider } from '@tanstack/react-router'
import { Provider, useSelector } from 'react-redux'
import { ThemeProvider } from '@repo/ui/providers/ThemeProvider'
import { initializeCognitoTokenManager } from '@repo/api-client/auth/cognito-integration'
import { router } from './routes'
import { store } from './store'
import { AuthProvider } from './services/auth/AuthProvider'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import { selectAuth } from './store/slices/authSlice'

// Initialize enhanced Cognito token manager
// This will be configured with actual tokens from the auth provider
// The enhanced version includes automatic token refresh and caching
initializeCognitoTokenManager()

/**
 * Inner app component that connects auth state to router context
 * This enables route guards to access authentication state
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
          <AuthProvider>
            <InnerApp />
          </AuthProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  )
}
