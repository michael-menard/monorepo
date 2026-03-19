/**
 * Artifact Operations for Jump Table + Type-Specific Tables
 *
 * Operations for reading and writing workflow artifacts through the jump table
 * pattern. The storyArtifacts table serves as a registry/index, while content
 * is stored in 13 type-specific tables with typed columns for queryability.
 *
 * The MCP API stays backward-compatible — callers pass generic content JSONB,
 * and the CRUD layer handles routing to/from type-specific tables transparently.
 *
 * @see plans/future/db-first-artifact-storage/PLAN.md
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, and, desc, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  storyArtifacts,
  artifactCheckpoints,
  artifactContexts,
  artifactReviews,
  artifactElaborations,
  artifactAnalyses,
  artifactScopes,
  artifactPlans,
  artifactEvidence,
  artifactVerifications,
  artifactFixSummaries,
  artifactProofs,
  artifactQaGates,
  artifactCompletionReports,
  artifactStorySeeds,
  artifactTestPlans,
  artifactDevFeasibility,
  artifactUiuxNotes,
} from '../db/schema.js'
import type * as schema from '../db/schema.js'
import { ArtifactTypeSchema, StoryPhaseSchema } from '../__types__/index.js'
import { extractArtifactSummary } from './artifact-summary.js'

// Explicit column selector — guard against schema-vs-DB drift
const artifactColumns = {
  id: storyArtifacts.id,
  storyId: storyArtifacts.storyId,
  artifactType: storyArtifacts.artifactType,
  artifactName: storyArtifacts.artifactName,
  kbEntryId: storyArtifacts.kbEntryId,
  phase: storyArtifacts.phase,
  iteration: storyArtifacts.iteration,
  summary: storyArtifacts.summary,
  detailTable: storyArtifacts.detailTable,
  detailId: storyArtifacts.detailId,
  createdAt: storyArtifacts.createdAt,
  updatedAt: storyArtifacts.updatedAt,
} as const

// ============================================================================
// Constants
// ============================================================================

/**
 * All allowed artifact types.
 */
export const ARTIFACT_TYPES = [
  'checkpoint',
  'scope',
  'plan',
  'evidence',
  'verification',
  'analysis',
  'context',
  'fix_summary',
  'proof',
  'elaboration',
  'review',
  'qa_gate',
  'completion_report',
  'story_seed',
  'test_plan',
  'dev_feasibility',
  'uiux_notes',
] as const

/**
 * All allowed phases.
 */
export const PHASES = [
  'setup',
  'analysis',
  'planning',
  'implementation',
  'code_review',
  'qa_verification',
  'completion',
] as const

/**
 * Maps artifact_type to its detail table name.
 */
const ARTIFACT_TYPE_TO_TABLE: Record<string, string> = {
  checkpoint: 'artifact_checkpoints',
  context: 'artifact_contexts',
  review: 'artifact_reviews',
  elaboration: 'artifact_elaborations',
  analysis: 'artifact_analyses',
  scope: 'artifact_scopes',
  plan: 'artifact_plans',
  evidence: 'artifact_evidence',
  verification: 'artifact_verifications',
  fix_summary: 'artifact_fix_summaries',
  proof: 'artifact_proofs',
  qa_gate: 'artifact_qa_gates',
  completion_report: 'artifact_completion_reports',
  story_seed: 'artifact_story_seeds',
  test_plan: 'artifact_test_plans',
  dev_feasibility: 'artifact_dev_feasibility',
  uiux_notes: 'artifact_uiux_notes',
}

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for kb_write_artifact input.
 *
 * Creates or updates an artifact for a story. Uses upsert behavior based on
 * story_id + artifact_type + artifact_name + iteration.
 */
export const KbWriteArtifactInputSchema = z.object({
  /** Story ID this artifact belongs to (e.g., 'WISH-2045') */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Type of artifact */
  artifact_type: ArtifactTypeSchema,

  /** Full artifact content as JSONB */
  content: z.record(z.unknown()),

  /** Implementation phase this artifact belongs to */
  phase: StoryPhaseSchema.nullable().optional(),

  /** Iteration number for fix cycles (default: 0) */
  iteration: z.number().int().min(0).optional().default(0),

  /** Human-readable name for the artifact (auto-generated if not provided) */
  artifact_name: z.string().nullable().optional(),

  /** JSONB summary for quick access (subset of content) */
  summary: z.record(z.unknown()).nullable().optional(),

  /** When true, ignore caller's iteration value and auto-assign MAX(iteration)+1 for this (story_id, artifact_type, artifact_name) triple. Default: false (preserves upsert behavior). */
  auto_increment: z.boolean().optional(),

  /** Maximum allowed iteration. Rejects writes when resolved iteration >= max_iterations. */
  max_iterations: z.number().int().min(1).optional(),
})

/** Input type — allows optional fields that have defaults in the schema. */
export type KbWriteArtifactInput = z.input<typeof KbWriteArtifactInputSchema>

