import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './mocks/server'

// Suppress native canvas/sharp warnings in JSDOM on macOS by mocking heavy native modules
vi.mock('canvas', () => ({
  createCanvas: () => ({ getContext: () => null }),
  loadImage: async () => ({}),
}))
vi.mock('sharp', () => ({
  __esModule: true,
  default: () => ({ toBuffer: async () => Buffer.from('') }),
}))
// Also stub canvas context on the DOM prototype
Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => null),
})

// Mock @tanstack/react-router globally
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
  useParams: () => ({}),
}))

// Establish API mocking before all tests
beforeAll(() => server.listen())

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  server.resetHandlers()

  // Clean up DOM between tests to prevent accumulation
  document.body.innerHTML = ''
  document.head.innerHTML = ''

  // Clear any remaining timers
  vi.clearAllTimers()

  // Reset any global state
  if (typeof window !== 'undefined') {
    // Clear localStorage and sessionStorage
    window.localStorage.clear()
    window.sessionStorage.clear()

    // Reset location if it was modified
    if (window.location.href !== 'http://localhost:3000/') {
      window.history.replaceState({}, '', '/')
    }
  }
})

// Clean up after the tests are finished
afterAll(() => server.close())