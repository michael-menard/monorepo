/**
 * Zod Schemas for KBAR Sync Functions
 * KBAR-0030: KBAR sync service
 *
 * All sync function inputs and outputs use Zod-first approach.
 * No TypeScript interfaces - all types inferred from Zod schemas.
 */

import { createHash } from 'node:crypto'
import path from 'node:path'
import { lstat } from 'node:fs/promises'
import { z } from 'zod'

// ============================================================================
// Sync Story To Database - AC-1
// ============================================================================

/**
 * Input schema for syncStoryToDatabase
 * Syncs a story file from filesystem to database
 */
export const SyncStoryToDatabaseInputSchema = z.object({
  storyId: z.string().min(1, 'storyId is required'), // e.g., "KBAR-0030"
  filePath: z.string().min(1, 'filePath is required'), // Absolute path to story YAML file
  triggeredBy: z.enum(['user', 'agent', 'automation']).default('user'),
})

export type SyncStoryToDatabaseInput = z.infer<typeof SyncStoryToDatabaseInputSchema>

/**
 * Output schema for syncStoryToDatabase
 */
export const SyncStoryToDatabaseOutputSchema = z.object({
  success: z.boolean(),
  storyId: z.string(),
  checksum: z.string().optional(), // SHA-256 hash of file content
  syncStatus: z.enum(['completed', 'failed', 'skipped']),
  message: z.string().optional(),
  syncEventId: z.string().uuid().optional(), // UUID of created sync event
  error: z.string().optional(),
  skipped: z.boolean().optional(), // True if checksum unchanged (idempotency)
})

export type SyncStoryToDatabaseOutput = z.infer<typeof SyncStoryToDatabaseOutputSchema>

// ============================================================================
// Sync Story From Database - AC-2
// ============================================================================

/**
 * Input schema for syncStoryFromDatabase
 * Syncs a story from database back to filesystem
 */
export const SyncStoryFromDatabaseInputSchema = z.object({
  storyId: z.string().min(1, 'storyId is required'),
  outputPath: z.string().min(1, 'outputPath is required'), // Absolute path where to write file
  triggeredBy: z.enum(['user', 'agent', 'automation']).default('user'),
})

export type SyncStoryFromDatabaseInput = z.infer<typeof SyncStoryFromDatabaseInputSchema>

/**
 * Output schema for syncStoryFromDatabase
 */
export const SyncStoryFromDatabaseOutputSchema = z.object({
  success: z.boolean(),
  storyId: z.string(),
  filePath: z.string().optional(), // Path where file was written
  syncStatus: z.enum(['completed', 'failed']),
  message: z.string().optional(),
  syncEventId: z.string().uuid().optional(),
  error: z.string().optional(),
})

export type SyncStoryFromDatabaseOutput = z.infer<typeof SyncStoryFromDatabaseOutputSchema>

// ============================================================================
// Detect Sync Conflicts - AC-3
// ============================================================================

/**
 * Input schema for detectSyncConflicts
 * Detects conflicts when both filesystem and database changed
 */
export const DetectSyncConflictsInputSchema = z.object({
  storyId: z.string().min(1, 'storyId is required'),
  filePath: z.string().min(1, 'filePath is required'),
})

export type DetectSyncConflictsInput = z.infer<typeof DetectSyncConflictsInputSchema>

/**
 * Conflict resolution options
 */
export const ConflictResolutionSchema = z.enum([
  'filesystem_wins',
  'database_wins',
  'manual',
  'merged',
  'deferred',
])

export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>

/**
 * Output schema for detectSyncConflicts
 */
export const DetectSyncConflictsOutputSchema = z.object({
  success: z.boolean(),
  storyId: z.string(),
  hasConflict: z.boolean(),
  conflictType: z.enum(['checksum_mismatch', 'missing_file', 'schema_error', 'none']),
  filesystemChecksum: z.string().optional(),
  databaseChecksum: z.string().optional(),
  filesystemUpdatedAt: z.date().optional(),
  databaseUpdatedAt: z.date().optional(),
  conflictId: z.string().uuid().optional(), // UUID of created sync conflict record
  resolutionOptions: z.array(ConflictResolutionSchema).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
})

