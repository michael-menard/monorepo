/**
 * StatsCards Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { StatsCards } from '../cards/stats-cards'
import type { StatItem } from '../cards/stats-cards'
import { Users, ShoppingCart, TrendingUp } from 'lucide-react'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    article: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => <article {...props}>{children}</article>,
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
  useMotionValue: () => ({ get: () => 0 }),
  animate: (
    _value: unknown,
    target: number,
    options?: { onUpdate?: (v: number) => void },
  ) => {
    options?.onUpdate?.(target)
    return { stop: vi.fn() }
  },
}))

describe('StatsCards', () => {
  const defaultItems: StatItem[] = [
    {
      icon: Users,
      label: 'Total Users',
      value: 1234,
      colorClass: 'text-blue-500',
      bgClass: 'bg-blue-500/10',
    },
    {
      icon: ShoppingCart,
      label: 'Orders',
      value: 567,
      colorClass: 'text-green-500',
      bgClass: 'bg-green-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Revenue',
      value: 89012,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering stats', () => {
    it('renders all stat cards with labels', () => {
      render(<StatsCards items={defaultItems} />)

      expect(screen.getByText('Total Users')).toBeInTheDocument()
      expect(screen.getByText('Orders')).toBeInTheDocument()
      expect(screen.getByText('Revenue')).toBeInTheDocument()
    })

    it('displays correct stat values', async () => {
      render(<StatsCards items={defaultItems} />)

      await waitFor(() => {
        expect(screen.getByText('1,234')).toBeInTheDocument()
        expect(screen.getByText('567')).toBeInTheDocument()
        expect(screen.getByText('89,012')).toBeInTheDocument()
      })
    })

    it('has accessible region with default aria-label', () => {
      render(<StatsCards items={defaultItems} />)

      expect(screen.getByRole('region', { name: 'Statistics' })).toBeInTheDocument()
    })

    it('supports custom aria-label', () => {
      render(<StatsCards items={defaultItems} ariaLabel="User Statistics" />)

      expect(screen.getByRole('region', { name: 'User Statistics' })).toBeInTheDocument()
    })

    it('renders stat cards with aria-labels', () => {
      render(<StatsCards items={defaultItems} />)

      expect(screen.getByRole('region', { name: /Total Users - 1,234/ })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: /Orders - 567/ })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: /Revenue - 89,012/ })).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('renders loading skeletons when isLoading is true', () => {
      render(<StatsCards items={defaultItems} isLoading={true} />)

      const skeletons = screen
        .getAllByRole('generic')
        .filter(el => el.classList.contains('animate-pulse'))
      expect(skeletons.length).toBeGreaterThanOrEqual(3)
    })

    it('does not render stat cards when loading', () => {
      render(<StatsCards items={defaultItems} isLoading={true} />)

      expect(screen.queryByText('Total Users')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('renders error message when error is provided', () => {
      const error = new Error('Failed to fetch stats')
      render(<StatsCards items={defaultItems} error={error} />)

      expect(screen.getByText('Unable to load statistics')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch stats')).toBeInTheDocument()
    })

    it('supports custom error title', () => {
      const error = new Error('Network error')
      render(<StatsCards items={defaultItems} error={error} errorTitle="Custom Error" />)

      expect(screen.getByText('Custom Error')).toBeInTheDocument()
    })

    it('does not render stat cards when error is present', () => {
      const error = new Error('Network error')
      render(<StatsCards items={defaultItems} error={error} />)

      expect(screen.queryByText('Total Users')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('renders empty state when all values are zero', () => {
      const zeroItems: StatItem[] = defaultItems.map(item => ({ ...item, value: 0 }))

      render(<StatsCards items={zeroItems} />)

      expect(screen.getByText('No data yet')).toBeInTheDocument()
      expect(screen.getByText('Data will appear here once available.')).toBeInTheDocument()
    })

    it('supports custom empty state messages', () => {
      const zeroItems: StatItem[] = defaultItems.map(item => ({ ...item, value: 0 }))

      render(
        <StatsCards
          items={zeroItems}
          emptyTitle="No users found"
          emptyDescription="Users will appear once they sign up."
        />,
      )

      expect(screen.getByText('No users found')).toBeInTheDocument()
      expect(screen.getByText('Users will appear once they sign up.')).toBeInTheDocument()
    })

    it('does not render empty state when any stat is non-zero', () => {
      const partialItems: StatItem[] = [
        { ...defaultItems[0], value: 1 },
        { ...defaultItems[1], value: 0 },
        { ...defaultItems[2], value: 0 },
      ]

      render(<StatsCards items={partialItems} />)

      expect(screen.queryByText('No data yet')).not.toBeInTheDocument()
      expect(screen.getByText('Total Users')).toBeInTheDocument()
    })
  })

  describe('responsive grid', () => {
    it('has responsive grid classes', () => {
      render(<StatsCards items={defaultItems} />)

      const grid = screen.getByRole('region', { name: 'Statistics' })
      expect(grid).toHaveClass('grid-cols-1')
      expect(grid).toHaveClass('md:grid-cols-2')
      expect(grid).toHaveClass('lg:grid-cols-3')
    })

    it('supports custom className', () => {
      render(<StatsCards items={defaultItems} className="custom-class" />)

      const grid = screen.getByRole('region', { name: 'Statistics' })
      expect(grid).toHaveClass('custom-class')
    })
  })

  describe('default styling', () => {
    it('applies default color classes when not specified', () => {
      const itemsWithoutColors: StatItem[] = [
        { icon: Users, label: 'Test', value: 100 },
      ]

      render(<StatsCards items={itemsWithoutColors} />)

      // Component should render without errors when color classes are not provided
      expect(screen.getByText('Test')).toBeInTheDocument()
    })
  })
})
