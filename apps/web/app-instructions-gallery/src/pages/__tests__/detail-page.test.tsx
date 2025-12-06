/**
 * DetailPage Component Tests
 * Story 3.1.4: Instructions Detail Page
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DetailPage, DetailPageSkeleton, DetailPageNotFound } from '../detail-page'
import type { Instruction } from '../../__types__'

// Mock @repo/app-component-library
vi.mock('@repo/app-component-library', () => ({
  Button: vi.fn(
    ({
      children,
      onClick,
      variant,
      size,
      'aria-label': ariaLabel,
      'data-testid': testId,
      asChild,
    }) => {
      if (asChild) {
        return <span data-testid={testId}>{children}</span>
      }
      return (
        <button
          onClick={onClick}
          data-variant={variant}
          data-size={size}
          aria-label={ariaLabel}
          data-testid={testId}
        >
          {children}
        </button>
      )
    },
  ),
  Badge: vi.fn(({ children, variant, 'data-testid': testId }) => (
    <span data-testid={testId} data-variant={variant}>
      {children}
    </span>
  )),
  Card: vi.fn(({ children }) => <div data-testid="card">{children}</div>),
  CardContent: vi.fn(({ children, className }) => <div className={className}>{children}</div>),
  CardHeader: vi.fn(({ children }) => <div>{children}</div>),
  CardTitle: vi.fn(({ children }) => <h3>{children}</h3>),
  Skeleton: vi.fn(({ className }) => <div data-testid="skeleton" className={className} />),
  cn: (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' '),
}))

// Mock @repo/gallery
vi.mock('@repo/gallery', () => ({
  GalleryGrid: vi.fn(({ children }) => <div data-testid="gallery-grid">{children}</div>),
  GalleryLightbox: vi.fn(({ open, 'data-testid': testId }) =>
    open ? <div data-testid={testId}>Lightbox Open</div> : null,
  ),
  useLightbox: vi.fn(() => ({
    open: false,
    currentIndex: 0,
    openLightbox: vi.fn(),
    closeLightbox: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    goTo: vi.fn(),
    hasMultipleImages: false,
    positionDisplay: '1 of 1',
  })),
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  ArrowLeft: vi.fn(() => <svg data-testid="arrow-left-icon" />),
  Heart: vi.fn(({ className }) => <svg data-testid="heart-icon" className={className} />),
  Pencil: vi.fn(() => <svg data-testid="pencil-icon" />),
  Download: vi.fn(() => <svg data-testid="download-icon" />),
  BookOpen: vi.fn(() => <svg data-testid="book-open-icon" />),
}))

const mockInstruction: Instruction = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  name: 'Test Technic Supercar',
  description: 'A detailed supercar model with working features.',
  thumbnail: 'https://example.com/thumbnail.jpg',
  images: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
    'https://example.com/image3.jpg',
  ],
  pieceCount: 3599,
  theme: 'Technic',
  tags: ['vehicle', 'supercar', 'advanced'],
  pdfUrl: 'https://example.com/instructions.pdf',
  createdAt: '2025-01-10T10:30:00Z',
  updatedAt: '2025-01-15T14:20:00Z',
  isFavorite: true,
}

describe('DetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('renders skeleton when isLoading is true', () => {
      render(<DetailPage instruction={null} isLoading={true} />)

      expect(screen.getByTestId('detail-page-skeleton')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('renders error message when error prop is provided', () => {
      render(<DetailPage instruction={null} error="Failed to load instruction" />)

      expect(screen.getByTestId('detail-page-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load instruction')).toBeInTheDocument()
    })

    it('renders back button in error state when onBack is provided', () => {
      const handleBack = vi.fn()
      render(<DetailPage instruction={null} error="Error" onBack={handleBack} />)

      expect(screen.getByText('Back to Gallery')).toBeInTheDocument()
    })
  })

  describe('Not Found State', () => {
    it('renders not found when instruction is null', () => {
      render(<DetailPage instruction={null} />)

      expect(screen.getByTestId('detail-page-not-found')).toBeInTheDocument()
      expect(screen.getByText('Instruction Not Found')).toBeInTheDocument()
    })
  })

  describe('Successful Render', () => {
    it('renders instruction details', () => {
      render(<DetailPage instruction={mockInstruction} />)

      expect(screen.getByTestId('detail-page')).toBeInTheDocument()
      expect(screen.getByTestId('instruction-title')).toHaveTextContent('Test Technic Supercar')
    })

    it('displays piece count', () => {
      render(<DetailPage instruction={mockInstruction} />)

      expect(screen.getByTestId('piece-count')).toHaveTextContent('3,599 pieces')
    })

    it('displays theme badge', () => {
      render(<DetailPage instruction={mockInstruction} />)

      expect(screen.getByTestId('theme-badge')).toHaveTextContent('Technic')
    })

    it('displays tags', () => {
      render(<DetailPage instruction={mockInstruction} />)

      const tagsList = screen.getByTestId('tags-list')
      expect(tagsList).toHaveTextContent('vehicle')
      expect(tagsList).toHaveTextContent('supercar')
      expect(tagsList).toHaveTextContent('advanced')
    })

    it('displays description when available', () => {
      render(<DetailPage instruction={mockInstruction} />)

      expect(screen.getByTestId('description')).toHaveTextContent('A detailed supercar model')
    })

    it('displays created date', () => {
      render(<DetailPage instruction={mockInstruction} />)

      expect(screen.getByTestId('created-date')).toBeInTheDocument()
    })

    it('renders PDF download button when pdfUrl is available', () => {
      render(<DetailPage instruction={mockInstruction} />)

      expect(screen.getByTestId('download-pdf-button')).toBeInTheDocument()
    })

    it('does not render PDF button when pdfUrl is not available', () => {
      const instructionWithoutPdf = { ...mockInstruction, pdfUrl: undefined }
      render(<DetailPage instruction={instructionWithoutPdf} />)

      expect(screen.queryByTestId('download-pdf-button')).not.toBeInTheDocument()
    })
  })

  describe('Image Gallery', () => {
    it('renders images section', () => {
      render(<DetailPage instruction={mockInstruction} />)

      expect(screen.getByTestId('images-section')).toBeInTheDocument()
    })

    it('renders image thumbnails', () => {
      render(<DetailPage instruction={mockInstruction} />)

      expect(screen.getByTestId('image-thumbnail-0')).toBeInTheDocument()
      expect(screen.getByTestId('image-thumbnail-1')).toBeInTheDocument()
      expect(screen.getByTestId('image-thumbnail-2')).toBeInTheDocument()
    })

    it('uses thumbnail when images array is empty', () => {
      const instructionWithoutImages = { ...mockInstruction, images: [] }
      render(<DetailPage instruction={instructionWithoutImages} />)

      // Should still render one thumbnail using the thumbnail field
      expect(screen.getByTestId('image-thumbnail-0')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('renders back button when onBack is provided', () => {
      const handleBack = vi.fn()
      render(<DetailPage instruction={mockInstruction} onBack={handleBack} />)

      expect(screen.getByTestId('back-button')).toBeInTheDocument()
    })

    it('calls onBack when back button is clicked', async () => {
      const handleBack = vi.fn()
      const user = userEvent.setup()
      render(<DetailPage instruction={mockInstruction} onBack={handleBack} />)

      await user.click(screen.getByTestId('back-button'))

      expect(handleBack).toHaveBeenCalledTimes(1)
    })

    it('does not render back button when onBack is not provided', () => {
      render(<DetailPage instruction={mockInstruction} />)

      expect(screen.queryByTestId('back-button')).not.toBeInTheDocument()
    })
  })

  describe('Edit Action', () => {
    it('renders edit button when onEdit is provided', () => {
      const handleEdit = vi.fn()
      render(<DetailPage instruction={mockInstruction} onEdit={handleEdit} />)

      expect(screen.getByTestId('edit-button')).toBeInTheDocument()
    })

    it('calls onEdit with instruction id when edit button is clicked', async () => {
      const handleEdit = vi.fn()
      const user = userEvent.setup()
      render(<DetailPage instruction={mockInstruction} onEdit={handleEdit} />)

      await user.click(screen.getByTestId('edit-button'))

      expect(handleEdit).toHaveBeenCalledTimes(1)
      expect(handleEdit).toHaveBeenCalledWith(mockInstruction.id)
    })

    it('does not render edit button when onEdit is not provided', () => {
      render(<DetailPage instruction={mockInstruction} />)

      expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument()
    })
  })

  describe('Favorite Action', () => {
    it('renders favorite button when onFavorite is provided', () => {
      const handleFavorite = vi.fn()
      render(<DetailPage instruction={mockInstruction} onFavorite={handleFavorite} />)

      expect(screen.getByTestId('favorite-button')).toBeInTheDocument()
    })

    it('calls onFavorite with instruction id when favorite button is clicked', async () => {
      const handleFavorite = vi.fn()
      const user = userEvent.setup()
      render(<DetailPage instruction={mockInstruction} onFavorite={handleFavorite} />)

      await user.click(screen.getByTestId('favorite-button'))

      expect(handleFavorite).toHaveBeenCalledTimes(1)
      expect(handleFavorite).toHaveBeenCalledWith(mockInstruction.id)
    })

    it('shows filled heart when isFavorite is true', () => {
      render(<DetailPage instruction={mockInstruction} onFavorite={vi.fn()} />)

      const heartIcon = screen.getByTestId('heart-icon')
      expect(heartIcon).toHaveClass('fill-current')
      expect(heartIcon).toHaveClass('text-red-500')
    })

    it('shows unfilled heart when isFavorite is false', () => {
      const unfavoriteInstruction = { ...mockInstruction, isFavorite: false }
      render(<DetailPage instruction={unfavoriteInstruction} onFavorite={vi.fn()} />)

      const heartIcon = screen.getByTestId('heart-icon')
      expect(heartIcon).not.toHaveClass('fill-current')
    })
  })
})

describe('DetailPageSkeleton', () => {
  it('renders loading skeleton', () => {
    render(<DetailPageSkeleton />)

    expect(screen.getByTestId('detail-page-skeleton')).toBeInTheDocument()
    // Should have multiple skeleton elements
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})

describe('DetailPageNotFound', () => {
  it('renders not found message', () => {
    render(<DetailPageNotFound />)

    expect(screen.getByTestId('detail-page-not-found')).toBeInTheDocument()
    expect(screen.getByText('Instruction Not Found')).toBeInTheDocument()
  })

  it('renders back button when onBack is provided', () => {
    const handleBack = vi.fn()
    render(<DetailPageNotFound onBack={handleBack} />)

    expect(screen.getByText('Back to Gallery')).toBeInTheDocument()
  })

  it('calls onBack when back button is clicked', async () => {
    const handleBack = vi.fn()
    const user = userEvent.setup()
    render(<DetailPageNotFound onBack={handleBack} />)

    await user.click(screen.getByText('Back to Gallery'))

    expect(handleBack).toHaveBeenCalledTimes(1)
  })
})
