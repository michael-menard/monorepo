
import { RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import { router } from './routes'
import { store } from './store'
import { useAuthRefresh } from './hooks/useAuthRefresh'
import { useEffect } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/ui/toaster'

// Component to handle token refresh on app load
function AuthRefreshHandler() {
  const { refreshAuth } = useAuthRefresh();

  useEffect(() => {
    // Attempt to refresh token on app load
    refreshAuth();
  }, [refreshAuth]);

  return null; // This component doesn't render anything
}

function App() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <AuthRefreshHandler />
        <RouterProvider router={router} />
        <Toaster />
      </ErrorBoundary>
    </Provider>
  )
}

export default App
