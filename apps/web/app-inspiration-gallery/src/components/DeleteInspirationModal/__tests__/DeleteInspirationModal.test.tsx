/**
 * DeleteInspirationModal Component Tests
 *
 * BUGF-012: Test coverage for untested components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteInspirationModal } from '../index'
import type { DeleteInspirationItem } from '../index'

describe('DeleteInspirationModal', () => {
  const mockItem: DeleteInspirationItem = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test Inspiration',
    imageUrl: 'https://example.com/image.jpg',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    albumCount: 2,
    albumNames: ['Album 1', 'Album 2'],
  }

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    item: mockItem,
    isDeleting: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders when open with item', () => {
      render(<DeleteInspirationModal {...defaultProps} />)

      expect(screen.getByTestId('delete-inspiration-modal')).toBeInTheDocument()
      expect(screen.getByText(/Delete Inspiration\?/i)).toBeInTheDocument()
    })

    it('does not render when item is null', () => {
      render(<DeleteInspirationModal {...defaultProps} item={null} />)

      expect(screen.queryByTestId('delete-inspiration-modal')).not.toBeInTheDocument()
    })

    it('displays item preview with thumbnail', () => {
      render(<DeleteInspirationModal {...defaultProps} />)

      const preview = screen.getByTestId('delete-inspiration-preview')
      expect(preview).toBeInTheDocument()

      const img = screen.getByRole('img', { name: mockItem.title })
      expect(img).toHaveAttribute('src', mockItem.thumbnailUrl)
    })

    it('falls back to imageUrl when no thumbnail', () => {
      const item = { ...mockItem, thumbnailUrl: null }
      render(<DeleteInspirationModal {...defaultProps} item={item} />)

      const img = screen.getByRole('img', { name: mockItem.title })
      expect(img).toHaveAttribute('src', mockItem.imageUrl)
    })

    it('shows album count when item is in albums', () => {
      render(<DeleteInspirationModal {...defaultProps} />)

      expect(screen.getByText(/In 2 albums/i)).toBeInTheDocument()
    })

    it('shows singular album text when in one album', () => {
      const item = { ...mockItem, albumCount: 1 }
      render(<DeleteInspirationModal {...defaultProps} item={item} />)

      expect(screen.getByText(/In 1 album$/i)).toBeInTheDocument()
    })

    it('shows multi-album warning when in multiple albums', () => {
      render(<DeleteInspirationModal {...defaultProps} />)

      expect(screen.getByText(/Will be removed from:/i)).toBeInTheDocument()
      expect(screen.getByText('Album 1')).toBeInTheDocument()
      expect(screen.getByText('Album 2')).toBeInTheDocument()
    })

    it('limits album names display to 3', () => {
      const item = {
        ...mockItem,
        albumCount: 5,
        albumNames: ['Album 1', 'Album 2', 'Album 3', 'Album 4', 'Album 5'],
      }
      render(<DeleteInspirationModal {...defaultProps} item={item} />)

      expect(screen.getByText('Album 1')).toBeInTheDocument()
      expect(screen.getByText('Album 2')).toBeInTheDocument()
      expect(screen.getByText('Album 3')).toBeInTheDocument()
      expect(screen.getByText(/...and 2 more/i)).toBeInTheDocument()
      expect(screen.queryByText('Album 4')).not.toBeInTheDocument()
    })

    it('shows loading state when deleting', () => {
      render(<DeleteInspirationModal {...defaultProps} isDeleting={true} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText(/Deleting inspiration.../i)).toBeInTheDocument()
    })

    it('disables buttons when deleting', () => {
      render(<DeleteInspirationModal {...defaultProps} isDeleting={true} />)

      const cancelButton = screen.getByTestId('delete-inspiration-cancel')
      const confirmButton = screen.getByTestId('delete-inspiration-confirm')

      expect(cancelButton).toBeDisabled()
      expect(confirmButton).toBeDisabled()
    })
  })

  describe('interactions', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<DeleteInspirationModal {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByTestId('delete-inspiration-cancel')
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('calls onConfirm with item when confirm button is clicked', async () => {
      const onConfirm = vi.fn()
      render(<DeleteInspirationModal {...defaultProps} onConfirm={onConfirm} />)

      const confirmButton = screen.getByTestId('delete-inspiration-confirm')
      await userEvent.click(confirmButton)

      expect(onConfirm).toHaveBeenCalledTimes(1)
      expect(onConfirm).toHaveBeenCalledWith(mockItem)
    })

    it('does not call onClose when deleting', async () => {
      const onClose = vi.fn()
      render(<DeleteInspirationModal {...defaultProps} onClose={onClose} isDeleting={true} />)

      const cancelButton = screen.getByTestId('delete-inspiration-cancel')
      await userEvent.click(cancelButton)

      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has descriptive warning message', () => {
      render(<DeleteInspirationModal {...defaultProps} />)

      expect(
        screen.getByText(/This will permanently delete this inspiration from your gallery./i),
      ).toBeInTheDocument()
    })

    it('shows destructive styling on confirm button', () => {
      render(<DeleteInspirationModal {...defaultProps} />)

      const confirmButton = screen.getByTestId('delete-inspiration-confirm')
      expect(confirmButton).toHaveClass('bg-destructive')
    })

    it('has role status for loading indicator', () => {
      render(<DeleteInspirationModal {...defaultProps} isDeleting={true} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })
})
