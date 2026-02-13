import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotFoundHandler } from '../NotFoundHandler'

// Mock @tanstack/react-router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className, onClick }: any) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
  useNavigate: () => mockNavigate,
}))

// Mock NavigationProvider
const mockTrackNavigation = vi.fn()
vi.mock('../NavigationProvider', () => ({
  useNavigation: () => ({
    trackNavigation: mockTrackNavigation,
  }),
}))

// Mock @repo/app-component-library
vi.mock('@repo/app-component-library', () => ({
  Button: ({ children, onClick, variant, className, ...props }: any) => (
    <button onClick={onClick} data-variant={variant} className={className} {...props}>
      {children}
    </button>
  ),
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
}))

// Mock lucide-react
vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    Home: () => React.createElement('svg', { 'data-testid': 'home-icon' }),
    ArrowLeft: () => React.createElement('svg', { 'data-testid': 'arrow-left-icon' }),
    Search: () => React.createElement('svg', { 'data-testid': 'search-icon' }),
    AlertTriangle: () => React.createElement('svg', { 'data-testid': 'alert-triangle-icon' }),
  }
})

describe('NotFoundHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with default title and description', () => {
      render(<NotFoundHandler />)

      expect(screen.getByText('Page Not Found')).toBeInTheDocument()
      expect(
        screen.getByText("The page you're looking for doesn't exist or has been moved."),
      ).toBeInTheDocument()
    })

    it('should render alert triangle icon', () => {
      render(<NotFoundHandler />)

      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument()
    })

    it('should render with custom title and description', () => {
      render(<NotFoundHandler title="Custom Title" description="Custom description text" />)

      expect(screen.getByText('Custom Title')).toBeInTheDocument()
      expect(screen.getByText('Custom description text')).toBeInTheDocument()
    })

    it('should render both action buttons by default', () => {
      render(<NotFoundHandler />)

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument()
    })

    it('should render search suggestions by default', () => {
      render(<NotFoundHandler />)

      expect(screen.getByText('Browse MOCs')).toBeInTheDocument()
      expect(screen.getByText('MOC Gallery')).toBeInTheDocument()
      expect(screen.getByText('Inspiration Gallery')).toBeInTheDocument()
      expect(screen.getByText('My Wishlist')).toBeInTheDocument()
      expect(screen.getByText('My Profile')).toBeInTheDocument()
    })

    it('should render help text', () => {
      render(<NotFoundHandler />)

      expect(
        screen.getByText(
          /If you believe this is an error, please contact support or try refreshing the page/i,
        ),
      ).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call navigate with ".." when Go Back button is clicked', async () => {
      const user = userEvent.setup()
      render(<NotFoundHandler />)

      const backButton = screen.getByRole('button', { name: /go back/i })
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith({ to: '..' })
      expect(mockTrackNavigation).toHaveBeenCalledWith('404_back', {
        source: 'not_found_handler',
      })
    })

    it('should call navigate with "/" when Go Home button is clicked', async () => {
      const user = userEvent.setup()
      render(<NotFoundHandler />)

      const homeButton = screen.getByRole('button', { name: /go home/i })
      await user.click(homeButton)

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
      expect(mockTrackNavigation).toHaveBeenCalledWith('404_home', {
        source: 'not_found_handler',
      })
    })

    it('should track navigation when search suggestion is clicked', async () => {
      const user = userEvent.setup()
      render(<NotFoundHandler />)

      const browseLink = screen.getByText('Browse MOCs').closest('a')
      await user.click(browseLink!)

      expect(mockTrackNavigation).toHaveBeenCalledWith('404_search_suggestion', {
        source: 'not_found_handler',
        suggestion: 'Browse MOCs',
      })
    })
  })

  describe('conditional rendering', () => {
    it('should hide back button when showBackButton is false', () => {
      render(<NotFoundHandler showBackButton={false} />)

      expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument()
    })

    it('should hide home button when showHomeButton is false', () => {
      render(<NotFoundHandler showHomeButton={false} />)

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /go home/i })).not.toBeInTheDocument()
    })

    it('should hide search suggestions when showSearchSuggestions is false', () => {
      render(<NotFoundHandler showSearchSuggestions={false} />)

      expect(screen.queryByText('Browse MOCs')).not.toBeInTheDocument()
      expect(screen.queryByText('MOC Gallery')).not.toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<NotFoundHandler className="custom-class" />)

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('should render all search suggestion links with correct href attributes', () => {
      render(<NotFoundHandler />)

      expect(screen.getByText('Browse MOCs').closest('a')).toHaveAttribute('href', '/gallery')
      expect(screen.getByText('MOC Gallery').closest('a')).toHaveAttribute('href', '/moc-gallery')
      expect(screen.getByText('Inspiration Gallery').closest('a')).toHaveAttribute(
        'href',
        '/inspiration',
      )
      expect(screen.getByText('My Wishlist').closest('a')).toHaveAttribute('href', '/wishlist')
      expect(screen.getByText('My Profile').closest('a')).toHaveAttribute('href', '/profile')
    })

    it('should have proper button roles', () => {
      render(<NotFoundHandler />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })
  })
})
