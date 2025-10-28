import '@testing-library/jest-dom'
import {afterAll, afterEach, beforeAll, vi} from 'vitest'
import React from 'react'
import {server} from './mocks/server'

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

// Mock window.matchMedia for theme tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock AWS Amplify
vi.mock('aws-amplify/auth', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  confirmSignUp: vi.fn(),
  resendSignUpCode: vi.fn(),
  resetPassword: vi.fn(),
  confirmResetPassword: vi.fn(),
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
}))

// Mock Amplify configuration
vi.mock('../config/amplify', () => ({}))

// Mock @tanstack/react-router globally
const mockNavigate = vi.fn()
const mockCreateMemoryRouter = vi.fn(() => ({
  navigate: mockNavigate,
  state: { location: { pathname: '/auth/verify-email' } },
}))
const mockCreateRootRoute = vi.fn(() => ({
  addChildren: vi.fn(() => ({})),
}))

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useRouter: () => ({
      navigate: mockNavigate,
    }),
    useParams: () => ({}),
    useSearch: () => ({ email: 'test@example.com' }),
    createMemoryRouter: mockCreateMemoryRouter,
    createRootRoute: mockCreateRootRoute,
    RouterProvider: ({ children }: any) => children,
  }
})

// Mock @repo/ui components globally
vi.mock('@repo/ui', async () => {
  const actual = await vi.importActual('@repo/ui')
  return {
    ...actual,
    AppCard: ({ children, className, ...props }: any) => {
      return React.createElement('div', {
        className,
        'data-testid': 'app-card',
        ...props
      }, children)
    },
    Button: ({ children, className, disabled, type, onClick, variant, ...props }: any) => {
      return React.createElement('button', {
        className,
        disabled,
        type,
        onClick,
        ...props
      }, children)
    },
    Input: ({ className, type, placeholder, ...props }: any) => {
      return React.createElement('input', {
        className,
        type,
        placeholder,
        ...props
      })
    },
    Label: ({ children, className, htmlFor, ...props }: any) => {
      return React.createElement('label', {
        className,
        htmlFor,
        ...props
      }, children)
    },
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }
})

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
