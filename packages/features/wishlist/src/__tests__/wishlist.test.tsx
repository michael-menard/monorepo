import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WishlistItem from '../components/WishlistItem'
import type { WishlistItem as WishlistItemType } from '../schemas'

const mockItem: WishlistItemType = {
  id: '1',
  name: 'Test Item',
  description: 'Test description',
  price: 99.99,
  priority: 'high',
  category: 'Electronics',
  isPurchased: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockHandlers = {
  onEdit: () => {},
  onDelete: () => {},
  onTogglePurchased: () => {},
}

describe('Wishlist Package', () => {
  it('exports WishlistItem component', () => {
    expect(WishlistItem).toBeDefined()
  })

  it('renders WishlistItem with correct data', () => {
    render(
      <WishlistItem
        item={mockItem}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onTogglePurchased={mockHandlers.onTogglePurchased}
      />,
    )

    expect(screen.getByText('Test Item')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('$99.99')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
    expect(screen.getByText('Electronics')).toBeInTheDocument()
  })

  it('shows purchased state correctly', () => {
    const purchasedItem = { ...mockItem, isPurchased: true }

    render(
      <WishlistItem
        item={purchasedItem}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onTogglePurchased={mockHandlers.onTogglePurchased}
      />,
    )

    expect(screen.getByText('Purchased')).toBeInTheDocument()
  })

  it('renders without optional fields', () => {
    const minimalItem = {
      ...mockItem,
      description: undefined,
      price: undefined,
      category: undefined,
    }

    render(
      <WishlistItem
        item={minimalItem}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        onTogglePurchased={mockHandlers.onTogglePurchased}
      />,
    )

    expect(screen.getByText('Test Item')).toBeInTheDocument()
    expect(screen.queryByText('Test description')).not.toBeInTheDocument()
    expect(screen.queryByText('$99.99')).not.toBeInTheDocument()
    expect(screen.queryByText('Electronics')).not.toBeInTheDocument()
  })
})
