/**
 * UploadModal Component Tests
 * BUGF-012: Test coverage for untested components
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadModal } from '../index'

describe('UploadModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onUpload: vi.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<UploadModal {...defaultProps} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText('Add Inspiration').length).toBeGreaterThan(0)
  })

  it('does not render when closed', () => {
    render(<UploadModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows upload mode tabs', () => {
    render(<UploadModal {...defaultProps} />)
    expect(screen.getByText('Upload File')).toBeInTheDocument()
    expect(screen.getByText('Import URL')).toBeInTheDocument()
  })

  it('calls onClose when cancel button clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<UploadModal {...defaultProps} onClose={onClose} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(onClose).toHaveBeenCalled()
  })
})
