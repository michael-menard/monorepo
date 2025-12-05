import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageIcon, FolderIcon } from 'lucide-react'

import { GalleryEmptyState } from '../components/GalleryEmptyState'
import { GalleryNoResults } from '../components/GalleryNoResults'
import { GallerySkeleton } from '../components/GallerySkeleton'

describe('GalleryEmptyState', () => {
  describe('rendering', () => {
    it('renders with required title prop', () => {
      render(<GalleryEmptyState title="No items yet" />)

      expect(screen.getByTestId('gallery-empty-state')).toBeInTheDocument()
      expect(screen.getByTestId('gallery-empty-state-title')).toHaveTextContent('No items yet')
    })

    it('renders default icon when not provided', () => {
      render(<GalleryEmptyState title="No items" />)

      expect(screen.getByTestId('gallery-empty-state-icon')).toBeInTheDocument()
    })

    it('renders custom icon when provided', () => {
      render(<GalleryEmptyState title="No items" icon={FolderIcon} />)

      expect(screen.getByTestId('gallery-empty-state-icon')).toBeInTheDocument()
    })

    it('renders description when provided', () => {
      render(
        <GalleryEmptyState
          title="No items"
          description="Upload your first item to get started."
        />,
      )

      expect(screen.getByTestId('gallery-empty-state-description')).toHaveTextContent(
        'Upload your first item to get started.',
      )
    })

    it('does not render description when not provided', () => {
      render(<GalleryEmptyState title="No items" />)

      expect(screen.queryByTestId('gallery-empty-state-description')).not.toBeInTheDocument()
    })

    it('renders action button when provided', () => {
      const handleClick = vi.fn()
      render(
        <GalleryEmptyState
          title="No items"
          action={{ label: 'Upload', onClick: handleClick }}
        />,
      )

      expect(screen.getByTestId('gallery-empty-state-action')).toHaveTextContent('Upload')
    })

    it('does not render action button when not provided', () => {
      render(<GalleryEmptyState title="No items" />)

      expect(screen.queryByTestId('gallery-empty-state-action')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<GalleryEmptyState title="No items" className="custom-class" />)

      expect(screen.getByTestId('gallery-empty-state')).toHaveClass('custom-class')
    })

    it('applies custom data-testid', () => {
      render(<GalleryEmptyState title="No items" data-testid="custom-empty" />)

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls action onClick when button is clicked', () => {
      const handleClick = vi.fn()
      render(
        <GalleryEmptyState
          title="No items"
          action={{ label: 'Upload', onClick: handleClick }}
        />,
      )

      fireEvent.click(screen.getByTestId('gallery-empty-state-action'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has role="status"', () => {
      render(<GalleryEmptyState title="No items" />)

      expect(screen.getByTestId('gallery-empty-state')).toHaveAttribute('role', 'status')
    })

    it('has aria-label with title', () => {
      render(<GalleryEmptyState title="No items yet" />)

      expect(screen.getByTestId('gallery-empty-state')).toHaveAttribute('aria-label', 'No items yet')
    })

    it('icon has aria-hidden', () => {
      render(<GalleryEmptyState title="No items" />)

      const iconContainer = screen.getByTestId('gallery-empty-state-icon')
      const svg = iconContainer.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })
})

describe('GalleryNoResults', () => {
  const defaultProps = {
    hasFilters: false,
    onClearFilters: vi.fn(),
  }

  describe('rendering', () => {
    it('renders basic no results state', () => {
      render(<GalleryNoResults {...defaultProps} />)

      expect(screen.getByTestId('gallery-no-results')).toBeInTheDocument()
      expect(screen.getByTestId('gallery-no-results-title')).toHaveTextContent('No results found')
    })

    it('renders with search term in title', () => {
      render(<GalleryNoResults {...defaultProps} searchTerm="castle" />)

      // Uses regex to match curly quotes from &ldquo; and &rdquo;
      expect(screen.getByTestId('gallery-no-results-title')).toHaveTextContent(
        /No results found for.*castle/,
      )
    })

    it('renders icon', () => {
      render(<GalleryNoResults {...defaultProps} />)

      expect(screen.getByTestId('gallery-no-results-icon')).toBeInTheDocument()
    })

    it('renders description text', () => {
      render(<GalleryNoResults {...defaultProps} />)

      expect(screen.getByTestId('gallery-no-results-description')).toBeInTheDocument()
    })

    it('shows appropriate description for search term only', () => {
      render(<GalleryNoResults {...defaultProps} searchTerm="castle" />)

      expect(screen.getByTestId('gallery-no-results-description')).toHaveTextContent(
        'Try a different search term.',
      )
    })

    it('shows appropriate description for filters only', () => {
      render(<GalleryNoResults {...defaultProps} hasFilters />)

      expect(screen.getByTestId('gallery-no-results-description')).toHaveTextContent(
        'Try clearing some filters to see more results.',
      )
    })

    it('shows appropriate description for both search and filters', () => {
      render(<GalleryNoResults {...defaultProps} searchTerm="castle" hasFilters />)

      expect(screen.getByTestId('gallery-no-results-description')).toHaveTextContent(
        'Try adjusting your search or clearing some filters.',
      )
    })

    it('applies custom className', () => {
      render(<GalleryNoResults {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('gallery-no-results')).toHaveClass('custom-class')
    })

    it('applies custom data-testid', () => {
      render(<GalleryNoResults {...defaultProps} data-testid="custom-no-results" />)

      expect(screen.getByTestId('custom-no-results')).toBeInTheDocument()
    })
  })

  describe('buttons', () => {
    it('shows clear search button when searchTerm and onClearSearch provided', () => {
      const onClearSearch = vi.fn()
      render(
        <GalleryNoResults
          {...defaultProps}
          searchTerm="castle"
          onClearSearch={onClearSearch}
        />,
      )

      expect(screen.getByTestId('gallery-no-results-clear-search')).toHaveTextContent('Clear Search')
    })

    it('does not show clear search button when no searchTerm', () => {
      const onClearSearch = vi.fn()
      render(<GalleryNoResults {...defaultProps} onClearSearch={onClearSearch} />)

      expect(screen.queryByTestId('gallery-no-results-clear-search')).not.toBeInTheDocument()
    })

    it('does not show clear search button when no onClearSearch', () => {
      render(<GalleryNoResults {...defaultProps} searchTerm="castle" />)

      expect(screen.queryByTestId('gallery-no-results-clear-search')).not.toBeInTheDocument()
    })

    it('shows clear filters button when hasFilters is true', () => {
      render(<GalleryNoResults {...defaultProps} hasFilters />)

      expect(screen.getByTestId('gallery-no-results-clear-filters')).toHaveTextContent(
        'Clear Filters',
      )
    })

    it('does not show clear filters button when hasFilters is false', () => {
      render(<GalleryNoResults {...defaultProps} />)

      expect(screen.queryByTestId('gallery-no-results-clear-filters')).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onClearSearch when clear search button is clicked', () => {
      const onClearSearch = vi.fn()
      render(
        <GalleryNoResults
          {...defaultProps}
          searchTerm="castle"
          onClearSearch={onClearSearch}
        />,
      )

      fireEvent.click(screen.getByTestId('gallery-no-results-clear-search'))

      expect(onClearSearch).toHaveBeenCalledTimes(1)
    })

    it('calls onClearFilters when clear filters button is clicked', () => {
      const onClearFilters = vi.fn()
      render(<GalleryNoResults {...defaultProps} hasFilters onClearFilters={onClearFilters} />)

      fireEvent.click(screen.getByTestId('gallery-no-results-clear-filters'))

      expect(onClearFilters).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has role="status"', () => {
      render(<GalleryNoResults {...defaultProps} />)

      expect(screen.getByTestId('gallery-no-results')).toHaveAttribute('role', 'status')
    })

    it('has aria-live="polite"', () => {
      render(<GalleryNoResults {...defaultProps} />)

      expect(screen.getByTestId('gallery-no-results')).toHaveAttribute('aria-live', 'polite')
    })

    it('icon has aria-hidden', () => {
      render(<GalleryNoResults {...defaultProps} />)

      const iconContainer = screen.getByTestId('gallery-no-results-icon')
      const svg = iconContainer.querySelector('svg')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    })
  })
})

describe('GallerySkeleton', () => {
  describe('rendering', () => {
    it('renders skeleton grid', () => {
      render(<GallerySkeleton />)

      expect(screen.getByTestId('gallery-skeleton')).toBeInTheDocument()
      expect(screen.getByTestId('gallery-skeleton-grid')).toBeInTheDocument()
    })

    it('renders default 8 skeleton cards', () => {
      render(<GallerySkeleton />)

      // Check that 8 card skeletons are rendered
      for (let i = 0; i < 8; i++) {
        expect(screen.getByTestId(`gallery-skeleton-card-${i}`)).toBeInTheDocument()
      }
    })

    it('renders custom count of skeleton cards', () => {
      render(<GallerySkeleton count={4} />)

      for (let i = 0; i < 4; i++) {
        expect(screen.getByTestId(`gallery-skeleton-card-${i}`)).toBeInTheDocument()
      }
      expect(screen.queryByTestId('gallery-skeleton-card-4')).not.toBeInTheDocument()
    })

    it('does not show filter skeleton by default', () => {
      render(<GallerySkeleton />)

      expect(screen.queryByTestId('gallery-skeleton-filters')).not.toBeInTheDocument()
    })

    it('shows filter skeleton when showFilters is true', () => {
      render(<GallerySkeleton showFilters />)

      expect(screen.getByTestId('gallery-skeleton-filters')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<GallerySkeleton className="custom-class" />)

      expect(screen.getByTestId('gallery-skeleton')).toHaveClass('custom-class')
    })

    it('applies custom data-testid', () => {
      render(<GallerySkeleton data-testid="custom-skeleton" />)

      expect(screen.getByTestId('custom-skeleton')).toBeInTheDocument()
    })
  })

  describe('grid layout', () => {
    it('renders grid with default columns', () => {
      render(<GallerySkeleton />)

      const grid = screen.getByTestId('gallery-skeleton-grid')
      expect(grid).toHaveClass('grid')
    })

    it('accepts columns prop', () => {
      render(<GallerySkeleton columns={{ sm: 2, md: 3, lg: 4, xl: 5 }} />)

      expect(screen.getByTestId('gallery-skeleton-grid')).toBeInTheDocument()
    })

    it('accepts gap prop', () => {
      render(<GallerySkeleton gap={6} />)

      expect(screen.getByTestId('gallery-skeleton-grid')).toBeInTheDocument()
    })
  })
})