/**
 * Schema for kb_read_artifact input.
 *
 * Reads an artifact by story_id + artifact_type + optional artifact_name + optional iteration.
 */
export const KbReadArtifactInputSchema = z.object({
  /** Story ID to read artifact for */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Type of artifact to read */
  artifact_type: ArtifactTypeSchema,

  /** Specific artifact name (for disambiguating multiple artifacts of same type) */
  artifact_name: z.string().optional(),

  /** Iteration number (default: latest/0) */
  iteration: z.number().int().min(0).optional(),
})

export type KbReadArtifactInput = z.infer<typeof KbReadArtifactInputSchema>

/**
 * Schema for kb_list_artifacts input.
 *
 * Lists artifacts for a story with optional filters.
 */
export const KbListArtifactsInputSchema = z.object({
  /** Story ID to list artifacts for */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Filter by phase */
  phase: StoryPhaseSchema.nullable().optional(),

  /** Filter by artifact type */
  artifact_type: ArtifactTypeSchema.nullable().optional(),

  /** Include content in response (default: false for performance) */
  include_content: z.boolean().optional().default(false),

  /** Maximum results (default: 50) */
  limit: z.number().int().min(1).max(100).optional().default(50),
})

export type KbListArtifactsInput = z.infer<typeof KbListArtifactsInputSchema>

export const KbDeleteArtifactInputSchema = z.object({
  /** UUID of the artifact to delete */
  artifact_id: z.string().uuid('artifact_id must be a valid UUID'),
})

export type KbDeleteArtifactInput = z.infer<typeof KbDeleteArtifactInputSchema>

// ============================================================================
// Dependencies
// ============================================================================

export interface ArtifactOperationsDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Output Types
// ============================================================================

/**
 * Artifact response format (snake_case for MCP API consistency).
 */
