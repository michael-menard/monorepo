/**
 * BulkActionsBar Component Tests
 *
 * INSP-021: Multi-Select & Bulk Ops
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkActionsBar } from '../index'

describe('BulkActionsBar', () => {
  const defaultProps = {
    selectionCount: 3,
    totalCount: 10,
    itemType: 'inspirations' as const,
    onClearSelection: vi.fn(),
    onSelectAll: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders when items are selected', () => {
      render(<BulkActionsBar {...defaultProps} />)

      expect(screen.getByRole('toolbar', { name: /Bulk actions/i })).toBeInTheDocument()
    })

    it('does not render when no items are selected', () => {
      render(<BulkActionsBar {...defaultProps} selectionCount={0} />)

      expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
    })

    it('displays correct selection count for inspirations', () => {
      render(<BulkActionsBar {...defaultProps} selectionCount={3} />)

      expect(screen.getByText(/3 inspirations selected/i)).toBeInTheDocument()
    })

    it('displays singular label for single selection', () => {
      render(<BulkActionsBar {...defaultProps} selectionCount={1} />)

      expect(screen.getByText(/1 inspiration selected/i)).toBeInTheDocument()
    })

    it('displays correct label for albums', () => {
      render(<BulkActionsBar {...defaultProps} itemType="albums" selectionCount={2} />)

      expect(screen.getByText(/2 albums selected/i)).toBeInTheDocument()
    })

    it('shows Select All button when not all items selected', () => {
      render(<BulkActionsBar {...defaultProps} selectionCount={3} totalCount={10} />)

      expect(screen.getByRole('button', { name: /Select all \(10\)/i })).toBeInTheDocument()
    })

    it('hides Select All button when all items are selected', () => {
      render(<BulkActionsBar {...defaultProps} selectionCount={10} totalCount={10} />)

      expect(screen.queryByRole('button', { name: /Select all/i })).not.toBeInTheDocument()
    })

    it('shows clear selection button', () => {
      render(<BulkActionsBar {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Clear selection/i })).toBeInTheDocument()
    })
  })

  describe('action buttons', () => {
    it('shows Add to Album button for inspirations', () => {
      render(<BulkActionsBar {...defaultProps} onAddToAlbum={vi.fn()} />)

      expect(screen.getByTestId('bulk-add-to-album')).toBeInTheDocument()
    })

    it('does not show Add to Album button for albums', () => {
      render(<BulkActionsBar {...defaultProps} itemType="albums" onAddToAlbum={vi.fn()} />)

      expect(screen.queryByTestId('bulk-add-to-album')).not.toBeInTheDocument()
    })

    it('shows Link to MOC button when onLinkToMoc is provided', () => {
      render(<BulkActionsBar {...defaultProps} onLinkToMoc={vi.fn()} />)

      expect(screen.getByTestId('bulk-link-to-moc')).toBeInTheDocument()
    })

    it('does not show Link to MOC button when onLinkToMoc is not provided', () => {
      render(<BulkActionsBar {...defaultProps} />)

      expect(screen.queryByTestId('bulk-link-to-moc')).not.toBeInTheDocument()
    })

    it('shows Delete button when onDelete is provided', () => {
      render(<BulkActionsBar {...defaultProps} onDelete={vi.fn()} />)

      expect(screen.getByTestId('bulk-delete')).toBeInTheDocument()
    })

    it('does not show Delete button when onDelete is not provided', () => {
      render(<BulkActionsBar {...defaultProps} />)

      expect(screen.queryByTestId('bulk-delete')).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onClearSelection when clear button is clicked', async () => {
      const onClearSelection = vi.fn()
      render(<BulkActionsBar {...defaultProps} onClearSelection={onClearSelection} />)

      await userEvent.click(screen.getByRole('button', { name: /Clear selection/i }))

      expect(onClearSelection).toHaveBeenCalledTimes(1)
    })

    it('calls onSelectAll when Select All button is clicked', async () => {
      const onSelectAll = vi.fn()
      render(<BulkActionsBar {...defaultProps} onSelectAll={onSelectAll} />)

      await userEvent.click(screen.getByRole('button', { name: /Select all/i }))

      expect(onSelectAll).toHaveBeenCalledTimes(1)
    })

    it('calls onAddToAlbum when Add to Album button is clicked', async () => {
      const onAddToAlbum = vi.fn()
      render(<BulkActionsBar {...defaultProps} onAddToAlbum={onAddToAlbum} />)

      await userEvent.click(screen.getByTestId('bulk-add-to-album'))

      expect(onAddToAlbum).toHaveBeenCalledTimes(1)
    })

    it('calls onLinkToMoc when Link to MOC button is clicked', async () => {
      const onLinkToMoc = vi.fn()
      render(<BulkActionsBar {...defaultProps} onLinkToMoc={onLinkToMoc} />)

      await userEvent.click(screen.getByTestId('bulk-link-to-moc'))

      expect(onLinkToMoc).toHaveBeenCalledTimes(1)
    })

    it('calls onDelete when Delete button is clicked', async () => {
      const onDelete = vi.fn()
      render(<BulkActionsBar {...defaultProps} onDelete={onDelete} />)

      await userEvent.click(screen.getByTestId('bulk-delete'))

      expect(onDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has role toolbar', () => {
      render(<BulkActionsBar {...defaultProps} />)

      expect(screen.getByRole('toolbar')).toBeInTheDocument()
    })

    it('has accessible label', () => {
      render(<BulkActionsBar {...defaultProps} />)

      expect(screen.getByRole('toolbar', { name: /Bulk actions/i })).toBeInTheDocument()
    })

    it('all buttons are accessible', () => {
      render(
        <BulkActionsBar
          {...defaultProps}
          onAddToAlbum={vi.fn()}
          onLinkToMoc={vi.fn()}
          onDelete={vi.fn()}
        />,
      )

      // All action buttons should be accessible
      expect(screen.getByRole('button', { name: /Clear selection/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Select all/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Add to Album/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Link to MOC/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      render(<BulkActionsBar {...defaultProps} className="custom-class" />)

      const toolbar = screen.getByRole('toolbar')
      expect(toolbar).toHaveClass('custom-class')
    })

    it('has delete button with destructive styling', () => {
      render(<BulkActionsBar {...defaultProps} onDelete={vi.fn()} />)

      const deleteButton = screen.getByTestId('bulk-delete')
      expect(deleteButton).toHaveClass('text-destructive')
    })
  })
})
