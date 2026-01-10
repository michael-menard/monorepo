/**
 * Wishlist MainPage Grid View Tests
 * Ensures grid view still uses GalleryGrid when useViewMode returns 'grid'.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

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

vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => ({
  useGetWishlistQuery: vi.fn().mockReturnValue({
    data: mockWishlistResponse,
    isLoading: false,
    isFetching: false,
    error: null,
  }),
  wishlistGalleryApi: {
    reducerPath: 'wishlistGalleryApi',
    reducer: (state = {}) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
}))

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
      <MainPage />
    </Provider>,
  )
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('Wishlist MainPage - Grid View', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
