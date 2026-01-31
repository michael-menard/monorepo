import { eq, and } from 'drizzle-orm';
import { ok, err } from '@repo/api-core';
/**
 * Create a feature flag repository adapter
 */
export function createFeatureFlagRepository(db, schema) {
    const typedDb = db;
    const typedSchema = schema;
    const { featureFlags } = typedSchema;
    const DEFAULT_ENVIRONMENT = 'production';
    /**
     * Map database row to FeatureFlag type
     */
    function mapToFeatureFlag(row) {
        const r = row;
        return {
            id: r.id,
            flagKey: r.flagKey,
            enabled: r.enabled,
            rolloutPercentage: r.rolloutPercentage,
            description: r.description,
            environment: r.environment,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
        };
    }
    return {
        /**
         * Find feature flag by key and environment
         */
        async findByKey(flagKey, environment = DEFAULT_ENVIRONMENT) {
            const rows = await typedDb
                .select()
                .from(featureFlags)
                .where(and(eq(featureFlags.flagKey, flagKey), eq(featureFlags.environment, environment)));
            if (rows.length === 0) {
                return err('NOT_FOUND');
            }
            return ok(mapToFeatureFlag(rows[0]));
        },
        /**
         * Find all feature flags for an environment
         */
        async findAllByEnvironment(environment = DEFAULT_ENVIRONMENT) {
            const rows = await typedDb
                .select()
                .from(featureFlags)
                .where(eq(featureFlags.environment, environment));
            return rows.map(mapToFeatureFlag);
        },
        /**
         * Create a new feature flag
         */
        async create(input) {
            try {
                // Check if flag already exists
                const existing = await this.findByKey(input.flagKey, input.environment);
                if (existing.ok) {
                    return err('ALREADY_EXISTS');
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
                    .returning();
                return ok(mapToFeatureFlag(rows[0]));
            }
            catch (error) {
                console.error('Failed to create feature flag:', error);
                return err('DB_ERROR');
            }
        },
        /**
         * Update an existing feature flag
         */
        async update(flagKey, input, environment = DEFAULT_ENVIRONMENT) {
            try {
                const updateData = {
                    updatedAt: new Date(),
                };
                if (input.enabled !== undefined) {
                    updateData.enabled = input.enabled;
                }
                if (input.rolloutPercentage !== undefined) {
                    updateData.rolloutPercentage = input.rolloutPercentage;
                }
                if (input.description !== undefined) {
                    updateData.description = input.description;
                }
                const rows = await typedDb
                    .update(featureFlags)
                    .set(updateData)
                    .where(and(eq(featureFlags.flagKey, flagKey), eq(featureFlags.environment, environment)))
                    .returning();
                if (rows.length === 0) {
                    return err('NOT_FOUND');
                }
                return ok(mapToFeatureFlag(rows[0]));
            }
            catch (error) {
                console.error('Failed to update feature flag:', error);
                return err('DB_ERROR');
            }
        },
        /**
         * Delete a feature flag
         */
        async delete(flagKey, environment = DEFAULT_ENVIRONMENT) {
            const rows = await typedDb
                .delete(featureFlags)
                .where(and(eq(featureFlags.flagKey, flagKey), eq(featureFlags.environment, environment)))
                .returning();
            if (rows.length === 0) {
                return err('NOT_FOUND');
            }
            return ok(undefined);
        },
    };
}
