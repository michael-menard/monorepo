/**
 * DashboardSkeleton Component Tests
 * Story 2.10: Dashboard Unit Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardSkeleton } from '../DashboardSkeleton'

describe('DashboardSkeleton', () => {
  it('renders skeleton elements', () => {
    const { container } = render(<DashboardSkeleton />)

    // Check for skeleton elements with animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders header skeleton', () => {
    const { container } = render(<DashboardSkeleton />)

    // Header section should have skeleton elements
    const headerSkeletons = container.querySelectorAll('.h-9, .h-5')
    expect(headerSkeletons.length).toBeGreaterThan(0)
  })

  it('renders stats cards skeleton grid', () => {
    const { container } = render(<DashboardSkeleton />)

    // Should have 3 stat card skeletons
    const cardContainers = container.querySelectorAll('.border.rounded-lg')
    expect(cardContainers).toHaveLength(3)
  })

  it('renders recent MOCs skeleton grid', () => {
    const { container } = render(<DashboardSkeleton />)

    // Should have 5 MOC card skeletons
    const aspectSquareSkeletons = container.querySelectorAll('.aspect-square')
    expect(aspectSquareSkeletons).toHaveLength(5)
  })

  it('has fade-in animation class', () => {
    const { container } = render(<DashboardSkeleton />)

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('animate-in')
    expect(wrapper).toHaveClass('fade-in')
  })
})
