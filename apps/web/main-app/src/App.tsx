import { RouterProvider } from '@tanstack/react-router'
import { Provider } from 'react-redux'
import { ThemeProvider } from '@repo/ui/providers/ThemeProvider'
import { initializeCognitoTokenManager } from '@repo/api-client/auth/cognito-integration'
import { router } from './routes'
import { store } from './store'
import { AuthProvider } from './services/auth/AuthProvider'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'

// Initialize enhanced Cognito token manager
// This will be configured with actual tokens from the auth provider
// The enhanced version includes automatic token refresh and caching
initializeCognitoTokenManager()

export function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider defaultTheme="system" storageKey="main-app-theme">
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  )
}
