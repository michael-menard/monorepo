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
