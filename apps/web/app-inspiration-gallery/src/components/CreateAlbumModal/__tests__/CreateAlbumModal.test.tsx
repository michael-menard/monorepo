/**
 * CreateAlbumModal Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateAlbumModal } from '../index'

describe('CreateAlbumModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onCreate: vi.fn().mockResolvedValue(undefined),
    parentAlbums: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<CreateAlbumModal {...defaultProps} />)
    expect(screen.getByTestId('create-album-modal')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<CreateAlbumModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('create-album-modal')).not.toBeInTheDocument()
  })

  it('shows album title input', () => {
    render(<CreateAlbumModal {...defaultProps} />)
    const titleInput = screen.getByTestId('create-album-title')
    expect(titleInput).toBeInTheDocument()
  })

  it('calls onCreate when form submitted with valid data', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn().mockResolvedValue(undefined)
    render(<CreateAlbumModal {...defaultProps} onCreate={onCreate} />)

    const titleInput = screen.getByTestId('create-album-title')
    await user.type(titleInput, 'New Album')

    const createButton = screen.getByTestId('create-album-submit')
    await user.click(createButton)

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        title: 'New Album',
        description: undefined,
        parentAlbumId: undefined,
      })
    })
  })

  it('disables form when creating', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000)),
    )
    render(<CreateAlbumModal {...defaultProps} onCreate={onCreate} />)

    const titleInput = screen.getByTestId('create-album-title')
    await user.type(titleInput, 'New Album')

    const createButton = screen.getByTestId('create-album-submit')
    await user.click(createButton)

    const creatingButton = await screen.findByRole('button', { name: /creating/i })
    expect(creatingButton).toBeDisabled()
  })
})
