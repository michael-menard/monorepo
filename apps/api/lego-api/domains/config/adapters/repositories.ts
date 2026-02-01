import { eq, and, count, desc } from 'drizzle-orm'
import { ok, err, type Result } from '@repo/api-core'
import type {
  FeatureFlagRepository,
  UserOverrideRepository,
  UserOverridePagination,
} from '../ports/index.js'
import type {
  FeatureFlag,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  UserOverride,
  OverrideType,
} from '../types.js'

/**
 * Feature Flag Repository Adapter (WISH-2009)
 *
 * Database adapter for feature flag CRUD operations.
 * Uses type assertions for Drizzle db/schema since exact types are complex.
 */

/**
 * Type alias for Drizzle operations
 *
 * Uses 'any' to avoid complex Drizzle type inference issues with eq().
 * TypeScript's noImplicitAny: false allows this pattern per codebase config.
 */
type DrizzleAny = any

/**
 * Create a feature flag repository adapter
 */
export function createFeatureFlagRepository(db: unknown, schema: unknown): FeatureFlagRepository {
  const typedDb = db as DrizzleAny
  const typedSchema = schema as DrizzleAny
  const featureFlags = typedSchema.featureFlags
  const DEFAULT_ENVIRONMENT = 'production'

  /**
   * Map database row to FeatureFlag type
   */
  function mapToFeatureFlag(row: unknown): FeatureFlag {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      flagKey: r.flagKey as string,
      enabled: r.enabled as boolean,
      rolloutPercentage: r.rolloutPercentage as number,
      description: r.description as string | null,
      environment: r.environment as string,
      createdAt: r.createdAt as Date,
      updatedAt: r.updatedAt as Date,
    }
  }

  return {
    /**
     * Find feature flag by key and environment
     */
    async findByKey(
      flagKey: string,
      environment: string = DEFAULT_ENVIRONMENT,
    ): Promise<Result<FeatureFlag, 'NOT_FOUND'>> {
      const rows = await typedDb
        .select()
        .from(featureFlags)
        .where(and(eq(featureFlags.flagKey, flagKey), eq(featureFlags.environment, environment)))

      if (rows.length === 0) {
        return err('NOT_FOUND')
      }

      return ok(mapToFeatureFlag(rows[0]))
    },

    /**
     * Find all feature flags for an environment
     */
    async findAllByEnvironment(environment: string = DEFAULT_ENVIRONMENT): Promise<FeatureFlag[]> {
      const rows = await typedDb
        .select()
        .from(featureFlags)
        .where(eq(featureFlags.environment, environment))

      return rows.map(mapToFeatureFlag)
    },

    /**
     * Create a new feature flag
     */
    async create(
      input: CreateFeatureFlagInput,
    ): Promise<Result<FeatureFlag, 'ALREADY_EXISTS' | 'DB_ERROR'>> {
      try {
        // Check if flag already exists
        const existing = await this.findByKey(input.flagKey, input.environment)
        if (existing.ok) {
          return err('ALREADY_EXISTS')
        }

        const rows = await typedDb
          .insert(featureFlags)
          .values({
            flagKey: input.flagKey,
            enabled: input.enabled ?? false,
            rolloutPercentage: input.rolloutPercentage ?? 0,
            description: input.description ?? null,
            environment: input.environment ?? DEFAULT_ENVIRONMENT,
          })
          .returning()

        return ok(mapToFeatureFlag(rows[0]))
      } catch (error) {
        console.error('Failed to create feature flag:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Update an existing feature flag
     */
    async update(
      flagKey: string,
      input: UpdateFeatureFlagInput,
      environment: string = DEFAULT_ENVIRONMENT,
    ): Promise<Result<FeatureFlag, 'NOT_FOUND' | 'DB_ERROR'>> {
      try {
        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        }

        if (input.enabled !== undefined) {
          updateData.enabled = input.enabled
        }
        if (input.rolloutPercentage !== undefined) {
          updateData.rolloutPercentage = input.rolloutPercentage
        }
        if (input.description !== undefined) {
          updateData.description = input.description
        }

        const rows = await typedDb
          .update(featureFlags)
          .set(updateData)
          .where(and(eq(featureFlags.flagKey, flagKey), eq(featureFlags.environment, environment)))
          .returning()

        if (rows.length === 0) {
          return err('NOT_FOUND')
        }

        return ok(mapToFeatureFlag(rows[0]))
      } catch (error) {
        console.error('Failed to update feature flag:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Delete a feature flag
     */
    async delete(
      flagKey: string,
      environment: string = DEFAULT_ENVIRONMENT,
    ): Promise<Result<void, 'NOT_FOUND'>> {
      const rows = await typedDb
        .delete(featureFlags)
        .where(and(eq(featureFlags.flagKey, flagKey), eq(featureFlags.environment, environment)))
        .returning()

      if (rows.length === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },
  }
}

/**
 * User Override Repository Adapter (WISH-2039)
 *
 * Database adapter for user override CRUD operations.
 * Uses type assertions for Drizzle db/schema since exact types are complex.
 */

/**
 * Create a user override repository adapter
 */
export function createUserOverrideRepository(db: unknown, schema: unknown): UserOverrideRepository {
  const typedDb = db as DrizzleAny
  const typedSchema = schema as DrizzleAny

  const userOverridesTable = typedSchema.featureFlagUserOverrides

  if (!userOverridesTable) {
    throw new Error('featureFlagUserOverrides table not found in schema')
  }

  /**
   * Map database row to UserOverride type
   */
  function mapToUserOverride(row: unknown): UserOverride {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      flagId: r.flagId as string,
      userId: r.userId as string,
      overrideType: r.overrideType as OverrideType,
      reason: r.reason as string | null,
      createdBy: r.createdBy as string | null,
      createdAt: r.createdAt as Date,
    }
  }

  return {
    /**
     * Find a specific user override
     */
    async findByFlagAndUser(flagId: string, userId: string): Promise<UserOverride | null> {
      const rows = await typedDb
        .select()
        .from(userOverridesTable)
        .where(and(eq(userOverridesTable.flagId, flagId), eq(userOverridesTable.userId, userId)))

      if (rows.length === 0) {
        return null
      }

      return mapToUserOverride(rows[0])
    },

    /**
     * Find all overrides for a flag with pagination
     */
    async findAllByFlag(
      flagId: string,
      pagination: UserOverridePagination,
    ): Promise<{ overrides: UserOverride[]; total: number }> {
      const { page, pageSize } = pagination
      const offsetVal = (page - 1) * pageSize

      // Get paginated results
      const rows = await typedDb
        .select()
        .from(userOverridesTable)
        .where(eq(userOverridesTable.flagId, flagId))
        .orderBy(desc(userOverridesTable.createdAt))
        .limit(pageSize)
        .offset(offsetVal)

      // Get total count
      const countResult = await typedDb
        .select({ count: count() })
        .from(userOverridesTable)
        .where(eq(userOverridesTable.flagId, flagId))

      const totalCount = countResult[0]?.count ?? 0

      return {
        overrides: rows.map(mapToUserOverride),
        total: totalCount,
      }
    },

    /**
     * Create or update a user override (upsert)
     */
    async upsert(
      flagId: string,
      input: {
        userId: string
        overrideType: OverrideType
        reason?: string
        createdBy?: string
      },
    ): Promise<Result<UserOverride, 'DB_ERROR'>> {
      try {
        const rows = await typedDb
          .insert(userOverridesTable)
          .values({
            flagId,
            userId: input.userId,
            overrideType: input.overrideType,
            reason: input.reason ?? null,
            createdBy: input.createdBy ?? null,
          })
          .onConflictDoUpdate({
            target: [userOverridesTable.flagId, userOverridesTable.userId],
            set: {
              overrideType: input.overrideType,
              reason: input.reason ?? null,
              createdBy: input.createdBy ?? null,
            },
          })
          .returning()

        return ok(mapToUserOverride(rows[0]))
      } catch (error) {
        console.error('Failed to upsert user override:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Delete a user override
     */
    async delete(flagId: string, userId: string): Promise<Result<void, 'NOT_FOUND'>> {
      const rows = await typedDb
        .delete(userOverridesTable)
        .where(and(eq(userOverridesTable.flagId, flagId), eq(userOverridesTable.userId, userId)))
        .returning()

      if (rows.length === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    /**
     * Delete all overrides for a flag
     */
    async deleteAllByFlag(flagId: string): Promise<void> {
      await typedDb
        .delete(userOverridesTable)
        .where(eq(userOverridesTable.flagId, flagId))
        .returning()
    },
  }
}
