/**
 * Graph Get Capability Coverage MCP Tool
 * WINT-0130 AC-8: Queries capability coverage breakdown per feature
 *
 * Features:
 * - Dual ID support (UUID or feature name)
 * - Zod validation at entry (fail fast)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with features schema from @repo/database-schema
 *
 * Security: AC-2 (Parameterized Queries Mandatory), AC-10 (Zod Validation at Entry)
 *
 * SCHEMA LIMITATION (WINT-0130-SCHEMA-FIX):
 * Current WINT schema does not have feature-capability linkage (capabilities.featureId missing).
 * This tool returns null until schema is updated.
 * See DECISIONS.yaml decision_001 for details.
 */

import { logger } from '@repo/logger'
import {
  GraphGetCapabilityCoverageInputSchema,
  type GraphGetCapabilityCoverageInput,
  type CapabilityCoverageOutput,
} from './__types__/index.js'

/**
 * Query capability coverage breakdown per feature
 *
 * Returns CRUD capability counts and maturity level distribution for a feature.
 *
 * @param input - Feature ID (UUID or feature name)
 * @returns Capability coverage breakdown or null if feature not found
 *
 * @example
 * ```typescript
 * const coverage = await graphGetCapabilityCoverage({ featureId: 'user-authentication' })
 * // => {
 * //   featureId: 'uuid',
 * //   capabilities: { create: 2, read: 3, update: 2, delete: 1 },
 * //   maturityLevels: { stable: 6, beta: 2 },
 * //   totalCount: 8
 * // }
 * ```
 *
 * **SCHEMA LIMITATION:** Current implementation returns null due to missing
 * feature-capability linkage in WINT schema. Requires capabilities.featureId foreign key.
 * Follow-up story: WINT-0130-SCHEMA-FIX
 */
export async function graph_get_capability_coverage(
  input: GraphGetCapabilityCoverageInput,
): Promise<CapabilityCoverageOutput | null> {
  try {
    // Validate input - fail fast if invalid (AC-10: Zod Validation at Entry)
    const parsed = GraphGetCapabilityCoverageInputSchema.parse(input)


    // SCHEMA LIMITATION: capabilities table missing featureId foreign key
    // Cannot query capability coverage until schema is fixed
    // See DECISIONS.yaml decision_001

    logger.warn(
      '[mcp-tools] graph_get_capability_coverage: Schema limitation - capabilities.featureId missing. Returning null.',
      { featureId: parsed.featureId },
    )

    return null
  } catch (error) {
    // Resilient error handling: log warning, don't crash (AC-12: Resilient Error Handling)
    logger.warn(
      '[mcp-tools] Failed to get capability coverage:',
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}
