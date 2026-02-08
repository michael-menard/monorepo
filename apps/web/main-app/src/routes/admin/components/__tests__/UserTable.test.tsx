import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserTable } from '../UserTable'
import type { CognitoUser } from '@repo/api-client'

// Mock the Table components
vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Table: vi.fn(({ children, ...props }) =>
      React.createElement('table', { 'data-testid': 'table', ...props }, children),
    ),
    TableBody: vi.fn(({ children, ...props }) =>
      React.createElement('tbody', props, children),
    ),
    TableCell: vi.fn(({ children, className, ...props }) =>
      React.createElement('td', { className, ...props }, children),
    ),
    TableHead: vi.fn(({ children, className, ...props }) =>
      React.createElement('th', { className, ...props }, children),
    ),
    TableHeader: vi.fn(({ children, ...props }) =>
      React.createElement('thead', props, children),
    ),
    TableRow: vi.fn(({ children, className, onClick, ...props }) =>
      React.createElement('tr', { className, onClick, ...props }, children),
    ),
  }
})

// Mock Lucide icons
vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    CheckCircle: vi.fn(props =>
      React.createElement('svg', { 'data-testid': 'check-circle-icon', ...props }),
    ),
    XCircle: vi.fn(props =>
      React.createElement('svg', { 'data-testid': 'x-circle-icon', ...props }),
    ),
    Loader2: vi.fn(props =>
      React.createElement('svg', { 'data-testid': 'loader-icon', ...props }),
    ),
  }
})

/**
 * UserTable Component Tests
 *
 * Tests the user table display, loading states, and click interactions.
 */

const mockUsers: CognitoUser[] = [
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
    userStatus: 'UNCONFIRMED',
    enabled: true,
    createdAt: '2024-02-20T14:00:00.000Z',
  },
  {
    userId: 'user-3',
    email: null,
    username: 'noemail',
    userStatus: 'CONFIRMED',
    enabled: false,
    createdAt: null,
  },
]

describe('UserTable', () => {
  const mockOnUserClick = vi.fn()

  beforeEach(() => {
    mockOnUserClick.mockClear()
  })

  describe('rendering', () => {
    it('renders user data in table rows', () => {
      render(
        <UserTable
          users={mockUsers}
          isLoading={false}
          onUserClick={mockOnUserClick}
        />,
      )

      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('johndoe')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
      expect(screen.getByText('janedoe')).toBeInTheDocument()
    })

    it('renders table headers', () => {
      render(
        <UserTable
          users={mockUsers}
          isLoading={false}
          onUserClick={mockOnUserClick}
        />,
      )

      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Username')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Created')).toBeInTheDocument()
      expect(screen.getByText('Enabled')).toBeInTheDocument()
    })

    it('displays user status badges', () => {
      render(
        <UserTable
          users={mockUsers}
          isLoading={false}
          onUserClick={mockOnUserClick}
        />,
      )

      // Two users have CONFIRMED status
      expect(screen.getAllByText('CONFIRMED')).toHaveLength(2)
      expect(screen.getByText('UNCONFIRMED')).toBeInTheDocument()
    })

    it('shows "No email" for users without email', () => {
      render(
        <UserTable
          users={mockUsers}
          isLoading={false}
          onUserClick={mockOnUserClick}
        />,
      )

      expect(screen.getByText('No email')).toBeInTheDocument()
    })

    it('shows "N/A" for null created date', () => {
      render(
        <UserTable
          users={mockUsers}
          isLoading={false}
          onUserClick={mockOnUserClick}
        />,
      )

      expect(screen.getByText('N/A')).toBeInTheDocument()
    })

    it('shows check icon for enabled users', () => {
      render(
        <UserTable
          users={[mockUsers[0]]}
          isLoading={false}
          onUserClick={mockOnUserClick}
        />,
      )

      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument()
    })

    it('shows X icon for disabled users', () => {
      render(
        <UserTable
          users={[mockUsers[2]]}
          isLoading={false}
          onUserClick={mockOnUserClick}
        />,
      )

      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows loading spinner when loading', () => {
      render(
        <UserTable
          users={[]}
          isLoading={true}
          onUserClick={mockOnUserClick}
        />,
      )

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    })

    it('does not render table when loading', () => {
      render(
        <UserTable
          users={[]}
          isLoading={true}
          onUserClick={mockOnUserClick}
        />,
      )

      expect(screen.queryByTestId('table')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty message when no users', () => {
      render(
        <UserTable
          users={[]}
          isLoading={false}
          onUserClick={mockOnUserClick}
        />,
      )

      expect(screen.getByText('No users found')).toBeInTheDocument()
    })

    it('does not render table when empty', () => {
      render(
        <UserTable
          users={[]}
          isLoading={false}
          onUserClick={mockOnUserClick}
        />,
      )

      expect(screen.queryByTestId('table')).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onUserClick when row is clicked', async () => {
      const user = userEvent.setup()

      render(
        <UserTable
          users={mockUsers}
          isLoading={false}
          onUserClick={mockOnUserClick}
        />,
      )

      // Click on the first user's email cell
      await user.click(screen.getByText('john@example.com'))

      expect(mockOnUserClick).toHaveBeenCalledWith('user-1')
    })

    it('calls onUserClick with correct user ID for different rows', async () => {
      const user = userEvent.setup()

      render(
        <UserTable
          users={mockUsers}
          isLoading={false}
          onUserClick={mockOnUserClick}
        />,
      )

      await user.click(screen.getByText('jane@example.com'))

      expect(mockOnUserClick).toHaveBeenCalledWith('user-2')
    })
  })

  describe('date formatting', () => {
    it('formats dates correctly', () => {
      render(
        <UserTable
          users={mockUsers}
          isLoading={false}
          onUserClick={mockOnUserClick}
        />,
      )

      // Check that formatted dates are displayed (format depends on locale)
      expect(screen.getByText(/Jan 15, 2024|15 Jan 2024/)).toBeInTheDocument()
    })
  })
})
