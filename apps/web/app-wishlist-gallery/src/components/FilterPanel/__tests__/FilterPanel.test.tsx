/**
 * FilterPanel Component Tests
 *
 * Main test suite for FilterPanel functionality.
 * Story WISH-20172: Frontend Filter Panel UI
 * AC13: Minimum 15 component tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { FilterPanel } from '../index'
import type { FilterPanelState } from '../__types__'

describe('FilterPanel', () => {
  const mockOnApplyFilters = vi.fn()
  const mockOnClearFilters = vi.fn()

  const defaultProps = {
    onApplyFilters: mockOnApplyFilters,
    onClearFilters: mockOnClearFilters,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders filter button trigger', () => {
      render(<FilterPanel {...defaultProps} />)
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveTextContent('Filters')
    })

    it('does not show panel content initially', () => {
      render(<FilterPanel {...defaultProps} />)
      const panel = screen.queryByTestId('filter-panel-content')
      expect(panel).not.toBeInTheDocument()
    })

    it('shows panel content when trigger clicked', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const panel = screen.getByTestId('filter-panel-content')
      expect(panel).toBeInTheDocument()
    })
  })

  describe('Initial State', () => {
    it('applies initialState to form controls', async () => {
      const user = userEvent.setup()
      const initialState: FilterPanelState = {
        stores: ['LEGO', 'BrickLink'],
        priorityRange: { min: 2, max: 4 },
        priceRange: { min: 50, max: 200 },
      }

      render(<FilterPanel {...defaultProps} initialState={initialState} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      // Check store checkboxes
      const legoCheckbox = screen.getByRole('checkbox', { name: /filter by lego/i })
      const brickLinkCheckbox = screen.getByRole('checkbox', { name: /filter by bricklink/i })
      expect(legoCheckbox).toBeChecked()
      expect(brickLinkCheckbox).toBeChecked()

      // Check priority range
      const priorityMin = screen.getByTestId('priority-min-input')
      const priorityMax = screen.getByTestId('priority-max-input')
      expect(priorityMin).toHaveValue(2)
      expect(priorityMax).toHaveValue(4)

      // Check price range
      const priceMin = screen.getByTestId('price-min-input')
      const priceMax = screen.getByTestId('price-max-input')
      expect(priceMin).toHaveValue(50)
      expect(priceMax).toHaveValue(200)
    })
  })

  describe('Apply Filters', () => {
    it('calls onApplyFilters with current state when Apply clicked', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      // Select LEGO store
      const legoCheckbox = screen.getByRole('checkbox', { name: /filter by lego/i })
      await user.click(legoCheckbox)

      // Set priority range
      const priorityMin = screen.getByTestId('priority-min-input')
      const priorityMax = screen.getByTestId('priority-max-input')
      await user.clear(priorityMin)
      await user.type(priorityMin, '3')
      await user.clear(priorityMax)
      await user.type(priorityMax, '5')

      // Click Apply
      const applyButton = screen.getByTestId('apply-filters-button')
      await user.click(applyButton)

      expect(mockOnApplyFilters).toHaveBeenCalledTimes(1)
      expect(mockOnApplyFilters).toHaveBeenCalledWith({
        stores: ['LEGO'],
        priorityRange: { min: 3, max: 5 },
        priceRange: null,
      })
    })

    it('closes popover after applying filters', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const applyButton = screen.getByTestId('apply-filters-button')
      await user.click(applyButton)

      // Panel should be closed
      const panel = screen.queryByTestId('filter-panel-content')
      expect(panel).not.toBeInTheDocument()
    })
  })

  describe('Clear Filters', () => {
    it('calls onClearFilters when Clear All clicked', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const clearButton = screen.getByTestId('clear-filters-button')
      await user.click(clearButton)

      expect(mockOnClearFilters).toHaveBeenCalledTimes(1)
    })

    it('resets local state when Clear All clicked', async () => {
      const user = userEvent.setup()
      const initialState: FilterPanelState = {
        stores: ['LEGO'],
        priorityRange: { min: 2, max: 4 },
        priceRange: { min: 50, max: 200 },
      }

      render(<FilterPanel {...defaultProps} initialState={initialState} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      // Clear filters
      const clearButton = screen.getByTestId('clear-filters-button')
      await user.click(clearButton)

      // Reopen panel
      await user.click(trigger)

      // All should be reset
      const legoCheckbox = screen.getByRole('checkbox', { name: /filter by lego/i })
      expect(legoCheckbox).not.toBeChecked()

      const priorityMin = screen.getByTestId('priority-min-input')
      const priorityMax = screen.getByTestId('priority-max-input')
      expect(priorityMin).toHaveValue(null)
      expect(priorityMax).toHaveValue(null)
    })
  })
})
