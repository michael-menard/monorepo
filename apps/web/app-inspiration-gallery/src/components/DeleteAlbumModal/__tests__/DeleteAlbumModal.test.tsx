/**
 * DeleteAlbumModal Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeleteAlbumModal } from '../index'
import type { DeleteAlbumItem } from '../index'

describe('DeleteAlbumModal', () => {
  const mockItem: DeleteAlbumItem = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test Album',
    itemCount: 5,
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

  it('renders when open with item', () => {
    render(<DeleteAlbumModal {...defaultProps} />)
    expect(screen.getByTestId('delete-album-modal')).toBeInTheDocument()
  })

  it('does not render when item is null', () => {
    render(<DeleteAlbumModal {...defaultProps} item={null} />)
    expect(screen.queryByTestId('delete-album-modal')).not.toBeInTheDocument()
  })

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn()
    render(<DeleteAlbumModal {...defaultProps} onConfirm={onConfirm} />)
    
    const confirmButton = screen.getByTestId('delete-album-confirm')
    await userEvent.click(confirmButton)
    
    expect(onConfirm).toHaveBeenCalledWith(mockItem)
  })

  it('calls onClose when cancel button clicked', async () => {
    const onClose = vi.fn()
    render(<DeleteAlbumModal {...defaultProps} onClose={onClose} />)
    
    const cancelButton = screen.getByTestId('delete-album-cancel')
    await userEvent.click(cancelButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('disables buttons when deleting', () => {
    render(<DeleteAlbumModal {...defaultProps} isDeleting={true} />)
    
    expect(screen.getByTestId('delete-album-cancel')).toBeDisabled()
    expect(screen.getByTestId('delete-album-confirm')).toBeDisabled()
  })
})
