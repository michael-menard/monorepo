import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GalleryViewToggle } from '../GalleryViewToggle'

// Mock Framer Motion to avoid animation side effects in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe('GalleryViewToggle', () => {
  const mockOnViewChange = vi.fn()
  const mockOnDismissHint = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders grid and table view buttons', () => {
    render(
      <GalleryViewToggle currentView="grid" onViewChange={mockOnViewChange} />,
    )

    expect(screen.getByRole('button', { name: /grid view/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /table view/i })).toBeInTheDocument()
  })

  it('shows first-time hint when showFirstTimeHint is true', () => {
    render(
      <GalleryViewToggle
        currentView="grid"
        onViewChange={mockOnViewChange}
        showFirstTimeHint
        onDismissHint={mockOnDismissHint}
      />,
    )

    expect(screen.getByText(/try table view/i)).toBeInTheDocument()
  })

  it('calls onDismissHint when hint close button clicked', async () => {
    const user = userEvent.setup()

    render(
      <GalleryViewToggle
        currentView="grid"
        onViewChange={mockOnViewChange}
        showFirstTimeHint
        onDismissHint={mockOnDismissHint}
      />,
    )

    await user.click(screen.getByRole('button', { name: /dismiss hint/i }))
    expect(mockOnDismissHint).toHaveBeenCalled()
  })

  it('has minimum 44x44px touch targets via Tailwind classes', () => {
    render(
      <GalleryViewToggle currentView="grid" onViewChange={mockOnViewChange} />,
    )

    const gridButton = screen.getByRole('button', { name: /grid view/i })
    expect(gridButton.className).toContain('min-w-[44px]')
    expect(gridButton.className).toContain('min-h-[44px]')
  })

  it('has accessible labels for both view modes', () => {
    render(
      <GalleryViewToggle currentView="grid" onViewChange={mockOnViewChange} />,
    )

    expect(screen.getByRole('button', { name: /grid view/i })).toHaveAttribute('aria-label', 'Grid view')
    expect(screen.getByRole('button', { name: /table view/i })).toHaveAttribute('aria-label', 'Table view')
  })

  it('renders with correct test id', () => {
    render(
      <GalleryViewToggle
        currentView="grid"
        onViewChange={mockOnViewChange}
        data-testid="custom-toggle"
      />,
    )

    expect(screen.getByTestId('custom-toggle')).toBeInTheDocument()
  })
})
