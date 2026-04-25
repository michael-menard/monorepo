import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityList } from '../ActivityList'
import type { ActivityListItem, TimelineGroup } from '../__types__'

vi.mock('lucide-react', () => ({
  Clock: (props: Record<string, unknown>) => <svg data-testid="clock-icon" {...props} />,
  ArrowUpRight: (props: Record<string, unknown>) => (
    <svg data-testid="arrow-icon" {...props} />
  ),
  RefreshCw: (props: Record<string, unknown>) => <svg data-testid="refresh-icon" {...props} />,
  Check: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  Loader2: (props: Record<string, unknown>) => <svg data-testid="loader-icon" {...props} />,
  SkipForward: (props: Record<string, unknown>) => (
    <svg data-testid="skip-icon" {...props} />
  ),
  AlertCircle: (props: Record<string, unknown>) => (
    <svg data-testid="alert-circle-icon" {...props} />
  ),
  Circle: (props: Record<string, unknown>) => <svg data-testid="circle-icon" {...props} />,
}))

const mockItems: ActivityListItem[] = [
  { action: 'Added', item: 'Millennium Falcon', time: '2 hours ago', img: '/falcon.jpg' },
  { action: 'Updated', item: 'Star Destroyer', time: '5 hours ago', img: null },
  { action: 'Removed', item: 'X-Wing', time: '1 day ago' },
]

const mockAvatarItems: ActivityListItem[] = [
  {
    action: 'added a set',
    item: 'Millennium Falcon',
    time: '2 hours ago',
    user: 'Michael',
    avatar: 'MM',
  },
  {
    action: 'updated notes',
    item: 'Star Destroyer',
    time: '5 hours ago',
    user: 'Alice',
  },
]

const mockTimelineGroups: TimelineGroup[] = [
  {
    date: 'Today',
    items: [
      { action: 'Added', item: 'Millennium Falcon', time: '2:00 PM' },
      { action: 'Updated', item: 'Star Destroyer', time: '11:00 AM' },
    ],
  },
  {
    date: 'Yesterday',
    items: [{ action: 'Removed', item: 'X-Wing', time: '4:00 PM' }],
  },
]

describe('ActivityList', () => {
  describe('image variant', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <ActivityList items={mockItems} variant="image" />,
      )
      expect(container.querySelector('[data-slot="activity-list"]')).toBeInTheDocument()
    })

    it('renders all activity items', () => {
      render(<ActivityList items={mockItems} variant="image" />)
      expect(screen.getByText('Millennium Falcon')).toBeInTheDocument()
      expect(screen.getByText('Star Destroyer')).toBeInTheDocument()
      expect(screen.getByText('X-Wing')).toBeInTheDocument()
    })

    it('renders action labels', () => {
      render(<ActivityList items={mockItems} variant="image" />)
      expect(screen.getByText('Added:')).toBeInTheDocument()
      expect(screen.getByText('Updated:')).toBeInTheDocument()
      expect(screen.getByText('Removed:')).toBeInTheDocument()
    })

    it('renders time stamps', () => {
      render(<ActivityList items={mockItems} variant="image" />)
      expect(screen.getByText('2 hours ago')).toBeInTheDocument()
      expect(screen.getByText('5 hours ago')).toBeInTheDocument()
    })

    it('renders img element when img URL is provided', () => {
      render(<ActivityList items={mockItems} variant="image" />)
      const img = screen.getByAltText('Millennium Falcon')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', '/falcon.jpg')
    })

    it('renders fallback icon when img is null', () => {
      render(<ActivityList items={mockItems} variant="image" />)
      // Items with null or missing img get a RefreshCw icon fallback
      const refreshIcons = screen.getAllByTestId('refresh-icon')
      expect(refreshIcons.length).toBeGreaterThanOrEqual(2)
    })

    it('renders optional title', () => {
      render(
        <ActivityList items={mockItems} variant="image" title="Recent Activity" />,
      )
      expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    })
  })

  describe('avatar variant', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <ActivityList items={mockAvatarItems} variant="avatar" />,
      )
      expect(container.querySelector('[data-slot="activity-list"]')).toBeInTheDocument()
    })

    it('renders user names', () => {
      render(<ActivityList items={mockAvatarItems} variant="avatar" />)
      expect(screen.getByText('Michael')).toBeInTheDocument()
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    it('renders avatar fallback text', () => {
      render(<ActivityList items={mockAvatarItems} variant="avatar" />)
      expect(screen.getByText('MM')).toBeInTheDocument()
      // Alice has no avatar prop, so it uses user.slice(0, 2) = 'Al'
      expect(screen.getByText('Al')).toBeInTheDocument()
    })

    it('renders action buttons', () => {
      render(<ActivityList items={mockAvatarItems} variant="avatar" />)
      const arrowIcons = screen.getAllByTestId('arrow-icon')
      expect(arrowIcons).toHaveLength(2)
    })
  })

  describe('timeline variant', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <ActivityList groups={mockTimelineGroups} variant="timeline" />,
      )
      expect(container.querySelector('[data-slot="activity-list"]')).toBeInTheDocument()
    })

    it('renders date group headers', () => {
      render(<ActivityList groups={mockTimelineGroups} variant="timeline" />)
      expect(screen.getByText('Today')).toBeInTheDocument()
      expect(screen.getByText('Yesterday')).toBeInTheDocument()
    })

    it('renders all timeline items', () => {
      render(<ActivityList groups={mockTimelineGroups} variant="timeline" />)
      expect(screen.getByText('Millennium Falcon')).toBeInTheDocument()
      expect(screen.getByText('Star Destroyer')).toBeInTheDocument()
      expect(screen.getByText('X-Wing')).toBeInTheDocument()
    })

    it('renders timeline group sections', () => {
      const { container } = render(
        <ActivityList groups={mockTimelineGroups} variant="timeline" />,
      )
      const groups = container.querySelectorAll('[data-slot="timeline-group"]')
      expect(groups).toHaveLength(2)
    })
  })

  describe('empty data', () => {
    it('renders image variant with empty items array', () => {
      const { container } = render(
        <ActivityList items={[]} variant="image" />,
      )
      expect(container.querySelector('[data-slot="activity-list"]')).toBeInTheDocument()
    })

    it('renders avatar variant with empty items array', () => {
      const { container } = render(
        <ActivityList items={[]} variant="avatar" />,
      )
      expect(container.querySelector('[data-slot="activity-list"]')).toBeInTheDocument()
    })

    it('renders timeline variant with empty groups array', () => {
      const { container } = render(
        <ActivityList groups={[]} variant="timeline" />,
      )
      expect(container.querySelector('[data-slot="activity-list"]')).toBeInTheDocument()
    })
  })
})
