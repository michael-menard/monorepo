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

  it('renders with grid mode active', () => {
    render(
      <GalleryViewToggle currentView="grid" onViewChange={mockOnViewChange} />,
    )

    const gridButton = screen.getByRole('button', { name: /grid view/i })
    expect(gridButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onViewChange when table icon clicked', async () => {
    const user = userEvent.setup()

    render(
      <GalleryViewToggle currentView="grid" onViewChange={mockOnViewChange} />,
    )

    await user.click(screen.getByRole('button', { name: /table view/i }))
    expect(mockOnViewChange).toHaveBeenCalledWith('datatable')
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

  it('scrolls to top when view changes', async () => {
    const user = userEvent.setup()
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})

    render(
      <GalleryViewToggle currentView="grid" onViewChange={mockOnViewChange} />,
    )

    await user.click(screen.getByRole('button', { name: /table view/i }))

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })

    scrollToSpy.mockRestore()
  })
})
