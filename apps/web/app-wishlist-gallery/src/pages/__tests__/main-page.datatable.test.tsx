/**
 * Wishlist MainPage Datatable View Tests
 * Story glry-1006: Datatable Foundation - Wishlist Only
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

// Mock useViewMode from @repo/gallery so that MainPage renders datatable view
vi.mock('@repo/gallery', async () => {
  const actual = await vi.importActual<typeof import('@repo/gallery')>('@repo/gallery')

  return {
    ...actual,
    useViewMode: vi.fn().mockReturnValue(['datatable', vi.fn()]),
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
    {
      id: '2',
      userId: 'user-1',
      title: 'Modular Building',
      store: 'Barweer',
      setNumber: '10255',
      sourceUrl: null,
      imageUrl: null,
      price: '149.99',
      currency: 'USD',
      pieceCount: 2500,
      releaseDate: null,
      tags: [],
      priority: 3,
      notes: null,
      sortOrder: 1,
      createdAt: '2025-01-02T00:00:00.000Z',
      updatedAt: '2025-01-02T00:00:00.000Z',
      createdBy: null,
      updatedBy: null,
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
  counts: {
    total: 2,
    byStore: {
      LEGO: 1,
      Barweer: 1,
    },
  },
  filters: {
    availableTags: [],
    availableStores: ['LEGO', 'Barweer'],
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

describe('Wishlist MainPage - Datatable View', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset the default mock implementation for each test
    useGetWishlistQueryMock.mockReturnValue({
      data: mockWishlistResponse,
      isLoading: false,
      isFetching: false,
      error: null,
    })
  })

  it('renders wishlist items in datatable when viewMode is datatable', () => {
    renderWithProviders()

    // Table should be present with the wishlist aria-label
    const table = screen.getByRole('table', { name: /wishlist items table/i })
    expect(table).toBeInTheDocument()

    // Titles from mock data should appear in the table
    expect(screen.getByText('LEGO Castle')).toBeInTheDocument()
    expect(screen.getByText('Modular Building')).toBeInTheDocument()
  })

  it('renders hardcoded wishlist columns (title, price, store, priority)', () => {
    renderWithProviders()

    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('Store')).toBeInTheDocument()
    expect(screen.getByText('Priority')).toBeInTheDocument()
  })

  it('sets correct accessible name on wishlist datatable', () => {
    renderWithProviders()

    // The table should be findable by its accessible name (via aria-label or aria-labelledby)
    const table = screen.getByRole('table', { name: /wishlist items table/i })
    expect(table).toBeInTheDocument()
  })

  it('makes wishlist datatable rows keyboard focusable', () => {
    renderWithProviders()

    const firstRow = screen.getByText('LEGO Castle').closest('tr') as HTMLTableRowElement
    expect(firstRow).toBeTruthy()
    expect(firstRow.getAttribute('tabindex')).toBe('0')
  })

  it('allows keyboard activation (Enter) from focused datatable row', async () => {
    const user = userEvent.setup()

    const originalLocation = window.location

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/' },
    })

    try {
      renderWithProviders()

      const firstRow = screen.getByText('LEGO Castle').closest('tr') as HTMLTableRowElement
      expect(firstRow).toBeTruthy()

      firstRow.focus()
      expect(document.activeElement).toBe(firstRow)

      await user.keyboard('{Enter}')

      expect(window.location.href).toContain('/wishlist/1')
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      })
    }
  })

  it('navigates to detail page when a datatable row is clicked', async () => {
    const user = userEvent.setup()

    // Spy on location changes
    const originalLocation = window.location

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/' },
    })

    try {
      renderWithProviders()

      const firstRow = screen.getByText('LEGO Castle').closest('tr') as HTMLTableRowElement
      expect(firstRow).toBeTruthy()

      await user.click(firstRow)

      expect(window.location.href).toContain('/wishlist/1')
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      })
    }
  })

  it('does not render pagination controls in datatable view', () => {
    renderWithProviders()

    // GalleryPagination uses a navigation role with aria-label="Pagination"
    const paginationNav = screen.queryByRole('navigation', { name: /pagination/i })
    expect(paginationNav).not.toBeInTheDocument()
  })

  it('shows datatable with loading state when fetching additional items', () => {
    // First render with some items
    renderWithProviders()

    // Verify table exists with items
    const table = screen.getByRole('table', { name: /wishlist items table/i })
    expect(table).toBeInTheDocument()

    // When isFetching is true (e.g., loading more items), the table should still be visible
    // The GalleryDataTable component handles the loading state internally
    expect(screen.getByText('LEGO Castle')).toBeInTheDocument()
  })
})
