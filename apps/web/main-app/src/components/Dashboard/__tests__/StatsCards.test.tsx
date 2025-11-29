/**
 * StatsCards Component Tests
 * Story 2.10: Dashboard Unit Tests
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCards } from '../StatsCards'
import type { DashboardStats } from '@repo/api-client/rtk/dashboard-api'

describe('StatsCards', () => {
  const mockStats: DashboardStats = {
    totalMocs: 42,
    wishlistCount: 15,
    themeCount: 8,
    lastUpdated: '2025-11-29T12:00:00Z',
  }

  it('renders all stat cards', () => {
    render(<StatsCards stats={mockStats} />)

    expect(screen.getByText('Total MOCs')).toBeInTheDocument()
    expect(screen.getByText('Wishlist Items')).toBeInTheDocument()
    expect(screen.getByText('Themes')).toBeInTheDocument()
  })

  it('displays correct stat values', () => {
    render(<StatsCards stats={mockStats} />)

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('formats large numbers with locale string', () => {
    const largeStats: DashboardStats = {
      totalMocs: 1234567,
      wishlistCount: 9876,
      themeCount: 543,
      lastUpdated: '2025-11-29T12:00:00Z',
    }

    render(<StatsCards stats={largeStats} />)

    expect(screen.getByText('1,234,567')).toBeInTheDocument()
    expect(screen.getByText('9,876')).toBeInTheDocument()
    expect(screen.getByText('543')).toBeInTheDocument()
  })

  it('renders zero values correctly', () => {
    const zeroStats: DashboardStats = {
      totalMocs: 0,
      wishlistCount: 0,
      themeCount: 0,
      lastUpdated: '2025-11-29T12:00:00Z',
    }

    render(<StatsCards stats={zeroStats} />)

    const zeros = screen.getAllByText('0')
    expect(zeros).toHaveLength(3)
  })
})
