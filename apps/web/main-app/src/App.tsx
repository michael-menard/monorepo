import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider, Toaster, TooltipProvider } from '@repo/app-component-library'
import { initializeCognitoTokenManager } from '@repo/api-client/auth/cognito-integration'
import { AppRoutes } from './routes'
import { store } from './store'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import { RootLayout } from './components/Layout/RootLayout'

// Initialize enhanced Cognito token manager
initializeCognitoTokenManager()

export function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider defaultTheme="system" storageKey="main-app-theme">
          <TooltipProvider>
            <BrowserRouter>
              <RootLayout>
                <AppRoutes />
              </RootLayout>
            </BrowserRouter>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  )
}
