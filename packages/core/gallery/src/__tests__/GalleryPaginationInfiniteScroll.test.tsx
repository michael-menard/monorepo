import { fireEvent, render, screen, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { useInfiniteScroll } from '../hooks/useInfiniteScroll'
import { GalleryLoadMore } from '../components/GalleryLoadMore'
import { GalleryPagination } from '../components/GalleryPagination'
import { GalleryEndOfResults } from '../components/GalleryEndOfResults'

// Test component that uses the hook
function TestInfiniteScrollComponent({
  hasMore,
  isLoading,
  onLoadMore,
  threshold,
  enabled,
}: {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  threshold?: number
  enabled?: boolean
}) {
  const { sentinelRef, isNearBottom } = useInfiniteScroll({
    hasMore,
    isLoading,
    onLoadMore,
    threshold,
    enabled,
  })

  return (
    <div>
      <div data-testid="content">Content</div>
      <div ref={sentinelRef} data-testid="sentinel" />
      <div data-testid="is-near-bottom">{isNearBottom ? 'true' : 'false'}</div>
    </div>
  )
}

describe('useInfiniteScroll', () => {
  let mockIntersectionObserver: ReturnType<typeof vi.fn>
  let observerCallback: IntersectionObserverCallback
  let observerOptions: IntersectionObserverInit | undefined

  beforeEach(() => {
    mockIntersectionObserver = vi.fn((callback, options) => {
      observerCallback = callback
      observerOptions = options
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }
    })
    vi.stubGlobal('IntersectionObserver', mockIntersectionObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates IntersectionObserver when enabled', () => {
    render(
      <TestInfiniteScrollComponent
        hasMore={true}
        isLoading={false}
        onLoadMore={() => {}}
      />,
    )

    expect(mockIntersectionObserver).toHaveBeenCalled()
  })

  it('uses default threshold of 200px', () => {
    render(
      <TestInfiniteScrollComponent
        hasMore={true}
        isLoading={false}
        onLoadMore={() => {}}
      />,
    )

    expect(observerOptions?.rootMargin).toBe('200px')
  })

  it('uses custom threshold when provided', () => {
    render(
      <TestInfiniteScrollComponent
        hasMore={true}
        isLoading={false}
        onLoadMore={() => {}}
        threshold={500}
      />,
    )

    expect(observerOptions?.rootMargin).toBe('500px')
  })

  it('calls onLoadMore when sentinel intersects', () => {
    const handleLoadMore = vi.fn()
    render(
      <TestInfiniteScrollComponent
        hasMore={true}
        isLoading={false}
        onLoadMore={handleLoadMore}
      />,
    )

    // Simulate intersection
    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(handleLoadMore).toHaveBeenCalledTimes(1)
  })

  it('does not call onLoadMore when isLoading is true', () => {
    const handleLoadMore = vi.fn()
    render(
      <TestInfiniteScrollComponent
        hasMore={true}
        isLoading={true}
        onLoadMore={handleLoadMore}
      />,
    )

    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(handleLoadMore).not.toHaveBeenCalled()
  })

  it('does not call onLoadMore when hasMore is false', () => {
    const handleLoadMore = vi.fn()
    render(
      <TestInfiniteScrollComponent
        hasMore={false}
        isLoading={false}
        onLoadMore={handleLoadMore}
      />,
    )

    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(handleLoadMore).not.toHaveBeenCalled()
  })

  it('does not call onLoadMore when enabled is false', () => {
    const handleLoadMore = vi.fn()
    render(
      <TestInfiniteScrollComponent
        hasMore={true}
        isLoading={false}
        onLoadMore={handleLoadMore}
        enabled={false}
      />,
    )

    // Observer shouldn't even be created when disabled
    expect(mockIntersectionObserver).not.toHaveBeenCalled()
  })

  it('does not call onLoadMore when not intersecting', () => {
    const handleLoadMore = vi.fn()
    render(
      <TestInfiniteScrollComponent
        hasMore={true}
        isLoading={false}
        onLoadMore={handleLoadMore}
      />,
    )

    act(() => {
      observerCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(handleLoadMore).not.toHaveBeenCalled()
  })

  it('updates isNearBottom state', () => {
    render(
      <TestInfiniteScrollComponent
        hasMore={true}
        isLoading={false}
        onLoadMore={() => {}}
      />,
    )

    expect(screen.getByTestId('is-near-bottom')).toHaveTextContent('false')

    act(() => {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })

    expect(screen.getByTestId('is-near-bottom')).toHaveTextContent('true')
  })
})

describe('GalleryLoadMore', () => {
  it('renders load more button', () => {
    render(<GalleryLoadMore onLoadMore={() => {}} />)

    expect(screen.getByTestId('gallery-load-more')).toBeInTheDocument()
    expect(screen.getByTestId('gallery-load-more-button')).toBeInTheDocument()
  })

  it('displays default text', () => {
    render(<GalleryLoadMore onLoadMore={() => {}} />)

    expect(screen.getByText('Load More')).toBeInTheDocument()
  })

  it('displays custom text', () => {
    render(<GalleryLoadMore onLoadMore={() => {}} loadMoreText="Show More Items" />)

    expect(screen.getByText('Show More Items')).toBeInTheDocument()
  })

  it('displays loading text when isLoading', () => {
    render(<GalleryLoadMore onLoadMore={() => {}} isLoading />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays custom loading text', () => {
    render(
      <GalleryLoadMore
        onLoadMore={() => {}}
        isLoading
        loadingText="Fetching..."
      />,
    )

    expect(screen.getByText('Fetching...')).toBeInTheDocument()
  })

  it('calls onLoadMore when clicked', () => {
    const handleLoadMore = vi.fn()
    render(<GalleryLoadMore onLoadMore={handleLoadMore} />)

    fireEvent.click(screen.getByTestId('gallery-load-more-button'))

    expect(handleLoadMore).toHaveBeenCalledTimes(1)
  })

  it('disables button when isLoading', () => {
    render(<GalleryLoadMore onLoadMore={() => {}} isLoading />)

    expect(screen.getByTestId('gallery-load-more-button')).toBeDisabled()
  })

  it('renders nothing when hasMore is false and not loading', () => {
    const { container } = render(
      <GalleryLoadMore onLoadMore={() => {}} hasMore={false} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('still renders when loading even if hasMore is false', () => {
    render(<GalleryLoadMore onLoadMore={() => {}} hasMore={false} isLoading />)

    expect(screen.getByTestId('gallery-load-more')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<GalleryLoadMore onLoadMore={() => {}} className="custom-class" />)

    expect(screen.getByTestId('gallery-load-more')).toHaveClass('custom-class')
  })

  it('renders with custom data-testid', () => {
    render(<GalleryLoadMore onLoadMore={() => {}} data-testid="custom-load-more" />)

    expect(screen.getByTestId('custom-load-more')).toBeInTheDocument()
  })
})

describe('GalleryPagination', () => {
  it('renders pagination component', () => {
    render(
      <GalleryPagination
        currentPage={1}
        totalPages={5}
        onPageChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-pagination')).toBeInTheDocument()
  })

  it('renders previous and next buttons', () => {
    render(
      <GalleryPagination
        currentPage={2}
        totalPages={5}
        onPageChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-pagination-prev')).toBeInTheDocument()
    expect(screen.getByTestId('gallery-pagination-next')).toBeInTheDocument()
  })

  it('disables previous button on first page', () => {
    render(
      <GalleryPagination
        currentPage={1}
        totalPages={5}
        onPageChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-pagination-prev')).toBeDisabled()
  })

  it('disables next button on last page', () => {
    render(
      <GalleryPagination
        currentPage={5}
        totalPages={5}
        onPageChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-pagination-next')).toBeDisabled()
  })

  it('calls onPageChange when previous clicked', () => {
    const handlePageChange = vi.fn()
    render(
      <GalleryPagination
        currentPage={3}
        totalPages={5}
        onPageChange={handlePageChange}
      />,
    )

    fireEvent.click(screen.getByTestId('gallery-pagination-prev'))

    expect(handlePageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange when next clicked', () => {
    const handlePageChange = vi.fn()
    render(
      <GalleryPagination
        currentPage={3}
        totalPages={5}
        onPageChange={handlePageChange}
      />,
    )

    fireEvent.click(screen.getByTestId('gallery-pagination-next'))

    expect(handlePageChange).toHaveBeenCalledWith(4)
  })

  it('renders page number buttons', () => {
    render(
      <GalleryPagination
        currentPage={1}
        totalPages={5}
        onPageChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-pagination-page-1')).toBeInTheDocument()
    expect(screen.getByTestId('gallery-pagination-page-2')).toBeInTheDocument()
    expect(screen.getByTestId('gallery-pagination-page-5')).toBeInTheDocument()
  })

  it('calls onPageChange when page number clicked', () => {
    const handlePageChange = vi.fn()
    render(
      <GalleryPagination
        currentPage={1}
        totalPages={5}
        onPageChange={handlePageChange}
      />,
    )

    fireEvent.click(screen.getByTestId('gallery-pagination-page-3'))

    expect(handlePageChange).toHaveBeenCalledWith(3)
  })

  it('shows ellipsis for large page counts', () => {
    render(
      <GalleryPagination
        currentPage={5}
        totalPages={10}
        onPageChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-pagination-ellipsis-start')).toBeInTheDocument()
    expect(screen.getByTestId('gallery-pagination-ellipsis-end')).toBeInTheDocument()
  })

  it('renders nothing when totalPages is 1 and no page size selector', () => {
    const { container } = render(
      <GalleryPagination
        currentPage={1}
        totalPages={1}
        onPageChange={() => {}}
      />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('has accessible navigation role', () => {
    render(
      <GalleryPagination
        currentPage={1}
        totalPages={5}
        onPageChange={() => {}}
      />,
    )

    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Pagination')
  })

  it('marks current page with aria-current', () => {
    render(
      <GalleryPagination
        currentPage={3}
        totalPages={5}
        onPageChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-pagination-page-3')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('applies custom className', () => {
    render(
      <GalleryPagination
        currentPage={1}
        totalPages={5}
        onPageChange={() => {}}
        className="custom-class"
      />,
    )

    expect(screen.getByTestId('gallery-pagination')).toHaveClass('custom-class')
  })
})

describe('GalleryEndOfResults', () => {
  it('renders end of results indicator', () => {
    render(<GalleryEndOfResults />)

    expect(screen.getByTestId('gallery-end-of-results')).toBeInTheDocument()
  })

  it('displays default message', () => {
    render(<GalleryEndOfResults />)

    expect(screen.getByText("You've reached the end")).toBeInTheDocument()
  })

  it('displays custom message', () => {
    render(<GalleryEndOfResults message="No more items to show" />)

    expect(screen.getByText('No more items to show')).toBeInTheDocument()
  })

  it('displays total count singular', () => {
    render(<GalleryEndOfResults totalCount={1} />)

    expect(screen.getByText('Showing all 1 item')).toBeInTheDocument()
  })

  it('displays total count plural', () => {
    render(<GalleryEndOfResults totalCount={42} />)

    expect(screen.getByText('Showing all 42 items')).toBeInTheDocument()
  })

  it('prefers custom message over totalCount', () => {
    render(<GalleryEndOfResults totalCount={42} message="Custom message" />)

    expect(screen.getByText('Custom message')).toBeInTheDocument()
    expect(screen.queryByText('Showing all 42 items')).not.toBeInTheDocument()
  })

  it('has accessible role and aria-live', () => {
    render(<GalleryEndOfResults />)

    const element = screen.getByTestId('gallery-end-of-results')
    expect(element).toHaveAttribute('role', 'status')
    expect(element).toHaveAttribute('aria-live', 'polite')
  })

  it('applies custom className', () => {
    render(<GalleryEndOfResults className="custom-class" />)

    expect(screen.getByTestId('gallery-end-of-results')).toHaveClass('custom-class')
  })

  it('renders with custom data-testid', () => {
    render(<GalleryEndOfResults data-testid="custom-end" />)

    expect(screen.getByTestId('custom-end')).toBeInTheDocument()
  })
})
