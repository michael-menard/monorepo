/**
 * FilterPanel Interaction Tests
 *
 * Tests for Apply Filters and Clear All functionality.
 * Story WISH-20172: Frontend Filter Panel UI
 * AC10: Apply button triggers callback with correct params
 * AC12: Clear All resets all filters
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { FilterPanel } from '../index'
import type { FilterPanelState } from '../__types__'

describe('FilterPanel - Interaction (AC10, AC12)', () => {
  const mockOnApplyFilters = vi.fn()
  const mockOnClearFilters = vi.fn()

  const defaultProps = {
    onApplyFilters: mockOnApplyFilters,
    onClearFilters: mockOnClearFilters,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Store Multi-Select', () => {
    it('toggles store checkbox selection', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const legoCheckbox = screen.getByRole('checkbox', { name: /filter by lego/i })
      expect(legoCheckbox).not.toBeChecked()

      await user.click(legoCheckbox)
      expect(legoCheckbox).toBeChecked()

      await user.click(legoCheckbox)
      expect(legoCheckbox).not.toBeChecked()
    })

    it('allows multiple store selections', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const legoCheckbox = screen.getByRole('checkbox', { name: /filter by lego/i })
      const brickLinkCheckbox = screen.getByRole('checkbox', { name: /filter by bricklink/i })

      await user.click(legoCheckbox)
      await user.click(brickLinkCheckbox)

      expect(legoCheckbox).toBeChecked()
      expect(brickLinkCheckbox).toBeChecked()

      // Apply and check state
      const applyButton = screen.getByTestId('apply-filters-button')
      await user.click(applyButton)

      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          stores: expect.arrayContaining(['LEGO', 'BrickLink']),
        }),
      )
    })
  })

  describe('Priority Range Input', () => {
    it('updates priority min value', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const priorityMin = screen.getByTestId('priority-min-input')
      await user.clear(priorityMin)
      await user.type(priorityMin, '2')

      expect(priorityMin).toHaveValue(2)
    })

    it('updates priority max value', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const priorityMax = screen.getByTestId('priority-max-input')
      await user.clear(priorityMax)
      await user.type(priorityMax, '4')

      expect(priorityMax).toHaveValue(4)
    })

    it('passes priority range to onApplyFilters', async () => {
      const user = userEvent.setup()
      render(
        <FilterPanel
          {...defaultProps}
          initialState={{ stores: [], priorityRange: { min: 1, max: 3 }, priceRange: null }}
        />,
      )

      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const applyButton = screen.getByTestId('apply-filters-button')
      await user.click(applyButton)

      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          priorityRange: { min: 1, max: 3 },
        }),
      )
    })
  })

  describe('Price Range Input', () => {
    it('updates price min value', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const priceMin = screen.getByTestId('price-min-input')
      await user.clear(priceMin)
      await user.type(priceMin, '50')

      expect(priceMin).toHaveValue(50)
    })

    it('updates price max value', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const priceMax = screen.getByTestId('price-max-input')
      await user.clear(priceMax)
      await user.type(priceMax, '200')

      expect(priceMax).toHaveValue(200)
    })

    it('passes price range to onApplyFilters', async () => {
      const user = userEvent.setup()
      render(
        <FilterPanel
          {...defaultProps}
          initialState={{ stores: [], priorityRange: null, priceRange: { min: 100, max: 500 } }}
        />,
      )

      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const applyButton = screen.getByTestId('apply-filters-button')
      await user.click(applyButton)

      expect(mockOnApplyFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          priceRange: { min: 100, max: 500 },
        }),
      )
    })
  })

  describe('Clear All (AC12)', () => {
    it('resets stores to empty array', async () => {
      const user = userEvent.setup()
      const initialState: FilterPanelState = {
        stores: ['LEGO', 'BrickLink'],
        priorityRange: null,
        priceRange: null,
      }

      render(<FilterPanel {...defaultProps} initialState={initialState} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const clearButton = screen.getByTestId('clear-filters-button')
      await user.click(clearButton)

      // Reopen and verify
      await user.click(trigger)
      const legoCheckbox = screen.getByRole('checkbox', { name: /filter by lego/i })
      expect(legoCheckbox).not.toBeChecked()
    })

    it('resets priority range to null', async () => {
      const user = userEvent.setup()
      const initialState = {
        stores: [],
        priorityRange: { min: 2, max: 4 },
        priceRange: null,
      }

      render(<FilterPanel {...defaultProps} initialState={initialState} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const clearButton = screen.getByTestId('clear-filters-button')
      await user.click(clearButton)

      // Reopen and verify
      await user.click(trigger)
      const priorityMin = screen.getByTestId('priority-min-input')
      const priorityMax = screen.getByTestId('priority-max-input')
      expect(priorityMin).toHaveValue(null)
      expect(priorityMax).toHaveValue(null)
    })

    it('resets price range to null', async () => {
      const user = userEvent.setup()
      const initialState = {
        stores: [],
        priorityRange: null,
        priceRange: { min: 50, max: 200 },
      }

      render(<FilterPanel {...defaultProps} initialState={initialState} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const clearButton = screen.getByTestId('clear-filters-button')
      await user.click(clearButton)

      // Reopen and verify
      await user.click(trigger)
      const priceMin = screen.getByTestId('price-min-input')
      const priceMax = screen.getByTestId('price-max-input')
      expect(priceMin).toHaveValue(null)
      expect(priceMax).toHaveValue(null)
    })
  })
})
