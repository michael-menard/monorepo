/**
 * EditPage Component Tests
 *
 * Story wish-2003: Detail & Edit Pages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { EditPage } from '../edit-page'
import { wishlistGalleryApi } from '@repo/api-client/rtk/wishlist-gallery-api'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'

// Mock the RTK Query hooks
vi.mock('@repo/api-client/rtk/wishlist-gallery-api', async () => {
  const actual = await vi.importActual('@repo/api-client/rtk/wishlist-gallery-api')
  return {
    ...actual,
    useGetWishlistItemQuery: vi.fn(),
    useUpdateWishlistItemMutation: vi.fn(),
  }
})

// Mock the toast hook
vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual('@repo/app-component-library')
  return {
    ...actual,
    useToast: () => ({
      toast: vi.fn(),
    }),
  }
})

// Import the mocked module
import {
  useGetWishlistItemQuery,
  useUpdateWishlistItemMutation,
} from '@repo/api-client/rtk/wishlist-gallery-api'

// Mock data
const mockItem: WishlistItem = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: '123e4567-e89b-12d3-a456-426614174001',
  title: 'LEGO Star Wars Millennium Falcon',
  store: 'LEGO',
  setNumber: '75192',
  sourceUrl: 'https://lego.com/product/75192',
  imageUrl: 'https://example.com/image.jpg',
  price: '849.99',
  currency: 'USD',
  pieceCount: 7541,
  releaseDate: '2023-01-01T00:00:00.000Z',
  tags: ['Star Wars', 'UCS'],
  priority: 5,
  notes: 'Dream set!',
  sortOrder: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

// Create test store
function createTestStore() {
  return configureStore({
    reducer: {
      [wishlistGalleryApi.reducerPath]: wishlistGalleryApi.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(wishlistGalleryApi.middleware),
  })
}

// Wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const store = createTestStore()
  return <Provider store={store}>{children}</Provider>
}

describe('EditPage', () => {
  const mockOnCancel = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockUpdateItem = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    vi.mocked(useUpdateWishlistItemMutation).mockReturnValue([
      mockUpdateItem.mockReturnValue({ unwrap: () => Promise.resolve(mockItem) }),
      { isLoading: false },
    ] as any)
  })

  it('renders loading skeleton when loading', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <EditPage itemId={mockItem.id} onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
      </TestWrapper>,
    )

    expect(screen.getByTestId('edit-skeleton')).toBeInTheDocument()
  })

  it('renders not found state when item not found', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 404 },
    } as any)

    render(
      <TestWrapper>
        <EditPage itemId={mockItem.id} onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
      </TestWrapper>,
    )

    expect(screen.getByTestId('edit-not-found')).toBeInTheDocument()
  })

  it('renders edit form when loaded', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <EditPage itemId={mockItem.id} onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
      </TestWrapper>,
    )

    expect(screen.getByTestId('edit-page')).toBeInTheDocument()
    expect(screen.getByText('Edit Wishlist Item')).toBeInTheDocument()
  })

  it('pre-fills form with existing item data', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <EditPage itemId={mockItem.id} onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
      </TestWrapper>,
    )

    const titleInput = screen.getByTestId('wishlist-form-title')
    expect(titleInput).toHaveValue(mockItem.title)
  })

  it('calls onCancel when cancel button is clicked', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <EditPage itemId={mockItem.id} onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
      </TestWrapper>,
    )

    fireEvent.click(screen.getByTestId('edit-cancel-button'))
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('disables save button when form is not dirty', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <EditPage itemId={mockItem.id} onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
      </TestWrapper>,
    )

    const saveButton = screen.getByTestId('edit-save-button')
    expect(saveButton).toBeDisabled()
  })

  it('enables save button when form is modified', async () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <EditPage itemId={mockItem.id} onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
      </TestWrapper>,
    )

    const titleInput = screen.getByTestId('wishlist-form-title')
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })

    await waitFor(() => {
      const saveButton = screen.getByTestId('edit-save-button')
      expect(saveButton).not.toBeDisabled()
    })
  })

  it('displays current image when imageUrl is present', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <EditPage itemId={mockItem.id} onCancel={mockOnCancel} onSuccess={mockOnSuccess} />
      </TestWrapper>,
    )

    expect(screen.getByText('Current image:')).toBeInTheDocument()
  })
})
