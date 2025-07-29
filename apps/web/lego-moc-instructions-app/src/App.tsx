import { Provider } from 'react-redux'
import { BrowserRouter, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Button } from '@repo/ui'
import { RouteGuard } from '@repo/auth'
import { store } from './store/store'
import { config } from './config/environment.js'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RouteGuard>
            <div className="min-h-screen bg-background text-foreground">
              <header className="container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold text-center mb-8">
                  {config.app.name}
                </h1>
                <div className="text-center space-y-4">
                  <p className="text-lg">
                    Welcome to the LEGO MOC Instructions application!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Connected to: {config.api.baseUrl}
                  </p>
                  <div className="space-x-4">
                    <Link to="/moc-instructions">
                      <Button>View MOC Gallery</Button>
                    </Link>
                    <Link to="/profile">
                      <Button variant="outline">View Profile</Button>
                    </Link>
                  </div>
                </div>
              </header>
            </div>
          </RouteGuard>
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </Provider>
  )
}

export default App
