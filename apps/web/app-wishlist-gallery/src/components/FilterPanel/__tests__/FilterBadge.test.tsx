/**
 * FilterBadge Component Tests
 *
 * Tests for active filter count badge.
 * Story WISH-20172: Frontend Filter Panel UI
 * AC11: Filter panel shows active filter count badge
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FilterBadge } from '../FilterBadge'

describe('FilterBadge (AC11)', () => {
  it('is hidden when count is 0', () => {
    render(<FilterBadge count={0} />)
    const badge = screen.queryByTestId('filter-badge')
    expect(badge).not.toBeInTheDocument()
  })

  it('shows "1 filter" for count of 1', () => {
    render(<FilterBadge count={1} />)
    const badge = screen.getByTestId('filter-badge')
    expect(badge).toHaveTextContent('1 filter')
  })

  it('shows "2 filters" for count of 2', () => {
    render(<FilterBadge count={2} />)
    const badge = screen.getByTestId('filter-badge')
    expect(badge).toHaveTextContent('2 filters')
  })

  it('shows "3 filters" for count of 3', () => {
    render(<FilterBadge count={3} />)
    const badge = screen.getByTestId('filter-badge')
    expect(badge).toHaveTextContent('3 filters')
  })

  it('applies custom className', () => {
    render(<FilterBadge count={2} className="custom-class" />)
    const badge = screen.getByTestId('filter-badge')
    expect(badge).toHaveClass('custom-class')
  })
})
