import { useEffect } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'

import { WishlistDetailPage } from '../wishlist-detail-page'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'

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

// Mock RTK Query wishlist hooks
const useGetWishlistItemQueryMock = vi.fn()

vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => {
  return {
    useGetWishlistItemQuery: useGetWishlistItemQueryMock,
    useRemoveFromWishlistMutation: () => [vi.fn(), { isLoading: false }],
    useAddToWishlistMutation: () => [vi.fn(), { isLoading: false }],
  }
})

// Mock useToast (we only care that it is called, not its internals)
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

// Mock GotItModal to immediately call onCompleted with a newSetId
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
// Tests
// -----------------------------------------------------------------------------

describe('WishlistDetailPage - Got It redirect', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock wishlist item fetch
    useGetWishlistItemQueryMock.mockReturnValue({
      data: mockWishlistItem,
      isLoading: false,
      isFetching: false,
      error: null,
    })

    // Mock location so we can inspect href changes
    // @ts-expect-error override for test
    delete window.location
    // @ts-expect-error minimal href implementation
    window.location = { href: 'http://localhost/wishlist/item-1', pathname: '/wishlist/item-1' } as Location
  })

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window as any).location = originalLocation
  })

  it('navigates to /sets/:id when Got It flow completes with newSetId', async () => {
    render(<WishlistDetailPage />)

    await waitFor(() => {
      expect(window.location.href).toContain('/sets/set-123')
    })
  })
})