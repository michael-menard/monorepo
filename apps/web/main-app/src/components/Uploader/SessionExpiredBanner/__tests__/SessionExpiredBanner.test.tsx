import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionExpiredBanner } from '../index'

vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Alert: vi.fn(({ children, ...props }) =>
      React.createElement('div', { 'data-testid': 'alert', role: 'alert', ...props }, children),
    ),
    AlertTitle: vi.fn(({ children }) => React.createElement('div', {}, children)),
    AlertDescription: vi.fn(({ children }) => React.createElement('div', {}, children)),
    Button: vi.fn(({ children, onClick, disabled, ...props }) =>
      React.createElement('button', { onClick, disabled, ...props }, children),
    ),
    cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
  }
})

vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    AlertCircle: vi.fn(props =>
      React.createElement('svg', { 'data-testid': 'alert-circle-icon', ...props }),
    ),
    RefreshCw: vi.fn(props => React.createElement('svg', { 'data-testid': 'refresh-cw-icon', ...props })),
  }
})

describe('SessionExpiredBanner', () => {
  const mockHandlers = {
    onRefreshSession: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('does not render when not visible', () => {
      render(
        <SessionExpiredBanner
          visible={false}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
        />,
      )

      expect(screen.queryByTestId('alert')).not.toBeInTheDocument()
    })

    it('does not render when expiredCount is 0', () => {
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={0}
          onRefreshSession={mockHandlers.onRefreshSession}
        />,
      )

      expect(screen.queryByTestId('alert')).not.toBeInTheDocument()
    })

    it('renders when visible and expiredCount > 0', () => {
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
        />,
      )

      expect(screen.getByTestId('alert')).toBeInTheDocument()
    })

    it('displays title and icon', () => {
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
        />,
      )

      expect(screen.getByText('Upload Session Expired')).toBeInTheDocument()
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument()
    })

    it('displays singular message for 1 file', () => {
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
        />,
      )

      expect(screen.getByText('1 file needs a new upload session.')).toBeInTheDocument()
    })

    it('displays plural message for multiple files', () => {
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={5}
          onRefreshSession={mockHandlers.onRefreshSession}
        />,
      )

      expect(screen.getByText('5 files need new upload sessions.')).toBeInTheDocument()
    })

    it('displays Refresh Session button', () => {
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
        />,
      )

      expect(screen.getByText('Refresh Session')).toBeInTheDocument()
      expect(screen.getByTestId('refresh-cw-icon')).toBeInTheDocument()
    })

    it('displays Refreshing... when isRefreshing is true', () => {
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
          isRefreshing={true}
        />,
      )

      expect(screen.getByText('Refreshing...')).toBeInTheDocument()
    })

    it('does not display Refreshing... when isRefreshing is false', () => {
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
          isRefreshing={false}
        />,
      )

      expect(screen.queryByText('Refreshing...')).not.toBeInTheDocument()
      expect(screen.getByText('Refresh Session')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onRefreshSession when button clicked', async () => {
      const user = userEvent.setup()
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
        />,
      )

      const refreshButton = screen.getByText('Refresh Session')
      await user.click(refreshButton)

      expect(mockHandlers.onRefreshSession).toHaveBeenCalledTimes(1)
    })

    it('disables button when isRefreshing is true', () => {
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
          isRefreshing={true}
        />,
      )

      const refreshButton = screen.getByText('Refreshing...')
      expect(refreshButton).toBeDisabled()
    })

    it('does not disable button when isRefreshing is false', () => {
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
          isRefreshing={false}
        />,
      )

      const refreshButton = screen.getByText('Refresh Session')
      expect(refreshButton).not.toBeDisabled()
    })

    it('does not call onRefreshSession when disabled', async () => {
      const user = userEvent.setup()
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
          isRefreshing={true}
        />,
      )

      const refreshButton = screen.getByText('Refreshing...')
      await user.click(refreshButton)

      expect(mockHandlers.onRefreshSession).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has aria-busy on button when refreshing', () => {
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
          isRefreshing={true}
        />,
      )

      const refreshButton = screen.getByText('Refreshing...')
      expect(refreshButton).toHaveAttribute('aria-busy', 'true')
    })

    it('has aria-busy false on button when not refreshing', () => {
      render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
          isRefreshing={false}
        />,
      )

      const refreshButton = screen.getByText('Refresh Session')
      expect(refreshButton).toHaveAttribute('aria-busy', 'false')
    })

    it('has screen reader announcement', () => {
      const { container } = render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
        />,
      )

      const announcement = container.querySelector('[role="alert"][aria-live="assertive"]')
      expect(announcement).toBeInTheDocument()
      expect(announcement).toHaveTextContent(
        'Upload session expired for 1 file. Click Refresh Session to continue uploading.',
      )
    })

    it('announces correct count for multiple files', () => {
      const { container } = render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={5}
          onRefreshSession={mockHandlers.onRefreshSession}
        />,
      )

      const announcement = container.querySelector('[role="alert"][aria-live="assertive"]')
      expect(announcement).toHaveTextContent(
        'Upload session expired for 5 files. Click Refresh Session to continue uploading.',
      )
    })

    it('has aria-live assertive on announcement', () => {
      const { container } = render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
        />,
      )

      const announcement = container.querySelector('[role="alert"][aria-live="assertive"]')
      expect(announcement).toHaveAttribute('aria-live', 'assertive')
    })

    it('announcement is visually hidden', () => {
      const { container } = render(
        <SessionExpiredBanner
          visible={true}
          expiredCount={1}
          onRefreshSession={mockHandlers.onRefreshSession}
        />,
      )

      const announcement = container.querySelector('[role="alert"][aria-live="assertive"]')
      expect(announcement).toHaveClass('sr-only')
    })
  })
})
