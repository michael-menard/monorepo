import React from 'react'
import ReactDOM from 'react-dom/client'
import { logger } from '@repo/logger'
import { App } from './App'
import './styles/globals.css'

// Initialize logger
logger.info('App Dashboard starting up', {
  environment: import.meta.env.MODE,
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
})

// Initialize performance monitoring
if (import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true') {
  logger.info('Performance monitoring enabled')
}

// Initialize error reporting
if (import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true') {
  logger.info('Error reporting enabled')
}

// Initialize MSW in development
async function enableMocking() {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true') {
    const { worker } = await import('./test/mocks/browser')
    return worker.start({
      onUnhandledRequest: 'warn',
    })
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
