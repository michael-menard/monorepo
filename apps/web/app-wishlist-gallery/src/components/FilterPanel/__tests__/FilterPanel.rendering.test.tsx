/**
 * FilterPanel Rendering Tests
 *
 * Tests that all filter controls render correctly.
 * Story WISH-20172: Frontend Filter Panel UI
 * AC7: Filter panel component renders all filter controls
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { FilterPanel } from '../index'

describe('FilterPanel - Rendering (AC7)', () => {
  const mockOnApplyFilters = vi.fn()
  const mockOnClearFilters = vi.fn()

  const defaultProps = {
    onApplyFilters: mockOnApplyFilters,
    onClearFilters: mockOnClearFilters,
  }

  describe('Store Filter Controls', () => {
    it('renders all store checkboxes', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      // All 5 store options should render
      expect(screen.getByRole('checkbox', { name: /filter by lego/i })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /filter by bricklink/i })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /filter by barweer/i })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /filter by cata/i })).toBeInTheDocument()
      expect(screen.getByRole('checkbox', { name: /filter by other/i })).toBeInTheDocument()
    })

    it('renders store group with accessible label', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const storeGroup = screen.getByTestId('store-filter-group')
      expect(storeGroup).toHaveAttribute('role', 'group')
    })
  })

  describe('Priority Range Controls', () => {
    it('renders priority min input', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const priorityMin = screen.getByLabelText(/minimum priority/i)
      expect(priorityMin).toBeInTheDocument()
      expect(priorityMin).toHaveAttribute('type', 'number')
      expect(priorityMin).toHaveAttribute('min', '0')
      expect(priorityMin).toHaveAttribute('max', '5')
    })

    it('renders priority max input', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const priorityMax = screen.getByLabelText(/maximum priority/i)
      expect(priorityMax).toBeInTheDocument()
      expect(priorityMax).toHaveAttribute('type', 'number')
      expect(priorityMax).toHaveAttribute('min', '0')
      expect(priorityMax).toHaveAttribute('max', '5')
    })
  })

  describe('Price Range Controls', () => {
    it('renders price min input', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const priceMin = screen.getByLabelText(/minimum price/i)
      expect(priceMin).toBeInTheDocument()
      expect(priceMin).toHaveAttribute('type', 'number')
      expect(priceMin).toHaveAttribute('min', '0')
    })

    it('renders price max input', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const priceMax = screen.getByLabelText(/maximum price/i)
      expect(priceMax).toBeInTheDocument()
      expect(priceMax).toHaveAttribute('type', 'number')
      expect(priceMax).toHaveAttribute('min', '0')
    })
  })

  describe('Action Buttons', () => {
    it('renders Apply Filters button', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const applyButton = screen.getByTestId('apply-filters-button')
      expect(applyButton).toBeInTheDocument()
      expect(applyButton).toHaveTextContent('Apply Filters')
    })

    it('renders Clear All button', async () => {
      const user = userEvent.setup()
      render(<FilterPanel {...defaultProps} />)
      
      const trigger = screen.getByRole('button', { name: /open filter panel/i })
      await user.click(trigger)

      const clearButton = screen.getByTestId('clear-filters-button')
      expect(clearButton).toBeInTheDocument()
      expect(clearButton).toHaveTextContent('Clear All')
    })
  })
})