export type DetectSyncConflictsOutput = z.infer<typeof DetectSyncConflictsOutputSchema>

// ============================================================================
// Internal Helper Schemas
// ============================================================================

/**
 * Story frontmatter schema (parsed from YAML)
 * Represents the structure of KBAR story YAML files
 */
export const StoryFrontmatterSchema = z.object({
  schema: z.number().optional(),
  story_id: z.string(),
  epic: z.string(),
  title: z.string(),
  description: z.string().optional(),
  story_type: z.string(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).default('P2'),
  complexity: z.string().optional(),
  story_points: z.number().optional(),
  current_phase: z.enum(['setup', 'plan', 'execute', 'review', 'qa', 'done']).default('setup'),
  status: z.string().default('backlog'),
  metadata: z
    .object({
      surfaces: z
        .object({
          backend: z.boolean().optional(),
          frontend: z.boolean().optional(),
          database: z.boolean().optional(),
          infra: z.boolean().optional(),
        })
        .optional(),
      tags: z.array(z.string()).optional(),
      wave: z.number().optional(),
      blocked_by: z.array(z.string()).optional(),
      blocks: z.array(z.string()).optional(),
      feature_dir: z.string().optional(),
    })
    .optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type StoryFrontmatter = z.infer<typeof StoryFrontmatterSchema>

/**
 * Database client schema for dependency injection
 * Minimal schema to allow testing with mocks
 * TS-002 fix: Converted from TypeScript interface to Zod schema per CLAUDE.md zod-first-types rule
 *
 * Note: The query method uses unknown[] for row results since the generic parameter T
 * cannot be represented in a Zod schema at runtime.
 */
export const DbClientSchema = z.object({
  query: z
    .function()
    .args(z.string(), z.array(z.unknown()).optional())
    .returns(z.promise(z.object({ rows: z.array(z.unknown()), rowCount: z.number() }))),
})

export type DbClient = z.infer<typeof DbClientSchema>

// ============================================================================
// Utility Functions (Extracted for DRY)
// ============================================================================

/**
 * Minimal logger schema for validation helper
 * TS-003 fix: Converted from TypeScript interface to Zod schema per CLAUDE.md zod-first-types rule
 */
const SimpleLoggerSchema = z.object({
  error: z.function().args(z.string(), z.record(z.unknown()).optional()).returns(z.void()),
  info: z.function().args(z.string(), z.record(z.unknown()).optional()).returns(z.void()),
  warn: z.function().args(z.string(), z.record(z.unknown()).optional()).returns(z.void()),
})

type SimpleLogger = z.infer<typeof SimpleLoggerSchema>

/**
 * Compute SHA-256 checksum for file content
 * QUAL-001 fix: Extracted from duplicate definitions in sync functions
 * Uses Node.js built-in crypto module (no external dependency)
 *
 * DEBT-RU-001: This SHA-256 implementation is similar to generateConfigHash() in
 * @repo/orchestrator/src/providers/base.ts. The orchestrator version does not export a
 * standalone computeChecksum() function, so this local implementation is intentionally
 * kept here. A shared @repo/crypto or @repo/backend-utils package should consolidate
 * these in a future refactor.
 */
export function computeChecksum(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

/**
 * Validate file path to prevent directory traversal attacks
 * SEC-001 fix: Path traversal vulnerability protection
 *
 * @param filePath - Path to validate
 * @param baseDir - Base directory that filePath must resolve within
 * @returns true if path is safe, false otherwise
 * @throws Error with details if path is unsafe
 */
export function validateFilePath(filePath: string, baseDir: string): boolean {
  // Resolve both paths to absolute paths
  const resolvedBase = path.resolve(baseDir)
  const resolvedPath = path.resolve(filePath)

  // Use path.relative to check if resolvedPath is within resolvedBase
  const relativePath = path.relative(resolvedBase, resolvedPath)

  // If relative path starts with '..' or is absolute, it's outside baseDir
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Path traversal detected: ${filePath} is outside allowed directory ${baseDir}`)
  }

  return true
}

/**
 * Check if a path is a symbolic link
 * SEC-002 fix: Symlink attack vulnerability protection
 *
 * @param filePath - Path to check
 * @returns true if path exists and is a symlink, false otherwise
 * @throws Error if path is a symlink
 */
export async function validateNotSymlink(filePath: string): Promise<boolean> {
  try {
    const stats = await lstat(filePath)
    if (stats.isSymbolicLink()) {
      throw new Error(
        `Symlink detected: ${filePath} is a symbolic link, which is not allowed for security reasons`,
      )
    }
    return true
  } catch (error) {
    // If file doesn't exist (ENOENT), that's okay - we might be creating it
    // TS-001 fix: Use NodeJS.ErrnoException type narrowing instead of 'as any'
    if (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return true
    }
    throw error
  }
}

/**
 * Validate input using Zod schema with standardized error handling
 * QUAL-003 fix: Extracted from duplicate validation patterns
 *
 * DEBT-RU-002: This validateInput() pattern (Zod safeParse + error logging) is repeated
 * across 4+ backend packages: mcp-tools/session-management, database-schema, orchestrator,
 * and kbar-sync. No shared @repo/backend-utils package currently exists to consolidate this.
 * A future refactor should extract this to a shared package to eliminate duplication.
 *
 * @param schema - Zod schema to validate against
 * @param input - Input data to validate
 * @param logger - Logger instance for error logging
 * @returns Validated data if successful, null if validation fails
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  logger: SimpleLogger,
): T | null {
  const validationResult = schema.safeParse(input)
  if (!validationResult.success) {
    const errorMessage = validationResult.error.errors.map(e => e.message).join(', ')
    logger.error('Input validation failed', { error: errorMessage, input })
    return null
  }
  return validationResult.data
}

/**
 * Normalize optional field to undefined (never null)
 * QUAL-004 fix: Consistent optional field handling
 *
 * @param value - Value to normalize
 * @returns Value if truthy, undefined otherwise
 */
export function normalizeOptionalField<T>(value: T | null | undefined): T | undefined {
  return value || undefined
}

// ============================================================================
// KBAR-0040: Artifact Sync Types
// ============================================================================

/**
 * Non-story artifact type enum
 *
 * Maps kbar_artifact_type values that are NOT 'story_file'.
 * 'story_file' is excluded because it is synced by syncStoryToDatabase/syncStoryFromDatabase.
 *
 * NOTE: 'elaboration' (and other types) can appear multiple times per story — the
 * kbar.artifacts table uses a non-unique index (storyArtifactTypeIdx), NOT a
 * unique index on (storyId, artifactType). Multiple 'elaboration' rows per story
 * are intentional (e.g., STORY-SEED.md and DEV-FEASIBILITY.md both map to 'elaboration').
 */
export const NonStoryArtifactTypeSchema = z.enum([
  'elaboration',
  'plan',
  'scope',
  'evidence',
  'review',
  'test_plan',
  'decisions',
  'checkpoint',
  'knowledge_context',
])

export type NonStoryArtifactType = z.infer<typeof NonStoryArtifactTypeSchema>

/**
 * ARTIFACT_FILENAME_MAP — Static mapping of artifact filenames to artifact types.
 *
 * Maps known _implementation/ and _pm/ filenames to their canonical kbar_artifact_type.
 *
 * IMPORTANT NOTES (AC-10):
 * - 'story_file' is excluded — it is the story's own YAML/md file, handled separately.
 * - Both '_pm/STORY-SEED.md' and '_pm/DEV-FEASIBILITY.md' map to 'elaboration' because
 *   both describe the story's elaboration phase. kbar.artifacts does NOT enforce uniqueness
 *   on (storyId, artifactType), so multiple 'elaboration' rows are valid.
 * - PROOF-*.md files are NOT listed here — they are discovered by glob pattern in
 *   batchSyncArtifactsForStory and use 'evidence' type.
 * - All paths are relative to the story directory root.
 */
export const ARTIFACT_FILENAME_MAP: Record<string, NonStoryArtifactType> = {
  // _implementation/ artifacts
  '_implementation/PLAN.yaml': 'plan',
  '_implementation/SCOPE.yaml': 'scope',
  '_implementation/EVIDENCE.yaml': 'evidence',
  '_implementation/REVIEW.yaml': 'review',
  '_implementation/CHECKPOINT.yaml': 'checkpoint',
  '_implementation/KNOWLEDGE-CONTEXT.yaml': 'knowledge_context',
  '_implementation/DECISIONS.yaml': 'decisions',
  // _pm/ artifacts
  '_pm/STORY-SEED.md': 'elaboration',
  '_pm/DEV-FEASIBILITY.md': 'elaboration',
  '_pm/TEST-PLAN.md': 'test_plan',
}

// ============================================================================
// Sync Artifact To Database - AC-1, AC-3, AC-7
// ============================================================================

/**
 * Input schema for syncArtifactToDatabase
 * Syncs a non-story artifact from filesystem to database.
 *
 * syncStatus 'synced': Artifact sync uses 'synced' rather than 'completed' to distinguish
 * artifact sync events from story sync events ('completed'). This is intentional — artifact
 * sync is a lighter-weight operation and 'synced' better reflects its semantic. Per DECISIONS.yaml.
 */
export const SyncArtifactToDatabaseInputSchema = z.object({
  storyId: z.string().min(1, 'storyId is required'),
  artifactType: NonStoryArtifactTypeSchema,
  filePath: z.string().min(1, 'filePath is required'),
  triggeredBy: z.enum(['user', 'agent', 'automation']).default('user'),
})

export type SyncArtifactToDatabaseInput = z.infer<typeof SyncArtifactToDatabaseInputSchema>

/**
 * Output schema for syncArtifactToDatabase
 *
 * syncStatus values:
 * - 'synced': artifact was written to DB for the first time or content changed
 * - 'skipped': checksum unchanged, no DB write needed (idempotency)
 * - 'failed': operation failed, see error field
 *
 * NOTE: 'synced' is intentionally different from story sync's 'completed' —
 * document this distinction per AC-10.
 */
export const SyncArtifactToDatabaseOutputSchema = z.object({
  success: z.boolean(),
  storyId: z.string(),
  artifactType: z.string(),
  checksum: z.string().optional(),
  syncStatus: z.enum(['synced', 'skipped', 'failed']),
  message: z.string().optional(),
  syncEventId: z.string().uuid().optional(),
  artifactId: z.string().uuid().optional(),
  error: z.string().optional(),
  skipped: z.boolean().optional(),
  sizeBytes: z.number().optional(),
})

export type SyncArtifactToDatabaseOutput = z.infer<typeof SyncArtifactToDatabaseOutputSchema>

// ============================================================================
// Sync Artifact From Database - AC-2, AC-3, AC-7
// ============================================================================

/**
 * Input schema for syncArtifactFromDatabase
 * Syncs a non-story artifact from database back to filesystem.
 */
export const SyncArtifactFromDatabaseInputSchema = z.object({
  storyId: z.string().min(1, 'storyId is required'),
  artifactType: NonStoryArtifactTypeSchema,
  outputPath: z.string().min(1, 'outputPath is required'),
  triggeredBy: z.enum(['user', 'agent', 'automation']).default('user'),
})

export type SyncArtifactFromDatabaseInput = z.infer<typeof SyncArtifactFromDatabaseInputSchema>

/**
 * Output schema for syncArtifactFromDatabase
 */
export const SyncArtifactFromDatabaseOutputSchema = z.object({
  success: z.boolean(),
  storyId: z.string(),
  artifactType: z.string(),
  filePath: z.string().optional(),
  syncStatus: z.enum(['synced', 'failed']),
  message: z.string().optional(),
  syncEventId: z.string().uuid().optional(),
  cacheHit: z.boolean().optional(),
  error: z.string().optional(),
})

export type SyncArtifactFromDatabaseOutput = z.infer<typeof SyncArtifactFromDatabaseOutputSchema>

// ============================================================================
// Batch Sync Artifacts For Story - AC-4, AC-7
// ============================================================================

/**
 * Input schema for batchSyncArtifactsForStory
 * Discovers and syncs all known artifacts for a story.
 */
export const BatchSyncArtifactsInputSchema = z.object({
  storyId: z.string().min(1, 'storyId is required'),
  storyDir: z.string().min(1, 'storyDir is required'),
  triggeredBy: z.enum(['user', 'agent', 'automation']).default('user'),
})

export type BatchSyncArtifactsInput = z.infer<typeof BatchSyncArtifactsInputSchema>

/**
 * Per-artifact result in batch sync
 */
export const ArtifactSyncResultSchema = z.object({
  filePath: z.string(),
  artifactType: z.string(),
  status: z.enum(['synced', 'skipped', 'failed']),
  error: z.string().optional(),
})

export type ArtifactSyncResult = z.infer<typeof ArtifactSyncResultSchema>

/**
 * Output schema for batchSyncArtifactsForStory
 */
export const BatchSyncArtifactsOutputSchema = z.object({
  success: z.boolean(),
  storyId: z.string(),
  syncEventId: z.string().uuid().optional(),
  totalDiscovered: z.number(),
  totalSynced: z.number(),
  totalSkipped: z.number(),
  totalFailed: z.number(),
  results: z.array(ArtifactSyncResultSchema),
  error: z.string().optional(),
})

export type BatchSyncArtifactsOutput = z.infer<typeof BatchSyncArtifactsOutputSchema>

// ============================================================================
// Batch Sync By Type - AC-5, AC-7, AC-10
// ============================================================================

/**
 * Input schema for batchSyncByType
 * Cross-story sync of all artifacts of a given type.
 *
 * NOTE: batchSyncByType intentionally omits conflictsDetected in its output.
 * AC-5 does not specify conflict detection for cross-story batch operations.
 * Conflict detection is handled separately by detectArtifactConflicts.
 */
export const BatchSyncByTypeInputSchema = z.object({
  artifactType: NonStoryArtifactTypeSchema,
  baseDir: z.string().min(1, 'baseDir is required'),
  triggeredBy: z.enum(['user', 'agent', 'automation']).default('user'),
  /**
   * Checkpoint name for resumption (AC-5, AC-10).
   * syncCheckpoints record is keyed by checkpointName.
   * If provided, batch will resume from lastProcessedPath recorded in DB.
   */
  checkpointName: z.string().optional(),
})

export type BatchSyncByTypeInput = z.infer<typeof BatchSyncByTypeInputSchema>

/**
 * Output schema for batchSyncByType
 *
 * NOTE: conflictsDetected field is intentionally OMITTED — see AC-10 note above.
 */
export const BatchSyncByTypeOutputSchema = z.object({
  success: z.boolean(),
  artifactType: z.string(),
  checkpointName: z.string().optional(),
  totalDiscovered: z.number(),
  totalSynced: z.number(),
  totalSkipped: z.number(),
  totalFailed: z.number(),
  lastProcessedPath: z.string().optional(),
  results: z.array(ArtifactSyncResultSchema),
  error: z.string().optional(),
})

export type BatchSyncByTypeOutput = z.infer<typeof BatchSyncByTypeOutputSchema>

// ============================================================================
// Detect Artifact Conflicts - AC-6, AC-7
// ============================================================================

/**
 * Input schema for detectArtifactConflicts
 * Compares filesystem checksum with database checksum for a non-story artifact.
 */
export const DetectArtifactConflictsInputSchema = z.object({
  storyId: z.string().min(1, 'storyId is required'),
  artifactType: NonStoryArtifactTypeSchema,
  filePath: z.string().min(1, 'filePath is required'),
})

export type DetectArtifactConflictsInput = z.infer<typeof DetectArtifactConflictsInputSchema>

/**
 * Output schema for detectArtifactConflicts
 */
export const DetectArtifactConflictsOutputSchema = z.object({
  success: z.boolean(),
  storyId: z.string(),
  artifactType: z.string(),
  hasConflict: z.boolean(),
  conflictType: z.enum(['checksum_mismatch', 'missing_file', 'none']),
  filesystemChecksum: z.string().optional(),
  databaseChecksum: z.string().optional(),
  conflictId: z.string().uuid().optional(),
  resolutionOptions: z.array(ConflictResolutionSchema).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
})

export type DetectArtifactConflictsOutput = z.infer<typeof DetectArtifactConflictsOutputSchema>
