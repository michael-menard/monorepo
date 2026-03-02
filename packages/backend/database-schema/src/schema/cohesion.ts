/**
 * Cohesion Scanner Database Schema
 *
 * Defines the wint.cohesion_snapshots table for persisting the results
 * of each cohesion scanner run. Each row captures the composite score,
 * per-category violation counts, and which categories fell below threshold.
 *
 * Story: APIP-4020 - Cohesion Scanner
 *
 * Schema Isolation:
 * - Table lives in the 'wint' PostgreSQL schema namespace (re-uses wintSchema)
 * - Isolated from application data (public schema)
 */

import {
  index,
  jsonb,
  numeric,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { wintSchema } from './wint.js'

// ============================================================================
// Zod Schemas for JSONB Columns
// ============================================================================

/**
 * Per-category violation counts stored in the violation_summary JSONB column.
 */
export const ViolationSummarySchema = z.record(z.string(), z.number().min(0))

export type ViolationSummary = z.infer<typeof ViolationSummarySchema>

// ============================================================================
// Table Definition
// ============================================================================

/**
 * wint.cohesion_snapshots — persisted cohesion scan results.
 *
 * AC-6: Drizzle table definition for cohesion scanner snapshots.
 */
export const cohesionSnapshots = wintSchema.table(
  'cohesion_snapshots',
  {
    /** UUID primary key */
    id: uuid('id').primaryKey().defaultRandom(),
    /** ISO timestamp of when the scan ran */
    scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull(),
    /** Weighted composite score in [0, 1] */
    compositeScore: numeric('composite_score', { precision: 4, scale: 3 }).notNull(),
    /** Comma-separated list of categories below threshold */
    categoriesBelow: text('categories_below').array().notNull().default([]),
    /** JSONB map of category -> weighted violation count */
    violationSummary: jsonb('violation_summary').$type<ViolationSummary>().notNull().default({}),
    /** Row creation timestamp */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    /** Index for time-range queries on scan results */
    scannedAtIdx: index('idx_cohesion_snapshots_scanned_at').on(table.scannedAt),
    /** Index for querying recent snapshots by composite score */
    compositeScoreIdx: index('idx_cohesion_snapshots_composite_score').on(table.compositeScore),
  }),
)
