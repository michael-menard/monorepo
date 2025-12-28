/**
 * DeleteConfirmationModal Tests
 *
 * Story wish-2004: Delete Confirmation Modal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteConfirmationModal } from '../index'

// Mock RTK Query hook
const mockRemoveItem = vi.fn()
vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => ({
  useRemoveFromWishlistMutation: () => [
    mockRemoveItem,
    { isLoading: false },
  ],
}))

// Mock toast functions
vi.mock('@repo/ui', async () => {
  const actual = await vi.importActual('@repo/ui')
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

describe('DeleteConfirmationModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    itemId: '123e4567-e89b-12d3-a456-426614174000',
    itemTitle: 'LEGO Star Wars Set',
    onDeleted: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRemoveItem.mockReturnValue({
      unwrap: () => Promise.resolve({ id: defaultProps.itemId }),
    })
  })

  it('renders the modal when open', () => {
    render(<DeleteConfirmationModal {...defaultProps} />)

    expect(screen.getByText('Remove from Wishlist?')).toBeInTheDocument()
    expect(
      screen.getByText(/Are you sure you want to remove "LEGO Star Wars Set"/),
    ).toBeInTheDocument()
  })

  it('shows the item title in the description', () => {
    render(<DeleteConfirmationModal {...defaultProps} itemTitle="Custom Title" />)

    expect(screen.getByText(/Custom Title/)).toBeInTheDocument()
  })

  it('calls onOpenChange with false when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<DeleteConfirmationModal {...defaultProps} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls removeItem mutation when confirm is clicked', async () => {
    const user = userEvent.setup()
    render(<DeleteConfirmationModal {...defaultProps} />)

    const confirmButton = screen.getByRole('button', { name: /remove/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(mockRemoveItem).toHaveBeenCalledWith(defaultProps.itemId)
    })
  })

  it('calls onDeleted after successful deletion', async () => {
    const user = userEvent.setup()
    render(<DeleteConfirmationModal {...defaultProps} />)

    const confirmButton = screen.getByRole('button', { name: /remove/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(defaultProps.onDeleted).toHaveBeenCalled()
    })
  })

  it('closes the modal after successful deletion', async () => {
    const user = userEvent.setup()
    render(<DeleteConfirmationModal {...defaultProps} />)

    const confirmButton = screen.getByRole('button', { name: /remove/i })
    await user.click(confirmButton)

    await waitFor(() => {
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('does not render when open is false', () => {
    render(<DeleteConfirmationModal {...defaultProps} open={false} />)

    expect(screen.queryByText('Remove from Wishlist?')).not.toBeInTheDocument()
  })
})
