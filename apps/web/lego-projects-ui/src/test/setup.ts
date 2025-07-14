import { vi, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom'

// Mock RTK Query API
vi.mock('@/services/authApi', () => ({
  authApi: {
    reducerPath: 'authApi',
    reducer: vi.fn(),
    middleware: vi.fn(),
  },
  useLoginMutation: () => [
    vi.fn(),
    { isLoading: false, error: null, isSuccess: false }
  ],
  useSignupMutation: () => [
    vi.fn(),
    { isLoading: false, error: null, isSuccess: false }
  ],
  useLogoutMutation: () => [
    vi.fn(),
    { isLoading: false, error: null, isSuccess: false }
  ],
  useRefreshTokenMutation: () => [
    vi.fn(),
    { isLoading: false, error: null, isSuccess: false }
  ],
  useVerifyEmailMutation: () => [
    vi.fn(),
    { isLoading: false, error: null, isSuccess: false }
  ],
  useForgotPasswordMutation: () => [
    vi.fn(),
    { isLoading: false, error: null, isSuccess: false }
  ],
  useResetPasswordMutation: () => [
    vi.fn(),
    { isLoading: false, error: null, isSuccess: false }
  ],
  useSocialLoginMutation: () => [
    vi.fn(),
    { isLoading: false, error: null, isSuccess: false }
  ],
}))

// Mock @packages/auth
const mockUseAuthState = vi.fn()

vi.mock('@packages/auth', () => ({
  useAuthState: mockUseAuthState,
  useAuthActions: vi.fn(() => ({
    login: vi.fn(),
    logout: vi.fn(),
    signup: vi.fn(),
    refreshToken: vi.fn(),
    verifyEmail: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    socialLogin: vi.fn(),
  })),
  authReducer: vi.fn(),
}))

// Export for use in tests
export { mockUseAuthState }

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/', state: null }),
  useParams: () => ({}),
  MemoryRouter: ({ children }: { children: unknown }) => children,
  BrowserRouter: ({ children }: { children: unknown }) => children,
  Link: ({ children, to }: { children: unknown; to: string }) => ({ type: 'a', props: { href: to, children } }),
  NavLink: ({ children, to }: { children: unknown; to: string }) => ({ type: 'a', props: { href: to, children } }),
}))

// Mock Redux store
vi.mock('@/store', () => ({
  store: {
    getState: vi.fn(() => ({
      auth: {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      },
      user: {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      }
    })),
    dispatch: vi.fn(),
    subscribe: vi.fn(),
  }
}))

// Mock environment variables
vi.mock('import.meta.env', () => ({
  VITE_AUTH_API_URL: 'http://localhost:3001',
  VITE_APP_NAME: 'Lego Projects UI',
  VITE_APP_VERSION: '1.0.0',
}))

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  log: vi.fn(),
}

// Mock window.matchMedia
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

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock database connections and API calls
vi.mock('@/hooks/useAuthRefresh', () => ({
  useAuthRefresh: () => ({
    refreshAuth: vi.fn(),
    isLoading: false,
    error: null,
  }),
}))

// Mock any external API calls
vi.mock('@/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// Mock any database connections
vi.mock('@/lib/db', () => ({
  connectDB: vi.fn(),
  disconnectDB: vi.fn(),
}))

// Mock any external services
vi.mock('@/services/external', () => ({
  externalService: {
    call: vi.fn(),
  },
}))

// Mock any WebSocket connections
vi.mock('@/services/websocket', () => ({
  WebSocketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
  },
}))

// Mock any timer functions that might cause hanging
vi.mock('@/utils/timers', () => ({
  setTimeout: vi.fn(),
  setInterval: vi.fn(),
  clearTimeout: vi.fn(),
  clearInterval: vi.fn(),
}))

// Mock any async operations that might hang
vi.mock('@/utils/async', () => ({
  asyncOperation: vi.fn(),
  waitFor: vi.fn(),
}))

// Set test timeout to prevent hanging
beforeEach(() => {
  vi.setConfig({ testTimeout: 5000 })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.clearAllTimers()
}) 