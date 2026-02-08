/**
 * DeleteConfirmModal Component Tests
 *
 * Tests for the delete confirmation modal.
 * Story WISH-2041: Delete Flow
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'
import { DeleteConfirmModal } from '../index'

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
  status: 'wishlist',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
  createdBy: null,
  updatedBy: null,
}

describe('DeleteConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    item: mockWishlistItem,
    isDeleting: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders modal when open with item', () => {
    render(<DeleteConfirmModal {...defaultProps} />)

    expect(screen.getByText('Delete Item?')).toBeInTheDocument()
    expect(
      screen.getByText('This action is permanent. You cannot undo it.'),
    ).toBeInTheDocument()
  })

  it('renders item preview with title', () => {
    render(<DeleteConfirmModal {...defaultProps} />)

    expect(screen.getByTestId('delete-confirm-title')).toHaveTextContent(
      'LEGO Star Wars Millennium Falcon',
    )
  })

  it('renders set number when available', () => {
    render(<DeleteConfirmModal {...defaultProps} />)

    expect(screen.getByText('Set #75192')).toBeInTheDocument()
  })

  it('renders store name when available', () => {
    render(<DeleteConfirmModal {...defaultProps} />)

    expect(screen.getByText('LEGO')).toBeInTheDocument()
  })

  it('renders item image when available', () => {
    render(<DeleteConfirmModal {...defaultProps} />)

    const image = screen.getByAltText('LEGO Star Wars Millennium Falcon')
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('renders placeholder when no image', () => {
    const itemWithoutImage = { ...mockWishlistItem, imageUrl: null }
    render(<DeleteConfirmModal {...defaultProps} item={itemWithoutImage} />)

    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('does not render when item is null', () => {
    render(<DeleteConfirmModal {...defaultProps} item={null} />)

    expect(screen.queryByText('Delete Item?')).not.toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<DeleteConfirmModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Delete Item?')).not.toBeInTheDocument()
  })

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn()
    render(<DeleteConfirmModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByTestId('delete-confirm-cancel'))

    // onClose is called from both the button onClick and the dialog onOpenChange
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onConfirm with item when Delete button is clicked', () => {
    const onConfirm = vi.fn()
    render(<DeleteConfirmModal {...defaultProps} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByTestId('delete-confirm-delete'))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith(mockWishlistItem)
  })

  it('disables buttons when isDeleting is true', () => {
    render(<DeleteConfirmModal {...defaultProps} isDeleting={true} />)

    expect(screen.getByTestId('delete-confirm-cancel')).toBeDisabled()
    expect(screen.getByTestId('delete-confirm-delete')).toBeDisabled()
  })

  it('shows loading text when isDeleting is true', () => {
    render(<DeleteConfirmModal {...defaultProps} isDeleting={true} />)

    expect(screen.getByText('Deleting...')).toBeInTheDocument()
    expect(screen.getByText('Deleting item...')).toBeInTheDocument()
  })

  it('shows Delete text when not deleting', () => {
    render(<DeleteConfirmModal {...defaultProps} isDeleting={false} />)

    expect(screen.getByTestId('delete-confirm-delete')).toHaveTextContent('Delete')
  })

  it('renders without optional fields', () => {
    const minimalItem: WishlistItem = {
      ...mockWishlistItem,
      setNumber: null,
      imageUrl: null,
    }

    render(<DeleteConfirmModal {...defaultProps} item={minimalItem} />)

    expect(screen.getByTestId('delete-confirm-title')).toHaveTextContent(
      'LEGO Star Wars Millennium Falcon',
    )
    expect(screen.queryByText(/Set #/)).not.toBeInTheDocument()
  })

  describe('accessibility', () => {
    it('has destructive styling on delete button', () => {
      render(<DeleteConfirmModal {...defaultProps} />)

      const deleteButton = screen.getByTestId('delete-confirm-delete')
      expect(deleteButton).toHaveClass('bg-destructive')
    })

    it('has alert role on loading indicator', () => {
      render(<DeleteConfirmModal {...defaultProps} isDeleting={true} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has accessible item preview', () => {
      render(<DeleteConfirmModal {...defaultProps} />)

      expect(screen.getByTestId('delete-confirm-item-preview')).toBeInTheDocument()
    })
  })
})
