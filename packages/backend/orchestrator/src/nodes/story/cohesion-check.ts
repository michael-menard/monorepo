/**
 * Cohesion Check LangGraph Node
 * WINT-9030: Create cohesion-prosecutor LangGraph Node
 *
 * Self-contained compute logic ported from the cohesion sidecar (WINT-4010).
 * Uses identical Drizzle query patterns for AC-14 parity.
 *
 * TODO: Replace self-contained compute logic with direct import from
 * @repo/cohesion-sidecar once its build chain is stable (AC-15 deferred).
 *
 * AC-1: Exports cohesionCheckNode and createCohesionCheckNode(config)
 * AC-2: Per-feature check via featureId
 * AC-3: Full audit via packageName
 * AC-4: GraphStateWithCohesionCheck is Zod-based (no interface keyword)
 * AC-5: Uses createToolNode preset (2 retries, 10s timeout)
 * AC-6: DB client is injectable via config
 * AC-14: Identical query logic to sidecar for parity
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { features, capabilities } from '@repo/database-schema'
import {
  CapabilityCoverageSchema,
  CohesionStatusSchema,
  CohesionCheckResultSchema,
  FrankenFeatureItemSchema,
  CohesionAuditResultSchema,
} from '@repo/mcp-tools'
import type { GraphState } from '../../state/index.js'
import { createToolNode } from '../../runner/node-factory.js'
import { updateState } from '../../runner/state-helpers.js'

// ============================================================================
// Re-export canonical schemas from @repo/mcp-tools
// ============================================================================

export {
  CapabilityCoverageSchema,
  CohesionStatusSchema,
  CohesionCheckResultSchema,
  FrankenFeatureItemSchema,
  CohesionAuditResultSchema,
}

export type CapabilityCoverage = z.infer<typeof CapabilityCoverageSchema>

export type CohesionStatus = z.infer<typeof CohesionStatusSchema>

export type CohesionCheckResult = z.infer<typeof CohesionCheckResultSchema>

export type FrankenFeatureItem = z.infer<typeof FrankenFeatureItemSchema>

export type CohesionAuditResult = z.infer<typeof CohesionAuditResultSchema>

// ============================================================================
// AC-4: Zod schemas for state extension and config (no TypeScript interfaces)
// ============================================================================

/**
 * Cohesion-specific state fields as a Zod schema.
 * AC-4: Defined via z.object() with z.infer<> — no interface keyword.
 */
export const CohesionCheckStateSchema = z.object({
  cohesionCheck: CohesionCheckResultSchema.optional(),
  cohesionAudit: CohesionAuditResultSchema.optional(),
})

/**
 * AC-4: GraphState extension type via Zod inference + intersection.
 * GraphStateSchema uses superRefine so cannot use .extend() —
 * type intersection is the correct pattern.
 */
export type GraphStateWithCohesionCheck = GraphState & z.infer<typeof CohesionCheckStateSchema>

/**
 * AC-6: Config schema with injectable DB client.
 */
export const CohesionCheckConfigSchema = z.object({
  db: z.custom<NodePgDatabase<any>>(),
  featureId: z.string().optional(),
  packageName: z.string().optional(),
})

export type CohesionCheckConfig = z.infer<typeof CohesionCheckConfigSchema>

/**
 * Result schema for the cohesion check node.
 */
export const CohesionCheckNodeResultSchema = z.object({
  cohesionCheck: CohesionCheckResultSchema.nullable(),
  cohesionAudit: CohesionAuditResultSchema.nullable(),
  analyzed: z.boolean(),
  error: z.string().optional(),
})

export type CohesionCheckNodeResult = z.infer<typeof CohesionCheckNodeResultSchema>

// ============================================================================
// Constants
// ============================================================================

const CRUD_STAGES = ['create', 'read', 'update', 'delete'] as const

// ============================================================================
// Inner compute functions (injectable db, unit-testable)
// AC-6, AC-7, AC-8, AC-9, AC-14
// ============================================================================

/**
 * Per-feature cohesion check.
 * AC-2: Accepts featureId, returns CohesionCheckResult.
 * AC-6: db is injectable.
 * AC-7: Unknown featureId returns { status: 'unknown' } gracefully.
 * AC-8: Full coverage returns { status: 'complete' }.
 * AC-9: Partial coverage returns { status: 'incomplete' } with violations.
 * AC-14: Identical query logic to sidecar computeCheck for parity.
 */
