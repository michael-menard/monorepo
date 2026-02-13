import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DashboardSkeleton } from '../skeleton'

describe('DashboardSkeleton', () => {
  it('renders skeleton elements with animate-pulse class', () => {
    const { container } = render(<DashboardSkeleton />)

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders header skeleton', () => {
    const { container } = render(<DashboardSkeleton />)

    const headerSkeletons = container.querySelectorAll('.h-9, .h-5')
    expect(headerSkeletons.length).toBeGreaterThan(0)
  })

  it('renders 3 stats card skeletons', () => {
    const { container } = render(<DashboardSkeleton />)

    const cardContainers = container.querySelectorAll('.border.rounded-lg')
    expect(cardContainers).toHaveLength(3)
  })

  it('renders 5 recent MOC card skeletons', () => {
    const { container } = render(<DashboardSkeleton />)

    const aspectSquareSkeletons = container.querySelectorAll('.aspect-square')
    expect(aspectSquareSkeletons).toHaveLength(5)
  })

  it('has fade-in animation class', () => {
    const { container } = render(<DashboardSkeleton />)

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('animate-in')
    expect(wrapper).toHaveClass('fade-in')
  })

  it('uses library Skeleton primitive (not custom inline)', () => {
    const { container } = render(<DashboardSkeleton />)

    // Library Skeleton uses bg-muted class from cva variants
    const skeletons = container.querySelectorAll('.bg-muted')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('supports custom className', () => {
    const { container } = render(<DashboardSkeleton className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(<DashboardSkeleton />)

    const wrapper = container.firstChild
    expect(wrapper).toHaveAttribute('aria-busy', 'true')
    expect(wrapper).toHaveAttribute('aria-label', 'Loading dashboard')
  })

  it('has data-testid for testing', () => {
    const { container } = render(<DashboardSkeleton />)

    expect(container.querySelector('[data-testid="dashboard-skeleton"]')).toBeInTheDocument()
  })

  it('renders quick actions skeleton section', () => {
    const { container } = render(<DashboardSkeleton />)

    // Quick actions section has 3 skeleton buttons
    const quickActionsSkeletons = container.querySelectorAll('.h-10')
    expect(quickActionsSkeletons.length).toBeGreaterThanOrEqual(3)
  })
})
