/**
 * Artifact Operations for DB-First Artifact Storage
 *
 * Operations for reading and writing workflow artifacts (CHECKPOINT.yaml,
 * EVIDENCE.yaml, REVIEW.yaml, etc.) directly to the database.
 *
 * This eliminates file-based storage and enables:
 * - Semantic search across all artifacts
 * - Centralized artifact history and versioning
 * - Agents don't need to know file paths
 *
 * @see plans/future/db-first-artifact-storage/PLAN.md
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, and, desc } from 'drizzle-orm'
import { z } from 'zod'
import { storyArtifacts } from '../db/schema.js'
import type * as schema from '../db/schema.js'
import { ArtifactTypeSchema, StoryPhaseSchema } from '../__types__/index.js'

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

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for kb_write_artifact input.
 *
 * Creates or updates an artifact for a story. Uses upsert behavior based on
 * story_id + artifact_type + iteration.
 */
export const KbWriteArtifactInputSchema = z.object({
  /** Story ID this artifact belongs to (e.g., 'WISH-2045') */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Type of artifact */
  artifact_type: ArtifactTypeSchema,

  /** Full artifact content as JSONB */
  content: z.record(z.unknown()),

  /** Implementation phase this artifact belongs to */
  phase: StoryPhaseSchema.optional().nullable(),

  /** Iteration number for fix cycles (default: 0) */
  iteration: z.number().int().min(0).optional().default(0),

  /** Human-readable name for the artifact (auto-generated if not provided) */
  artifact_name: z.string().optional().nullable(),

  /** JSONB summary for quick access (subset of content) */
  summary: z.record(z.unknown()).optional().nullable(),
})

export type KbWriteArtifactInput = z.infer<typeof KbWriteArtifactInputSchema>

/**
 * Schema for kb_read_artifact input.
 *
 * Reads an artifact by story_id + artifact_type + optional iteration.
 */
export const KbReadArtifactInputSchema = z.object({
  /** Story ID to read artifact for */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Type of artifact to read */
  artifact_type: ArtifactTypeSchema,

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
  phase: StoryPhaseSchema.optional().nullable(),

  /** Filter by artifact type */
  artifact_type: ArtifactTypeSchema.optional().nullable(),

  /** Include content in response (default: false for performance) */
  include_content: z.boolean().optional().default(false),

  /** Maximum results (default: 50) */
  limit: z.number().int().min(1).max(100).optional().default(50),
})

export type KbListArtifactsInput = z.infer<typeof KbListArtifactsInputSchema>

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

/**
 * Convert DB artifact to API response format.
 */
function toArtifactResponse(artifact: schema.StoryArtifact): ArtifactResponse {
  return {
    id: artifact.id,
    story_id: artifact.storyId,
    artifact_type: artifact.artifactType,
    artifact_name: artifact.artifactName,
    phase: artifact.phase,
    iteration: artifact.iteration,
    content: artifact.content as Record<string, unknown> | null,
    summary: artifact.summary as Record<string, unknown> | null,
    created_at: artifact.createdAt,
    updated_at: artifact.updatedAt,
  }
}

/**
 * Convert DB artifact to list item format.
 */
function toArtifactListItem(
  artifact: schema.StoryArtifact,
  includeContent: boolean,
): ArtifactListItem {
  const item: ArtifactListItem = {
    id: artifact.id,
    story_id: artifact.storyId,
    artifact_type: artifact.artifactType,
    artifact_name: artifact.artifactName,
    phase: artifact.phase,
    iteration: artifact.iteration,
    summary: artifact.summary as Record<string, unknown> | null,
    created_at: artifact.createdAt,
    updated_at: artifact.updatedAt,
  }

  if (includeContent) {
    item.content = artifact.content as Record<string, unknown> | null
  }

  return item
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
  }

  const baseName = typeNames[artifactType] ?? artifactType.toUpperCase()
  return iteration > 0 ? `${baseName} (iteration ${iteration})` : baseName
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Write (create or update) an artifact for a story.
 *
 * Uses upsert behavior: if artifact with same story_id + artifact_type + iteration
 * exists, it will be updated. Otherwise, a new artifact is created.
 *
 * @param input - Artifact data
 * @param deps - Database dependency
 * @returns Created/updated artifact
 */
