import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Lightbox } from '../index'

// Mock images for testing
const mockImages = [
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg',
  'https://example.com/image3.jpg',
]

const defaultProps = {
  images: mockImages,
  currentIndex: 0,
  onClose: vi.fn(),
}

describe('Lightbox', () => {
  beforeEach(() => {
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    // Mock document.body.style.overflow
    Object.defineProperty(document.body, 'style', {
      value: {},
      writable: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders with correct initial state', () => {
    render(<Lightbox {...defaultProps} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByAltText('Image 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('1 of 3')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('displays correct image based on currentIndex', () => {
    render(<Lightbox {...defaultProps} currentIndex={1} />)

    expect(screen.getByAltText('Image 2 of 3')).toBeInTheDocument()
    expect(screen.getByText('2 of 3')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(<Lightbox {...defaultProps} />)

    const closeButton = screen.getByLabelText('Close lightbox')
    fireEvent.click(closeButton)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking outside the image', () => {
    render(<Lightbox {...defaultProps} />)

    const overlay = screen.getByRole('dialog')
    fireEvent.click(overlay)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('navigates to next image when next button is clicked', () => {
    render(<Lightbox {...defaultProps} />)

    const nextButton = screen.getByLabelText('Next image')
    fireEvent.click(nextButton)

    expect(screen.getByAltText('Image 2 of 3')).toBeInTheDocument()
    expect(screen.getByText('2 of 3')).toBeInTheDocument()
  })

  it('navigates to previous image when previous button is clicked', () => {
    render(<Lightbox {...defaultProps} currentIndex={1} />)

    const prevButton = screen.getByLabelText('Previous image')
    fireEvent.click(prevButton)

    expect(screen.getByAltText('Image 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('1 of 3')).toBeInTheDocument()
  })

  it('wraps around when navigating past the last image', () => {
    render(<Lightbox {...defaultProps} currentIndex={2} />)

    const nextButton = screen.getByLabelText('Next image')
    fireEvent.click(nextButton)

    expect(screen.getByAltText('Image 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('1 of 3')).toBeInTheDocument()
  })

  it('wraps around when navigating before the first image', () => {
    render(<Lightbox {...defaultProps} currentIndex={0} />)

    const prevButton = screen.getByLabelText('Previous image')
    fireEvent.click(prevButton)

    expect(screen.getByAltText('Image 3 of 3')).toBeInTheDocument()
    expect(screen.getByText('3 of 3')).toBeInTheDocument()
  })

  it('disables navigation buttons when there is only one image', () => {
    render(<Lightbox {...defaultProps} images={[mockImages[0]]} />)

    const nextButton = screen.getByLabelText('Next image')
    const prevButton = screen.getByLabelText('Previous image')

    expect(nextButton).toBeDisabled()
    expect(prevButton).toBeDisabled()
  })

  it('zooms in when zoom in button is clicked', () => {
    render(<Lightbox {...defaultProps} />)

    const zoomInButton = screen.getByLabelText('Zoom in')
    fireEvent.click(zoomInButton)

    expect(screen.getByText('120%')).toBeInTheDocument()
  })

  it('zooms out when zoom out button is clicked', () => {
    render(<Lightbox {...defaultProps} />)

    // First zoom in
    const zoomInButton = screen.getByLabelText('Zoom in')
    fireEvent.click(zoomInButton)
    expect(screen.getByText('120%')).toBeInTheDocument()

    // Then zoom out
    const zoomOutButton = screen.getByLabelText('Zoom out')
    fireEvent.click(zoomOutButton)

    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('disables zoom out button when at minimum zoom', () => {
    render(<Lightbox {...defaultProps} />)

    const zoomOutButton = screen.getByLabelText('Zoom out')
    expect(zoomOutButton).toBeDisabled()
  })

  it('disables zoom in button when at maximum zoom', () => {
    render(<Lightbox {...defaultProps} />)

    // Zoom to maximum
    const zoomInButton = screen.getByLabelText('Zoom in')
    for (let i = 0; i < 10; i++) {
      fireEvent.click(zoomInButton)
    }

    expect(zoomInButton).toBeDisabled()
    expect(screen.getByText('300%')).toBeInTheDocument()
  })

  it('shows reset zoom button when zoomed in', () => {
    render(<Lightbox {...defaultProps} />)

    // Initially, reset button should not be visible
    expect(screen.queryByLabelText('Reset zoom')).not.toBeInTheDocument()

    // Zoom in
    const zoomInButton = screen.getByLabelText('Zoom in')
    fireEvent.click(zoomInButton)

    // Reset button should now be visible
    expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument()
  })

  it('resets zoom when reset button is clicked', () => {
    render(<Lightbox {...defaultProps} />)

    // Zoom in
    const zoomInButton = screen.getByLabelText('Zoom in')
    fireEvent.click(zoomInButton)
    expect(screen.getByText('120%')).toBeInTheDocument()

    // Reset zoom
    const resetButton = screen.getByLabelText('Reset zoom')
    fireEvent.click(resetButton)

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.queryByLabelText('Reset zoom')).not.toBeInTheDocument()
  })

  it('resets zoom and position when navigating to a new image', () => {
    render(<Lightbox {...defaultProps} />)

    // Zoom in
    const zoomInButton = screen.getByLabelText('Zoom in')
    fireEvent.click(zoomInButton)
    expect(screen.getByText('120%')).toBeInTheDocument()

    // Navigate to next image
    const nextButton = screen.getByLabelText('Next image')
    fireEvent.click(nextButton)

    // Zoom should be reset
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  describe('Keyboard Navigation', () => {
    it('closes lightbox when Escape key is pressed', () => {
      render(<Lightbox {...defaultProps} />)

      fireEvent.keyDown(window, { key: 'Escape' })

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('navigates to next image when ArrowRight key is pressed', () => {
      render(<Lightbox {...defaultProps} />)

      fireEvent.keyDown(window, { key: 'ArrowRight' })

      expect(screen.getByAltText('Image 2 of 3')).toBeInTheDocument()
      expect(screen.getByText('2 of 3')).toBeInTheDocument()
    })

    it('navigates to previous image when ArrowLeft key is pressed', () => {
      render(<Lightbox {...defaultProps} currentIndex={1} />)

      fireEvent.keyDown(window, { key: 'ArrowLeft' })

      expect(screen.getByAltText('Image 1 of 3')).toBeInTheDocument()
      expect(screen.getByText('1 of 3')).toBeInTheDocument()
    })

    it('zooms in when + key is pressed', () => {
      render(<Lightbox {...defaultProps} />)

      fireEvent.keyDown(window, { key: '+' })

      expect(screen.getByText('120%')).toBeInTheDocument()
    })

    it('zooms in when = key is pressed', () => {
      render(<Lightbox {...defaultProps} />)

      fireEvent.keyDown(window, { key: '=' })

      expect(screen.getByText('120%')).toBeInTheDocument()
    })

    it('zooms out when - key is pressed', () => {
      render(<Lightbox {...defaultProps} />)

      // First zoom in
      fireEvent.keyDown(window, { key: '+' })
      expect(screen.getByText('120%')).toBeInTheDocument()

      // Then zoom out
      fireEvent.keyDown(window, { key: '-' })

      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('goes to first image when Home key is pressed', () => {
      render(<Lightbox {...defaultProps} currentIndex={2} />)

      fireEvent.keyDown(window, { key: 'Home' })

      expect(screen.getByAltText('Image 1 of 3')).toBeInTheDocument()
      expect(screen.getByText('1 of 3')).toBeInTheDocument()
    })

    it('goes to last image when End key is pressed', () => {
      render(<Lightbox {...defaultProps} currentIndex={0} />)

      fireEvent.keyDown(window, { key: 'End' })

      expect(screen.getByAltText('Image 3 of 3')).toBeInTheDocument()
      expect(screen.getByText('3 of 3')).toBeInTheDocument()
    })

    it('wraps around when navigating with arrow keys', () => {
      render(<Lightbox {...defaultProps} currentIndex={2} />)

      // Go to next (should wrap to first)
      fireEvent.keyDown(window, { key: 'ArrowRight' })
      expect(screen.getByAltText('Image 1 of 3')).toBeInTheDocument()

      // Go to previous (should wrap to last)
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      expect(screen.getByAltText('Image 3 of 3')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<Lightbox {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-label', 'Image 1 of 3')
    })

    it('has proper focus management', () => {
      render(<Lightbox {...defaultProps} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveFocus()
    })

    it('has proper button labels', () => {
      render(<Lightbox {...defaultProps} />)

      expect(screen.getByLabelText('Close lightbox')).toBeInTheDocument()
      expect(screen.getByLabelText('Previous image')).toBeInTheDocument()
      expect(screen.getByLabelText('Next image')).toBeInTheDocument()
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument()
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument()
    })

    it('shows keyboard shortcuts hint', () => {
      render(<Lightbox {...defaultProps} />)

      expect(
        screen.getByText('Use arrow keys to navigate, +/- to zoom, Escape to close'),
      ).toBeInTheDocument()
    })
  })

  describe('Body Scroll Prevention', () => {
    it('prevents body scroll when mounted', () => {
      render(<Lightbox {...defaultProps} />)

      expect(document.body.style.overflow).toBe('hidden')
    })

    it('restores body scroll when unmounted', () => {
      // Set initial overflow
      document.body.style.overflow = 'auto'

      const { unmount } = render(<Lightbox {...defaultProps} />)

      unmount()

      expect(document.body.style.overflow).toBe('auto')
    })
  })

  describe('Error Handling', () => {
    it('handles empty images array gracefully', () => {
      expect(() => {
        render(<Lightbox {...defaultProps} images={[]} />)
      }).toThrow('At least one image is required')
    })

    it('handles invalid currentIndex gracefully', () => {
      expect(() => {
        render(<Lightbox {...defaultProps} currentIndex={-1} />)
      }).toThrow()
    })

    it('handles currentIndex out of bounds gracefully', () => {
      // The Zod schema validation happens at runtime, so we need to test the actual validation
      const invalidProps = { ...defaultProps, currentIndex: 5 }
      expect(() => {
        // This should pass the initial render but fail validation when the component tries to use the props
        render(<Lightbox {...invalidProps} />)
      }).not.toThrow()
    })
  })
})
