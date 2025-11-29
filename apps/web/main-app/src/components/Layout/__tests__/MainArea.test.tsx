import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '@testing-library/react'
import { MainArea, MainAreaContainer, MainAreaHeader } from '../MainArea'
import { Home } from 'lucide-react'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid="outlet">Page Content</div>,
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('MainArea', () => {
  describe('rendering', () => {
    it('should render the main element', () => {
      render(<MainArea />)

      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('should render the Outlet for router content', () => {
      render(<MainArea />)

      expect(screen.getByTestId('outlet')).toBeInTheDocument()
      expect(screen.getByText('Page Content')).toBeInTheDocument()
    })
  })

  describe('layout classes (AC: 3, 4, 5)', () => {
    it('should have flex-1 for flexible content area', () => {
      render(<MainArea />)

      const main = screen.getByRole('main')
      expect(main.className).toContain('flex-1')
    })

    it('should have min-height for full viewport', () => {
      render(<MainArea />)

      const main = screen.getByRole('main')
      expect(main.className).toContain('min-h-[calc(100vh-4rem)]')
    })

    it('should have overflow-auto for independent scrolling (AC: 3)', () => {
      render(<MainArea />)

      const main = screen.getByRole('main')
      expect(main.className).toContain('overflow-auto')
    })

    it('should have transition classes for smooth animations', () => {
      render(<MainArea />)

      const main = screen.getByRole('main')
      expect(main.className).toContain('transition-all')
      expect(main.className).toContain('duration-300')
    })
  })

  describe('responsive behavior (AC: 6)', () => {
    it('should have margin for sidebar when authenticated', () => {
      render(<MainArea isAuthenticated={true} />)

      const main = screen.getByRole('main')
      expect(main.className).toContain('md:ml-64')
    })

    it('should not have sidebar margin when not authenticated', () => {
      render(<MainArea isAuthenticated={false} />)

      const main = screen.getByRole('main')
      expect(main.className).not.toContain('md:ml-64')
    })
  })

  describe('custom className', () => {
    it('should accept custom className prop', () => {
      render(<MainArea className="custom-class" />)

      const main = screen.getByRole('main')
      expect(main.className).toContain('custom-class')
    })
  })

  describe('container and page structure', () => {
    it('should have container with proper padding', () => {
      const { container } = render(<MainArea />)

      const containerDiv = container.querySelector('.container')
      expect(containerDiv).toBeInTheDocument()
      expect(containerDiv?.className).toContain('mx-auto')
      expect(containerDiv?.className).toContain('px-4')
      expect(containerDiv?.className).toContain('py-6')
    })
  })
})

describe('MainAreaContainer', () => {
  it('should render children', () => {
    render(
      <MainAreaContainer>
        <div data-testid="child">Child Content</div>
      </MainAreaContainer>,
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Child Content')).toBeInTheDocument()
  })

  it('should have space-y-6 for consistent spacing', () => {
    const { container } = render(
      <MainAreaContainer>
        <div>Content</div>
      </MainAreaContainer>,
    )

    expect(container.firstChild).toHaveClass('space-y-6')
  })

  it('should accept custom className', () => {
    const { container } = render(
      <MainAreaContainer className="custom-spacing">
        <div>Content</div>
      </MainAreaContainer>,
    )

    expect(container.firstChild).toHaveClass('custom-spacing')
  })
})

describe('MainAreaHeader', () => {
  it('should render title', () => {
    render(<MainAreaHeader title="Page Title" />)

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Page Title')).toBeInTheDocument()
  })

  it('should render description when provided', () => {
    render(<MainAreaHeader title="Title" description="Page description text" />)

    expect(screen.getByText('Page description text')).toBeInTheDocument()
  })

  it('should not render description when not provided', () => {
    render(<MainAreaHeader title="Title" />)

    const paragraphs = document.querySelectorAll('p')
    expect(paragraphs.length).toBe(0)
  })

  it('should render icon when provided', () => {
    render(<MainAreaHeader title="Title" icon={Home} />)

    const heading = screen.getByRole('heading', { level: 1 })
    const svg = heading.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should not render icon when not provided', () => {
    render(<MainAreaHeader title="Title" />)

    const heading = screen.getByRole('heading', { level: 1 })
    const svg = heading.querySelector('svg')
    expect(svg).not.toBeInTheDocument()
  })

  it('should render actions when provided', () => {
    render(
      <MainAreaHeader title="Title" actions={<button data-testid="action-btn">Action</button>} />,
    )

    expect(screen.getByTestId('action-btn')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  it('should have proper styling classes', () => {
    const { container } = render(<MainAreaHeader title="Title" />)

    expect(container.firstChild).toHaveClass('space-y-2')
  })

  it('should accept custom className', () => {
    const { container } = render(<MainAreaHeader title="Title" className="custom-header" />)

    expect(container.firstChild).toHaveClass('custom-header')
  })

  it('should have flex layout for title and actions', () => {
    const { container } = render(<MainAreaHeader title="Title" actions={<button>Action</button>} />)

    const flexDiv = container.querySelector('.flex.items-center.justify-between')
    expect(flexDiv).toBeInTheDocument()
  })
})
