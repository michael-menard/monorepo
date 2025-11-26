/**
 * Navigation System Test Setup
 * 
 * Common test utilities and mocks for navigation system tests
 */

import { vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { navigationSlice } from '@/store/slices/navigationSlice'

// Mock implementations for common browser APIs
export const mockWindowLocation = () => {
  Object.defineProperty(window, 'location', {
    value: {
      href: '',
      pathname: '/gallery',
      search: '',
      hash: '',
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
    },
    writable: true,
  })
}

export const mockWindowHistory = () => {
  Object.defineProperty(window, 'history', {
    value: {
      back: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      pushState: vi.fn(),
      replaceState: vi.fn(),
      state: null,
      length: 1,
    },
    writable: true,
  })
}

export const mockNavigatorUserAgent = () => {
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    writable: true,
  })
}

// Mock console methods for analytics testing
export const mockConsole = () => {
  const originalConsole = { ...console }
  
  const consoleMocks = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }
  
  Object.assign(console, consoleMocks)
  
  return {
    mocks: consoleMocks,
    restore: () => Object.assign(console, originalConsole),
  }
}

// Create test store with navigation slice
export const createTestStore = (initialState?: any) => {
  return configureStore({
    reducer: {
      navigation: navigationSlice.reducer,
    },
    preloadedState: initialState,
  })
}

// Mock react-router-dom with customizable location
export const createMockRouter = (pathname = '/gallery') => {
  return {
    useLocation: () => ({ pathname, search: '', hash: '', state: null }),
    useNavigate: () => vi.fn(),
    useParams: () => ({}),
    Link: ({ to, children, onClick, ...props }: any) => (
      <a href={to} onClick={onClick} {...props}>
        {children}
      </a>
    ),
    MemoryRouter: ({ children }: any) => <div data-testid="memory-router">{children}</div>,
  }
}

// Test data factories
export const createTestNavigationItem = (overrides = {}) => ({
  id: 'test-item',
  label: 'Test Item',
  href: '/test',
  category: 'primary' as const,
  description: 'Test navigation item',
  keywords: ['test', 'item'],
  ...overrides,
})

export const createTestBreadcrumbs = () => [
  { label: 'Home', href: '/', isClickable: true, icon: 'Home' },
  { label: 'Gallery', href: '/gallery', isClickable: true },
  { label: 'Featured', isClickable: false },
]

// Analytics test helpers
export const expectAnalyticsCall = (consoleMock: any, expectedData: any) => {
  expect(consoleMock).toHaveBeenCalledWith(
    'Navigation Analytics:',
    expect.objectContaining({
      timestamp: expect.any(String),
      userAgent: expect.any(String),
      ...expectedData,
    })
  )
}

// Async test helpers
export const waitForNavigation = async (callback: () => void, timeout = 1000) => {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Navigation timeout'))
    }, timeout)

    const checkNavigation = () => {
      try {
        callback()
        clearTimeout(timeoutId)
        resolve()
      } catch (error) {
        setTimeout(checkNavigation, 10)
      }
    }

    checkNavigation()
  })
}

// Test component wrappers
export const TestNavigationProvider = ({ children, store }: any) => {
  const { Provider } = require('react-redux')
  const { MemoryRouter } = require('react-router-dom')
  const { NavigationProvider } = require('../NavigationProvider')

  return (
    <Provider store={store}>
      <MemoryRouter>
        <NavigationProvider>
          {children}
        </NavigationProvider>
      </MemoryRouter>
    </Provider>
  )
}

// Performance testing helpers
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now()
  renderFn()
  const end = performance.now()
  return end - start
}

// Accessibility testing helpers
export const checkAccessibility = (container: HTMLElement) => {
  // Check for proper ARIA labels
  const buttons = container.querySelectorAll('button')
  buttons.forEach(button => {
    if (!button.getAttribute('aria-label') && !button.textContent?.trim()) {
      throw new Error(`Button without accessible name: ${button.outerHTML}`)
    }
  })

  // Check for proper navigation landmarks
  const nav = container.querySelector('nav')
  if (nav && !nav.getAttribute('aria-label')) {
    console.warn('Navigation element should have aria-label')
  }

  // Check for keyboard navigation support
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  
  return {
    buttonCount: buttons.length,
    focusableCount: focusableElements.length,
    hasNavigation: !!nav,
  }
}

// Error boundary for testing error states
export class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Test Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <div data-testid="error-boundary">Something went wrong: {this.state.error?.message}</div>
    }

    return this.props.children
  }
}
