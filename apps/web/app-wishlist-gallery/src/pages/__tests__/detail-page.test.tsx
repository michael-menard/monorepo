/**
 * DetailPage Component Tests
 *
 * Story wish-2003: Detail & Edit Pages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { DetailPage } from '../detail-page'
import { wishlistGalleryApi } from '@repo/api-client/rtk/wishlist-gallery-api'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'

// Mock the RTK Query hooks
vi.mock('@repo/api-client/rtk/wishlist-gallery-api', async () => {
  const actual = await vi.importActual('@repo/api-client/rtk/wishlist-gallery-api')
  return {
    ...actual,
    useGetWishlistItemQuery: vi.fn(),
    useDeleteWishlistItemMutation: vi.fn(),
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
  useDeleteWishlistItemMutation,
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

describe('DetailPage', () => {
  const mockOnBack = vi.fn()
  const mockOnEdit = vi.fn()
  const mockDeleteItem = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    vi.mocked(useDeleteWishlistItemMutation).mockReturnValue([
      mockDeleteItem.mockReturnValue({ unwrap: () => Promise.resolve() }),
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
        <DetailPage itemId={mockItem.id} onBack={mockOnBack} onEdit={mockOnEdit} />
      </TestWrapper>,
    )

    expect(screen.getByTestId('detail-skeleton')).toBeInTheDocument()
  })

  it('renders not found state when item not found', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 404 },
    } as any)

    render(
      <TestWrapper>
        <DetailPage itemId={mockItem.id} onBack={mockOnBack} onEdit={mockOnEdit} />
      </TestWrapper>,
    )

    expect(screen.getByTestId('not-found-state')).toBeInTheDocument()
    expect(screen.getByText('Item Not Found')).toBeInTheDocument()
  })

  it('renders item details when loaded', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <DetailPage itemId={mockItem.id} onBack={mockOnBack} onEdit={mockOnEdit} />
      </TestWrapper>,
    )

    expect(screen.getByTestId('detail-page')).toBeInTheDocument()
    expect(screen.getByTestId('detail-title')).toHaveTextContent(mockItem.title)
    expect(screen.getByTestId('detail-store')).toHaveTextContent(mockItem.store)
    expect(screen.getByTestId('detail-set-number')).toHaveTextContent('Set #75192')
  })

  it('calls onBack when back button is clicked', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <DetailPage itemId={mockItem.id} onBack={mockOnBack} onEdit={mockOnEdit} />
      </TestWrapper>,
    )

    fireEvent.click(screen.getByTestId('detail-back-button'))
    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('calls onEdit when edit button is clicked', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <DetailPage itemId={mockItem.id} onBack={mockOnBack} onEdit={mockOnEdit} />
      </TestWrapper>,
    )

    fireEvent.click(screen.getByTestId('detail-edit-button'))
    expect(mockOnEdit).toHaveBeenCalledWith(mockItem.id)
  })

  it('displays tags correctly', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <DetailPage itemId={mockItem.id} onBack={mockOnBack} onEdit={mockOnEdit} />
      </TestWrapper>,
    )

    expect(screen.getByTestId('detail-tags')).toBeInTheDocument()
    expect(screen.getByText('Star Wars')).toBeInTheDocument()
    expect(screen.getByText('UCS')).toBeInTheDocument()
  })

  it('displays notes section', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <DetailPage itemId={mockItem.id} onBack={mockOnBack} onEdit={mockOnEdit} />
      </TestWrapper>,
    )

    expect(screen.getByTestId('detail-notes')).toBeInTheDocument()
    expect(screen.getByText('Dream set!')).toBeInTheDocument()
  })

  it('renders source URL link when available', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <DetailPage itemId={mockItem.id} onBack={mockOnBack} onEdit={mockOnEdit} />
      </TestWrapper>,
    )

    const sourceLink = screen.getByTestId('detail-source-url')
    expect(sourceLink).toHaveAttribute('href', mockItem.sourceUrl)
  })

  it('opens delete confirmation dialog when delete button clicked', () => {
    vi.mocked(useGetWishlistItemQuery).mockReturnValue({
      data: mockItem,
      isLoading: false,
      error: undefined,
    } as any)

    render(
      <TestWrapper>
        <DetailPage itemId={mockItem.id} onBack={mockOnBack} onEdit={mockOnEdit} />
      </TestWrapper>,
    )

    fireEvent.click(screen.getByTestId('detail-delete-button'))
    expect(screen.getByText('Delete Wishlist Item?')).toBeInTheDocument()
  })
})
