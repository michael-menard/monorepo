/**
 * CLI Options Schemas for KBAR Sync CLI Commands
 * KBAR-0050: AC-8
 *
 * Zod schemas for all CLI flag types for sync:story and sync:epic commands.
 * All types are inferred from Zod schemas (no TypeScript interfaces).
 */

import { z } from 'zod'
import { NonStoryArtifactTypeSchema } from '../../src/__types__/index.js'

// ============================================================================
// sync:story CLI Options
// ============================================================================

/**
 * Schema for sync:story CLI flags.
 *
 * Required flags:
 *   --story-id <id>       Story identifier (e.g., "KBAR-0050")
 *   --story-dir <path>    Absolute path to story directory
 *
 * Optional flags:
 *   --dry-run             Compare checksums without writing to DB (exit 0 = up-to-date, 1 = would sync)
 *   --verbose             Enable verbose logging
 *   --force               Skip conflict check; proceed even if conflict detected
 *   --artifacts           Sync all artifacts for the story (calls batchSyncArtifactsForStory)
 *   --artifact-file <p>   Path to a specific artifact file (used with --artifact-type)
 *   --artifact-type <t>   Artifact type for single artifact sync
 *   --check-conflicts     Detect conflicts; exit 1 if conflict found
 *   --from-db             Sync from database back to filesystem (reverse direction)
 */
export const SyncStoryCLIOptionsSchema = z.object({
  storyId: z.string().min(1, 'storyId is required'),
  storyDir: z.string().min(1, 'storyDir is required'),
  dryRun: z.boolean().default(false),
  verbose: z.boolean().default(false),
  force: z.boolean().default(false),
  artifacts: z.boolean().default(false),
  artifactFile: z.string().optional(),
  artifactType: NonStoryArtifactTypeSchema.optional(),
  checkConflicts: z.boolean().default(false),
  fromDb: z.boolean().default(false),
})

export type SyncStoryCLIOptions = z.infer<typeof SyncStoryCLIOptionsSchema>

// ============================================================================
// sync:epic CLI Options
// ============================================================================

/**
 * Schema for sync:epic CLI flags.
 *
 * Required flags:
 *   --base-dir <path>     Base directory to scan for story directories
 *
 * Optional flags:
 *   --epic <prefix>       Filter to stories matching this epic prefix (e.g., "KBAR")
 *   --dry-run             Compare checksums without writing to DB (single batch query)
 *   --verbose             Enable verbose logging
 *   --force               Skip conflict checks; proceed even if conflicts detected
 *   --artifact-type <t>   Cross-story artifact type sync (calls batchSyncByType)
 *   --checkpoint <name>   Checkpoint name for resumable batch operations
 */
export const SyncEpicCLIOptionsSchema = z.object({
  baseDir: z.string().min(1, 'baseDir is required'),
  epic: z.string().optional(),
  dryRun: z.boolean().default(false),
  verbose: z.boolean().default(false),
  force: z.boolean().default(false),
  artifactType: NonStoryArtifactTypeSchema.optional(),
  checkpoint: z.string().optional(),
})

export type SyncEpicCLIOptions = z.infer<typeof SyncEpicCLIOptionsSchema>

// ============================================================================
// regenerate:index CLI Options
// ============================================================================

/**
 * Schema for regenerate:index CLI flags.
 * KBAR-0240
 *
 * Required flags:
 *   --epic <name>         Epic name to generate the stories index for
 *
 * Optional flags:
 *   --output <path>       File path to write the generated index to
 *   --dry-run             Print result to stdout; exit 0 if matches existing, 1 if differs
 *   --verbose             Enable verbose logging
 *   --force               Skip staleness check; regenerate unconditionally
 */
export const RegenerateIndexCLIOptionsSchema = z.object({
  epic: z.string().min(1, 'epic is required'),
  output: z.string().optional(),
  dryRun: z.boolean().default(false),
  verbose: z.boolean().default(false),
  force: z.boolean().default(false),
})

export type RegenerateIndexCLIOptions = z.infer<typeof RegenerateIndexCLIOptionsSchema>
