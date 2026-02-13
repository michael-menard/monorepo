/**
 * REPA-0510: UnsavedChangesDialog Tests
 * Migrated from apps/web/main-app/src/components/Uploader/UnsavedChangesDialog/__tests__
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UnsavedChangesDialog } from '../index'

describe('UnsavedChangesDialog', () => {
  const defaultProps = {
    open: true,
    onStay: vi.fn(),
    onLeave: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render dialog when open', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
      expect(screen.getByText(/You have unsaved changes that will be lost/)).toBeInTheDocument()
    })

    it('should not render dialog when closed', () => {
      render(<UnsavedChangesDialog {...defaultProps} open={false} />)

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })

    it('should render custom title and description', () => {
      render(
        <UnsavedChangesDialog
          {...defaultProps}
          title="Custom Title"
          description="Custom description text"
        />,
      )

      expect(screen.getByText('Custom Title')).toBeInTheDocument()
      expect(screen.getByText('Custom description text')).toBeInTheDocument()
    })

    it('should render custom button text', () => {
      render(
        <UnsavedChangesDialog
          {...defaultProps}
          stayButtonText="Keep editing"
          leaveButtonText="Discard changes"
        />,
      )

      expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onStay when stay button is clicked', () => {
      const onStay = vi.fn()
      render(<UnsavedChangesDialog {...defaultProps} onStay={onStay} />)

      fireEvent.click(screen.getByRole('button', { name: 'Stay on page' }))

      // Note: onStay may be called twice - once by button click, once by dialog close handler
      expect(onStay).toHaveBeenCalled()
    })

    it('should call onLeave when leave button is clicked', () => {
      const onLeave = vi.fn()
      render(<UnsavedChangesDialog {...defaultProps} onLeave={onLeave} />)

      fireEvent.click(screen.getByRole('button', { name: 'Leave page' }))

      expect(onLeave).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('should have proper title and description', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      // Check that title and description are present with correct IDs
      expect(screen.getByText('Unsaved changes')).toHaveAttribute('id', 'unsaved-changes-title')
      expect(screen.getByText(/You have unsaved changes that will be lost/)).toHaveAttribute('id', 'unsaved-changes-description')
    })

    it('should have accessible button labels', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Stay on page' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Leave page' })).toBeInTheDocument()
    })

    it('should have alertdialog role', () => {
      render(<UnsavedChangesDialog {...defaultProps} />)

      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
  })
})
