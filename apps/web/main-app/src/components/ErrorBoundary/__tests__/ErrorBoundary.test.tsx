import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary, RouteErrorComponent, useErrorHandler } from '../ErrorBoundary'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock @repo/ui components
vi.mock('@repo/app-component-library', () => ({
  Button: ({
    children,
    onClick,
    variant,
    className,
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
    className?: string
  }) => (
    <button onClick={onClick} data-variant={variant} className={className}>
      {children}
    </button>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 data-testid="card-title" className={className}>
      {children}
    </h2>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="alert-triangle-icon">AlertTriangle</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
  Home: () => <span data-testid="home-icon">Home</span>,
}))

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div data-testid="child-component">Child rendered successfully</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
    vi.clearAllMocks()
  })
  afterEach(() => {
    console.error = originalError
  })

  describe('AC 1: ErrorBoundary component exists', () => {
    it('should export ErrorBoundary component', () => {
      expect(ErrorBoundary).toBeDefined()
      expect(typeof ErrorBoundary).toBe('function')
    })

    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>,
      )

      expect(screen.getByTestId('child-component')).toBeInTheDocument()
      expect(screen.getByText('Child rendered successfully')).toBeInTheDocument()
    })
  })

  describe('AC 2: Catches JavaScript errors in child tree', () => {
    it('should catch rendering errors in child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      )

      // Error UI should be displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      // Child should not be rendered
      expect(screen.queryByTestId('child-component')).not.toBeInTheDocument()
    })

    it('should call componentDidCatch when error occurs', async () => {
      const { logger } = await import('@repo/logger')

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      expect(logger.error).toHaveBeenCalled()
    })

    it('should store error and errorInfo in state', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      // The error UI indicates state was updated correctly
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  describe('AC 3: Displays user-friendly error message', () => {
    it('should display friendly error title', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should display error description', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument()
    })

    it('should display warning icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument()
    })

    it('should display error details in development mode', () => {
      // In development mode (default in test environment), error details should be shown
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      // Should have details element for dev mode - the details element exists
      // even if we can't see the error message due to collapsed state
      const details = screen.queryByRole('group')
      expect(details || screen.getByText(/Error Details/)).toBeTruthy()
    })

    it('should use brand styling with Card components', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getByTestId('card-header')).toBeInTheDocument()
      expect(screen.getByTestId('card-title')).toBeInTheDocument()
      expect(screen.getByTestId('card-content')).toBeInTheDocument()
    })
  })

  describe('AC 4: Try Again button to retry/reload', () => {
    it('should display Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('should display Go Home button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      expect(screen.getByText('Go Home')).toBeInTheDocument()
    })

    it('should reset error state when Try Again is clicked', () => {
      // Create a stateful wrapper that can track error state reset
      let shouldThrowRef = true

      const ThrowErrorConditional = () => {
        if (shouldThrowRef) {
          throw new Error('Test error')
        }
        return <div data-testid="child-component">Child rendered successfully</div>
      }

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowErrorConditional />
        </ErrorBoundary>,
      )

      // Verify error UI is displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()

      // Change the ref so next render won't throw
      shouldThrowRef = false

      // Click Try Again - this resets the error boundary state
      fireEvent.click(screen.getByText('Try Again'))

      // The error boundary has reset its state, so on next render it will
      // try to render children again. We need to force a rerender.
      rerender(
        <ErrorBoundary>
          <ThrowErrorConditional />
        </ErrorBoundary>,
      )

      // After reset with non-throwing child, component should render
      expect(screen.getByTestId('child-component')).toBeInTheDocument()
    })

    it('should navigate to home when Go Home is clicked', () => {
      // Mock window.location
      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      })

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      fireEvent.click(screen.getByText('Go Home'))

      expect(window.location.href).toBe('/')

      window.location = originalLocation
    })

    it('should display button icons', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      expect(screen.getByTestId('refresh-icon')).toBeInTheDocument()
      expect(screen.getByTestId('home-icon')).toBeInTheDocument()
    })
  })

  describe('AC 5: Logs errors for debugging', () => {
    it('should log error via @repo/logger', async () => {
      const { logger } = await import('@repo/logger')

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      expect(logger.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.any(Error),
        expect.any(Object),
      )
    })

    it('should log error details when componentDidCatch is called', async () => {
      const { logger } = await import('@repo/logger')

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>,
      )

      // Should have called logger.error at least once for the caught error
      expect(logger.error).toHaveBeenCalled()

      // Verify logger was called with error information
      const calls = (logger.error as ReturnType<typeof vi.fn>).mock.calls
      expect(calls.length).toBeGreaterThan(0)
      expect(calls[0][0]).toBe('ErrorBoundary caught an error:')
    })
  })

  describe('custom fallback', () => {
    it('should render custom fallback when provided', () => {
      const CustomFallback = <div data-testid="custom-fallback">Custom Error UI</div>

      render(
        <ErrorBoundary fallback={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>,
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })
  })
})

