/**
 * Graph Get Franken Features MCP Tool
 * WINT-0130 AC-7: Identifies features with incomplete CRUD capabilities
 *
 * Features:
 * - Optional package name filter
 * - Zod validation at entry (fail fast)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with features schema from @repo/database-schema
 *
 * Security: AC-2 (Parameterized Queries Mandatory), AC-10 (Zod Validation at Entry)
 *
 * SCHEMA LIMITATION (WINT-0130-SCHEMA-FIX):
 * Current WINT schema does not have feature-capability linkage (capabilities.featureId missing).
 * This tool returns empty array until schema is updated.
 * See DECISIONS.yaml decision_001 for details.
 */

import { logger } from '@repo/logger'
import {
  GraphGetFrankenFeaturesInputSchema,
  type GraphGetFrankenFeaturesInput,
  type FrankenFeatureItem,
} from './__types__/index.js'

/**
 * Identify features with incomplete CRUD capabilities (Franken-features)
 *
 * Definition: Franken-feature = feature with < 4 CRUD capabilities (create, read, update, delete)
 *
 * @param input - Optional package name filter
 * @returns Array of features with missing capabilities
 *
 * @example
 * ```typescript
 * const franken = await graphGetFrankenFeatures({})
 * // => [{ featureId: 'uuid', featureName: 'incomplete-feature', missingCapabilities: ['create', 'update'] }]
 *
 * const filtered = await graphGetFrankenFeatures({ packageName: '@repo/ui' })
 * // => Only Franken-features from @repo/ui package
 * ```
 *
 * **SCHEMA LIMITATION:** Current implementation returns empty array due to missing
 * feature-capability linkage in WINT schema. Requires capabilities.featureId foreign key.
 * Follow-up story: WINT-0130-SCHEMA-FIX
 */
export async function graph_get_franken_features(
  input: GraphGetFrankenFeaturesInput,
): Promise<FrankenFeatureItem[]> {
  try {
    // Validate input - fail fast if invalid (AC-10: Zod Validation at Entry)
    GraphGetFrankenFeaturesInputSchema.parse(input)


    // SCHEMA LIMITATION: capabilities table missing featureId foreign key
    // Cannot query feature-capability relationship until schema is fixed
    // See DECISIONS.yaml decision_001

    logger.warn(
      '[mcp-tools] graph_get_franken_features: Schema limitation - capabilities.featureId missing. Returning empty array.',
      { packageName: input.packageName },
    )

    return []
  } catch (error) {
    // Resilient error handling: log warning, don't crash (AC-12: Resilient Error Handling)
    logger.warn(
      '[mcp-tools] Failed to get Franken-features:',
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}
