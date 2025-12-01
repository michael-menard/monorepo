import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// This configures a Service Worker with the given request handlers
export const worker = setupWorker(...handlers)

// Start the worker in development
if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true') {
  worker.start({
    onUnhandledRequest: 'warn',
  })
}
