/**
 * Dashboard Test Fixtures
 * Reusable test data for dashboard-related tests
 */

import type { DashboardStats } from '@repo/api-client/rtk/dashboard-api'

/**
 * Dashboard stats fixtures for various test scenarios
 */
export const dashboardStatsFixtures = {
  /** Standard stats with realistic values */
  standard: {
    totalMocs: 42,
    wishlistCount: 15,
    themeCount: 8,
    lastUpdated: '2025-11-29T12:00:00Z',
  } satisfies DashboardStats,

  /** Large numbers to test locale formatting */
  largeNumbers: {
    totalMocs: 1234567,
    wishlistCount: 9876,
    themeCount: 543,
    lastUpdated: '2025-11-29T12:00:00Z',
  } satisfies DashboardStats,

  /** All zeros - triggers empty state */
  empty: {
    totalMocs: 0,
    wishlistCount: 0,
    themeCount: 0,
    lastUpdated: '2025-11-29T12:00:00Z',
  } satisfies DashboardStats,

  /** Partial stats - one value non-zero */
  partial: {
    totalMocs: 1,
    wishlistCount: 0,
    themeCount: 0,
    lastUpdated: '2025-11-29T12:00:00Z',
  } satisfies DashboardStats,

  /** Single item in each category */
  minimal: {
    totalMocs: 1,
    wishlistCount: 1,
    themeCount: 1,
    lastUpdated: '2025-11-29T12:00:00Z',
  } satisfies DashboardStats,

  /** Recently updated stats */
  recentlyUpdated: {
    totalMocs: 25,
    wishlistCount: 10,
    themeCount: 5,
    lastUpdated: new Date().toISOString(),
  } satisfies DashboardStats,
}

/**
 * Error fixtures for dashboard error states
 */
export const dashboardErrorFixtures = {
  network: new Error('Network error: Failed to fetch'),
  timeout: new Error('Request timeout'),
  serverError: new Error('Internal server error'),
  notFound: new Error('Dashboard stats not found'),
  unauthorized: new Error('Unauthorized: Please log in'),
}

/**
 * Factory function to create custom dashboard stats
 */
export function createDashboardStats(overrides: Partial<DashboardStats> = {}): DashboardStats {
  return {
    ...dashboardStatsFixtures.standard,
    ...overrides,
  }
}
