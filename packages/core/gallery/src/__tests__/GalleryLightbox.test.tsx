import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { GalleryLightbox } from '../components/GalleryLightbox'
import { useLightbox } from '../hooks/useLightbox'
import { renderHook, act } from '@testing-library/react'

const mockImages = [
  { src: '/image1.jpg', alt: 'Image 1', title: 'First Image' },
  { src: '/image2.jpg', alt: 'Image 2', title: 'Second Image' },
  { src: '/image3.jpg', alt: 'Image 3' },
]

describe('GalleryLightbox', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnNext = vi.fn()
  const mockOnPrev = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders nothing when images array is empty', () => {
      render(
        <GalleryLightbox
          images={[]}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      expect(screen.queryByTestId('gallery-lightbox')).not.toBeInTheDocument()
    })

    it('renders lightbox when open with valid image', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      expect(screen.getByTestId('gallery-lightbox')).toBeInTheDocument()
    })

    it('renders with default data-testid', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      expect(screen.getByTestId('gallery-lightbox')).toBeInTheDocument()
    })

    it('renders with custom data-testid', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
          data-testid="custom-lightbox"
        />,
      )

      expect(screen.getByTestId('custom-lightbox')).toBeInTheDocument()
    })

    it('displays the current image', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      const image = screen.getByTestId('gallery-lightbox-image')
      expect(image).toHaveAttribute('src', '/image1.jpg')
      expect(image).toHaveAttribute('alt', 'Image 1')
    })

    it('displays image title when provided', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      expect(screen.getByTestId('gallery-lightbox-title')).toHaveTextContent('First Image')
    })

    it('does not display title section when image has no title', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={2}
          onOpenChange={mockOnOpenChange}
        />,
      )

      expect(screen.queryByTestId('gallery-lightbox-title')).not.toBeInTheDocument()
    })
  })

  describe('navigation', () => {
    it('shows navigation buttons when multiple images exist', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />,
      )

      expect(screen.getByTestId('gallery-lightbox-prev')).toBeInTheDocument()
      expect(screen.getByTestId('gallery-lightbox-next')).toBeInTheDocument()
    })

    it('hides navigation buttons when only one image', () => {
      render(
        <GalleryLightbox
          images={[mockImages[0]]}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />,
      )

      expect(screen.queryByTestId('gallery-lightbox-prev')).not.toBeInTheDocument()
      expect(screen.queryByTestId('gallery-lightbox-next')).not.toBeInTheDocument()
    })

    it('calls onPrev when previous button is clicked', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={1}
          onOpenChange={mockOnOpenChange}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />,
      )

      fireEvent.click(screen.getByTestId('gallery-lightbox-prev'))
      expect(mockOnPrev).toHaveBeenCalledTimes(1)
    })

    it('calls onNext when next button is clicked', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />,
      )

      fireEvent.click(screen.getByTestId('gallery-lightbox-next'))
      expect(mockOnNext).toHaveBeenCalledTimes(1)
    })

    it('displays position counter', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={1}
          onOpenChange={mockOnOpenChange}
        />,
      )

      expect(screen.getByTestId('gallery-lightbox-counter')).toHaveTextContent('2 of 3')
    })

    it('hides position counter when only one image', () => {
      render(
        <GalleryLightbox
          images={[mockImages[0]]}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      expect(screen.queryByTestId('gallery-lightbox-counter')).not.toBeInTheDocument()
    })
  })

  describe('close behavior', () => {
    it('calls onOpenChange with false when close button is clicked', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      fireEvent.click(screen.getByTestId('gallery-lightbox-close'))
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('accessibility', () => {
    it('has accessible dialog title', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      // The title appears in both sr-only dialog title and visible footer
      expect(screen.getAllByText('First Image').length).toBeGreaterThanOrEqual(1)
    })

    it('has accessible close button', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      expect(screen.getByLabelText('Close lightbox')).toBeInTheDocument()
    })

    it('has accessible navigation buttons', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />,
      )

      expect(screen.getByLabelText('Previous image')).toBeInTheDocument()
      expect(screen.getByLabelText('Next image')).toBeInTheDocument()
    })
  })

  describe('hover-to-show controls', () => {
    it('close button has hidden-until-hover classes', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      const closeButton = screen.getByTestId('gallery-lightbox-close')
      expect(closeButton).toHaveClass('opacity-0')
      expect(closeButton).toHaveClass('group-hover/lightbox:opacity-100')
    })

    it('navigation buttons have hidden-until-hover classes', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />,
      )

      const prevButton = screen.getByTestId('gallery-lightbox-prev')
      const nextButton = screen.getByTestId('gallery-lightbox-next')

      expect(prevButton).toHaveClass('opacity-0')
      expect(prevButton).toHaveClass('group-hover/lightbox:opacity-100')
      expect(nextButton).toHaveClass('opacity-0')
      expect(nextButton).toHaveClass('group-hover/lightbox:opacity-100')
    })

    it('counter has hidden-until-hover classes', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      const counter = screen.getByTestId('gallery-lightbox-counter')
      expect(counter).toHaveClass('opacity-0')
      expect(counter).toHaveClass('group-hover/lightbox:opacity-100')
    })

    it('title overlay has hidden-until-hover classes', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      const title = screen.getByTestId('gallery-lightbox-title')
      expect(title).toHaveClass('opacity-0')
      expect(title).toHaveClass('group-hover/lightbox:opacity-100')
    })

    it('buttons become visible on focus for keyboard accessibility', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
          onNext={mockOnNext}
          onPrev={mockOnPrev}
        />,
      )

      const closeButton = screen.getByTestId('gallery-lightbox-close')
      const prevButton = screen.getByTestId('gallery-lightbox-prev')
      const nextButton = screen.getByTestId('gallery-lightbox-next')

      // Buttons should have focus:opacity-100 class for keyboard accessibility
      expect(closeButton).toHaveClass('focus:opacity-100')
      expect(prevButton).toHaveClass('focus:opacity-100')
      expect(nextButton).toHaveClass('focus:opacity-100')
    })

    it('dialog content has group class for hover targeting', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      const dialogContent = screen.getByTestId('gallery-lightbox')
      expect(dialogContent).toHaveClass('group/lightbox')
    })
  })

  describe('full-area image display', () => {
    it('dialog has dark background for image viewing', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      const dialogContent = screen.getByTestId('gallery-lightbox')
      expect(dialogContent).toHaveClass('bg-black/95')
    })

    it('dialog has no visible border', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      const dialogContent = screen.getByTestId('gallery-lightbox')
      expect(dialogContent).toHaveClass('border-none')
    })

    it('dialog has no padding for full-area image', () => {
      render(
        <GalleryLightbox
          images={mockImages}
          open={true}
          currentIndex={0}
          onOpenChange={mockOnOpenChange}
        />,
      )

      const dialogContent = screen.getByTestId('gallery-lightbox')
      expect(dialogContent).toHaveClass('p-0')
    })
  })
})

