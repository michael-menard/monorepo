/**
 * AddToAlbumModal Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddToAlbumModal } from '../index'

describe('AddToAlbumModal', () => {
  const mockAlbums = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Album 1',
      coverImageUrl: null,
      itemCount: 5,
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Album 2',
      coverImageUrl: null,
      itemCount: 3,
    },
  ]

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    albums: mockAlbums,
    currentAlbumIds: [],
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<AddToAlbumModal {...defaultProps} />)
    expect(screen.getByTestId('add-to-album-modal')).toBeInTheDocument()
  })

  it('shows list of albums', () => {
    render(<AddToAlbumModal {...defaultProps} />)
    expect(screen.getByText('Album 1')).toBeInTheDocument()
    expect(screen.getByText('Album 2')).toBeInTheDocument()
  })

  it('calls onConfirm when album selected and confirmed', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<AddToAlbumModal {...defaultProps} onConfirm={onConfirm} />)

    const checkbox = screen.getByTestId('album-option-123e4567-e89b-12d3-a456-426614174000')
    await user.click(checkbox)

    const confirmButton = screen.getByTestId('add-to-album-confirm')
    await user.click(confirmButton)

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(['123e4567-e89b-12d3-a456-426614174000'])
    })
  })
})