export async function cohesionCheckImpl(
  featureId: string,
  db: NodePgDatabase<any>,
): Promise<CohesionCheckResult> {
  const rows = await db.select().from(capabilities).where(eq(capabilities.featureId, featureId))

  // AC-7: Feature not found (no capabilities) → unknown status (not an error)
  if (rows.length === 0) {
    return {
      featureId,
      status: 'unknown',
      violations: [],
      capabilityCoverage: {},
    }
  }

  // Collect all lifecycle stages present for this feature
  const presentStages = new Set<string>()
  for (const row of rows) {
    if (row.lifecycleStage) {
      presentStages.add(row.lifecycleStage)
    }
  }

  // Determine CRUD capability coverage (boolean per stage)
  const capabilityCoverage: CapabilityCoverage = {
    create: presentStages.has('create'),
    read: presentStages.has('read'),
    update: presentStages.has('update'),
    delete: presentStages.has('delete'),
  }

  // Identify missing CRUD stages
  const missingStages = CRUD_STAGES.filter(stage => !presentStages.has(stage))

  // Determine status
  const status: CohesionStatus = missingStages.length === 0 ? 'complete' : 'incomplete'

  // Violations: one entry per missing capability
  const violations = missingStages.map(stage => `missing ${stage} capability`)

  return {
    featureId,
    status,
    violations,
    capabilityCoverage,
  }
}

/**
 * Full graph audit.
 * AC-3: Accepts optional packageName filter.
 * AC-6: db is injectable.
 * AC-14: Identical query logic to sidecar computeAudit for parity.
 */
export async function cohesionAuditImpl(
  packageName: string | undefined | null,
  db: NodePgDatabase<any>,
): Promise<CohesionAuditResult> {
  // Left join features with capabilities so features with zero capabilities are included
  const baseQuery = db
    .select({
      featureId: features.id,
      featureName: features.featureName,
      packageName: features.packageName,
      lifecycleStage: capabilities.lifecycleStage,
    })
    .from(features)
    .leftJoin(capabilities, eq(capabilities.featureId, features.id))

  const rows = await (packageName != null
    ? baseQuery.where(eq(features.packageName, packageName))
    : baseQuery)

  // Group capabilities by featureId
  const featureMap = new Map<string, { featureName: string; stages: Set<string> }>()

  for (const row of rows) {
    const fId = row.featureId
    if (!featureMap.has(fId)) {
      featureMap.set(fId, { featureName: row.featureName, stages: new Set() })
    }
    if (row.lifecycleStage) {
      featureMap.get(fId)!.stages.add(row.lifecycleStage)
    }
  }

  const totalFeatures = featureMap.size

  // Detect features with < 4 distinct CRUD lifecycle stages (Franken-features)
  const frankenFeatures: FrankenFeatureItem[] = []

  for (const [fId, { featureName, stages }] of featureMap) {
    const missingCapabilities = CRUD_STAGES.filter(stage => !stages.has(stage))
    if (missingCapabilities.length > 0) {
      frankenFeatures.push({ featureId: fId, featureName, missingCapabilities })
    }
  }

  const incompleteCount = frankenFeatures.length
  const completeCount = totalFeatures - incompleteCount

  return {
    frankenFeatures,
    coverageSummary: { totalFeatures, completeCount, incompleteCount },
  }
}

// ============================================================================
// Node exports via createToolNode
// AC-1, AC-5
// ============================================================================

/**
 * AC-1: Default cohesion check node.
 * AC-5: Uses createToolNode preset (2 retries, 10s timeout).
 *
 * Default node without config — logs a warning. Use createCohesionCheckNode()
 * with a db client for actual functionality.
 */
export const cohesionCheckNode = createToolNode(
  'cohesion_check',
  async (_state: GraphState): Promise<Partial<GraphStateWithCohesionCheck>> => {
    return updateState({}) as Partial<GraphStateWithCohesionCheck>
  },
)

/**
 * AC-1: Factory function to create a cohesion check node with config.
 * AC-5: Uses createToolNode preset (2 retries, 10s timeout).
 * AC-6: DB client injected via config.
 */
export function createCohesionCheckNode(config: CohesionCheckConfig) {
  return createToolNode(
    'cohesion_check',
    async (_state: GraphState): Promise<Partial<GraphStateWithCohesionCheck>> => {
      const { db, featureId, packageName } = config

      let checkResult: CohesionCheckResult | undefined
      let auditResult: CohesionAuditResult | undefined

      // Phase 1: Per-feature check (if featureId provided)
      if (featureId) {
        checkResult = await cohesionCheckImpl(featureId, db)
      }

      // Phase 2: Full audit (if packageName provided)
      if (packageName !== undefined) {
        auditResult = await cohesionAuditImpl(packageName, db)
      }

      return updateState({
        cohesionCheck: checkResult,
        cohesionAudit: auditResult,
      } as Partial<GraphStateWithCohesionCheck>)
    },
  )
}
