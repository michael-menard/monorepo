/**
 * Working Set Sync Operations (KBMEM-008)
 *
 * Syncs working-set.md file to/from the KB work_state table.
 *
 * @see plans/future/kb-memory-architecture/PLAN.md
 */

import { z } from 'zod'
import {
  kb_get_work_state,
  kb_update_work_state,
  type WorkStateOperationsDeps,
  type WorkStateResponse,
} from '../crud-operations/work-state-operations.js'
import { parseWorkingSetMd, generateWorkingSetMd, type WorkingSetConfig } from './generator.js'

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Schema for kb_sync_working_set input.
 */
export const KbSyncWorkingSetInputSchema = z.object({
  /** Story ID to sync */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Working set markdown content to sync TO the KB */
  content: z.string().optional(),

  /** Direction of sync: 'to_kb' (file → DB) or 'from_kb' (DB → file) */
  direction: z.enum(['to_kb', 'from_kb']).default('to_kb'),
})

export type KbSyncWorkingSetInput = z.infer<typeof KbSyncWorkingSetInputSchema>

/**
 * Result of sync operation.
 */
export interface SyncResult {
  success: boolean
  story_id: string
  direction: 'to_kb' | 'from_kb'
  /** Generated markdown content (for from_kb direction) */
  content?: string
  /** Summary of what was synced */
  summary: {
    constraints_count: number
    actions_count: number
    next_steps_count: number
    blockers_count: number
    kb_references_count: number
  }
  message: string
}

// ============================================================================
// Sync Operations
// ============================================================================

/**
 * Sync working set between file and KB.
 *
 * @param input - Sync input with content and direction
 * @param deps - Database dependency
 * @returns Sync result
 */
export async function kb_sync_working_set(
  input: KbSyncWorkingSetInput,
  deps: WorkStateOperationsDeps,
): Promise<SyncResult> {
  const validated = KbSyncWorkingSetInputSchema.parse(input)

  if (validated.direction === 'to_kb') {
    return syncToKb(validated.story_id, validated.content, deps)
  } else {
    return syncFromKb(validated.story_id, deps)
  }
}

/**
 * Sync working-set.md content TO the KB.
 *
 * Parses the markdown and updates the work_state table.
 */
async function syncToKb(
  storyId: string,
  content: string | undefined,
  deps: WorkStateOperationsDeps,
): Promise<SyncResult> {
  if (!content) {
    return {
      success: false,
      story_id: storyId,
      direction: 'to_kb',
      summary: {
        constraints_count: 0,
        actions_count: 0,
        next_steps_count: 0,
        blockers_count: 0,
        kb_references_count: 0,
      },
      message: 'No content provided for sync',
    }
  }

  // Parse the markdown content
  const parsed = parseWorkingSetMd(content)

  // Ensure story ID matches (or use the one from input)
  if (parsed.storyId && parsed.storyId !== storyId) {
    return {
      success: false,
      story_id: storyId,
      direction: 'to_kb',
      summary: {
        constraints_count: 0,
        actions_count: 0,
        next_steps_count: 0,
        blockers_count: 0,
        kb_references_count: 0,
      },
      message: `Story ID mismatch: input=${storyId}, file=${parsed.storyId}`,
    }
  }

  // Convert parsed data to update input format
  const updateInput = {
    story_id: storyId,
    branch: parsed.branch ?? undefined,
    phase: parsed.phase ?? undefined,
    constraints: parsed.constraints?.map(c => ({
      constraint: c.constraint,
      source: c.source,
      priority: c.priority,
    })),
    recent_actions: parsed.recentActions?.map(a => ({
      action: a.action,
      completed: a.completed,
      timestamp: a.timestamp,
    })),
    next_steps: parsed.nextSteps,
    blockers: parsed.blockers?.map(b => ({
      title: b.title,
      description: b.description,
      waitingOn: b.waitingOn,
    })),
    kb_references: parsed.kbReferences?.reduce(
      (acc, ref) => {
        acc[ref.name] = ref.kbId
        return acc
      },
      {} as Record<string, string>,
    ),
  }

  // Update the KB
  await kb_update_work_state(updateInput, deps)

  return {
    success: true,
    story_id: storyId,
    direction: 'to_kb',
    summary: {
      constraints_count: parsed.constraints?.length ?? 0,
      actions_count: parsed.recentActions?.length ?? 0,
      next_steps_count: parsed.nextSteps?.length ?? 0,
      blockers_count: parsed.blockers?.length ?? 0,
      kb_references_count: parsed.kbReferences?.length ?? 0,
    },
    message: `Working set synced to KB for story ${storyId}`,
  }
}

/**
 * Sync work state FROM the KB to generate working-set.md content.
 */
