/**
 * DashboardSkeleton Component Tests
 * Story 2.9: Dashboard Loading State
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DashboardSkeleton } from '../index'

describe('DashboardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<DashboardSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders 3 stats card skeletons', () => {
    const { container } = render(<DashboardSkeleton />)
    const statsGrid = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-3')
    expect(statsGrid).toBeInTheDocument()
    const statsSkeletons = statsGrid?.querySelectorAll('[class*="animate-pulse"]')
    expect(statsSkeletons?.length).toBe(3)
  })

  it('renders recent MOCs section header skeleton', () => {
    const { container } = render(<DashboardSkeleton />)
    // Look for the header skeleton (h-6 w-32)
    const headerSkeleton = container.querySelector('[class*="h-6"][class*="w-32"]')
    expect(headerSkeleton).toBeInTheDocument()
  })

  it('renders 5 MOC card skeletons', () => {
    const { container } = render(<DashboardSkeleton />)
    const mocsGrid = container.querySelector(
      '.grid.grid-cols-1.sm\\:grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-5',
    )
    expect(mocsGrid).toBeInTheDocument()
    const mocSkeletons = mocsGrid?.querySelectorAll('[class*="animate-pulse"]')
    expect(mocSkeletons?.length).toBe(5)
  })

  it('applies pulse animation to skeleton elements', () => {
    const { container } = render(<DashboardSkeleton />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
    skeletons.forEach(skeleton => {
      expect(skeleton.className).toContain('animate-pulse')
    })
  })

  it('has proper spacing between sections', () => {
    const { container } = render(<DashboardSkeleton />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('space-y-8')
  })

  it('renders with rounded corners on skeleton elements', () => {
    const { container } = render(<DashboardSkeleton />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    skeletons.forEach(skeleton => {
      expect(skeleton.className).toMatch(/rounded/)
    })
  })

  it('applies custom className when provided', () => {
    const { container } = render(<DashboardSkeleton className="custom-test-class" />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('custom-test-class')
  })

  it('maintains proper grid layout for stats cards', () => {
    const { container } = render(<DashboardSkeleton />)
    const statsGrid = container.querySelector('.grid')
    expect(statsGrid).toHaveClass('grid-cols-1')
    expect(statsGrid).toHaveClass('md:grid-cols-3')
    expect(statsGrid).toHaveClass('gap-4')
  })

  it('maintains proper grid layout for MOC cards', () => {
    const { container } = render(<DashboardSkeleton />)
    const grids = container.querySelectorAll('.grid')
    const mocsGrid = grids[1] // Second grid is the MOCs grid
    expect(mocsGrid).toHaveClass('grid-cols-1')
    expect(mocsGrid).toHaveClass('sm:grid-cols-2')
    expect(mocsGrid).toHaveClass('md:grid-cols-3')
    expect(mocsGrid).toHaveClass('lg:grid-cols-5')
  })
})
