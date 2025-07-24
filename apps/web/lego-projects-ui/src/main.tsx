import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import './index.css'
import { router } from './routes/index.js'
import { store, persistor } from './store/index.js'
import { AppInitializer } from './components/AppInitializer/index.js'
import { ErrorBoundary } from './components/ErrorBoundary/index.js'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <AppInitializer>
            <RouterProvider router={router} />
          </AppInitializer>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  </StrictMode>,
)