export async function kb_write_artifact(
  input: KbWriteArtifactInput,
  deps: ArtifactOperationsDeps,
): Promise<ArtifactResponse> {
  const validatedInput = KbWriteArtifactInputSchema.parse(input)
  const { db } = deps

  const now = new Date()
  const iteration = validatedInput.iteration ?? 0

  // Check if artifact exists (using story_id + artifact_type + iteration)
  const existing = await db
    .select()
    .from(storyArtifacts)
    .where(
      and(
        eq(storyArtifacts.storyId, validatedInput.story_id),
        eq(storyArtifacts.artifactType, validatedInput.artifact_type),
        eq(storyArtifacts.iteration, iteration),
      ),
    )
    .limit(1)

  const artifactName =
    validatedInput.artifact_name ?? generateArtifactName(validatedInput.artifact_type, iteration)

  if (existing.length === 0) {
    // Create new artifact
    const result = await db
      .insert(storyArtifacts)
      .values({
        storyId: validatedInput.story_id,
        artifactType: validatedInput.artifact_type,
        artifactName,
        content: validatedInput.content,
        phase: validatedInput.phase ?? null,
        iteration,
        summary: validatedInput.summary ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    logger.info('Artifact created', {
      storyId: validatedInput.story_id,
      artifactType: validatedInput.artifact_type,
      iteration,
      artifactId: result[0].id,
    })

    return toArtifactResponse(result[0])
  }

  // Update existing artifact
  const result = await db
    .update(storyArtifacts)
    .set({
      content: validatedInput.content,
      artifactName,
      phase: validatedInput.phase ?? existing[0].phase,
      summary: validatedInput.summary ?? existing[0].summary,
      updatedAt: now,
    })
    .where(eq(storyArtifacts.id, existing[0].id))
    .returning()

  logger.info('Artifact updated', {
    storyId: validatedInput.story_id,
    artifactType: validatedInput.artifact_type,
    iteration,
    artifactId: result[0].id,
  })

  return toArtifactResponse(result[0])
}

/**
 * Read an artifact by story_id + artifact_type + optional iteration.
 *
 * If iteration is not specified, returns the artifact with iteration 0
 * (or the latest if multiple exist).
 *
 * @param input - Story ID and artifact type
 * @param deps - Database dependency
 * @returns Artifact or null if not found
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

  // If iteration specified, add it to conditions
  if (validatedInput.iteration !== undefined) {
    conditions.push(eq(storyArtifacts.iteration, validatedInput.iteration))
  }

  // Query with optional iteration filter, ordered by iteration desc to get latest
  const result = await db
    .select()
    .from(storyArtifacts)
    .where(and(...conditions))
    .orderBy(desc(storyArtifacts.iteration))
    .limit(1)

  if (result.length === 0) {
    logger.debug('Artifact not found', {
      storyId: validatedInput.story_id,
      artifactType: validatedInput.artifact_type,
      iteration: validatedInput.iteration,
    })
    return null
  }

  return toArtifactResponse(result[0])
}

/**
 * List artifacts for a story with optional filters.
 *
 * By default, content is excluded for performance. Set include_content=true
 * to include full artifact content.
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

  // Query artifacts
  const result = await db
    .select()
    .from(storyArtifacts)
    .where(and(...conditions))
    .orderBy(desc(storyArtifacts.createdAt))
    .limit(validatedInput.limit ?? 50)

  const artifacts = result.map(a => toArtifactListItem(a, validatedInput.include_content ?? false))

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
 * Used for cleanup or when an artifact is no longer needed.
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
  })

  return true
}
