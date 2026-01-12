import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Configure a Service Worker with the given request handlers.
export const worker = setupWorker(...handlers)
