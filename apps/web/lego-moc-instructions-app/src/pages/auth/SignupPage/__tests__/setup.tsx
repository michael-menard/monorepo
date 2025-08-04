import { vi } from 'vitest'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Lock: ({ className }: any) => <span className={className}>🔒</span>,
  Mail: ({ className }: any) => <span className={className}>📧</span>,
  User: ({ className }: any) => <span className={className}>👤</span>,
}))

// Mock @tanstack/react-router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
  useParams: () => ({}),
}))

// Export mock for use in tests
export { mockNavigate }

// Mock authApi
vi.mock('../../../../services/authApi', () => ({
  authApi: {
    signup: vi.fn(),
  },
  AuthApiError: class AuthApiError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'AuthApiError'
    }
  },
}))

// Mock window.alert
global.alert = vi.fn()

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
}) 