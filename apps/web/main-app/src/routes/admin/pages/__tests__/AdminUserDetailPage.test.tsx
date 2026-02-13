import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminUserDetailPage } from '../AdminUserDetailPage'

const mockNavigate = vi.fn()
const mockGetUserDetailQuery = vi.fn()
const mockRevokeTokensMutation = vi.fn()
const mockBlockUserMutation = vi.fn()
const mockUnblockUserMutation = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/store', () => ({
  useGetUserDetailQuery: () => mockGetUserDetailQuery(),
  useRevokeTokensMutation: () => [mockRevokeTokensMutation, { isLoading: false }],
  useBlockUserMutation: () => [mockBlockUserMutation, { isLoading: false }],
  useUnblockUserMutation: () => [mockUnblockUserMutation, { isLoading: false }],
}))

vi.mock('@repo/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

vi.mock('../components/BlockUserDialog', () => ({
  BlockUserDialog: () => null,
}))

vi.mock('../components/RevokeTokensDialog', () => ({
  RevokeTokensDialog: () => null,
}))

vi.mock('../components/UnblockUserDialog', () => ({
  UnblockUserDialog: () => null,
}))

vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Button: vi.fn(({ children, onClick, ...props }) =>
      React.createElement('button', { onClick, ...props }, children)
    ),
    Badge: vi.fn(({ children, ...props }) =>
      React.createElement('span', { 'data-testid': 'badge', ...props }, children)
    ),
  }
})

vi.mock('lucide-react', async () => {
  const React = await import('react')
  const createIcon = (testId: string) => vi.fn(props =>
    React.createElement('svg', { 'data-testid': testId, ...props })
  )
  return {
    ArrowLeft: createIcon('arrow-left-icon'),
    User: createIcon('user-icon'),
    Mail: createIcon('mail-icon'),
    Calendar: createIcon('calendar-icon'),
    Shield: createIcon('shield-icon'),
    ShieldOff: createIcon('shieldoff-icon'),
    KeyRound: createIcon('keyround-icon'),
    AlertCircle: createIcon('alert-icon'),
    CheckCircle: createIcon('check-icon'),
    XCircle: createIcon('xcircle-icon'),
    Loader2: createIcon('loader-icon'),
  }
})

describe('AdminUserDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders loading state while fetching user', () => {
      mockGetUserDetailQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
      })

      render(<AdminUserDetailPage userId="user-123" />)
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    })

    it('renders error state when user not found', () => {
      mockGetUserDetailQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: { message: 'Not found' },
      })

      render(<AdminUserDetailPage userId="user-123" />)
      expect(screen.getByText(/user not found or failed to load/i)).toBeInTheDocument()
    })
  })
})
