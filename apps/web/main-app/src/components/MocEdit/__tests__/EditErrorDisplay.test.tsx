/**
 * Story 3.1.40: EditErrorDisplay Tests
 *
 * Tests for error display component handling various error states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

const mockNavigate = vi.fn()

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="icon-alert-triangle" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  ArrowLeft: () => <span data-testid="icon-arrow-left" />,
  Lock: () => <span data-testid="icon-lock" />,
  FileQuestion: () => <span data-testid="icon-file-question" />,
}))

// Mock @repo/app-component-library components
vi.mock('@repo/app-component-library', () => ({
  Button: ({
    children,
    onClick,
    variant,
    ...props
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
  }) => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  ),
  Alert: ({
    children,
    variant,
    ...props
  }: {
    children: React.ReactNode
    variant?: string
  }) => (
    <div role="alert" data-variant={variant} {...props}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
}))

import { EditErrorDisplay } from '../EditErrorDisplay'

describe('EditErrorDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Unit: Network error', () => {
    it('should display network error message', () => {
      render(
        <EditErrorDisplay
          error={{ status: 'FETCH_ERROR', error: 'Network error' }}
        />
      )

      expect(screen.getByTestId('error-network')).toBeInTheDocument()
      expect(screen.getByText('Connection Error')).toBeInTheDocument()
    })

    it('should show retry button for network errors', () => {
      const onRetry = vi.fn()
      render(
        <EditErrorDisplay
          error={{ status: 'FETCH_ERROR', error: 'Network error' }}
          onRetry={onRetry}
        />
      )

      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()

      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('should display timeout error as network error', () => {
      render(
        <EditErrorDisplay
          error={{ status: 'TIMEOUT_ERROR', error: 'Timeout' }}
        />
      )

      expect(screen.getByTestId('error-network')).toBeInTheDocument()
      expect(screen.getByText(/timed out/i)).toBeInTheDocument()
    })
  })

  describe('Unit: 404 Not Found', () => {
    it('should display not found error', () => {
      render(
        <EditErrorDisplay
          error={{ status: 404, data: { message: 'Not found' } }}
        />
      )

      expect(screen.getByTestId('error-not-found')).toBeInTheDocument()
      expect(screen.getByText('MOC Not Found')).toBeInTheDocument()
    })

    it('should show back button for not found', () => {
      render(
        <EditErrorDisplay
          error={{ status: 404, data: {} }}
          mocSlug="test-moc"
        />
      )

      const backButton = screen.getByRole('button', { name: /go back/i })
      expect(backButton).toBeInTheDocument()

      fireEvent.click(backButton)
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/mocs/$slug',
        params: { slug: 'test-moc' },
      })
    })

    it('should navigate to dashboard if no slug', () => {
      render(
        <EditErrorDisplay
          error={{ status: 404, data: {} }}
        />
      )

      const backButton = screen.getByRole('button', { name: /go back/i })
      fireEvent.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' })
    })
  })

  describe('Unit: 403 Forbidden', () => {
    it('should display forbidden error', () => {
      render(
        <EditErrorDisplay
          error={{ status: 403, data: { message: 'Forbidden' } }}
        />
      )

      expect(screen.getByTestId('error-forbidden')).toBeInTheDocument()
      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })

    it('should show back button for forbidden', () => {
      render(
        <EditErrorDisplay
          error={{ status: 403, data: {} }}
        />
      )

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
    })
  })

  describe('Unit: 401 Unauthorized', () => {
    it('should display sign in message', () => {
      render(
        <EditErrorDisplay
          error={{ status: 401, data: {} }}
        />
      )

      expect(screen.getByTestId('error-forbidden')).toBeInTheDocument()
      expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })

    it('should show sign in button for unauthorized', () => {
      render(
        <EditErrorDisplay
          error={{ status: 401, data: {} }}
        />
      )

      const signInButton = screen.getByRole('button', { name: /sign in/i })
      expect(signInButton).toBeInTheDocument()

      fireEvent.click(signInButton)
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' })
    })
  })

  describe('Unit: Server error (5xx)', () => {
    it('should display generic error for server errors', () => {
      render(
        <EditErrorDisplay
          error={{ status: 500, data: { message: 'Internal server error' } }}
        />
      )

      expect(screen.getByTestId('error-generic')).toBeInTheDocument()
      expect(screen.getByText(/server error/i)).toBeInTheDocument()
    })

    it('should show retry button for server errors', () => {
      const onRetry = vi.fn()
      render(
        <EditErrorDisplay
          error={{ status: 500, data: {} }}
          onRetry={onRetry}
        />
      )

      const retryButton = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalledTimes(1)
    })
  })

  describe('Unit: Generic/Unknown error', () => {
    it('should display error message from error data', () => {
      render(
        <EditErrorDisplay
          error={{
            status: 400,
            data: { error: { message: 'Custom error message' } },
          }}
        />
      )

      expect(screen.getByTestId('error-generic')).toBeInTheDocument()
      expect(screen.getByText('Custom error message')).toBeInTheDocument()
    })

    it('should handle SerializedError', () => {
      render(
        <EditErrorDisplay
          error={{ message: 'Serialized error message', name: 'Error' }}
        />
      )

      expect(screen.getByText('Serialized error message')).toBeInTheDocument()
    })

    it('should show fallback message for undefined error', () => {
      render(<EditErrorDisplay error={undefined} />)

      expect(screen.getByText(/unknown error/i)).toBeInTheDocument()
    })
  })
})