async function syncFromKb(storyId: string, deps: WorkStateOperationsDeps): Promise<SyncResult> {
  // Get work state from KB
  const workState = await kb_get_work_state({ story_id: storyId }, deps)

  if (!workState) {
    return {
      success: false,
      story_id: storyId,
      direction: 'from_kb',
      summary: {
        constraints_count: 0,
        actions_count: 0,
        next_steps_count: 0,
        blockers_count: 0,
        kb_references_count: 0,
      },
      message: `No work state found for story ${storyId}`,
    }
  }

  // Convert work state to working set config
  const config: WorkingSetConfig = workStateToConfig(workState)

  // Generate markdown
  const content = generateWorkingSetMd(config)

  return {
    success: true,
    story_id: storyId,
    direction: 'from_kb',
    content,
    summary: {
      constraints_count: config.constraints?.length ?? 0,
      actions_count: config.recentActions?.length ?? 0,
      next_steps_count: config.nextSteps?.length ?? 0,
      blockers_count: config.blockers?.length ?? 0,
      kb_references_count: config.kbReferences?.length ?? 0,
    },
    message: `Working set generated from KB for story ${storyId}`,
  }
}

/**
 * Convert WorkStateResponse to WorkingSetConfig.
 */
function workStateToConfig(ws: WorkStateResponse): WorkingSetConfig {
  return {
    storyId: ws.story_id,
    branch: ws.branch ?? undefined,
    phase: (ws.phase as WorkingSetConfig['phase']) ?? undefined,
    constraints: ws.constraints.map(c => ({
      constraint: c.constraint,
      source: c.source,
      priority: c.priority,
      scope: 'project' as const, // Default scope
    })),
    recentActions: ws.recent_actions.map(a => ({
      action: a.action,
      completed: a.completed,
      timestamp: a.timestamp,
    })),
    nextSteps: ws.next_steps,
    blockers: ws.blockers.map(b => ({
      title: b.title,
      description: b.description,
      waitingOn: b.waiting_on,
    })),
    kbReferences: Object.entries(ws.kb_references).map(([name, kbId]) => ({
      name,
      kbId,
    })),
  }
}

// ============================================================================
// Archive Operations (KBMEM-021)
// ============================================================================

/**
 * Schema for kb_archive_working_set input.
 */
export const KbArchiveWorkingSetInputSchema = z.object({
  /** Story ID being archived */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Working set markdown content to archive */
  content: z.string().min(1, 'Content cannot be empty'),

  /** Optional archive path (relative to _implementation/) */
  archive_path: z.string().optional().default('WORKING-SET-ARCHIVE.md'),

  /** Whether to include timestamp header */
  include_timestamp: z.boolean().optional().default(true),
})

export type KbArchiveWorkingSetInput = z.infer<typeof KbArchiveWorkingSetInputSchema>

/**
 * Result of archive operation.
 */
export interface ArchiveWorkingSetResult {
  success: boolean
  story_id: string
  archive_path: string
  archived_at: string
  content_length: number
  message: string
}

/**
 * Default path for working set archive.
 */
export const DEFAULT_ARCHIVE_PATH = '_implementation/WORKING-SET-ARCHIVE.md'

/**
 * Archive working set to a persistent file.
 *
 * This function generates the archive content that would be written
 * to the archive file. The actual file write is handled by the caller
 * (MCP tool handler or CLI) since we don't have direct file access here.
 *
 * @param input - Archive input with content
 * @returns Archive result with formatted content
 *
 * @example
 * ```typescript
 * const result = await kb_archive_working_set({
 *   story_id: 'WISH-2045',
 *   content: workingSetMd,
 * })
 * // result.archive_content contains the formatted archive entry
 * ```
 */
export async function kb_archive_working_set(
  input: KbArchiveWorkingSetInput,
): Promise<ArchiveWorkingSetResult & { archive_content: string }> {
  const validated = KbArchiveWorkingSetInputSchema.parse(input)
  const archivedAt = new Date().toISOString()

  // Build archive entry header
  const header = validated.include_timestamp
    ? `\n---\n\n# Archived: ${validated.story_id}\n\n**Archived At**: ${archivedAt}\n\n---\n\n`
    : `\n---\n\n# Archived: ${validated.story_id}\n\n---\n\n`

  // Format the archive content
  const archiveContent = header + validated.content + '\n'

  return {
    success: true,
    story_id: validated.story_id,
    archive_path: validated.archive_path,
    archived_at: archivedAt,
    content_length: validated.content.length,
    archive_content: archiveContent,
    message: `Working set for ${validated.story_id} archived successfully`,
  }
}

/**
 * Generate archive header for a story.
 *
 * @param storyId - Story ID
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns Formatted header string
 */
export function generateArchiveHeader(storyId: string, timestamp?: Date): string {
  const ts = timestamp ?? new Date()
  return `\n---\n\n# Archived: ${storyId}\n\n**Archived At**: ${ts.toISOString()}\n\n---\n\n`
}
