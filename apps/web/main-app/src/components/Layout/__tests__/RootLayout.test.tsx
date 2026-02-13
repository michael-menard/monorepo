import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RootLayout } from '../RootLayout'

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: '/dashboard' }),
  useNavigate: () => vi.fn(),
}))

// Mock react-redux
vi.mock('react-redux', () => ({
  useDispatch: () => vi.fn(),
  useSelector: () => ({
    isAuthenticated: false,
    isLoading: false,
  }),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

// Mock @repo/app-component-library
vi.mock('@repo/app-component-library', () => ({
    LoadingSpinner: ({ size, className }: any) => (
      <div data-testid="loading-spinner" data-size={size} className={className}>
        Loading...
      </div>
    ),
    cn: (...args: any[]) => args.filter(Boolean).join(' '),
    AppTabs: ({ children, value }: any) => (
      <div data-testid="app-tabs" data-value={value}>
        {children}
      </div>
    ),
    AppTabsList: ({ children, variant, className }: any) => (
      <div data-testid="app-tabs-list" data-variant={variant} className={className}>
        {children}
      </div>
    ),
    AppTabsTrigger: ({ children, value, variant, className }: any) => (
      <button data-testid="app-tabs-trigger" data-value={value} data-variant={variant} className={className}>
        {children}
      </button>
    ),
}))

// Mock lucide-react
vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    LayoutDashboard: () => React.createElement('svg', { 'data-testid': 'layout-dashboard-icon' }),
    Heart: () => React.createElement('svg', { 'data-testid': 'heart-icon' }),
    BookOpen: () => React.createElement('svg', { 'data-testid': 'book-open-icon' }),
    Package: () => React.createElement('svg', { 'data-testid': 'package-icon' }),
    Lightbulb: () => React.createElement('svg', { 'data-testid': 'lightbulb-icon' }),
  }
})

// Mock child components
vi.mock('../../Navigation/NavigationProvider', () => ({
  NavigationProvider: ({ children }: any) => <div data-testid="navigation-provider">{children}</div>,
}))

vi.mock('../../PageTransitionSpinner/PageTransitionSpinner', () => ({
  PageTransitionSpinner: () => <div data-testid="page-transition-spinner">Spinner</div>,
}))

vi.mock('../Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}))

vi.mock('../MobileSidebar', () => ({
  MobileSidebar: () => <div data-testid="mobile-sidebar">Mobile Sidebar</div>,
}))

vi.mock('../Footer', () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}))

vi.mock('../MainArea', () => ({
  MainArea: ({ isPageTransitioning, currentPath, children }: any) => (
    <div data-testid="main-area" data-transitioning={isPageTransitioning} data-path={currentPath}>
      Main Area
      {children}
    </div>
  ),
}))

vi.mock('@/services/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: any) => <div data-testid="auth-provider">{children}</div>,
}))

// Mock hooks
vi.mock('@/hooks/useTokenRefresh', () => ({
  useTokenRefresh: () => {},
}))

vi.mock('@/hooks/useNavigationSync', () => ({
  useNavigationSync: () => {},
}))

describe('RootLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render children inside MainArea when not authenticated', () => {
      render(<RootLayout />)

      expect(screen.getByTestId('auth-provider')).toBeInTheDocument()
      expect(screen.getByTestId('main-area')).toBeInTheDocument()
    })

    it('should not show navigation components when not authenticated', () => {
      render(<RootLayout />)

      expect(screen.queryByTestId('header')).not.toBeInTheDocument()
      expect(screen.queryByTestId('footer')).not.toBeInTheDocument()
      expect(screen.queryByTestId('navigation-provider')).not.toBeInTheDocument()
    })
  })
})
