import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
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
