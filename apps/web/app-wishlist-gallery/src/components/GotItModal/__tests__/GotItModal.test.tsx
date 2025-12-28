/**
 * GotItModal Tests
 *
 * Story wish-2004: Got It Flow Modal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GotItModal } from '../index'
import type { WishlistItem } from '@repo/api-client/schemas/wishlist'

// Mock RTK Query hook
const mockMarkPurchased = vi.fn()
vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => ({
  useMarkAsPurchasedMutation: () => [mockMarkPurchased, { isLoading: false }],
}))

// Mock toast functions
vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual('@repo/app-component-library')
  return {
    ...actual,
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }
})

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe('GotItModal', () => {
  const mockItem: WishlistItem = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    title: 'LEGO Star Wars Millennium Falcon',
    store: 'LEGO',
    setNumber: '75192',
    sourceUrl: null,
    imageUrl: 'https://example.com/image.jpg',
    price: '99.99',
    currency: 'USD',
    pieceCount: 7541,
    releaseDate: null,
    tags: [],
    priority: 3,
    notes: null,
    sortOrder: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    item: mockItem,
    onCompleted: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockMarkPurchased.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          message: 'Item marked as purchased',
          newSetId: null,
          removedFromWishlist: true,
        }),
    })
  })

  it('renders the modal when open', () => {
    render(<GotItModal {...defaultProps} />)

    expect(screen.getByText('Add to Your Collection')).toBeInTheDocument()
    expect(screen.getByText('LEGO Star Wars Millennium Falcon')).toBeInTheDocument()
  })

  it('shows item summary with set number and piece count', () => {
    render(<GotItModal {...defaultProps} />)

    expect(screen.getByText('Set #75192')).toBeInTheDocument()
    expect(screen.getByText('7,541 pieces')).toBeInTheDocument()
  })

  it('pre-fills price from wishlist item', () => {
    render(<GotItModal {...defaultProps} />)

    const priceInput = screen.getByLabelText(/price paid/i)
    expect(priceInput).toHaveValue(99.99)
  })

  it('defaults quantity to 1', () => {
    render(<GotItModal {...defaultProps} />)

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('increments quantity when plus button is clicked', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...defaultProps} />)

    const plusButton = screen.getByRole('button', { name: /increase quantity/i })
    await user.click(plusButton)

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('decrements quantity when minus button is clicked', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...defaultProps} />)

    // First increment to 2
    const plusButton = screen.getByRole('button', { name: /increase quantity/i })
    await user.click(plusButton)

    // Then decrement back to 1
    const minusButton = screen.getByRole('button', { name: /decrease quantity/i })
    await user.click(minusButton)

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('does not decrement quantity below 1', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...defaultProps} />)

    const minusButton = screen.getByRole('button', { name: /decrease quantity/i })
    await user.click(minusButton)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(minusButton).toBeDisabled()
  })

  it('calls onOpenChange with false when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...defaultProps} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('submits form with correct data', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...defaultProps} />)

    const submitButton = screen.getByRole('button', { name: /add to collection/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockMarkPurchased).toHaveBeenCalledWith({
        id: mockItem.id,
        data: expect.objectContaining({
          purchasePrice: 99.99,
          quantity: 1,
          keepOnWishlist: false,
        }),
      })
    })
  })

  it('calls onCompleted after successful submission', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...defaultProps} />)

    const submitButton = screen.getByRole('button', { name: /add to collection/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(defaultProps.onCompleted).toHaveBeenCalled()
    })
  })

  it('shows item image when available', () => {
    render(<GotItModal {...defaultProps} />)

    const image = screen.getByAltText('LEGO Star Wars Millennium Falcon')
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
  })

  it('shows placeholder icon when no image', () => {
    const itemWithoutImage = { ...mockItem, imageUrl: null }
    render(<GotItModal {...defaultProps} item={itemWithoutImage} />)

    // Package icon should be present (SVG)
    expect(screen.queryByAltText('LEGO Star Wars Millennium Falcon')).not.toBeInTheDocument()
  })

  it('handles keep on wishlist checkbox', async () => {
    const user = userEvent.setup()
    render(<GotItModal {...defaultProps} />)

    const checkbox = screen.getByRole('checkbox', { name: /keep a copy on wishlist/i })
    await user.click(checkbox)

    expect(checkbox).toBeChecked()
  })

  it('does not render when open is false', () => {
    render(<GotItModal {...defaultProps} open={false} />)

    expect(screen.queryByText('Add to Your Collection')).not.toBeInTheDocument()
  })
})
