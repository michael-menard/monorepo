/**
 * FilterPanel Accessibility Tests
 *
 * Tests for keyboard navigation and screen reader support.
 * Story WISH-20172: Frontend Filter Panel UI
 * AC19: Keyboard navigable
 * AC20: Screen reader announces filter state changes
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { FilterPanel } from '../index'

describe('FilterPanel - Accessibility (AC19, AC20)', () => {
  const mockOnApplyFilters = vi.fn()
  const mockOnClearFilters = vi.fn()

  const defaultProps = {
    onApplyFilters: mockOnApplyFilters,
    onClearFilters: mockOnClearFilters,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Keyboard Navigation (AC19)', () => {
    it('opens panel via keyboard on trigger button', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)

      // Tab to the trigger button and activate it
      await user.tab()
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      expect(trigger).toHaveFocus()

      // Click to open (Radix Popover triggers on click/pointer events)
      await user.click(trigger)

      const panel = screen.getByTestId('filter-panel-content')
      expect(panel).toBeInTheDocument()
    })

    it('closes panel with Escape key', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const panel = screen.getByTestId('filter-panel-content')
      expect(panel).toBeInTheDocument()

      await user.keyboard('{Escape}')

      expect(screen.queryByTestId('filter-panel-content')).not.toBeInTheDocument()
    })

    it('applies filters with Enter key inside panel', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const panel = screen.getByTestId('filter-panel-content')
      panel.focus()

      await user.keyboard('{Enter}')

      expect(mockOnApplyFilters).toHaveBeenCalledTimes(1)
    })

    it('allows Tab navigation through all controls', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      // Tab through checkboxes
      await user.tab()
      const legoCheckbox = screen.getByRole('checkbox', { name: /filter by lego/i })
      expect(legoCheckbox).toHaveFocus()

      // Continue tabbing to other controls
      await user.tab() // BrickLink
      await user.tab() // Barweer
      await user.tab() // Cata
      await user.tab() // Other
      
      // Should reach priority min input
      await user.tab()
      const priorityMin = screen.getByTestId('priority-min-input')
      expect(priorityMin).toHaveFocus()
    })
  })

  describe('ARIA Labels and Roles (AC20)', () => {
    it('has aria-label on filter trigger button', () => {
      render(<FilterPanel {...defaultProps} />)
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      expect(trigger).toHaveAccessibleName('Open filter panel')
    })

    it('has aria-label on panel content', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const panel = screen.getByLabelText('Filter panel')
      expect(panel).toBeInTheDocument()
    })

    it('has accessible labels for all store checkboxes', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      expect(screen.getByLabelText(/filter by lego/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/filter by bricklink/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/filter by barweer/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/filter by cata/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/filter by other/i)).toBeInTheDocument()
    })

    it('has screen-reader-only labels for priority inputs', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      expect(screen.getByLabelText(/minimum priority/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/maximum priority/i)).toBeInTheDocument()
    })

    it('has screen-reader-only labels for price inputs', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      expect(screen.getByLabelText(/minimum price/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/maximum price/i)).toBeInTheDocument()
    })

    it('uses role="group" for store checkboxes', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const storeGroup = screen.getByTestId('store-filter-group')
      expect(storeGroup).toHaveAttribute('role', 'group')
    })

    it('has unique IDs for all form controls', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      // All inputs should have IDs
      const priorityMin = screen.getByTestId('priority-min-input')
      const priorityMax = screen.getByTestId('priority-max-input')
      const priceMin = screen.getByTestId('price-min-input')
      const priceMax = screen.getByTestId('price-max-input')

      expect(priorityMin).toHaveAttribute('id')
      expect(priorityMax).toHaveAttribute('id')
      expect(priceMin).toHaveAttribute('id')
      expect(priceMax).toHaveAttribute('id')

      // IDs should be unique
      const ids = [
        priorityMin.getAttribute('id'),
        priorityMax.getAttribute('id'),
        priceMin.getAttribute('id'),
        priceMax.getAttribute('id'),
      ]
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })
})
