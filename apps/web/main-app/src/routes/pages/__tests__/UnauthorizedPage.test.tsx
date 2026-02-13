import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnauthorizedPage } from '../UnauthorizedPage'

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

// Mock @repo/app-component-library
vi.mock('@repo/app-component-library', async () => {
  const React = await import('react')
  return {
    Button: ({ children, onClick, variant, className, asChild, ...props }: any) => {
      if (asChild) {
        return React.cloneElement(React.Children.only(children), { ...props })
      }
      return (
        <button onClick={onClick} data-variant={variant} className={className} {...props}>
          {children}
        </button>
      )
    },
    Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
    CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  }
})

// Mock lucide-react
vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    Home: () => React.createElement('svg', { 'data-testid': 'home-icon' }),
    ArrowLeft: () => React.createElement('svg', { 'data-testid': 'arrow-left-icon' }),
  }
})

describe('UnauthorizedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render 403 text', () => {
      render(<UnauthorizedPage />)

      expect(screen.getByText('403')).toBeInTheDocument()
    })

    it('should show "Access Denied" heading', () => {
      render(<UnauthorizedPage />)

      expect(screen.getByText('Access Denied')).toBeInTheDocument()
    })

    it('should show description message', () => {
      render(<UnauthorizedPage />)

      expect(
        screen.getByText(/Oops! This brick is locked. You don't have permission/i),
      ).toBeInTheDocument()
    })

    it('should render Go Home link', () => {
      render(<UnauthorizedPage />)

      const homeLink = screen.getByText('Go Home').closest('a')
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute('href', '/')
    })

    it('should render Go Back button', () => {
      render(<UnauthorizedPage />)

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
    })

    it('should render home icon', () => {
      render(<UnauthorizedPage />)

      expect(screen.getByTestId('home-icon')).toBeInTheDocument()
    })

    it('should render arrow left icon', () => {
      render(<UnauthorizedPage />)

      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call window.history.back when Go Back button is clicked', async () => {
      const user = userEvent.setup()
      const mockHistoryBack = vi.fn()
      window.history.back = mockHistoryBack

      render(<UnauthorizedPage />)

      const backButton = screen.getByRole('button', { name: /go back/i })
      await user.click(backButton)

      expect(mockHistoryBack).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<UnauthorizedPage />)

      const heading = screen.getByText('Access Denied')
      expect(heading.tagName).toBe('H2')
    })

    it('should have link with correct href', () => {
      render(<UnauthorizedPage />)

      const homeLink = screen.getByText('Go Home').closest('a')
      expect(homeLink).toHaveAttribute('href', '/')
    })

    it('should have buttons with proper roles', () => {
      render(<UnauthorizedPage />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })
})
