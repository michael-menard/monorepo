import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCards } from '../StatCards'
import type { StatCardItem } from '../__types__'

vi.mock('lucide-react', () => ({
  TrendingUp: (props: Record<string, unknown>) => <svg data-testid="trending-up" {...props} />,
  TrendingDown: (props: Record<string, unknown>) => <svg data-testid="trending-down" {...props} />,
}))

const mockIcon = (props: { className?: string }) => (
  <svg data-testid="mock-icon" className={props.className} />
)

const mockItems: StatCardItem[] = [
  { value: '1,234', label: 'Total Sets', icon: mockIcon },
  { value: '567', label: 'Minifigs', icon: mockIcon },
  { value: '89', label: 'Themes' },
]

const mockTrendItems: StatCardItem[] = [
  { value: '1,234', label: 'Total Sets', change: '+12%', trend: 'up' },
  { value: '567', label: 'Minifigs', change: '-3%', trend: 'down' },
  { value: '89', label: 'Themes' },
]

describe('StatCards', () => {
  describe('basic variant', () => {
    it('renders without crashing with valid data', () => {
      const { container } = render(<StatCards items={mockItems} />)
      expect(container.querySelector('[data-slot="stat-cards"]')).toBeInTheDocument()
    })

    it('renders all stat card items', () => {
      render(<StatCards items={mockItems} variant="basic" />)
      expect(screen.getByText('1,234')).toBeInTheDocument()
      expect(screen.getByText('Total Sets')).toBeInTheDocument()
      expect(screen.getByText('567')).toBeInTheDocument()
      expect(screen.getByText('Minifigs')).toBeInTheDocument()
      expect(screen.getByText('89')).toBeInTheDocument()
      expect(screen.getByText('Themes')).toBeInTheDocument()
    })

    it('renders icons when provided', () => {
      render(<StatCards items={mockItems} variant="basic" />)
      const icons = screen.getAllByTestId('mock-icon')
      expect(icons).toHaveLength(2)
    })

    it('has correct aria role and label', () => {
      render(<StatCards items={mockItems} />)
      expect(screen.getByRole('region', { name: 'Statistics' })).toBeInTheDocument()
    })
  })

  describe('trend variant', () => {
    it('renders trend cards with change indicators', () => {
      render(<StatCards items={mockTrendItems} variant="trend" />)
      expect(screen.getByText('+12%')).toBeInTheDocument()
      expect(screen.getByText('-3%')).toBeInTheDocument()
    })

    it('renders TrendingUp icon for up trends', () => {
      render(<StatCards items={mockTrendItems} variant="trend" />)
      expect(screen.getByTestId('trending-up')).toBeInTheDocument()
    })

    it('renders TrendingDown icon for down trends', () => {
      render(<StatCards items={mockTrendItems} variant="trend" />)
      expect(screen.getByTestId('trending-down')).toBeInTheDocument()
    })

    it('does not render change indicator when change is absent', () => {
      render(<StatCards items={mockTrendItems} variant="trend" />)
      const cards = document.querySelectorAll('[data-slot="stat-card"]')
      expect(cards).toHaveLength(3)
      // Third item has no change, so no trending icons beyond the first two
      expect(screen.getAllByTestId('trending-up')).toHaveLength(1)
      expect(screen.getAllByTestId('trending-down')).toHaveLength(1)
    })
  })

  describe('empty data', () => {
    it('renders without errors when items array is empty', () => {
      const { container } = render(<StatCards items={[]} />)
      const grid = container.querySelector('[data-slot="stat-cards"]')
      expect(grid).toBeInTheDocument()
      expect(grid?.children).toHaveLength(0)
    })
  })

  describe('columns', () => {
    it('uses item count as default columns', () => {
      const { container } = render(<StatCards items={mockItems} />)
      const grid = container.querySelector('[data-slot="stat-cards"]')
      expect(grid?.className).toContain('md:grid-cols-3')
    })

    it('respects explicit columns prop', () => {
      const { container } = render(<StatCards items={mockItems} columns={2} />)
      const grid = container.querySelector('[data-slot="stat-cards"]')
      expect(grid?.className).toContain('md:grid-cols-2')
    })

    it('caps columns at 6', () => {
      const manyItems = Array.from({ length: 8 }, (_, i) => ({
        value: `${i}`,
        label: `Item ${i}`,
      }))
      const { container } = render(<StatCards items={manyItems} />)
      const grid = container.querySelector('[data-slot="stat-cards"]')
      // Math.min(8, 6) = 6, so it uses md:grid-cols-6
      expect(grid?.className).toContain('md:grid-cols-6')
    })
  })
})
