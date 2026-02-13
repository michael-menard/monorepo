import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '../Sidebar'

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className, onClick }: any) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/dashboard' }),
}))

// Mock react-redux
vi.mock('react-redux', () => ({
  useSelector: (selector: any) => {
    const state = {
      navigation: {
        primary: [
          { id: 'home', label: 'Home', href: '/', icon: 'Home' },
          { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
          { id: 'wishlist', label: 'Wishlist', href: '/wishlist', icon: 'Heart' },
        ],
      },
      auth: {
        isAuthenticated: true,
      },
    }

    const selectorName = selector.name
    if (selectorName === 'selectPrimaryNavigation') {
      return state.navigation.primary
    }
    if (selectorName === 'selectAuth') {
      return state.auth
    }
    return []
  },
}))

// Mock @repo/app-component-library
vi.mock('@repo/app-component-library', () => ({
  CustomButton: ({ children, onClick, variant, className, ...props }: any) => (
    <button onClick={onClick} data-variant={variant} className={className} {...props}>
      {children}
    </button>
  ),
  AppBadge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
  ),
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock lucide-react
vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    Home: () => React.createElement('svg', { 'data-testid': 'home-icon' }),
    Images: () => React.createElement('svg', { 'data-testid': 'images-icon' }),
    Heart: () => React.createElement('svg', { 'data-testid': 'heart-icon' }),
    BookOpen: () => React.createElement('svg', { 'data-testid': 'book-open-icon' }),
    LayoutDashboard: () => React.createElement('svg', { 'data-testid': 'layout-dashboard-icon' }),
    Settings: () => React.createElement('svg', { 'data-testid': 'settings-icon' }),
    HelpCircle: () => React.createElement('svg', { 'data-testid': 'help-circle-icon' }),
    ChevronRight: () => React.createElement('svg', { 'data-testid': 'chevron-right-icon' }),
    Search: () => React.createElement('svg', { 'data-testid': 'search-icon' }),
    Lightbulb: () => React.createElement('svg', { 'data-testid': 'lightbulb-icon' }),
    User: () => React.createElement('svg', { 'data-testid': 'user-icon' }),
    Package: () => React.createElement('svg', { 'data-testid': 'package-icon' }),
  }
})

// Mock QuickActions
vi.mock('../../Navigation/QuickActions', () => ({
  QuickActions: ({ variant, showRecentlyVisited, maxItems, className }: any) => (
    <div
      data-testid="quick-actions"
      data-variant={variant}
      data-show-recently-visited={showRecentlyVisited}
      data-max-items={maxItems}
      className={className}
    >
      Quick Actions
    </div>
  ),
}))

// Mock NavigationProvider
const mockTrackNavigation = vi.fn()
vi.mock('../../Navigation/NavigationProvider', () => ({
  useNavigation: () => ({
    trackNavigation: mockTrackNavigation,
  }),
}))

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the LEGO MOC Hub header', () => {
      render(<Sidebar />)

      expect(screen.getByText('LEGO MOC Hub')).toBeInTheDocument()
    })

    it('should render navigation items from Redux state', () => {
      render(<Sidebar />)

      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Wishlist')).toBeInTheDocument()
    })

    it('should render settings link', () => {
      render(<Sidebar />)

      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('should render help and support link', () => {
      render(<Sidebar />)

      expect(screen.getByText('Help & Support')).toBeInTheDocument()
    })

    it('should render QuickActions component', () => {
      render(<Sidebar />)

      expect(screen.getByTestId('quick-actions')).toBeInTheDocument()
    })

    it('should render version info in footer', () => {
      render(<Sidebar />)

      expect(screen.getByText('LEGO MOC Instructions')).toBeInTheDocument()
      expect(screen.getByText(/Version/i)).toBeInTheDocument()
    })

    it('should render navigation section heading', () => {
      render(<Sidebar />)

      expect(screen.getByText('Navigation')).toBeInTheDocument()
    })

    it('should render account section heading', () => {
      render(<Sidebar />)

      expect(screen.getByText('Account')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should render as an aside element', () => {
      const { container } = render(<Sidebar />)

      expect(container.querySelector('aside')).toBeInTheDocument()
    })

    it('should render navigation links with correct href attributes', () => {
      render(<Sidebar />)

      expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/')
      expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard')
      expect(screen.getByText('Wishlist').closest('a')).toHaveAttribute('href', '/wishlist')
      expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings')
      expect(screen.getByText('Help & Support').closest('a')).toHaveAttribute('href', '/help')
    })
  })
})
