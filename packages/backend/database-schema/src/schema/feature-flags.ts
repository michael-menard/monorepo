import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  jsonb,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/**
 * Feature Flags Table (WISH-2009)
 *
 * Stores feature flag configuration for gradual rollout.
 * Each flag can be enabled/disabled with optional percentage-based rollout.
 */
export const featureFlags = pgTable(
  'feature_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Unique identifier for the flag (e.g., 'wishlist-gallery') */
    flagKey: text('flag_key').notNull(),

    /** Whether the flag is enabled */
    enabled: boolean('enabled').default(false).notNull(),

    /** Percentage of users to include in rollout (0-100) */
    rolloutPercentage: integer('rollout_percentage').default(0).notNull(),

    /** Human-readable description of the flag */
    description: text('description'),

    /** Environment this flag applies to (production, staging, development) */
    environment: text('environment').default('production').notNull(),

    /** Timestamps */
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    // Index for fast lookups by flag key
    flagKeyIdx: index('idx_feature_flags_flag_key').on(table.flagKey),

    // Index for environment filtering
    environmentIdx: index('idx_feature_flags_environment').on(table.environment),

    // Unique constraint on (flag_key, environment)
    uniqueFlagKeyEnvironment: uniqueIndex('feature_flags_flag_key_environment_unique').on(
      table.flagKey,
      table.environment,
    ),

    // Check constraint for rollout percentage range (0-100)
    rolloutPercentageCheck: check(
      'rollout_percentage_check',
      sql`rollout_percentage >= 0 AND rollout_percentage <= 100`,
    ),
  }),
)

/**
 * Feature Flag User Overrides Table (WISH-2039)
 *
 * Stores user-level targeting for feature flags.
 * Allows explicit inclusion/exclusion of specific users from feature flags.
 *
 * Evaluation Priority:
 * 1. Exclusion override -> return false (highest priority)
 * 2. Inclusion override -> return true
 * 3. Percentage-based rollout (existing WISH-2009 logic)
 */
export const featureFlagUserOverrides = pgTable(
  'feature_flag_user_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Foreign key to feature_flags table */
    flagId: uuid('flag_id')
      .notNull()
      .references(() => featureFlags.id, { onDelete: 'cascade' }),

    /** User ID (Cognito sub) to override */
    userId: text('user_id').notNull(),

    /** Type of override: 'include' (force true) or 'exclude' (force false) */
    overrideType: text('override_type').notNull(),

    /** Optional reason for the override (e.g., "Beta tester", "Support case #123") */
    reason: text('reason'),

    /** Admin user who created the override */
    createdBy: text('created_by'),

    /** Timestamp when override was created */
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    // Index for fast lookups by flag_id (for listing all overrides for a flag)
    flagIdIdx: index('idx_ffu_flag_id').on(table.flagId),

    // Index for fast lookups by user_id (for checking if user has any overrides)
    userIdIdx: index('idx_ffu_user_id').on(table.userId),

    // Unique constraint: one override per user per flag
    uniqueFlagUser: uniqueIndex('ffu_flag_user_unique').on(table.flagId, table.userId),

    // Check constraint: override_type must be 'include' or 'exclude'
    overrideTypeCheck: check('override_type_check', sql`override_type IN ('include', 'exclude')`),
  }),
)
/**
 * Feature Flag Schedules Table (WISH-2119, WISH-20260)
 *
 * Stores scheduled updates for feature flags with automatic retry mechanism.
 * Cron job processes pending schedules every 1 minute to apply flag changes automatically.
 *
 * Status States:
 * - 'pending': Schedule waiting to be processed
 * - 'applied': Schedule successfully applied to feature flag
 * - 'failed': Schedule processing failed (may retry automatically)
 * - 'cancelled': Schedule cancelled by admin before execution
 *
 * Retry Mechanism (WISH-20260):
 * - retry_count: Number of retry attempts (0 = first attempt)
 * - max_retries: Maximum retry attempts before permanent failure (default 3)
 * - next_retry_at: Timestamp for next retry (exponential backoff with jitter)
 * - last_error: Error message from most recent failure
 */
export const featureFlagSchedules = pgTable(
  'feature_flag_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** Foreign key to feature_flags table */
    flagId: uuid('flag_id')
      .notNull()
      .references(() => featureFlags.id, { onDelete: 'cascade' }),

    /** When to apply the scheduled update */
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),

    /** Current status of the schedule */
    status: text('status').default('pending').notNull(),

    /** JSONB object with flag updates to apply: { enabled?: boolean, rolloutPercentage?: number } */
    updates: jsonb('updates').notNull(),

    /** Timestamp when schedule was applied (null if not yet applied) */
    appliedAt: timestamp('applied_at', { withTimezone: true }),

    /** Error message if schedule failed */
    errorMessage: text('error_message'),

    /** Retry metadata (WISH-20260) */
    retryCount: integer('retry_count').default(0).notNull(),
    maxRetries: integer('max_retries').default(3).notNull(),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    lastError: text('last_error'),

    /** Admin tracking (WISH-20280) */
    createdBy: text('created_by'),
    cancelledBy: text('cancelled_by'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

    /** Timestamps */
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    // Index for fast lookups by flag_id (for listing all schedules for a flag)
    flagIdIdx: index('idx_schedules_flag_id').on(table.flagId),

    // Index for fast range queries on scheduled_at (for cron job processing)
    scheduledAtIdx: index('idx_schedules_scheduled_at').on(table.scheduledAt),

    // Index for status filtering (pending/applied/failed/cancelled)
    statusIdx: index('idx_schedules_status').on(table.status),

    // Index for retry queries (WISH-20260)
    nextRetryAtIdx: index('idx_schedules_next_retry_at').on(table.nextRetryAt),

    // Check constraint: status must be valid
    statusCheck: check(
      'schedule_status_check',
      sql`status IN ('pending', 'applied', 'failed', 'cancelled')`,
    ),

    // Check constraint: max_retries range (0-10) (WISH-20260)
    maxRetriesCheck: check('max_retries_check', sql`max_retries >= 0 AND max_retries <= 10`),
  }),
)
