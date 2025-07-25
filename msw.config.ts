import { setupServer } from 'msw/node';
import { setupWorker } from 'msw';
import { rest } from 'msw';

// Global handlers array, to be extended by each app/package
export const handlers: Parameters<typeof setupServer>[0][] = [];

// For Node.js (backend tests)
export const server = setupServer(...handlers);

// For browser (frontend tests)
export const worker = setupWorker(...handlers);

// Utility to register additional handlers (for apps/packages to extend)
export function registerHandlers(...newHandlers: Parameters<typeof setupServer>[0][]) {
  handlers.push(...newHandlers);
  // Re-apply handlers to server/worker if already started
  if (server.listening) {
    server.resetHandlers(...handlers);
  }
  if (worker) {
    worker.resetHandlers(...handlers);
  }
}

export { rest }; 