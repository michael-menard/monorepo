/**
 * Graph Get Franken Features MCP Tool
 * WINT-0131 AC-5: Identifies features with incomplete CRUD capabilities
 *
 * Features:
 * - Optional package name filter
 * - Zod validation at entry (fail fast)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with features + capabilities schemas from @repo/knowledge-base/src/db
 *
 * Security: AC-7 (Parameterized Queries Mandatory via Drizzle ORM), AC-8 (Zod Validation at Entry)
 *
 * Franken-feature definition: feature with < 4 distinct lifecycle_stage values
 * among linked capabilities (create, read, update, delete).
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { features, capabilities } from '@repo/knowledge-base/src/db'
import { eq, isNotNull } from 'drizzle-orm'
import {
  GraphGetFrankenFeaturesInputSchema,
  type GraphGetFrankenFeaturesInput,
  type FrankenFeatureItem,
} from './__types__/index.js'

const CRUD_STAGES = ['create', 'read', 'update', 'delete'] as const

/**
 * Identify features with incomplete CRUD capabilities (Franken-features)
 *
 * Definition: Franken-feature = feature with < 4 distinct lifecycle_stage values
 * among its linked capabilities (create, read, update, delete).
 *
 * @param input - Optional package name filter
 * @returns Array of features with missing CRUD capabilities
 *
 * @example
 * ```typescript
 * const franken = await graph_get_franken_features({})
 * // => [{ featureId: 'uuid', featureName: 'incomplete-feature', missingCapabilities: ['create', 'update'] }]
 *
 * const filtered = await graph_get_franken_features({ packageName: '@repo/ui' })
 * // => Only Franken-features from @repo/ui package
 * ```
 */
export async function graph_get_franken_features(
  input: GraphGetFrankenFeaturesInput,
): Promise<FrankenFeatureItem[]> {
  // Validate input - fail fast if invalid (AC-8: Zod Validation at Entry)
  const parsed = GraphGetFrankenFeaturesInputSchema.parse(input)

  try {
    // Query all features with their linked capabilities (AC-7: Drizzle ORM only, no raw SQL)
    const rows = await db
      .select({
        featureId: features.id,
        featureName: features.featureName,
        packageName: features.packageName,
        lifecycleStage: capabilities.lifecycleStage,
      })
      .from(features)
      .innerJoin(capabilities, eq(capabilities.featureId, features.id))
      .where(isNotNull(capabilities.featureId))

    // Apply optional package name filter in TypeScript (avoids additional DB round-trip)
    const filteredRows = parsed.packageName
      ? rows.filter(row => row.packageName === parsed.packageName)
      : rows

    // Group capabilities by featureId in TypeScript
    const featureMap = new Map<string, { featureName: string; stages: Set<string> }>()

    for (const row of filteredRows) {
      if (!featureMap.has(row.featureId)) {
        featureMap.set(row.featureId, {
          featureName: row.featureName,
          stages: new Set(),
        })
      }
      if (row.lifecycleStage) {
        featureMap.get(row.featureId)!.stages.add(row.lifecycleStage)
      }
    }

    // Detect features with < 4 distinct CRUD lifecycle_stage values
    const frankenFeatures: FrankenFeatureItem[] = []

    for (const [featureId, { featureName, stages }] of featureMap) {
      const missingCapabilities = CRUD_STAGES.filter(stage => !stages.has(stage))

      if (missingCapabilities.length > 0) {
        frankenFeatures.push({
          featureId,
          featureName,
          missingCapabilities,
        })
      }
    }

    return frankenFeatures
  } catch (error) {
    // Resilient error handling: log warning, don't crash (AC-9: Resilient Error Handling)
    logger.warn(
      '[mcp-tools] Failed to get Franken-features:',
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}
