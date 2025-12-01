import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotFoundPage } from '../NotFoundPage'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} data-testid="router-link" {...props}>
      {children}
    </a>
  ),
}))

// Mock UI components
vi.mock('@repo/app-component-library', () => ({
  Button: ({ children, asChild, onClick, ...props }: any) => {
    if (asChild) {
      return (
        <span data-testid="button-wrapper" {...props}>
          {children}
        </span>
      )
    }
    return (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    )
  },
  Card: ({ children, ...props }: any) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, ...props }: any) => (
    <div data-testid="card-content" {...props}>
      {children}
    </div>
  ),
  CardDescription: ({ children, ...props }: any) => (
    <p data-testid="card-description" {...props}>
      {children}
    </p>
  ),
  CardHeader: ({ children, ...props }: any) => (
    <div data-testid="card-header" {...props}>
      {children}
    </div>
  ),
  CardTitle: ({ children, ...props }: any) => (
    <h2 data-testid="card-title" {...props}>
      {children}
    </h2>
  ),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Home: () => <span data-testid="home-icon">Home</span>,
  ArrowLeft: () => <span data-testid="arrow-left-icon">ArrowLeft</span>,
}))

describe('NotFoundPage', () => {
  const mockHistoryBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.history.back
    Object.defineProperty(window, 'history', {
      value: { back: mockHistoryBack },
      writable: true,
    })
  })

  describe('Rendering', () => {
    it('renders the 404 heading', () => {
      render(<NotFoundPage />)

      expect(screen.getByText('404')).toBeInTheDocument()
    })

    it('renders the "Page Not Found" title', () => {
      render(<NotFoundPage />)

      expect(screen.getByText('Page Not Found')).toBeInTheDocument()
    })

    it('renders the friendly error message', () => {
      render(<NotFoundPage />)

      expect(screen.getByText(/This brick seems to be missing from our set/)).toBeInTheDocument()
      expect(screen.getByText(/doesn't exist or has been moved/)).toBeInTheDocument()
    })

    it('renders the LEGO brick illustration', () => {
      render(<NotFoundPage />)

      // SVG should be present with aria-hidden
      const svg = document.querySelector('svg[aria-hidden="true"]')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('renders Go Home link pointing to root', () => {
      render(<NotFoundPage />)

      const homeLink = screen.getByRole('link')
      expect(homeLink).toHaveAttribute('href', '/')
    })

    it('renders Go Home button with home icon', () => {
      render(<NotFoundPage />)

      expect(screen.getByText('Go Home')).toBeInTheDocument()
      expect(screen.getByTestId('home-icon')).toBeInTheDocument()
    })

    it('renders Go Back button with arrow icon', () => {
      render(<NotFoundPage />)

      expect(screen.getByText('Go Back')).toBeInTheDocument()
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument()
    })

    it('calls history.back when Go Back button is clicked', () => {
      render(<NotFoundPage />)

      const goBackButton = screen.getByText('Go Back').closest('button')
      expect(goBackButton).toBeInTheDocument()

      fireEvent.click(goBackButton!)

      expect(mockHistoryBack).toHaveBeenCalledTimes(1)
    })
  })

  describe('Visual Design', () => {
    it('applies gradient colors to 404 heading', () => {
      render(<NotFoundPage />)

      const heading = screen.getByText('404')
      expect(heading).toHaveClass('bg-gradient-to-r', 'from-sky-500', 'to-teal-500')
    })

    it('applies gradient to Go Home button', () => {
      render(<NotFoundPage />)

      const buttonWrapper = screen.getAllByTestId('button-wrapper')[0]
      expect(buttonWrapper).toHaveClass('bg-gradient-to-r', 'from-sky-500', 'to-teal-500')
    })

    it('renders card container', () => {
      render(<NotFoundPage />)

      expect(screen.getByTestId('card')).toBeInTheDocument()
    })

    it('uses responsive flex layout for buttons', () => {
      render(<NotFoundPage />)

      const buttonContainer = screen.getByText('Go Home').closest('.flex')
      expect(buttonContainer).toHaveClass('flex-col', 'sm:flex-row')
    })
  })

  describe('Accessibility', () => {
    it('hides the illustration from screen readers', () => {
      render(<NotFoundPage />)

      const svg = document.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })

    it('has proper heading hierarchy', () => {
      render(<NotFoundPage />)

      const titles = screen.getAllByTestId('card-title')
      expect(titles).toHaveLength(2) // 404 and Page Not Found
    })
  })
})
