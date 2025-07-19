/**
 * Vitest Test Setup Configuration
 * Sets up testing environment, global mocks, and utilities
 */
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'

// =============================================================================
// GLOBAL TEST CLEANUP
// =============================================================================

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// =============================================================================
// MOCK BROWSER APIS
// =============================================================================

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// =============================================================================
// MOCK FETCH API
// =============================================================================

// Global fetch mock
global.fetch = vi.fn()

// Helper to mock fetch responses
export const mockFetch = (response: unknown, ok: boolean = true, status: number = 200) => {
  const mockResponse = {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
    headers: new Headers(),
    url: '',
    redirected: false,
    type: 'basic' as ResponseType,
    body: null,
    bodyUsed: false,
    clone: vi.fn(),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  };
  
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockResponse)
}

// Helper to mock fetch errors
export const mockFetchError = (error: Error = new Error('Network error')) => {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error)
}

// =============================================================================
// MOCK FILE APIS
// =============================================================================

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url')
global.URL.revokeObjectURL = vi.fn()

// =============================================================================
// MOCK REACT ROUTER
// =============================================================================

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      pathname: '/',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    }),
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

// =============================================================================
// MOCK EXTERNAL DEPENDENCIES
// =============================================================================

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    form: 'form',
    input: 'input',
    textarea: 'textarea',
    img: 'img',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  useAnimation: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    set: vi.fn(),
  }),
  useMotionValue: (initial: unknown) => ({
    get: () => initial,
    set: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
  }),
}))

// =============================================================================
// ENVIRONMENT VARIABLES
// =============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.VITE_API_URL = 'http://localhost:3001'
process.env.VITE_AUTH_SERVICE_URL = 'http://localhost:3002'

// =============================================================================
// CLEANUP HANDLERS
// =============================================================================

beforeAll(() => {
  // Setup any global test state
})

afterAll(() => {
  // Cleanup any persistent mocks or state
  vi.restoreAllMocks()
}) 