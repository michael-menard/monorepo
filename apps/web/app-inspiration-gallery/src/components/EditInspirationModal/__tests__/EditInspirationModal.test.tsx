/**
 * EditInspirationModal Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditInspirationModal } from '../index'

describe('EditInspirationModal', () => {
  const mockInspiration = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test Inspiration',
    description: 'Test description',
    imageUrl: 'http://example.com/image.jpg',
    thumbnailUrl: null,
    sourceUrl: 'http://example.com/source',
    tags: ['tag1', 'tag2'],
  }

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    item: mockInspiration,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<EditInspirationModal {...defaultProps} />)
    expect(screen.getByTestId('edit-inspiration-modal')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<EditInspirationModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('edit-inspiration-modal')).not.toBeInTheDocument()
  })

  it('shows inspiration title in form', () => {
    render(<EditInspirationModal {...defaultProps} />)
    const titleInput = screen.getByTestId('edit-inspiration-title')
    expect(titleInput).toHaveValue(mockInspiration.title)
  })

  it('calls onSave when form submitted', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<EditInspirationModal {...defaultProps} onSave={onSave} />)

    const titleInput = screen.getByTestId('edit-inspiration-title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Title')

    const saveButton = screen.getByTestId('edit-inspiration-save')
    await user.click(saveButton)

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        id: mockInspiration.id,
        title: 'Updated Title',
        description: 'Test description',
        sourceUrl: 'http://example.com/source',
        tags: ['tag1', 'tag2'],
      })
    })
  })

  it('calls onClose when cancel button clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<EditInspirationModal {...defaultProps} onClose={onClose} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })

  it('disables form when saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000)),
    )
    render(<EditInspirationModal {...defaultProps} onSave={onSave} />)

    const titleInput = screen.getByTestId('edit-inspiration-title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Title')

    const saveButton = screen.getByTestId('edit-inspiration-save')
    await user.click(saveButton)

    const savingButton = await screen.findByRole('button', { name: /saving/i })
    expect(savingButton).toBeDisabled()
  })
})
