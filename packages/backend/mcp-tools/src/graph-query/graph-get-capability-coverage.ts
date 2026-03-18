/**
 * Graph Get Capability Coverage MCP Tool
 * WINT-0131 AC-6: Queries capability coverage breakdown per feature
 *
 * Features:
 * - Dual ID support (UUID or feature name)
 * - Zod validation at entry (fail fast)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with features + capabilities schemas from @repo/knowledge-base/src/db
 *
 * Security: AC-7 (Parameterized Queries Mandatory via Drizzle ORM), AC-8 (Zod Validation at Entry)
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { features, capabilities } from '@repo/knowledge-base/db'
import { eq, or, isNotNull } from 'drizzle-orm'
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
 * const coverage = await graph_get_capability_coverage({ featureId: 'user-authentication' })
 * // => {
 * //   featureId: 'uuid',
 * //   capabilities: { create: 2, read: 3, update: 2, delete: 1 },
 * //   maturityLevels: { stable: 6, beta: 2 },
 * //   totalCount: 8
 * // }
 * ```
 */
export async function graph_get_capability_coverage(
  input: GraphGetCapabilityCoverageInput,
): Promise<CapabilityCoverageOutput | null> {
  // Validate input - fail fast if invalid (AC-8: Zod Validation at Entry)
  const parsed = GraphGetCapabilityCoverageInputSchema.parse(input)

  try {
    // Dual-ID feature lookup: accept UUID or feature name (AC-7: Drizzle ORM only)
    const [feature] = await db
      .select()
      .from(features)
      .where(or(eq(features.id, parsed.featureId), eq(features.featureName, parsed.featureId)))
      .limit(1)

    if (!feature) {
      return null
    }

    // Query all capabilities linked to this feature via featureId FK
    const linkedCapabilities = await db
      .select()
      .from(capabilities)
      .where(
        // Use the resolved feature UUID (not the input which could be a name)
        isNotNull(capabilities.featureId),
      )
      .then(rows => rows.filter(cap => cap.featureId === feature.id))

    // Aggregate CRUD counts from lifecycleStage field in TypeScript
    const crudCounts = {
      create: 0,
      read: 0,
      update: 0,
      delete: 0,
    }

    // Aggregate maturity level distribution in TypeScript
    const maturityLevels: Record<string, number> = {}

    for (const cap of linkedCapabilities) {
      // CRUD lifecycle stage counts
      const stage = cap.lifecycleStage
      if (stage === 'create' || stage === 'read' || stage === 'update' || stage === 'delete') {
        crudCounts[stage]++
      }

      // Maturity level distribution
      const maturity = cap.maturityLevel ?? 'unknown'
      maturityLevels[maturity] = (maturityLevels[maturity] ?? 0) + 1
    }

    return {
      featureId: feature.id,
      capabilities: crudCounts,
      maturityLevels,
      totalCount: linkedCapabilities.length,
    }
  } catch (error) {
    // Resilient error handling: log warning, don't crash (AC-9: Resilient Error Handling)
    logger.warn(
      '[mcp-tools] Failed to get capability coverage:',
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}
