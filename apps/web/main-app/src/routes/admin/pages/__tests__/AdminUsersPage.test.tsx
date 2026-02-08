import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminUsersPage } from '../AdminUsersPage'

// Mock @/store hooks
const mockListUsersQuery = vi.fn()
vi.mock('@/store', () => ({
  useListUsersQuery: () => mockListUsersQuery(),
}))

// Mock the components
vi.mock('../../components/UserTable', () => ({
  UserTable: vi.fn(({ users, isLoading, onUserClick }) => {
    const React = require('react')
    if (isLoading) {
      return React.createElement('div', { 'data-testid': 'user-table-loading' }, 'Loading...')
    }
    return React.createElement(
      'div',
      { 'data-testid': 'user-table' },
      users.map((user: { userId: string; email: string }) =>
        React.createElement(
          'div',
          {
            key: user.userId,
            'data-testid': `user-row-${user.userId}`,
            onClick: () => onUserClick(user.userId),
          },
          user.email,
        ),
      ),
    )
  }),
}))

vi.mock('../../components/UserSearchInput', () => ({
  UserSearchInput: vi.fn(({ value, onChange, isLoading }) => {
    const React = require('react')
    return React.createElement('input', {
      'data-testid': 'user-search-input',
      value,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      placeholder: 'Search by email',
      disabled: isLoading,
    })
  }),
}))

// Mock @tanstack/react-router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock @repo/app-component-library
vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Button: vi.fn(({ children, onClick, disabled, variant, ...props }) =>
      React.createElement(
        'button',
        { onClick, disabled, 'data-variant': variant, ...props },
        children,
      ),
    ),
  }
})

// Mock lucide-react icons
vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    Shield: vi.fn(props => React.createElement('svg', { 'data-testid': 'shield-icon', ...props })),
    Users: vi.fn(props => React.createElement('svg', { 'data-testid': 'users-icon', ...props })),
  }
})

/**
 * AdminUsersPage Component Tests
 *
 * Tests the admin user list page including search, pagination,
 * navigation, and error handling.
 */

const mockUsers = [
  {
    userId: 'user-1',
    email: 'john@example.com',
    username: 'johndoe',
    userStatus: 'CONFIRMED',
    enabled: true,
    createdAt: '2024-01-15T10:30:00.000Z',
  },
  {
    userId: 'user-2',
    email: 'jane@example.com',
    username: 'janedoe',
    userStatus: 'CONFIRMED',
    enabled: true,
    createdAt: '2024-02-20T14:00:00.000Z',
  },
]

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListUsersQuery.mockReturnValue({
      data: { users: mockUsers, paginationToken: null },
      isLoading: false,
      isFetching: false,
      error: null,
    })
  })

  describe('rendering', () => {
    it('renders the page heading', () => {
      render(<AdminUsersPage />)

      expect(screen.getByText('User Management')).toBeInTheDocument()
    })

    it('renders the page description', () => {
      render(<AdminUsersPage />)

      expect(screen.getByText('Search and manage user accounts')).toBeInTheDocument()
    })

    it('renders the search input', () => {
      render(<AdminUsersPage />)

      expect(screen.getByTestId('user-search-input')).toBeInTheDocument()
    })

    it('renders the user table', () => {
      render(<AdminUsersPage />)

      expect(screen.getByTestId('user-table')).toBeInTheDocument()
    })

    it('displays user count', () => {
      render(<AdminUsersPage />)

      expect(screen.getByText('2 users')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows loading state in user table when loading', () => {
      mockListUsersQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: false,
        error: null,
      })

      render(<AdminUsersPage />)

      expect(screen.getByTestId('user-table-loading')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message when API fails', () => {
      mockListUsersQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        isFetching: false,
        error: { status: 500, message: 'Server error' },
      })

      render(<AdminUsersPage />)

      expect(screen.getByText('Failed to load users. Please try again.')).toBeInTheDocument()
    })
  })

  describe('search functionality', () => {
    it('updates search state when typing', async () => {
      const user = userEvent.setup()

      render(<AdminUsersPage />)

      const searchInput = screen.getByTestId('user-search-input')
      await user.type(searchInput, 'john@')

      expect(searchInput).toHaveValue('john@')
    })

    it('displays search term in user count', async () => {
      const user = userEvent.setup()

      // Re-render with search query that will be updated
      mockListUsersQuery.mockReturnValue({
        data: { users: [mockUsers[0]], paginationToken: null },
        isLoading: false,
        isFetching: false,
        error: null,
      })

      render(<AdminUsersPage />)

      const searchInput = screen.getByTestId('user-search-input')
      await user.type(searchInput, 'john')

      await waitFor(() => {
        expect(screen.getByText(/matching "john"/)).toBeInTheDocument()
      })
    })
  })

  describe('pagination', () => {
    it('shows Load More button when there is a pagination token', () => {
      mockListUsersQuery.mockReturnValue({
        data: { users: mockUsers, paginationToken: 'next-page-token' },
        isLoading: false,
        isFetching: false,
        error: null,
      })

      render(<AdminUsersPage />)

      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument()
    })

    it('hides Load More button when no pagination token', () => {
      render(<AdminUsersPage />)

      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
    })

    it('disables Load More button while fetching', () => {
      mockListUsersQuery.mockReturnValue({
        data: { users: mockUsers, paginationToken: 'next-page-token' },
        isLoading: false,
        isFetching: true,
        error: null,
      })

      render(<AdminUsersPage />)

      expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled()
    })
  })

  describe('navigation', () => {
    it('navigates to user detail page when clicking a user', async () => {
      const user = userEvent.setup()

      render(<AdminUsersPage />)

      const userRow = screen.getByTestId('user-row-user-1')
      await user.click(userRow)

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/admin/users/$userId',
        params: { userId: 'user-1' },
      })
    })
  })

  describe('empty state', () => {
    it('shows empty user count when no users', () => {
      mockListUsersQuery.mockReturnValue({
        data: { users: [], paginationToken: null },
        isLoading: false,
        isFetching: false,
        error: null,
      })

      render(<AdminUsersPage />)

      expect(screen.getByText('0 users')).toBeInTheDocument()
    })
  })
})
