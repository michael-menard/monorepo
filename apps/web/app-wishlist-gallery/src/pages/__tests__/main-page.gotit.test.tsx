import { useEffect } from 'react'
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

// Force grid view for this test so we exercise the Got It button in cards
vi.mock('@repo/gallery', async () => {
  const actual = await vi.importActual<typeof import('@repo/gallery')>('@repo/gallery')

  return {
    ...actual,
    useViewMode: vi.fn().mockReturnValue(['grid', vi.fn()]),
  }
})

// Mock RTK Query hooks for wishlist
const mockWishlistItem: WishlistItem = {
  id: 'item-1',
  userId: 'user-1',
  title: 'Medieval Castle',
  store: 'LEGO',
  setNumber: '10305',
  sourceUrl: null,
  imageUrl: null,
  price: '199.99',
  currency: 'USD',
  pieceCount: 4514,
  releaseDate: null,
  tags: [],
  priority: 5,
  notes: null,
  sortOrder: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockWishlistResponse: WishlistListResponse = {
  items: [mockWishlistItem],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
  counts: {
    total: 1,
    byStore: { LEGO: 1 },
  },
  filters: {
    availableTags: [],
    availableStores: ['LEGO'],
  },
}

// eslint-disable-next-line no-var
var useGetWishlistQueryMock: ReturnType<typeof vi.fn>
const markAsPurchasedMock = vi.fn()

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
    useMarkAsPurchasedMutation: () => [
      markAsPurchasedMock.mockReturnValue({
        unwrap: () =>
          Promise.resolve({
            message: 'Wishlist item marked as purchased',
            newSetId: 'set-123',
            removedFromWishlist: true,
          }),
      }),
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

// Mock useToast to capture toast calls
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

// Mock GotItModal so we don't depend on its internal form behavior
vi.mock('../components/GotItModal', () => {
  return {
    GotItModal: ({ open, onCompleted, item }: any) => {
      useEffect(() => {
        if (open && onCompleted && item) {
          onCompleted({
            item,
            response: {
              message: 'Wishlist item marked as purchased',
              newSetId: 'set-123',
              removedFromWishlist: true,
            },
          })
        }
      }, [open, onCompleted, item])

      return null
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
      <MainPage />
    </Provider>,
  )
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('Wishlist MainPage - Got It flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toastMock.mockReset()
  })

  it('shows Undo and View in Sets actions in toast when item is purchased and removed', async () => {
    renderWithProviders()

    const gotItButton = await screen.findByRole('button', { name: /got it!/i })
    fireEvent.click(gotItButton)

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled()
    })

    const toastArgs = toastMock.mock.calls[0][0]

    expect(toastArgs.title).toBe('Added to your collection!')
    expect(toastArgs.primaryAction).toBeDefined()
    expect(toastArgs.primaryAction.label).toBe('Undo')
    expect(typeof toastArgs.primaryAction.onClick).toBe('function')

    expect(toastArgs.secondaryAction).toBeDefined()
    expect(toastArgs.secondaryAction.label).toBe('View in Sets')
    expect(typeof toastArgs.secondaryAction.onClick).toBe('function')
  })
})
