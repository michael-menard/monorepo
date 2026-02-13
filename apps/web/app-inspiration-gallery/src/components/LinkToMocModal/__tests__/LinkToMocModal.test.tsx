/**
 * LinkToMocModal Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LinkToMocModal } from '../index'

describe('LinkToMocModal', () => {
  const mockMocs = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test MOC 1',
      imageUrl: null,
      status: 'draft' as const,
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Test MOC 2',
      imageUrl: null,
      status: 'in-progress' as const,
    },
  ]

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    mocs: mockMocs,
    currentMocIds: [],
    isLoading: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<LinkToMocModal {...defaultProps} />)
    expect(screen.getByTestId('link-to-moc-modal')).toBeInTheDocument()
  })

  it('shows search input for MOCs', () => {
    render(<LinkToMocModal {...defaultProps} />)
    const searchInput = screen.getByTestId('link-to-moc-search')
    expect(searchInput).toBeInTheDocument()
  })

  it('calls onConfirm when MOC selected and confirmed', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<LinkToMocModal {...defaultProps} onConfirm={onConfirm} />)

    const checkbox = screen.getByTestId('moc-option-123e4567-e89b-12d3-a456-426614174000')
    await user.click(checkbox)

    const confirmButton = screen.getByTestId('link-to-moc-confirm')
    await user.click(confirmButton)

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(['123e4567-e89b-12d3-a456-426614174000'])
    })
  })
})
