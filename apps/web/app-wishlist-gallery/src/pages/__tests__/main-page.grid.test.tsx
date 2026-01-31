/**
 * Wishlist MainPage Grid View Tests
 * Ensures grid view still uses GalleryGrid when useViewMode returns 'grid'.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { TooltipProvider } from '@repo/app-component-library'

import { MainPage } from '../main-page'
import type { WishlistListResponse } from '@repo/api-client/schemas/wishlist'

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock TanStack Router Link component to avoid needing full router context
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    Link: ({ to, children, ...props }: any) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => vi.fn(),
    useSearch: () => ({}),
    useMatch: () => ({ pathname: '/' }),
  }
})

// Mock useViewMode from @repo/gallery so that MainPage renders grid view
vi.mock('@repo/gallery', async () => {
  const actual = await vi.importActual<typeof import('@repo/gallery')>('@repo/gallery')

  return {
    ...actual,
    useViewMode: vi.fn().mockReturnValue(['grid', vi.fn()]),
  }
})

// Mock RTK Query wishlist hook to return loaded data
const mockWishlistResponse: WishlistListResponse = {
  items: [
    {
      id: '1',
      userId: 'user-1',
      title: 'LEGO Castle',
      store: 'LEGO',
      setNumber: '10305',
      sourceUrl: null,
      imageUrl: null,
      price: '99.99',
      currency: 'USD',
      pieceCount: 4514,
      releaseDate: null,
      tags: [],
      priority: 5,
      notes: null,
      sortOrder: 0,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      createdBy: null,
      updatedBy: null,
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
  counts: {
    total: 1,
    byStore: {
      LEGO: 1,
    },
  },
  filters: {
    availableTags: [],
    availableStores: ['LEGO'],
  },
}

// eslint-disable-next-line no-var
var useGetWishlistQueryMock: ReturnType<typeof vi.fn>

vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => {
  // Provide a minimal default implementation; individual tests will override
  useGetWishlistQueryMock = vi.fn().mockReturnValue({
    data: null as unknown as WishlistListResponse,
    isLoading: false,
    isFetching: false,
    error: null,
  })

  return {
    useGetWishlistQuery: useGetWishlistQueryMock,
    // WISH-2041: Add mock for delete mutation
    useRemoveFromWishlistMutation: vi.fn().mockReturnValue([vi.fn(), { isLoading: false }]),
    // WISH-2041: Add mock for add mutation (used for undo)
    useAddWishlistItemMutation: vi.fn().mockReturnValue([vi.fn(), { isLoading: false }]),
    // WISH-2042: Add mock for purchase mutation
    useMarkAsPurchasedMutation: vi.fn().mockReturnValue([vi.fn(), { isLoading: false }]),
    // WISH-2005a: Add mock for reorder mutation (used by DraggableWishlistGallery)
    useReorderWishlistMutation: vi.fn().mockReturnValue([vi.fn(), { isLoading: false }]),
    wishlistGalleryApi: {
      reducerPath: 'wishlistGalleryApi',
      reducer: (state = {}) => state,
      middleware: () => (next: any) => (action: any) => next(action),
    },
  }
})

// -----------------------------------------------------------------------------
// Test helpers
// -----------------------------------------------------------------------------

const createTestStore = () =>
  configureStore({
    reducer: {
      wishlistGalleryApi: (state = {}) => state,
    },
  })

const renderWithProviders = () => {
  return render(
    <Provider store={createTestStore()}>
      <TooltipProvider>
        <MainPage />
      </TooltipProvider>
    </Provider>,
  )
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('Wishlist MainPage - Grid View', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Ensure the RTK query mock is reset to default data before each test
    useGetWishlistQueryMock.mockReturnValue({
      data: mockWishlistResponse,
      isLoading: false,
      isFetching: false,
      error: null,
    })
  })

  it('renders GalleryGrid when viewMode is grid', () => {
    renderWithProviders()

    // GalleryGrid from @repo/gallery uses data-testid="gallery-grid" by default
    const grid = screen.getByTestId('gallery-grid')
    expect(grid).toBeInTheDocument()

    // Wishlist item title should appear inside the grid
    expect(screen.getByText('LEGO Castle')).toBeInTheDocument()

    // Datatable should not be rendered in grid view
    const table = screen.queryByRole('table', { name: /wishlist items table/i })
    expect(table).not.toBeInTheDocument()
  })
})
