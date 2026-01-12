import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

import { MainPage } from '../main-page'
import type { WishlistListResponse, WishlistItem } from '@repo/api-client/schemas/wishlist'

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

// Force grid view so we exercise drag-and-drop code paths
vi.mock('@repo/gallery', async () => {
  const actual = await vi.importActual<typeof import('@repo/gallery')>('@repo/gallery')

  return {
    ...actual,
    useViewMode: vi.fn().mockReturnValue(['grid', vi.fn()]),
  }
})

const mockItems: WishlistItem[] = [
  {
    id: 'item-1',
    userId: 'user-1',
    title: 'Set One',
    store: 'LEGO',
    setNumber: '10001',
    sourceUrl: null,
    imageUrl: null,
    price: '10.00',
    currency: 'USD',
    pieceCount: 100,
    releaseDate: null,
    tags: [],
    priority: 1,
    notes: null,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'item-2',
    userId: 'user-1',
    title: 'Set Two',
    store: 'LEGO',
    setNumber: '10002',
    sourceUrl: null,
    imageUrl: null,
    price: '20.00',
    currency: 'USD',
    pieceCount: 200,
    releaseDate: null,
    tags: [],
    priority: 2,
    notes: null,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const mockWishlistResponse: WishlistListResponse = {
  items: mockItems,
  pagination: {
    page: 1,
    limit: 20,
    total: mockItems.length,
    totalPages: 1,
  },
  counts: {
    total: mockItems.length,
    byStore: { LEGO: mockItems.length },
  },
  filters: {
    availableTags: [],
    availableStores: ['LEGO'],
  },
}

// eslint-disable-next-line no-var
var useGetWishlistQueryMock: ReturnType<typeof vi.fn>
const reorderWishlistMock = vi.fn()

vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => {
  useGetWishlistQueryMock = vi.fn().mockReturnValue({
    data: mockWishlistResponse,
    isLoading: false,
    isFetching: false,
    error: null,
  })

  return {
    useGetWishlistQuery: useGetWishlistQueryMock,
    useRemoveFromWishlistMutation: () => [vi.fn(), { isLoading: false }],
    useAddToWishlistMutation: () => [vi.fn(), { isLoading: false }],
    useReorderWishlistMutation: () => [
      reorderWishlistMock.mockReturnValue({ unwrap: () => Promise.resolve() }),
      { isLoading: false },
    ],
    wishlistGalleryApi: {
      reducerPath: 'wishlistGalleryApi',
      reducer: (state = {}) => state,
      middleware: () => (next: any) => (action: any) => next(action),
      util: {
        updateQueryData: vi.fn(() => ({ undo: vi.fn() })),
      },
    },
  }
})

// Mock useToast so we can assert on toast calls
const toastMock = vi.fn()

vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual<typeof import('@repo/app-component-library')>(
    '@repo/app-component-library',
  )

  return {
    ...actual,
    useToast: () => ({
      toast: toastMock,
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      dismiss: vi.fn(),
      dismissAll: vi.fn(),
    }),
  }
})

// -----------------------------------------------------------------------------
// Helpers
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

describe('Wishlist MainPage - drag-and-drop reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toastMock.mockReset()
  })

  it('shows an undo toast after a reorder and calls reorder mutation', async () => {
    renderWithProviders()

    const dragHandleButtons = await screen.findAllByRole('button', {
      name: /reorder wishlist item/i,
    })
    expect(dragHandleButtons.length).toBeGreaterThan(0)

    fireEvent.click(dragHandleButtons[0])

    await waitFor(() => {
      expect(reorderWishlistMock).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled()
    })

    const toastArgs = toastMock.mock.calls[0][0]
    expect(toastArgs.title).toBe('Priority updated')
    expect(toastArgs.primaryAction).toBeDefined()
    expect(toastArgs.primaryAction.label).toBe('Undo')

    // Invoke the Undo handler from the toast and ensure it triggers
    // a second reorder call (server-side undo).
    await toastArgs.primaryAction.onClick()

    expect(reorderWishlistMock).toHaveBeenCalledTimes(2)
  })

  it('shows an error toast when the reorder mutation fails', async () => {
    // Make the mutation reject once to simulate a network error
    reorderWishlistMock.mockReturnValueOnce({
      unwrap: () => Promise.reject(new Error('Network error')),
    })

    renderWithProviders()

    const dragHandleButtons = await screen.findAllByRole('button', {
      name: /reorder wishlist item/i,
    })
    fireEvent.click(dragHandleButtons[0])

    // The toast for success is still scheduled, but we also expect
    // an error toast coming from the catch branch.
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled()
    })

    const calls = toastMock.mock.calls.map(call => call[0])
    // At least one toast should contain the failure message
    expect(
      calls.some(args =>
        typeof args?.description === 'string' &&
        args.description.toLowerCase().includes('failed to update wishlist priority'),
      ),
    ).toBe(true)
  })
})

describe('Wishlist MainPage - empty states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toastMock.mockReset()
  })

  it('renders new user empty state when there are no items and no filters and user has never had items', () => {
    useGetWishlistQueryMock.mockReturnValue({
      data: {
        ...mockWishlistResponse,
        items: [],
        pagination: { ...mockWishlistResponse.pagination, total: 0 },
        counts: { total: 0, byStore: {} },
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    const { getByText } = renderWithProviders()

    expect(getByText('Nothing on your wishlist yet')).toBeInTheDocument()
    expect(getByText('Add Item')).toBeInTheDocument()
  })

  it('renders no-results empty state when there are no items but filters are active', () => {
    useGetWishlistQueryMock.mockReturnValue({
      data: {
        ...mockWishlistResponse,
        items: [],
      },
      isLoading: false,
      isFetching: false,
      error: null,
    })

    const { getByText } = renderWithProviders()

    expect(getByText('No wishlist items match your filters')).toBeInTheDocument()
    expect(getByText('Clear Filters')).toBeInTheDocument()
  })
})