describe('useLightbox', () => {
  describe('initial state', () => {
    it('starts with closed state', () => {
      const { result } = renderHook(() => useLightbox(5))

      expect(result.current.open).toBe(false)
      expect(result.current.currentIndex).toBe(0)
    })

    it('reports hasMultipleImages correctly', () => {
      const { result: multipleResult } = renderHook(() => useLightbox(5))
      const { result: singleResult } = renderHook(() => useLightbox(1))

      expect(multipleResult.current.hasMultipleImages).toBe(true)
      expect(singleResult.current.hasMultipleImages).toBe(false)
    })

    it('provides correct position display', () => {
      const { result } = renderHook(() => useLightbox(5))

      expect(result.current.positionDisplay).toBe('1 of 5')
    })
  })

  describe('openLightbox', () => {
    it('opens lightbox at specified index', () => {
      const { result } = renderHook(() => useLightbox(5))

      act(() => {
        result.current.openLightbox(2)
      })

      expect(result.current.open).toBe(true)
      expect(result.current.currentIndex).toBe(2)
    })

    it('clamps index to valid range', () => {
      const { result } = renderHook(() => useLightbox(5))

      act(() => {
        result.current.openLightbox(10)
      })

      expect(result.current.currentIndex).toBe(4) // Max valid index

      act(() => {
        result.current.closeLightbox()
        result.current.openLightbox(-5)
      })

      expect(result.current.currentIndex).toBe(0) // Min valid index
    })
  })

  describe('closeLightbox', () => {
    it('closes the lightbox', () => {
      const { result } = renderHook(() => useLightbox(5))

      act(() => {
        result.current.openLightbox(2)
      })

      expect(result.current.open).toBe(true)

      act(() => {
        result.current.closeLightbox()
      })

      expect(result.current.open).toBe(false)
    })
  })

  describe('navigation', () => {
    it('navigates to next image', () => {
      const { result } = renderHook(() => useLightbox(5))

      act(() => {
        result.current.openLightbox(0)
        result.current.next()
      })

      expect(result.current.currentIndex).toBe(1)
    })

    it('wraps around when going past last image', () => {
      const { result } = renderHook(() => useLightbox(3))

      act(() => {
        result.current.openLightbox(2)
        result.current.next()
      })

      expect(result.current.currentIndex).toBe(0)
    })

    it('navigates to previous image', () => {
      const { result } = renderHook(() => useLightbox(5))

      act(() => {
        result.current.openLightbox(2)
        result.current.prev()
      })

      expect(result.current.currentIndex).toBe(1)
    })

    it('wraps around when going before first image', () => {
      const { result } = renderHook(() => useLightbox(3))

      act(() => {
        result.current.openLightbox(0)
        result.current.prev()
      })

      expect(result.current.currentIndex).toBe(2)
    })

    it('does not navigate when only one image', () => {
      const { result } = renderHook(() => useLightbox(1))

      act(() => {
        result.current.openLightbox(0)
        result.current.next()
      })

      expect(result.current.currentIndex).toBe(0)

      act(() => {
        result.current.prev()
      })

      expect(result.current.currentIndex).toBe(0)
    })

    it('goTo navigates to specific index', () => {
      const { result } = renderHook(() => useLightbox(5))

      act(() => {
        result.current.goTo(3)
      })

      expect(result.current.currentIndex).toBe(3)
    })

    it('goTo clamps to valid range', () => {
      const { result } = renderHook(() => useLightbox(5))

      act(() => {
        result.current.goTo(10)
      })

      expect(result.current.currentIndex).toBe(4)

      act(() => {
        result.current.goTo(-1)
      })

      expect(result.current.currentIndex).toBe(0)
    })
  })

  describe('keyboard navigation', () => {
    it('responds to ArrowRight key when open', () => {
      const { result } = renderHook(() => useLightbox(5))

      act(() => {
        result.current.openLightbox(0)
      })

      act(() => {
        fireEvent.keyDown(document, { key: 'ArrowRight' })
      })

      expect(result.current.currentIndex).toBe(1)
    })

    it('responds to ArrowLeft key when open', () => {
      const { result } = renderHook(() => useLightbox(5))

      act(() => {
        result.current.openLightbox(2)
      })

      act(() => {
        fireEvent.keyDown(document, { key: 'ArrowLeft' })
      })

      expect(result.current.currentIndex).toBe(1)
    })

    it('does not respond to arrow keys when closed', () => {
      const { result } = renderHook(() => useLightbox(5))

      // Set a non-zero index via goTo
      act(() => {
        result.current.goTo(2)
      })

      // Ensure closed
      expect(result.current.open).toBe(false)

      act(() => {
        fireEvent.keyDown(document, { key: 'ArrowRight' })
      })

      expect(result.current.currentIndex).toBe(2) // Should not change
    })
  })

  describe('position display', () => {
    it('updates position display as index changes', () => {
      const { result } = renderHook(() => useLightbox(5))

      expect(result.current.positionDisplay).toBe('1 of 5')

      act(() => {
        result.current.goTo(2)
      })

      expect(result.current.positionDisplay).toBe('3 of 5')

      act(() => {
        result.current.goTo(4)
      })

      expect(result.current.positionDisplay).toBe('5 of 5')
    })
  })
})
