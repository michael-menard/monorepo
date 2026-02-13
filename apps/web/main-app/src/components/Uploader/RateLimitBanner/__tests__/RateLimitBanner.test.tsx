import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RateLimitBanner } from '../index'

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
    Clock: vi.fn(props => React.createElement('svg', { 'data-testid': 'clock-icon', ...props })),
    RefreshCw: vi.fn(props => React.createElement('svg', { 'data-testid': 'refresh-cw-icon', ...props })),
  }
})

describe('RateLimitBanner', () => {
  const mockHandlers = {
    onRetry: vi.fn(),
    onDismiss: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('does not render when not visible', () => {
      render(
        <RateLimitBanner
          visible={false}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
        />,
      )

      expect(screen.queryByTestId('alert')).not.toBeInTheDocument()
    })

    it('renders when visible', () => {
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
        />,
      )

      expect(screen.getByTestId('alert')).toBeInTheDocument()
    })

    it('displays rate limit title and icon', () => {
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
        />,
      )

      expect(screen.getByText('Rate Limit Exceeded')).toBeInTheDocument()
      expect(screen.getByTestId('clock-icon')).toBeInTheDocument()
    })

    it('displays countdown in MM:SS format', () => {
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={125}
          onRetry={mockHandlers.onRetry}
        />,
      )

      expect(screen.getByText(/Please wait 2:05 before retrying/)).toBeInTheDocument()
    })

    it('displays single digit seconds with leading zero', () => {
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={65}
          onRetry={mockHandlers.onRetry}
        />,
      )

      expect(screen.getByText(/Please wait 1:05 before retrying/)).toBeInTheDocument()
    })

    it('displays Retry button', () => {
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
        />,
      )

      expect(screen.getByText('Retry')).toBeInTheDocument()
      expect(screen.getByTestId('refresh-cw-icon')).toBeInTheDocument()
    })

    it('displays Dismiss button when onDismiss provided', () => {
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
          onDismiss={mockHandlers.onDismiss}
        />,
      )

      expect(screen.getByText('Dismiss')).toBeInTheDocument()
    })

    it('does not display Dismiss button when onDismiss not provided', () => {
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
        />,
      )

      expect(screen.queryByText('Dismiss')).not.toBeInTheDocument()
    })

    it('displays progress bar when counting down', () => {
      const { container } = render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
        />,
      )

      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
    })
  })

  describe('interactions', () => {
    it('disables Retry button during countdown', () => {
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
        />,
      )

      const retryButton = screen.getByText('Retry')
      expect(retryButton).toBeDisabled()
    })

    it('enables Retry button when countdown reaches 0', () => {
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={0}
          onRetry={mockHandlers.onRetry}
        />,
      )

      const retryButton = screen.getByText('Retry')
      expect(retryButton).not.toBeDisabled()
    })

    it('calls onRetry when Retry button clicked after countdown', async () => {
      const user = userEvent.setup()
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={0}
          onRetry={mockHandlers.onRetry}
        />,
      )

      const retryButton = screen.getByText('Retry')
      expect(retryButton).not.toBeDisabled()
      await user.click(retryButton)

      expect(mockHandlers.onRetry).toHaveBeenCalledTimes(1)
    })

    it('does not call onRetry when clicked during countdown', async () => {
      const user = userEvent.setup()
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
        />,
      )

      const retryButton = screen.getByText('Retry')
      await user.click(retryButton)

      expect(mockHandlers.onRetry).not.toHaveBeenCalled()
    })

    it('calls onDismiss when Dismiss button clicked', async () => {
      const user = userEvent.setup()
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
          onDismiss={mockHandlers.onDismiss}
        />,
      )

      const dismissButton = screen.getByText('Dismiss')
      await user.click(dismissButton)

      expect(mockHandlers.onDismiss).toHaveBeenCalledTimes(1)
    })

    it('displays ready message when countdown complete', () => {
      render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={0}
          onRetry={mockHandlers.onRetry}
        />,
      )

      expect(screen.getByText('You can now retry your request.')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has role timer for screen reader announcement', () => {
      const { container } = render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
        />,
      )

      const timer = container.querySelector('[role="timer"]')
      expect(timer).toBeInTheDocument()
    })

    it('has aria-live polite on timer', () => {
      const { container } = render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
        />,
      )

      const timer = container.querySelector('[role="timer"]')
      expect(timer).toHaveAttribute('aria-live', 'polite')
    })

    it('announces remaining time for screen readers', () => {
      const { container } = render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={45}
          onRetry={mockHandlers.onRetry}
        />,
      )

      const timer = container.querySelector('[role="timer"]')
      expect(timer).toHaveTextContent('45 seconds remaining until you can retry.')
    })

    it('announces completion for screen readers', () => {
      const { container } = render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={0}
          onRetry={mockHandlers.onRetry}
        />,
      )

      const timer = container.querySelector('[role="timer"]')
      expect(timer).toHaveTextContent('Rate limit expired. You can now retry.')
    })

    it('has aria-label on progress bar', () => {
      const { container } = render(
        <RateLimitBanner
          visible={true}
          retryAfterSeconds={60}
          onRetry={mockHandlers.onRetry}
        />,
      )

      const progressBar = container.querySelector('[role="progressbar"]')
      expect(progressBar).toHaveAttribute('aria-label', 'Rate limit countdown progress')
    })
  })
})