describe('RouteErrorComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render error UI', () => {
    const error = new Error('Route error')

    render(<RouteErrorComponent error={error} />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Go Home')).toBeInTheDocument()
  })

  it('should log error on mount', async () => {
    const { logger } = await import('@repo/logger')
    const error = new Error('Route error')

    render(<RouteErrorComponent error={error} />)

    expect(logger.error).toHaveBeenCalledWith(
      'Route error occurred:',
      expect.objectContaining({
        error: 'Route error',
      }),
    )
  })

  it('should call reset function when provided and Try Again is clicked', () => {
    const resetFn = vi.fn()
    const error = new Error('Route error')

    render(<RouteErrorComponent error={error} reset={resetFn} />)

    fireEvent.click(screen.getByText('Try Again'))

    expect(resetFn).toHaveBeenCalled()
  })

  it('should reload page when reset is not provided and Try Again is clicked', () => {
    const error = new Error('Route error')
    const reloadFn = vi.fn()

    Object.defineProperty(window, 'location', {
      value: { reload: reloadFn, href: '' },
      writable: true,
    })

    render(<RouteErrorComponent error={error} />)

    fireEvent.click(screen.getByText('Try Again'))

    expect(reloadFn).toHaveBeenCalled()
  })

  it('should show error details in dev mode', () => {
    // In test environment, DEV is true by default
    const error = new Error('Route error with details')

    render(<RouteErrorComponent error={error} />)

    // In dev mode, the details element should exist
    const details = screen.queryByRole('group')
    expect(details || screen.getByText(/Error Details/)).toBeTruthy()
  })
})

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a function', () => {
    const TestComponent = () => {
      const handleError = useErrorHandler()
      return <div>{typeof handleError}</div>
    }

    render(<TestComponent />)

    expect(screen.getByText('function')).toBeInTheDocument()
  })

  it('should log error when called', async () => {
    const { logger } = await import('@repo/logger')

    const TestComponent = () => {
      const handleError = useErrorHandler()
      return <button onClick={() => handleError(new Error('Hook error'))}>Trigger Error</button>
    }

    render(<TestComponent />)

    fireEvent.click(screen.getByText('Trigger Error'))

    expect(logger.error).toHaveBeenCalledWith(
      'Error caught by useErrorHandler:',
      expect.any(Error),
      undefined,
    )
  })

  it('should log error with errorInfo when provided', async () => {
    const { logger } = await import('@repo/logger')
    const errorInfo = { componentStack: 'test stack' }

    const TestComponent = () => {
      const handleError = useErrorHandler()
      return (
        <button onClick={() => handleError(new Error('Hook error'), errorInfo as React.ErrorInfo)}>
          Trigger Error
        </button>
      )
    }

    render(<TestComponent />)

    fireEvent.click(screen.getByText('Trigger Error'))

    expect(logger.error).toHaveBeenCalledWith(
      'Error caught by useErrorHandler:',
      expect.any(Error),
      expect.objectContaining({ componentStack: 'test stack' }),
    )
  })
})
