/**
 * LoadingPage Component Tests
 * Story 1.20: Loading Animation
 *
 * Tests:
 * - LEGO-themed loading animation renders
 * - Accessibility attributes are present
 * - Loading text displays with optional animated dots
 * - Skeleton layout mode works correctly
 * - Different brick sizes render properly
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingPage, LegoBrickAnimation, LoadingText, LoadingSkeleton } from '../pages/LoadingPage'

// Mock framer-motion to avoid animation timing issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('LoadingPage (Story 1.20)', () => {
  describe('Accessibility (AC 6)', () => {
    it('has role="status" attribute', () => {
      render(<LoadingPage />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has aria-busy="true" attribute', () => {
      render(<LoadingPage />)
      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-busy', 'true')
    })

    it('has aria-live="polite" attribute', () => {
      render(<LoadingPage />)
      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-live', 'polite')
    })

    it('has aria-label with message', () => {
      render(<LoadingPage message="Loading dashboard" />)
      const status = screen.getByRole('status')
      expect(status).toHaveAttribute('aria-label', 'Loading dashboard')
    })
  })

  describe('Loading Text (AC 4)', () => {
    it('displays default loading message', () => {
      render(<LoadingPage />)
      expect(screen.getByText('Loading')).toBeInTheDocument()
    })

    it('displays custom message', () => {
      render(<LoadingPage message="Building your MOCs" />)
      expect(screen.getByText('Building your MOCs')).toBeInTheDocument()
    })

    it('shows animated dots by default', () => {
      render(<LoadingPage />)
      // Three dot elements should be rendered
      const dots = screen.getAllByText('.')
      expect(dots).toHaveLength(3)
    })

    it('hides dots when showAnimatedDots is false', () => {
      render(<LoadingPage showAnimatedDots={false} />)
      const dots = screen.queryAllByText('.')
      expect(dots).toHaveLength(0)
    })
  })

  describe('LEGO Animation (AC 2)', () => {
    it('renders 4 LEGO bricks', () => {
      render(<LoadingPage />)
      // Find brick containers (they should have LEGO colors)
      const container = screen.getByRole('status')
      const bricks = container.querySelectorAll(
        '[class*="bg-red-500"], [class*="bg-blue-500"], [class*="bg-yellow-500"], [class*="bg-green-500"]',
      )
      expect(bricks.length).toBe(4)
    })
  })

  describe('Centered Layout (AC 3)', () => {
    it('centers content in viewport', () => {
      render(<LoadingPage />)
      const container = screen.getByRole('status')
      expect(container).toHaveClass('flex')
      expect(container).toHaveClass('items-center')
      expect(container).toHaveClass('justify-center')
    })
  })

  describe('Skeleton Mode', () => {
    it('shows skeleton layout when showSkeleton is true', () => {
      render(<LoadingPage showSkeleton={true} />)
      const container = screen.getByRole('status')
      // Skeleton mode has different class structure
      expect(container).toHaveClass('space-y-6')
    })

    it('shows centered animation when showSkeleton is false', () => {
      render(<LoadingPage showSkeleton={false} />)
      const container = screen.getByRole('status')
      expect(container).toHaveClass('min-h-[50vh]')
    })
  })
})

describe('LegoBrickAnimation', () => {
  it('renders with default size', () => {
    render(<LegoBrickAnimation />)
    const bricks = document.querySelectorAll('.h-8.w-8')
    expect(bricks.length).toBe(4)
  })

  it('renders with small size', () => {
    render(<LegoBrickAnimation size="sm" />)
    const bricks = document.querySelectorAll('.h-6.w-6')
    expect(bricks.length).toBe(4)
  })

  it('renders with large size', () => {
    render(<LegoBrickAnimation size="lg" />)
    const bricks = document.querySelectorAll('.h-10.w-10')
    expect(bricks.length).toBe(4)
  })

  it('has aria-hidden for decorative content', () => {
    render(<LegoBrickAnimation />)
    const container = document.querySelector('[aria-hidden="true"]')
    expect(container).toBeInTheDocument()
  })
})

describe('LoadingText', () => {
  it('renders message text', () => {
    render(<LoadingText message="Loading content" />)
    expect(screen.getByText('Loading content')).toBeInTheDocument()
  })

  it('shows dots by default', () => {
    render(<LoadingText message="Loading" />)
    const dots = screen.getAllByText('.')
    expect(dots).toHaveLength(3)
  })

  it('hides dots when showDots is false', () => {
    render(<LoadingText message="Loading" showDots={false} />)
    const dots = screen.queryAllByText('.')
    expect(dots).toHaveLength(0)
  })
})

describe('LoadingSkeleton', () => {
  it('renders with accessibility attributes', () => {
    render(<LoadingSkeleton />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has aria-busy attribute', () => {
    render(<LoadingSkeleton />)
    const container = screen.getByRole('status')
    expect(container).toHaveAttribute('aria-busy', 'true')
  })

  it('has screen reader text', () => {
    render(<LoadingSkeleton />)
    expect(screen.getByText('Loading content...')).toBeInTheDocument()
  })
})
