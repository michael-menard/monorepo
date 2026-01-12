/**
 * WishlistCard Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { WishlistCard } from '../index'
import { wishlistGalleryApi } from '@repo/api-client/rtk/wishlist-gallery-api'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'

// Create test store with RTK Query reducer
function createTestStore() {
  return configureStore({
    reducer: {
      [wishlistGalleryApi.reducerPath]: wishlistGalleryApi.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(wishlistGalleryApi.middleware),
  })
}

// Test wrapper with Redux Provider
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <Provider store={createTestStore()}>{children}</Provider>
}

// Helper to render with Provider
function renderWithProvider(ui: React.ReactNode) {
  return render(<TestWrapper>{ui}</TestWrapper>)
}

// Mock data
const mockWishlistItem: WishlistItem = {
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

describe('WishlistCard', () => {
  it('renders title correctly', () => {
    renderWithProvider(<WishlistCard item={mockWishlistItem} />)
    expect(screen.getByText('LEGO Star Wars Millennium Falcon')).toBeInTheDocument()
  })

  it('renders set number as subtitle', () => {
    renderWithProvider(<WishlistCard item={mockWishlistItem} />)
    expect(screen.getByText('Set #75192')).toBeInTheDocument()
  })

  it('renders store badge', () => {
    renderWithProvider(<WishlistCard item={mockWishlistItem} />)
    expect(screen.getByTestId('wishlist-card-store')).toHaveTextContent('LEGO')
  })

  it('renders formatted price', () => {
    renderWithProvider(<WishlistCard item={mockWishlistItem} />)
    expect(screen.getByTestId('wishlist-card-price')).toHaveTextContent('$849.99')
  })

  it('renders piece count with locale formatting', () => {
    renderWithProvider(<WishlistCard item={mockWishlistItem} />)
    expect(screen.getByTestId('wishlist-card-pieces')).toHaveTextContent('7,541')
  })

  it('renders priority stars', () => {
    renderWithProvider(<WishlistCard item={mockWishlistItem} />)
    const priorityElement = screen.getByTestId('wishlist-card-priority')
    expect(priorityElement).toBeInTheDocument()
    // Check for aria-label with priority value
    expect(priorityElement).toHaveAttribute('aria-label', 'Priority 5 of 5')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    renderWithProvider(<WishlistCard item={mockWishlistItem} onClick={handleClick} />)

    const card = screen.getByTestId(`wishlist-card-${mockWishlistItem.id}`)
    fireEvent.click(card)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders without optional fields', () => {
    const minimalItem: WishlistItem = {
      ...mockWishlistItem,
      setNumber: null,
      price: null,
      pieceCount: null,
      priority: 0,
      imageUrl: null,
    }

    renderWithProvider(<WishlistCard item={minimalItem} />)

    expect(screen.getByText('LEGO Star Wars Millennium Falcon')).toBeInTheDocument()
    expect(screen.queryByText(/Set #/)).not.toBeInTheDocument()
    expect(screen.queryByTestId('wishlist-card-price')).not.toBeInTheDocument()
    expect(screen.queryByTestId('wishlist-card-pieces')).not.toBeInTheDocument()
    expect(screen.queryByTestId('wishlist-card-priority')).not.toBeInTheDocument()
  })

  it('applies different store badge colors', () => {
    const barweerItem: WishlistItem = { ...mockWishlistItem, store: 'Barweer' }
    const { rerender } = renderWithProvider(<WishlistCard item={barweerItem} />)
    expect(screen.getByTestId('wishlist-card-store')).toHaveTextContent('Barweer')

    const bricklinkItem: WishlistItem = { ...mockWishlistItem, store: 'BrickLink' }
    rerender(<TestWrapper><WishlistCard item={bricklinkItem} /></TestWrapper>)
    expect(screen.getByTestId('wishlist-card-store')).toHaveTextContent('BrickLink')
  })

  it('applies className prop', () => {
    renderWithProvider(<WishlistCard item={mockWishlistItem} className="custom-class" />)
    const card = screen.getByTestId(`wishlist-card-${mockWishlistItem.id}`)
    expect(card).toHaveClass('custom-class')
  })

  it('renders with different priority levels', () => {
    const lowPriority: WishlistItem = { ...mockWishlistItem, priority: 1 }
    const { rerender } = renderWithProvider(<WishlistCard item={lowPriority} />)
    expect(screen.getByTestId('wishlist-card-priority')).toHaveAttribute('aria-label', 'Priority 1 of 5')

    const midPriority: WishlistItem = { ...mockWishlistItem, priority: 3 }
    rerender(<TestWrapper><WishlistCard item={midPriority} /></TestWrapper>)
    expect(screen.getByTestId('wishlist-card-priority')).toHaveAttribute('aria-label', 'Priority 3 of 5')
  })
})
