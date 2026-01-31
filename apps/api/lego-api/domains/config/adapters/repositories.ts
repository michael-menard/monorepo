import { eq, and } from 'drizzle-orm'
import { ok, err, type Result } from '@repo/api-core'
import type { FeatureFlagRepository } from '../ports/index.js'
import type { FeatureFlag, CreateFeatureFlagInput, UpdateFeatureFlagInput } from '../types.js'

/**
 * Feature Flag Repository Adapter (WISH-2009)
 *
 * Database adapter for feature flag CRUD operations.
 * Uses type assertions for Drizzle db/schema since exact types are complex.
 */

// Define minimal types for Drizzle operations
interface DrizzleDb {
  select(): { from(table: unknown): { where(condition: unknown): Promise<unknown[]> } }
  insert(table: unknown): { values(data: unknown): { returning(): Promise<unknown[]> } }
  update(table: unknown): {
    set(data: unknown): { where(condition: unknown): { returning(): Promise<unknown[]> } }
  }
  delete(table: unknown): { where(condition: unknown): { returning(): Promise<unknown[]> } }
}

interface DrizzleTable {
  flagKey: unknown
  environment: unknown
}

interface DrizzleSchema {
  featureFlags: DrizzleTable
}

/**
 * Create a feature flag repository adapter
 */
export function createFeatureFlagRepository(db: unknown, schema: unknown): FeatureFlagRepository {
  const typedDb = db as DrizzleDb
  const typedSchema = schema as DrizzleSchema
  const { featureFlags } = typedSchema
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
