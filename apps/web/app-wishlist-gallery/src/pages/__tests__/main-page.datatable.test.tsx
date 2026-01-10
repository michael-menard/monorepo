/**
 * Wishlist MainPage Datatable View Tests
 * Story glry-1006: Datatable Foundation - Wishlist Only
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('Wishlist MainPage - Datatable View', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('sets correct aria-label on wishlist datatable', () => {
    renderWithProviders()

    const table = screen.getByRole('table', { name: /wishlist items table/i })
    expect(table).toHaveAttribute('aria-label', 'Wishlist items table')
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
    // @ts-expect-error override for test
    delete window.location
    // @ts-expect-error minimal href implementation
    window.location = { href: 'http://localhost/' } as Location

    try {
      renderWithProviders()

      const firstRow = screen.getByText('LEGO Castle').closest('tr') as HTMLTableRowElement
      expect(firstRow).toBeTruthy()

      firstRow.focus()
      expect(document.activeElement).toBe(firstRow)

      await user.keyboard('{Enter}')

      expect(window.location.href).toContain('/wishlist/1')
    } finally {
      window.location = originalLocation
    }
  })

  it('navigates to detail page when a datatable row is clicked', async () => {
    const user = userEvent.setup()

    // Spy on location changes
    const originalLocation = window.location
    // @ts-expect-error - override for testing
    delete window.location
    // @ts-expect-error - provide minimal href implementation
    window.location = { href: 'http://localhost/' } as Location

    try {
      renderWithProviders()

      const firstRow = screen.getByText('LEGO Castle').closest('tr') as HTMLTableRowElement
      expect(firstRow).toBeTruthy()

      await user.click(firstRow)

      expect(window.location.href).toContain('/wishlist/1')
    } finally {
      window.location = originalLocation
    }
  })

  it('does not render pagination controls in datatable view', () => {
    renderWithProviders()

    // GalleryPagination uses a navigation role with aria-label="Pagination"
    const paginationNav = screen.queryByRole('navigation', { name: /pagination/i })
    expect(paginationNav).not.toBeInTheDocument()
  })
})