export interface ArtifactResponse {
  id: string
  story_id: string
  artifact_type: string
  artifact_name: string | null
  phase: string | null
  iteration: number | null
  content: Record<string, unknown> | null
  summary: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

/**
 * Artifact list item (without content by default).
 */
export interface ArtifactListItem {
  id: string
  story_id: string
  artifact_type: string
  artifact_name: string | null
  phase: string | null
  iteration: number | null
  summary: Record<string, unknown> | null
  content?: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

// ============================================================================
// Content Mapping Helpers
// ============================================================================

/**
 * Extract known typed fields from generic content JSONB for a given artifact type.
 * Returns { typedColumns, data } where typedColumns are the typed fields and
 * data is the full content stored as the JSONB remainder.
 */
function mapContentToTypedColumns(
  artifactType: string,
  content: Record<string, unknown>,
  storyId: string,
): { typedColumns: Record<string, unknown>; data: Record<string, unknown> } {
  // The full content is always stored in the `data` column for backward compat
  const data = content

  switch (artifactType) {
    case 'checkpoint':
      return {
        typedColumns: {
          targetId: storyId,
          scope: (content.scope as string) ?? 'story',
          phaseStatus: content.phase_status ?? content.phaseStatus ?? {},
          resumeFrom: content.resume_from ?? content.resumeFrom ?? null,
          featureDir: content.feature_dir ?? content.featureDir ?? null,
          prefix: content.prefix ?? null,
        },
        data,
      }

    case 'context':
      return {
        typedColumns: {
          targetId: storyId,
          scope: (content.scope as string) ?? 'story',
          featureDir: content.feature_dir ?? content.featureDir ?? null,
          prefix: content.prefix ?? null,
          storyCount: content.story_count ?? content.storyCount ?? null,
        },
        data,
      }

    case 'review':
      return {
        typedColumns: {
          targetId: storyId,
          scope: (content.scope as string) ?? 'story',
          perspective: content.perspective ?? null,
          verdict: content.verdict ?? null,
          findingCount: content.finding_count ?? content.findingCount ?? null,
          criticalCount: content.critical_count ?? content.criticalCount ?? null,
        },
        data,
      }

    case 'elaboration':
      return {
        typedColumns: {
          targetId: storyId,
          scope: (content.scope as string) ?? 'story',
          elaborationType: content.elaboration_type ?? content.elaborationType ?? 'story_analysis',
          verdict: content.verdict ?? null,
          decisionCount: content.decision_count ?? content.decisionCount ?? null,
        },
        data,
      }

    case 'analysis':
      return {
        typedColumns: {
          targetId: storyId,
          scope: (content.scope as string) ?? 'story',
          analysisType: content.analysis_type ?? content.analysisType ?? 'general',
          summaryText: content.summary_text ?? content.summaryText ?? null,
        },
        data,
      }

    case 'scope':
      return {
        typedColumns: {
          targetId: storyId,
          touchesBackend: content.touches_backend ?? content.touchesBackend ?? null,
          touchesFrontend: content.touches_frontend ?? content.touchesFrontend ?? null,
          touchesDatabase: content.touches_database ?? content.touchesDatabase ?? null,
          touchesInfra: content.touches_infra ?? content.touchesInfra ?? null,
          fileCount: content.file_count ?? content.fileCount ?? null,
        },
        data,
      }

    case 'plan':
      return {
        typedColumns: {
          targetId: storyId,
          stepCount: content.step_count ?? content.stepCount ?? null,
          estimatedComplexity: content.estimated_complexity ?? content.estimatedComplexity ?? null,
        },
        data,
      }

    case 'evidence':
      return {
        typedColumns: {
          targetId: storyId,
          acTotal: content.ac_total ?? content.acTotal ?? null,
          acMet: content.ac_met ?? content.acMet ?? null,
          acStatus: content.ac_status ?? content.acStatus ?? null,
          testPassCount: content.test_pass_count ?? content.testPassCount ?? null,
          testFailCount: content.test_fail_count ?? content.testFailCount ?? null,
        },
        data,
      }

    case 'verification':
      return {
        typedColumns: {
          targetId: storyId,
          verdict: content.verdict ?? null,
          findingCount: content.finding_count ?? content.findingCount ?? null,
          criticalCount: content.critical_count ?? content.criticalCount ?? null,
        },
        data,
      }

    case 'fix_summary':
      return {
        typedColumns: {
          targetId: storyId,
          iteration: content.iteration ?? 0,
          issuesFixed: content.issues_fixed ?? content.issuesFixed ?? null,
          issuesRemaining: content.issues_remaining ?? content.issuesRemaining ?? null,
        },
        data,
      }

    case 'proof':
      return {
        typedColumns: {
          targetId: storyId,
          proofType: content.proof_type ?? content.proofType ?? null,
          verified: content.verified ?? null,
        },
        data,
      }

    case 'qa_gate':
      return {
        typedColumns: {
          targetId: storyId,
          decision: content.decision ?? 'FAIL',
          reviewer: content.reviewer ?? null,
          findingCount: content.finding_count ?? content.findingCount ?? null,
          blockerCount: content.blocker_count ?? content.blockerCount ?? null,
        },
        data,
      }

    case 'completion_report':
      return {
        typedColumns: {
          targetId: storyId,
          status: content.status ?? null,
          iterationsUsed: content.iterations_used ?? content.iterationsUsed ?? null,
        },
        data,
      }

    default:
      return { typedColumns: { targetId: storyId }, data }
  }
}

/**
 * A detail table reference with the minimum columns needed for CRUD operations.
 * All 13 type-specific tables share id, data, createdAt, updatedAt.
 */
type DetailTableRef = {
  id: typeof artifactCheckpoints.id
  [key: string]: unknown
}

/**
 * Get the Drizzle table reference for a given detail table name.
 * Uses `as any` because Drizzle PgTable types are nominally typed by table name,
 * but all our detail tables share the same structural pattern (id, data, timestamps).
 */
function getDetailTableRef(detailTable: string): DetailTableRef | null {
  const tableMap: Record<string, any> = {
    artifact_checkpoints: artifactCheckpoints,
    artifact_contexts: artifactContexts,
    artifact_reviews: artifactReviews,
    artifact_elaborations: artifactElaborations,
    artifact_analyses: artifactAnalyses,
    artifact_scopes: artifactScopes,
    artifact_plans: artifactPlans,
    artifact_evidence: artifactEvidence,
    artifact_verifications: artifactVerifications,
    artifact_fix_summaries: artifactFixSummaries,
    artifact_proofs: artifactProofs,
    artifact_qa_gates: artifactQaGates,
    artifact_completion_reports: artifactCompletionReports,
    artifact_story_seeds: artifactStorySeeds,
    artifact_test_plans: artifactTestPlans,
    artifact_dev_feasibility: artifactDevFeasibility,
    artifact_uiux_notes: artifactUiuxNotes,
  }
  return tableMap[detailTable] ?? null
}

/**
 * Reconstruct content JSONB from a type-specific table row.
 * The `data` column contains the full original content.
 */
function mergeTypedColumnsToContent(row: Record<string, unknown>): Record<string, unknown> | null {
  if (!row) return null
  // The data column stores the full content - return it directly
  return (row.data as Record<string, unknown>) ?? null
}

/**
 * Generate default artifact name from type and iteration.
 */
function generateArtifactName(artifactType: string, iteration: number): string {
  const typeNames: Record<string, string> = {
    checkpoint: 'CHECKPOINT',
    scope: 'SCOPE',
    plan: 'IMPLEMENTATION-PLAN',
    evidence: 'EVIDENCE',
    verification: 'VERIFICATION',
    analysis: 'ANALYSIS',
    context: 'AGENT-CONTEXT',
    fix_summary: 'FIX-SUMMARY',
    proof: 'PROOF',
    elaboration: 'ELABORATION',
    review: 'REVIEW',
    qa_gate: 'QA-GATE',
    completion_report: 'COMPLETION-REPORT',
    story_seed: 'STORY-SEED',
    test_plan: 'TEST-PLAN',
    dev_feasibility: 'DEV-FEASIBILITY',
    uiux_notes: 'UIUX-NOTES',
  }

  const baseName = typeNames[artifactType] ?? artifactType.toUpperCase()
  return iteration > 0 ? `${baseName} (iteration ${iteration})` : baseName
}

/**
 * Convert jump table row + detail content to API response format.
 */
function toArtifactResponse(
  jumpRow: schema.StoryArtifact,
  content: Record<string, unknown> | null,
): ArtifactResponse {
  return {
    id: jumpRow.id,
    story_id: jumpRow.storyId,
    artifact_type: jumpRow.artifactType,
    artifact_name: jumpRow.artifactName,
    phase: jumpRow.phase,
    iteration: jumpRow.iteration,
    content,
    summary: jumpRow.summary as Record<string, unknown> | null,
    created_at: jumpRow.createdAt,
    updated_at: jumpRow.updatedAt,
  }
}

/**
 * Convert jump table row to list item format.
 */
function toArtifactListItem(
  jumpRow: schema.StoryArtifact,
  includeContent: boolean,
  content?: Record<string, unknown> | null,
): ArtifactListItem {
  const item: ArtifactListItem = {
    id: jumpRow.id,
    story_id: jumpRow.storyId,
    artifact_type: jumpRow.artifactType,
    artifact_name: jumpRow.artifactName,
    phase: jumpRow.phase,
    iteration: jumpRow.iteration,
    summary: jumpRow.summary as Record<string, unknown> | null,
    created_at: jumpRow.createdAt,
    updated_at: jumpRow.updatedAt,
  }

  if (includeContent) {
    item.content = content ?? null
  }

  return item
}

// ============================================================================
// Detail Table Operations (insert/update/read/delete)
// ============================================================================

/**
 * Insert a row into the appropriate type-specific table.
 * Returns the UUID of the inserted row.
 *
 * Uses `as any` casts for dynamic table operations because Drizzle's type system
 * is nominally typed per-table — all 13 tables share the same structural pattern
 * but TypeScript treats each as a distinct type.
 */
async function insertDetailRow(
  db: NodePgDatabase<typeof schema>,
  artifactType: string,
  content: Record<string, unknown>,
  storyId: string,
): Promise<{ detailTable: string; detailId: string }> {
  const detailTable = ARTIFACT_TYPE_TO_TABLE[artifactType]
  if (!detailTable) {
    throw new Error(`Unknown artifact type: ${artifactType}`)
  }

  const { typedColumns, data } = mapContentToTypedColumns(artifactType, content, storyId)

  const columns = { ...typedColumns, data }
  const id = crypto.randomUUID()

  const tableRef = getDetailTableRef(detailTable)
  if (!tableRef) {
    throw new Error(`No table reference for: ${detailTable}`)
  }

  const result = await (db as any)
    .insert(tableRef)
    .values({ id, ...columns })
    .returning({ id: (tableRef as any).id })

  return { detailTable, detailId: result[0].id }
}

/**
 * Update an existing row in the type-specific table.
 */
async function updateDetailRow(
  db: NodePgDatabase<typeof schema>,
  detailTable: string,
  detailId: string,
  artifactType: string,
  content: Record<string, unknown>,
  storyId: string,
): Promise<void> {
  const { typedColumns, data } = mapContentToTypedColumns(artifactType, content, storyId)

  const tableRef = getDetailTableRef(detailTable)
  if (!tableRef) {
    throw new Error(`No table reference for: ${detailTable}`)
  }

  const now = new Date()

  await (db as any)
    .update(tableRef)
    .set({ ...typedColumns, data, updatedAt: now })
    .where(eq((tableRef as any).id, detailId))
}

/**
 * Read a row from the type-specific table and return its content.
 */
async function readDetailRow(
  db: NodePgDatabase<typeof schema>,
  detailTable: string,
  detailId: string,
): Promise<Record<string, unknown> | null> {
  const tableRef = getDetailTableRef(detailTable)
  if (!tableRef) return null

  const result = await (db as any)
    .select()
    .from(tableRef)
    .where(eq((tableRef as any).id, detailId))
    .limit(1)

  if (result.length === 0) return null
  return mergeTypedColumnsToContent(result[0] as Record<string, unknown>)
}

/**
 * Delete a row from the type-specific table.
 */
async function deleteDetailRow(
  db: NodePgDatabase<typeof schema>,
  detailTable: string,
  detailId: string,
): Promise<void> {
  const tableRef = getDetailTableRef(detailTable)
  if (!tableRef) return

  await (db as any).delete(tableRef).where(eq((tableRef as any).id, detailId))
}

// ============================================================================
// Iteration Helpers
// ============================================================================

/**
 * Resolve the next iteration number for a (story_id, artifact_type) pair.
 * When a custom artifact_name is provided, scopes the query to that name.
 * When artifact_name is null (auto-generated names), queries across all
 * names for that type since auto-generated names vary by iteration.
 *
 * Returns MAX(iteration) + 1, or 0 if no prior artifacts exist.
 */
async function resolveNextIteration(
  db: NodePgDatabase<typeof schema>,
  storyId: string,
  artifactType: string,
  artifactName: string | null,
): Promise<number> {
  const conditions = [
    eq(storyArtifacts.storyId, storyId),
    eq(storyArtifacts.artifactType, artifactType),
  ]

  // Only filter by artifact_name when a custom name was explicitly provided.
  // Auto-generated names include the iteration suffix and vary per row.
  if (artifactName !== null) {
    conditions.push(eq(storyArtifacts.artifactName, artifactName))
  }

  const result = await db
    .select({ maxIter: sql<number>`COALESCE(MAX(${storyArtifacts.iteration}), -1)` })
    .from(storyArtifacts)
    .where(and(...conditions))

  return (result[0]?.maxIter ?? -1) + 1
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Write (create or update) an artifact for a story.
 *
 * Uses upsert behavior: if artifact with same story_id + artifact_type + artifact_name + iteration
 * exists, it will be updated. Otherwise, a new artifact is created.
 *
 * Flow:
 * 1. Insert/update the type-specific detail table row
 * 2. Upsert the jump table row with detail_table + detail_id
 *
 * @param input - Artifact data
 * @param deps - Database dependency
 * @returns Created/updated artifact with content
 */
export async function kb_write_artifact(
  input: KbWriteArtifactInput,
  deps: ArtifactOperationsDeps,
): Promise<ArtifactResponse> {
  const validatedInput = KbWriteArtifactInputSchema.parse(input)
  const { db } = deps

  const now = new Date()

  // --- Resolve iteration ---
  // When auto_increment is true, compute the next iteration from MAX(iteration)+1.
  // Pass the custom artifact_name if provided; null triggers unscoped MAX across all names.
  let iteration: number
  if (validatedInput.auto_increment) {
    iteration = await resolveNextIteration(
      db,
      validatedInput.story_id,
      validatedInput.artifact_type,
      validatedInput.artifact_name ?? null,
    )
  } else {
    iteration = validatedInput.iteration ?? 0
  }

  // --- Enforce max_iterations ---
  if (validatedInput.max_iterations !== undefined && iteration >= validatedInput.max_iterations) {
    throw new Error(
      `Max iterations (${validatedInput.max_iterations}) reached for ${validatedInput.artifact_type} on ${validatedInput.story_id}. Resolved iteration: ${iteration}`,
    )
  }

  // --- Auto-inject iteration into content to eliminate drift ---
  const content = { ...validatedInput.content, iteration }

  const artifactName =
    validatedInput.artifact_name ?? generateArtifactName(validatedInput.artifact_type, iteration)

  // Check if artifact exists (using story_id + artifact_type + artifact_name + iteration)
  const existing = await db
    .select(artifactColumns)
    .from(storyArtifacts)
    .where(
      and(
        eq(storyArtifacts.storyId, validatedInput.story_id),
        eq(storyArtifacts.artifactType, validatedInput.artifact_type),
        sql`COALESCE(${storyArtifacts.artifactName}, '') = ${artifactName}`,
        sql`COALESCE(${storyArtifacts.iteration}, 0) = ${iteration}`,
      ),
    )
    .limit(1)

  if (existing.length === 0) {
    // Create new: insert detail row first, then jump table
    const { detailTable, detailId } = await insertDetailRow(
      db,
      validatedInput.artifact_type,
      content,
      validatedInput.story_id,
    )

    const result = await db
      .insert(storyArtifacts)
      .values({
        storyId: validatedInput.story_id,
        artifactType: validatedInput.artifact_type,
        artifactName,
        phase: validatedInput.phase ?? null,
        iteration,
        summary: validatedInput.summary ?? null,
        detailTable,
        detailId,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    logger.info('Artifact created', {
      storyId: validatedInput.story_id,
      artifactType: validatedInput.artifact_type,
      iteration,
      artifactId: result[0].id,
      detailTable,
      detailId,
    })

    return toArtifactResponse(result[0], content)
  }

  // Update existing: update detail row, then jump table
  const existingRow = existing[0]

  let resolvedDetailTable = existingRow.detailTable
  let resolvedDetailId = existingRow.detailId

  if (existingRow.detailTable && existingRow.detailId) {
    // Update existing detail row
    await updateDetailRow(
      db,
      existingRow.detailTable,
      existingRow.detailId,
      validatedInput.artifact_type,
      content,
      validatedInput.story_id,
    )
  } else {
    // Legacy row without detail table — create detail row
    const { detailTable, detailId } = await insertDetailRow(
      db,
      validatedInput.artifact_type,
      content,
      validatedInput.story_id,
    )
    resolvedDetailTable = detailTable
    resolvedDetailId = detailId
  }

  const result = await db
    .update(storyArtifacts)
    .set({
      artifactName,
      phase: validatedInput.phase ?? existingRow.phase,
      summary: validatedInput.summary ?? existingRow.summary,
      detailTable: resolvedDetailTable,
      detailId: resolvedDetailId,
      updatedAt: now,
    })
    .where(eq(storyArtifacts.id, existingRow.id))
    .returning()

  logger.info('Artifact updated', {
    storyId: validatedInput.story_id,
    artifactType: validatedInput.artifact_type,
    iteration,
    artifactId: result[0].id,
  })

  return toArtifactResponse(result[0], content)
}

/**
 * Read an artifact by story_id + artifact_type + optional artifact_name + optional iteration.
 *
 * Flow:
 * 1. Query jump table to find detail_table + detail_id
 * 2. Query detail table for full content
 * 3. Return merged result
 *
 * @param input - Story ID, artifact type, optional name, optional iteration
 * @param deps - Database dependency
 * @returns Artifact with content, or null if not found
 */
export async function kb_read_artifact(
  input: KbReadArtifactInput,
  deps: ArtifactOperationsDeps,
): Promise<ArtifactResponse | null> {
  const validatedInput = KbReadArtifactInputSchema.parse(input)
  const { db } = deps

  // Build query conditions
  const conditions = [
    eq(storyArtifacts.storyId, validatedInput.story_id),
    eq(storyArtifacts.artifactType, validatedInput.artifact_type),
  ]

  // If artifact_name specified, add it to conditions
  if (validatedInput.artifact_name) {
    conditions.push(eq(storyArtifacts.artifactName, validatedInput.artifact_name))
  }

  // If iteration specified, add it to conditions
  if (validatedInput.iteration !== undefined) {
    conditions.push(eq(storyArtifacts.iteration, validatedInput.iteration))
  }

  // Query jump table, ordered by iteration desc to get latest
  const result = await db
    .select(artifactColumns)
    .from(storyArtifacts)
    .where(and(...conditions))
    .orderBy(desc(storyArtifacts.iteration))
    .limit(1)

  if (result.length === 0) {
    logger.debug('Artifact not found', {
      storyId: validatedInput.story_id,
      artifactType: validatedInput.artifact_type,
      artifactName: validatedInput.artifact_name,
      iteration: validatedInput.iteration,
    })
    return null
  }

  const jumpRow = result[0]

  // Read content from detail table
  let content: Record<string, unknown> | null = null
  if (jumpRow.detailTable && jumpRow.detailId) {
    content = await readDetailRow(db, jumpRow.detailTable, jumpRow.detailId)
  }

  return toArtifactResponse(jumpRow, content)
}

/**
 * List artifacts for a story with optional filters.
 *
 * By default, content is excluded for performance. Set include_content=true
 * to include full artifact content (requires additional detail table queries).
 *
 * @param input - Story ID and optional filters
 * @param deps - Database dependency
 * @returns List of artifacts
 */
export async function kb_list_artifacts(
  input: KbListArtifactsInput,
  deps: ArtifactOperationsDeps,
): Promise<{ artifacts: ArtifactListItem[]; total: number }> {
  const validatedInput = KbListArtifactsInputSchema.parse(input)
  const { db } = deps

  // Build query conditions
  const conditions = [eq(storyArtifacts.storyId, validatedInput.story_id)]

  if (validatedInput.phase) {
    conditions.push(eq(storyArtifacts.phase, validatedInput.phase))
  }

  if (validatedInput.artifact_type) {
    conditions.push(eq(storyArtifacts.artifactType, validatedInput.artifact_type))
  }

  // Query jump table
  const result = await db
    .select(artifactColumns)
    .from(storyArtifacts)
    .where(and(...conditions))
    .orderBy(desc(storyArtifacts.createdAt))
    .limit(validatedInput.limit ?? 50)

  // If include_content, fetch content from detail tables
  const artifacts: ArtifactListItem[] = []
  for (const row of result) {
    let content: Record<string, unknown> | null = null
    if (validatedInput.include_content && row.detailTable && row.detailId) {
      content = await readDetailRow(db, row.detailTable, row.detailId)
    }
    artifacts.push(toArtifactListItem(row, validatedInput.include_content ?? false, content))
  }

  logger.debug('Artifacts listed', {
    storyId: validatedInput.story_id,
    count: artifacts.length,
    phase: validatedInput.phase,
    artifactType: validatedInput.artifact_type,
  })

  return {
    artifacts,
    total: artifacts.length,
  }
}

/**
 * Delete an artifact by ID.
 *
 * Deletes from both the type-specific table and the jump table.
 *
 * @param artifactId - UUID of the artifact to delete
 * @param deps - Database dependency
 * @returns True if deleted, false if not found
 */
export async function kb_delete_artifact(
  artifactId: string,
  deps: ArtifactOperationsDeps,
): Promise<boolean> {
  const { db } = deps

  // Read jump table row to get detail_table + detail_id
  const jumpRows = await db
    .select(artifactColumns)
    .from(storyArtifacts)
    .where(eq(storyArtifacts.id, artifactId))
    .limit(1)

  if (jumpRows.length === 0) {
    return false
  }

  const jumpRow = jumpRows[0]

  // Delete from detail table first
  if (jumpRow.detailTable && jumpRow.detailId) {
    await deleteDetailRow(db, jumpRow.detailTable, jumpRow.detailId)
  }

  // Delete from jump table
  const result = await db
    .delete(storyArtifacts)
    .where(eq(storyArtifacts.id, artifactId))
    .returning()

  if (result.length === 0) {
    return false
  }

  logger.info('Artifact deleted', {
    artifactId,
    storyId: result[0].storyId,
    artifactType: result[0].artifactType,
    detailTable: jumpRow.detailTable,
    detailId: jumpRow.detailId,
  })

  return true
}

// ============================================================================
// Dual-Write Tool (artifact_write)
// ============================================================================

/**
 * Canonical filename mapping for artifact types.
 * Maps artifact_type → YAML filename (without extension).
 */
const ARTIFACT_FILENAMES: Record<string, string> = {
  checkpoint: 'CHECKPOINT',
  scope: 'SCOPE',
  plan: 'PLAN',
  evidence: 'EVIDENCE',
  verification: 'VERIFICATION',
  analysis: 'ANALYSIS',
  context: 'AGENT-CONTEXT',
  fix_summary: 'FIX-SUMMARY',
  proof: 'PROOF',
  elaboration: 'ELABORATION',
  review: 'REVIEW',
  qa_gate: 'QA-GATE',
  completion_report: 'COMPLETION-REPORT',
}

/**
 * Compute canonical filesystem path for an artifact.
 *
 * Formula: {story_dir}/_implementation/{FILENAME}.yaml
 * For iteration > 0: {story_dir}/_implementation/{FILENAME}.iter{N}.yaml
 *
 * @param storyDir - Root directory for the story
 * @param artifactType - Artifact type (e.g., 'checkpoint')
 * @param iteration - Iteration number (0 = default, no suffix)
 * @returns Absolute path to the YAML file
 */
export function computeArtifactPath(
  storyDir: string,
  artifactType: string,
  iteration: number,
): string {
  const filename = ARTIFACT_FILENAMES[artifactType] ?? artifactType.toUpperCase()
  const suffix = iteration > 0 ? `.iter${iteration}` : ''
  return `${storyDir}/_implementation/${filename}${suffix}.yaml`
}

/**
 * Input schema for the `artifact_write` dual-write tool.
 *
 * Writes a YAML artifact to the filesystem AND optionally indexes it in the KB.
 * KB write failure does NOT prevent the file write from succeeding.
 */
export const ArtifactWriteInputSchema = z.object({
  /** Story ID this artifact belongs to (e.g., 'KBAR-0110') */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Type of artifact */
  artifact_type: ArtifactTypeSchema,

  /** Full artifact content as a JSON object (will be serialized to YAML) */
  content: z.record(z.unknown()),

  /** Story root directory (absolute path). Required for filesystem write. */
  story_dir: z.string().min(1, 'story_dir cannot be empty'),

  /** Implementation phase this artifact belongs to */
  phase: StoryPhaseSchema.nullable().optional(),

  /** Iteration number for fix cycles (default: 0) */
  iteration: z.number().int().min(0).optional().default(0),

  /** Whether to also write to KB database (default: true) */
  write_to_kb: z.boolean().optional().default(true),

  /** Explicit summary override. When provided, takes precedence over auto-extracted summary. */
  summary: z.record(z.unknown()).optional(),

  /** When true, auto-assign next iteration number via KB. Requires write_to_kb=true. Default: false. */
  auto_increment: z.boolean().optional(),

  /** Maximum allowed iteration. Rejects writes when resolved iteration >= max_iterations. */
  max_iterations: z.number().int().min(1).optional(),
})

export type ArtifactWriteInput = z.infer<typeof ArtifactWriteInputSchema>

/**
 * Result of an `artifact_write` operation.
 */
export const ArtifactWriteResultSchema = z.object({
  /** Whether the filesystem write succeeded */
  file_written: z.boolean(),

  /** Absolute path to the written file */
  file_path: z.string(),

  /** Whether the KB write succeeded (null if not attempted) */
  kb_written: z.boolean().nullable(),

  /** DB artifact ID (null if KB write was not attempted or failed) */
  kb_artifact_id: z.string().nullable(),

  /** Error message from KB write (null if succeeded or not attempted) */
  kb_error: z.string().nullable(),
})

export type ArtifactWriteResult = z.infer<typeof ArtifactWriteResultSchema>

/**
 * Write a workflow artifact to the filesystem and optionally to the KB.
 *
 * The filesystem write is the primary operation. KB write is best-effort:
 * if it fails, the error is logged and the result notes the failure,
 * but the overall operation still returns success.
 *
 * @param input - Artifact data including story_dir for filesystem path
 * @param deps - Database dependency for KB write
 * @returns Write result with file and KB status
 */
/**
 * Optional injectable KB write function (for testing).
 * Defaults to the module-level kb_write_artifact.
 */
export type KbWriteFn = typeof kb_write_artifact

export async function artifact_write(
  input: ArtifactWriteInput,
  deps: ArtifactOperationsDeps,
  kbWriteFn: KbWriteFn = kb_write_artifact,
): Promise<ArtifactWriteResult> {
  const validatedInput = ArtifactWriteInputSchema.parse(input)
  const useAutoIncrement = validatedInput.auto_increment ?? false

  // Artifact types that gate state transitions — KB write is mandatory for these.
  const GATED_ARTIFACT_TYPES = new Set(['elaboration', 'proof', 'review', 'qa_gate'])
  const isGated = GATED_ARTIFACT_TYPES.has(validatedInput.artifact_type)

  // Auto-extract summary; caller-provided summary takes precedence (AC-5, AC-6)
  const resolvedSummary =
    validatedInput.summary ??
    extractArtifactSummary(validatedInput.artifact_type, validatedInput.content)

  let kbWritten: boolean | null = null
  let kbArtifactId: string | null = null
  let kbError: string | null = null
  let resolvedIteration = validatedInput.iteration ?? 0

  // When auto_increment is true, do KB write FIRST to resolve the iteration,
  // then use the resolved iteration for the filesystem path.
  if (useAutoIncrement && validatedInput.write_to_kb) {
    try {
      const result = await kbWriteFn(
        {
          story_id: validatedInput.story_id,
          artifact_type: validatedInput.artifact_type,
          content: validatedInput.content,
          phase: validatedInput.phase ?? null,
          auto_increment: true,
          max_iterations: validatedInput.max_iterations,
          summary: resolvedSummary,
        },
        deps,
      )
      kbWritten = true
      kbArtifactId = result.id
      resolvedIteration = result.iteration ?? 0

      logger.info('artifact_write: KB write succeeded (auto_increment)', {
        storyId: validatedInput.story_id,
        artifactType: validatedInput.artifact_type,
        iteration: resolvedIteration,
        artifactId: result.id,
      })
    } catch (err) {
      kbWritten = false
      kbError = err instanceof Error ? err.message : String(err)

      if (isGated) {
        logger.error('artifact_write: KB write failed for gated artifact type (blocking)', {
          storyId: validatedInput.story_id,
          artifactType: validatedInput.artifact_type,
          error: kbError,
        })
        throw new Error(
          `KB write required for gated artifact type '${validatedInput.artifact_type}': ${kbError}`,
        )
      }

      logger.warn('artifact_write: KB write failed (non-blocking, auto_increment)', {
        storyId: validatedInput.story_id,
        artifactType: validatedInput.artifact_type,
        error: kbError,
      })
    }
  }

  const filePath = computeArtifactPath(
    validatedInput.story_dir,
    validatedInput.artifact_type,
    resolvedIteration,
  )

  // ---- Filesystem write (primary, must succeed) ----
  const yaml = await import('js-yaml')
  const fs = await import('fs/promises')
  const path = await import('path')

  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })

  const yamlContent = yaml.dump(validatedInput.content, { lineWidth: 120, noRefs: true })
  await fs.writeFile(filePath, yamlContent, 'utf-8')

  logger.info('artifact_write: file written', {
    storyId: validatedInput.story_id,
    artifactType: validatedInput.artifact_type,
    iteration: resolvedIteration,
    filePath,
  })

  // ---- KB write for non-auto_increment path (original behavior) ----
  if (!useAutoIncrement && validatedInput.write_to_kb) {
    try {
      const result = await kbWriteFn(
        {
          story_id: validatedInput.story_id,
          artifact_type: validatedInput.artifact_type,
          content: validatedInput.content,
          phase: validatedInput.phase ?? null,
          iteration: resolvedIteration,
          max_iterations: validatedInput.max_iterations,
          summary: resolvedSummary,
        },
        deps,
      )
      kbWritten = true
      kbArtifactId = result.id

      logger.info('artifact_write: KB write succeeded', {
        storyId: validatedInput.story_id,
        artifactType: validatedInput.artifact_type,
        iteration: resolvedIteration,
        artifactId: result.id,
      })
    } catch (err) {
      kbWritten = false
      kbError = err instanceof Error ? err.message : String(err)

      if (isGated) {
        logger.error('artifact_write: KB write failed for gated artifact type (blocking)', {
          storyId: validatedInput.story_id,
          artifactType: validatedInput.artifact_type,
          iteration: resolvedIteration,
          error: kbError,
        })
        throw new Error(
          `KB write required for gated artifact type '${validatedInput.artifact_type}': ${kbError}`,
        )
      }

      logger.warn('artifact_write: KB write failed (non-blocking)', {
        storyId: validatedInput.story_id,
        artifactType: validatedInput.artifact_type,
        iteration: resolvedIteration,
        error: kbError,
      })
    }
  }

  return {
    file_written: true,
    file_path: filePath,
    kb_written: kbWritten,
    kb_artifact_id: kbArtifactId,
    kb_error: kbError,
  }
}
