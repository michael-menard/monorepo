import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/globals.css'

// Initialize performance monitoring
if (import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true') {
  import('./lib/performance').then(({ performanceMonitor }) => {
    console.log('Performance monitoring enabled')

    // Report initial metrics after app loads
    setTimeout(() => {
      const metrics = performanceMonitor.getMetrics()
      console.log('Initial Performance Metrics:', metrics)
    }, 2000)
  })
}

// Initialize error reporting
if (import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true') {
  // Error reporting will be initialized here
  console.log('Error reporting enabled')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
