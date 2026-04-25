import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardLayout } from '../DashboardLayout'
import type { StatCardItem, ActivityListItem } from '../__types__'

vi.mock('lucide-react', () => ({
  TrendingUp: (props: Record<string, unknown>) => <svg data-testid="trending-up" {...props} />,
  TrendingDown: (props: Record<string, unknown>) => (
    <svg data-testid="trending-down" {...props} />
  ),
  RefreshCw: (props: Record<string, unknown>) => <svg data-testid="refresh-icon" {...props} />,
}))

const mockStats: StatCardItem[] = [
  { value: '1,234', label: 'Total Sets' },
  { value: '567', label: 'Minifigs' },
  { value: '89', label: 'Themes' },
  { value: '42', label: 'Wishlisted' },
]

const mockActivity: ActivityListItem[] = [
  { action: 'Added', item: 'Millennium Falcon', time: '2 hours ago' },
  { action: 'Updated', item: 'Star Destroyer', time: '5 hours ago' },
]

describe('DashboardLayout', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <DashboardLayout stats={mockStats} activity={mockActivity}>
        <div>Main content</div>
      </DashboardLayout>,
    )
    expect(container.querySelector('[data-slot="dashboard-layout"]')).toBeInTheDocument()
  })

  it('renders all stat cards', () => {
    render(
      <DashboardLayout stats={mockStats} activity={mockActivity}>
        <div>Main content</div>
      </DashboardLayout>,
    )
    expect(screen.getByText('1,234')).toBeInTheDocument()
    expect(screen.getByText('Total Sets')).toBeInTheDocument()
    expect(screen.getByText('567')).toBeInTheDocument()
    expect(screen.getByText('Minifigs')).toBeInTheDocument()
    expect(screen.getByText('89')).toBeInTheDocument()
    expect(screen.getByText('Themes')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Wishlisted')).toBeInTheDocument()
  })

  it('renders activity items', () => {
    render(
      <DashboardLayout stats={mockStats} activity={mockActivity}>
        <div>Main content</div>
      </DashboardLayout>,
    )
    expect(screen.getByText('Millennium Falcon')).toBeInTheDocument()
    expect(screen.getByText('Star Destroyer')).toBeInTheDocument()
    expect(screen.getByText('2 hours ago')).toBeInTheDocument()
    expect(screen.getByText('5 hours ago')).toBeInTheDocument()
  })

  it('renders children content', () => {
    render(
      <DashboardLayout stats={mockStats} activity={mockActivity}>
        <div data-testid="child-content">Dashboard charts go here</div>
      </DashboardLayout>,
    )
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Dashboard charts go here')).toBeInTheDocument()
  })

  it('renders default activity title', () => {
    render(
      <DashboardLayout stats={mockStats} activity={mockActivity}>
        <div>Content</div>
      </DashboardLayout>,
    )
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('renders custom activity title', () => {
    render(
      <DashboardLayout
        stats={mockStats}
        activity={mockActivity}
        activityTitle="Latest Updates"
      >
        <div>Content</div>
      </DashboardLayout>,
    )
    expect(screen.getByText('Latest Updates')).toBeInTheDocument()
    expect(screen.queryByText('Recent Activity')).not.toBeInTheDocument()
  })

  it('renders "View all" button', () => {
    render(
      <DashboardLayout stats={mockStats} activity={mockActivity}>
        <div>Content</div>
      </DashboardLayout>,
    )
    expect(screen.getByText('View all')).toBeInTheDocument()
  })

  describe('empty data', () => {
    it('renders with empty stats array', () => {
      const { container } = render(
        <DashboardLayout stats={[]} activity={mockActivity}>
          <div>Content</div>
        </DashboardLayout>,
      )
      expect(container.querySelector('[data-slot="dashboard-layout"]')).toBeInTheDocument()
    })

    it('renders with empty activity array', () => {
      const { container } = render(
        <DashboardLayout stats={mockStats} activity={[]}>
          <div>Content</div>
        </DashboardLayout>,
      )
      expect(container.querySelector('[data-slot="dashboard-layout"]')).toBeInTheDocument()
    })

    it('renders with both empty arrays', () => {
      const { container } = render(
        <DashboardLayout stats={[]} activity={[]}>
          <div>Content</div>
        </DashboardLayout>,
      )
      expect(container.querySelector('[data-slot="dashboard-layout"]')).toBeInTheDocument()
    })
  })
})
