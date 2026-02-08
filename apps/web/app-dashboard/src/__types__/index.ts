/**
 * Dashboard Types
 * Zod schemas for all dashboard data structures
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Build Status
// ─────────────────────────────────────────────────────────────────────────────

export const BuildStatusSchema = z.object({
  added: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  built: z.number().int().nonnegative(),
})

export type BuildStatus = z.infer<typeof BuildStatusSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Theme Breakdown
// ─────────────────────────────────────────────────────────────────────────────

export const ThemeBreakdownSchema = z.object({
  theme: z.string(),
  mocCount: z.number().int().nonnegative(),
  setCount: z.number().int().nonnegative(),
})

export type ThemeBreakdown = z.infer<typeof ThemeBreakdownSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Parts Coverage
// ─────────────────────────────────────────────────────────────────────────────

export const PartsCoverageSchema = z.object({
  fullInventory: z.number().int().nonnegative(),
  partialOrdered: z.number().int().nonnegative(),
  missingParts: z.number().int().nonnegative(),
})

export type PartsCoverage = z.infer<typeof PartsCoverageSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Partial MOC (needs parts)
// ─────────────────────────────────────────────────────────────────────────────

export const PartialMocSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  theme: z.string(),
  coverage: z.number().int().min(0).max(100),
  lastUpdated: z.string().datetime(),
})

export type PartialMoc = z.infer<typeof PartialMocSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Activity Item
// ─────────────────────────────────────────────────────────────────────────────

export const ActivityTypeSchema = z.enum(['added', 'built', 'wishlist', 'progress'])

export type ActivityType = z.infer<typeof ActivityTypeSchema>

export const ActivityItemSchema = z.object({
  id: z.string().uuid(),
  type: ActivityTypeSchema,
  message: z.string(),
  timestamp: z.string().datetime(),
})

export type ActivityItem = z.infer<typeof ActivityItemSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Extended Recent MOC (with theme)
// ─────────────────────────────────────────────────────────────────────────────

export const RecentMocExtendedSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string().nullable(),
  thumbnail: z.string().url().nullable(),
  theme: z.string(),
  createdAt: z.string().datetime(),
})

export type RecentMocExtended = z.infer<typeof RecentMocExtendedSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Stats Extended (with build progress)
// ─────────────────────────────────────────────────────────────────────────────

export const DashboardStatsExtendedSchema = z.object({
  totalMocs: z.number().int().nonnegative(),
  wishlistCount: z.number().int().nonnegative(),
  themeCount: z.number().int().nonnegative(),
  buildProgress: z.number().int().min(0).max(100),
  lastUpdated: z.string().datetime(),
})

export type DashboardStatsExtended = z.infer<typeof DashboardStatsExtendedSchema>
