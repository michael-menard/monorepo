/**
 * PriorityBadge Component Tests
 *
 * Story wish-2003: Detail & Edit Pages
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriorityBadge } from '../index'

describe('PriorityBadge', () => {
  it('renders nothing for priority 0 without label', () => {
    const { container } = render(<PriorityBadge priority={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders with label for priority 0', () => {
    render(<PriorityBadge priority={0} showLabel />)
    expect(screen.getByTestId('priority-badge')).toBeInTheDocument()
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('renders correct number of stars for each priority level', () => {
    const { rerender } = render(<PriorityBadge priority={1} />)
    let stars = screen.getByTestId('priority-badge').querySelectorAll('svg')
    expect(stars).toHaveLength(1)

    rerender(<PriorityBadge priority={3} />)
    stars = screen.getByTestId('priority-badge').querySelectorAll('svg')
    expect(stars).toHaveLength(3)

    rerender(<PriorityBadge priority={5} />)
    stars = screen.getByTestId('priority-badge').querySelectorAll('svg')
    expect(stars).toHaveLength(5)
  })

  it('shows correct priority labels', () => {
    const labels = ['None', 'Low', 'Medium', 'High', 'Very High', 'Must Have']

    labels.forEach((label, priority) => {
      const { unmount } = render(<PriorityBadge priority={priority} showLabel />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    })
  })

  it('has correct aria-label', () => {
    render(<PriorityBadge priority={3} />)
    expect(screen.getByTestId('priority-badge')).toHaveAttribute(
      'aria-label',
      'Priority: High',
    )
  })

  it('applies size variants correctly', () => {
    const { rerender } = render(<PriorityBadge priority={1} size="sm" />)
    const smallStars = screen.getByTestId('priority-badge').querySelectorAll('svg')
    expect(smallStars[0]).toHaveClass('h-3', 'w-3')

    rerender(<PriorityBadge priority={1} size="md" />)
    const mediumStars = screen.getByTestId('priority-badge').querySelectorAll('svg')
    expect(mediumStars[0]).toHaveClass('h-4', 'w-4')

    rerender(<PriorityBadge priority={1} size="lg" />)
    const largeStars = screen.getByTestId('priority-badge').querySelectorAll('svg')
    expect(largeStars[0]).toHaveClass('h-5', 'w-5')
  })

  it('applies custom className', () => {
    render(<PriorityBadge priority={2} className="custom-class" />)
    expect(screen.getByTestId('priority-badge')).toHaveClass('custom-class')
  })

  it('applies "Must Have" styling for priority 5 with label', () => {
    render(<PriorityBadge priority={5} showLabel />)
    const badge = screen.getByText('Must Have')
    expect(badge).toHaveClass('bg-red-500')
  })
})
