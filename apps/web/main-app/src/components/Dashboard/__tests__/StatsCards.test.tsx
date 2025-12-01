/**
 * StatsCards Component Tests
 * Story 2.5: Stats Cards Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { StatsCards } from '../StatsCards'
import { dashboardStatsFixtures, dashboardErrorFixtures } from '@/test/fixtures'

// framer-motion is mocked globally in test/setup.ts

describe('StatsCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering stats', () => {
    it('renders all stat cards with labels', () => {
      render(<StatsCards stats={dashboardStatsFixtures.standard} />)

      expect(screen.getByText('Total MOCs')).toBeInTheDocument()
      expect(screen.getByText('Wishlist Items')).toBeInTheDocument()
      expect(screen.getByText('Themes')).toBeInTheDocument()
    })

    it('displays correct stat values', async () => {
      render(<StatsCards stats={dashboardStatsFixtures.standard} />)

      await waitFor(() => {
        expect(screen.getByText('42')).toBeInTheDocument()
        expect(screen.getByText('15')).toBeInTheDocument()
        expect(screen.getByText('8')).toBeInTheDocument()
      })
    })

    it('formats large numbers with locale string', async () => {
      render(<StatsCards stats={dashboardStatsFixtures.largeNumbers} />)

      await waitFor(() => {
        expect(screen.getByText('1,234,567')).toBeInTheDocument()
        expect(screen.getByText('9,876')).toBeInTheDocument()
        expect(screen.getByText('543')).toBeInTheDocument()
      })
    })

    it('has accessible region with aria-label', () => {
      render(<StatsCards stats={dashboardStatsFixtures.standard} />)

      expect(screen.getByRole('region', { name: 'Dashboard statistics' })).toBeInTheDocument()
    })

    it('renders stat cards with aria-labels', () => {
      render(<StatsCards stats={dashboardStatsFixtures.standard} />)

      expect(screen.getByRole('region', { name: /Total MOCs - 42/ })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: /Wishlist Items - 15/ })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: /Themes - 8/ })).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('renders loading skeletons when isLoading is true', () => {
      render(<StatsCards stats={dashboardStatsFixtures.standard} isLoading={true} />)

      const skeletons = screen
        .getAllByRole('generic')
        .filter(el => el.classList.contains('animate-pulse'))
      expect(skeletons.length).toBeGreaterThanOrEqual(3)
    })

    it('does not render stat cards when loading', () => {
      render(<StatsCards stats={dashboardStatsFixtures.standard} isLoading={true} />)

      expect(screen.queryByText('Total MOCs')).not.toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('renders error message when error is provided', () => {
      render(
        <StatsCards
          stats={dashboardStatsFixtures.standard}
          error={dashboardErrorFixtures.network}
        />,
      )

      expect(screen.getByText('Unable to load statistics')).toBeInTheDocument()
      expect(screen.getByText('Network error: Failed to fetch')).toBeInTheDocument()
    })

    it('does not render stat cards when error is present', () => {
      render(
        <StatsCards
          stats={dashboardStatsFixtures.standard}
          error={dashboardErrorFixtures.serverError}
        />,
      )

      expect(screen.queryByText('Total MOCs')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('renders empty state when all stats are zero', () => {
      render(<StatsCards stats={dashboardStatsFixtures.empty} />)

      expect(screen.getByText('No data yet')).toBeInTheDocument()
      expect(screen.getByText('Start adding MOCs to see your stats!')).toBeInTheDocument()
    })

    it('does not render empty state when any stat is non-zero', () => {
      render(<StatsCards stats={dashboardStatsFixtures.partial} />)

      expect(screen.queryByText('No data yet')).not.toBeInTheDocument()
      expect(screen.getByText('Total MOCs')).toBeInTheDocument()
    })
  })

  describe('responsive grid', () => {
    it('has responsive grid classes', () => {
      render(<StatsCards stats={dashboardStatsFixtures.standard} />)

      const grid = screen.getByRole('region', { name: 'Dashboard statistics' })
      expect(grid).toHaveClass('grid-cols-1')
      expect(grid).toHaveClass('md:grid-cols-2')
      expect(grid).toHaveClass('lg:grid-cols-3')
    })
  })
})
