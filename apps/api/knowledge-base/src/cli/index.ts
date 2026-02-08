/**
 * KB CLI - Command Line Interface for Knowledge Base Operations (KBMEM-017)
 *
 * Provides dead-simple shortcuts for common KB operations.
 *
 * Usage:
 *   kb add note "Sharp requires libvips for HEIC support"
 *   kb add decision "Use server-side processing" --context "..." --story WISH-2045
 *   kb add task "Add HEIC to file types" --type follow_up --story WISH-2045
 *   kb add lesson "HEIC orientation metadata" --story WISH-2045 --category image_processing
 *   kb add runbook "Debug upload failures" --steps "Check logs" "Verify sharp"
 *   kb list tasks --status open --story WISH-2045
 *   kb update-work --story WISH-2045 --phase implementation
 *   kb process-deferred
 *
 * @see plans/future/kb-memory-architecture/PLAN.md
 */

import { z } from 'zod'

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Schema for CLI add note command.
 */
export const CliAddNoteSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  role: z.enum(['pm', 'dev', 'qa', 'all']).default('all'),
  tags: z.array(z.string()).optional(),
  story_id: z.string().optional(),
})

export type CliAddNoteInput = z.infer<typeof CliAddNoteSchema>

/**
 * Schema for CLI add decision command.
 */
export const CliAddDecisionSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  context: z.string().min(1, 'Context cannot be empty'),
  decision: z.string().optional(),
  consequences: z.string().optional(),
  story_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export type CliAddDecisionInput = z.infer<typeof CliAddDecisionSchema>

/**
 * Schema for CLI add task command.
 */
export const CliAddTaskSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  description: z.string().optional(),
  type: z.enum(['follow_up', 'improvement', 'bug', 'tech_debt', 'feature_idea']),
  story_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.enum(['p0', 'p1', 'p2', 'p3']).optional(),
})

export type CliAddTaskInput = z.infer<typeof CliAddTaskSchema>

/**
 * Schema for CLI add lesson command.
 */
export const CliAddLessonSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  story_id: z.string().min(1, 'Story ID is required for lessons'),
  category: z.enum([
    'architecture',
    'testing',
    'performance',
    'security',
    'ux',
    'devops',
    'tooling',
    'process',
    'other',
  ]),
  what_happened: z.string().min(1, 'What happened is required'),
  resolution: z.string().min(1, 'Resolution is required'),
  tags: z.array(z.string()).optional(),
})

export type CliAddLessonInput = z.infer<typeof CliAddLessonSchema>

/**
 * Schema for CLI add runbook command.
 */
export const CliAddRunbookSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  steps: z.array(z.string().min(1)).min(1, 'At least one step is required'),
  prerequisites: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

export type CliAddRunbookInput = z.infer<typeof CliAddRunbookSchema>

/**
 * Schema for CLI list tasks command.
 */
export const CliListTasksSchema = z.object({
  status: z
    .enum(['open', 'triaged', 'in_progress', 'blocked', 'done', 'wont_do', 'promoted'])
    .optional(),
  type: z.enum(['follow_up', 'improvement', 'bug', 'tech_debt', 'feature_idea']).optional(),
  story_id: z.string().optional(),
  priority: z.enum(['p0', 'p1', 'p2', 'p3']).optional(),
  limit: z.number().int().min(1).max(100).default(20),
})

export type CliListTasksInput = z.infer<typeof CliListTasksSchema>

/**
 * Schema for CLI update work state command.
 */
export const CliUpdateWorkStateSchema = z.object({
  story_id: z.string().min(1, 'Story ID is required'),
  phase: z
    .enum([
      'planning',
      'in-elaboration',
      'ready-to-work',
      'implementation',
      'ready-for-code-review',
      'review',
      'ready-for-qa',
      'in-qa',
      'verification',
      'uat',
      'complete',
    ])
    .optional(),
  branch: z.string().optional(),
  next_steps: z.array(z.string()).optional(),
  blockers: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        waiting_on: z.string().optional(),
      }),
    )
    .optional(),
})

export type CliUpdateWorkStateInput = z.infer<typeof CliUpdateWorkStateSchema>

/**
 * Schema for CLI process deferred writes command.
 */
export const CliProcessDeferredSchema = z.object({
  dry_run: z.boolean().default(false),
  limit: z.number().int().min(1).max(200).default(50),
})

export type CliProcessDeferredInput = z.infer<typeof CliProcessDeferredSchema>

// ============================================================================
// CLI Command Types
// ============================================================================

/**
 * Available CLI commands.
 */
export type CliCommand =
  | 'add-note'
  | 'add-decision'
  | 'add-task'
  | 'add-lesson'
  | 'add-runbook'
  | 'add-constraint'
  | 'list-tasks'
  | 'update-work'
  | 'process-deferred'
  | 'list-deferred'
  | 'triage-tasks'
  | 'cleanup-tasks'

/**
 * Maps short command aliases to full command names.
 */
export const CLI_ALIASES: Record<string, CliCommand> = {
  note: 'add-note',
  decision: 'add-decision',
  task: 'add-task',
  lesson: 'add-lesson',
  runbook: 'add-runbook',
  constraint: 'add-constraint',
  tasks: 'list-tasks',
  work: 'update-work',
  deferred: 'process-deferred',
  triage: 'triage-tasks',
  cleanup: 'cleanup-tasks',
}

// ============================================================================
// CLI Parser
// ============================================================================

/**
 * Parse CLI arguments into a structured command.
 *
 * @param args - Command line arguments (e.g., ['add', 'note', 'content'])
 * @returns Parsed command and input
 *
 * @example
 * ```typescript
 * const result = parseCliArgs(['add', 'note', 'My note content', '--story', 'WISH-2045'])
 * // { command: 'add-note', input: { content: 'My note content', story_id: 'WISH-2045' } }
 * ```
 */
export function parseCliArgs(args: string[]): {
  command: CliCommand
  input: Record<string, unknown>
} {
  if (args.length < 2) {
    throw new Error('Usage: kb <action> <type> [options]')
  }

  const [action, type, ...rest] = args

  // Handle "add <type>" commands
  if (action === 'add') {
    return parseAddCommand(type, rest)
  }

  // Handle "list tasks" command
  if (action === 'list' && type === 'tasks') {
    return { command: 'list-tasks', input: parseOptions(rest) }
  }

  // Handle "update-work" command
  if (action === 'update-work' || action === 'update') {
    return { command: 'update-work', input: parseOptions([type, ...rest]) }
  }

  // Handle "process-deferred" command
  if (action === 'process-deferred' || action === 'process') {
    return { command: 'process-deferred', input: parseOptions([type, ...rest]) }
  }

  // Handle "list-deferred" command
  if (action === 'list-deferred' || (action === 'list' && type === 'deferred')) {
    return { command: 'list-deferred', input: parseOptions(rest) }
  }

  // Handle "triage-tasks" or "triage" command
  if (action === 'triage-tasks' || action === 'triage') {
    return { command: 'triage-tasks', input: parseOptions([type, ...rest]) }
  }

  // Handle "cleanup-tasks" or "cleanup" command
  if (action === 'cleanup-tasks' || action === 'cleanup') {
    return { command: 'cleanup-tasks', input: parseOptions([type, ...rest]) }
  }

  // Check aliases
  const aliasedCommand = CLI_ALIASES[action]
  if (aliasedCommand) {
    return { command: aliasedCommand, input: parseOptions([type, ...rest]) }
  }

  throw new Error(`Unknown command: ${action} ${type}`)
}

/**
 * Parse "add <type>" commands.
 */
function parseAddCommand(
  type: string,
  args: string[],
): { command: CliCommand; input: Record<string, unknown> } {
  switch (type) {
    case 'note': {
      // First non-option arg is content
      const content = args.find(arg => !arg.startsWith('--'))
      const options = parseOptions(
        args.filter(arg => arg.startsWith('--') || args.indexOf(arg) > args.indexOf(content ?? '')),
      )
      return { command: 'add-note', input: { content, ...options } }
    }

    case 'decision': {
      const title = args.find(arg => !arg.startsWith('--'))
      const options = parseOptions(
        args.filter(arg => arg.startsWith('--') || args.indexOf(arg) > args.indexOf(title ?? '')),
      )
      // If decision not provided, use title as decision
      if (!options.decision) {
        options.decision = title
      }
      return { command: 'add-decision', input: { title, ...options } }
    }

    case 'task': {
      const title = args.find(arg => !arg.startsWith('--'))
      const options = parseOptions(
        args.filter(arg => arg.startsWith('--') || args.indexOf(arg) > args.indexOf(title ?? '')),
      )
      return { command: 'add-task', input: { title, ...options } }
    }

    case 'lesson': {
      const title = args.find(arg => !arg.startsWith('--'))
      const options = parseOptions(
        args.filter(arg => arg.startsWith('--') || args.indexOf(arg) > args.indexOf(title ?? '')),
      )
      return { command: 'add-lesson', input: { title, ...options } }
    }

    case 'runbook': {
      const title = args.find(arg => !arg.startsWith('--'))
      const options = parseOptions(
        args.filter(arg => arg.startsWith('--') || args.indexOf(arg) > args.indexOf(title ?? '')),
      )
      return { command: 'add-runbook', input: { title, ...options } }
    }

    case 'constraint': {
      const constraint = args.find(arg => !arg.startsWith('--'))
      const options = parseOptions(
        args.filter(
          arg => arg.startsWith('--') || args.indexOf(arg) > args.indexOf(constraint ?? ''),
        ),
      )
      return { command: 'add-constraint', input: { constraint, ...options } }
    }

    default:
      throw new Error(
        `Unknown add type: ${type}. Valid types: note, decision, task, lesson, runbook, constraint`,
      )
  }
}

/**
 * Parse --key value pairs from args.
 */
function parseOptions(args: string[]): Record<string, unknown> {
  const options: Record<string, unknown> = {}
  let i = 0

  while (i < args.length) {
    const arg = args[i]

    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-/g, '_')
      const value = args[i + 1]

      if (value && !value.startsWith('--')) {
        // Handle array values (comma-separated or multiple)
        if (key === 'steps' || key === 'tags' || key === 'next_steps') {
          const arrayValues: string[] = []
          let j = i + 1
          while (j < args.length && !args[j].startsWith('--')) {
            arrayValues.push(args[j])
            j++
          }
          options[key] = arrayValues
          i = j
          continue
        }

        // Handle boolean values
        if (value === 'true') {
          options[key] = true
        } else if (value === 'false') {
          options[key] = false
        } else {
          options[key] = value
        }
        i += 2
      } else {
        // Flag without value (treat as true)
        options[key] = true
        i++
      }
    } else {
      i++
    }
  }

  return options
}

// ============================================================================
// CLI Result Types
// ============================================================================

/**
 * CLI execution result.
 */
export interface CliResult {
  success: boolean
  command: CliCommand
  message: string
  data?: unknown
}

// ============================================================================
// Exports
// ============================================================================

export {
  CliAddNoteSchema as AddNoteSchema,
  CliAddDecisionSchema as AddDecisionSchema,
  CliAddTaskSchema as AddTaskSchema,
  CliAddLessonSchema as AddLessonSchema,
  CliAddRunbookSchema as AddRunbookSchema,
  CliListTasksSchema as ListTasksSchema,
  CliUpdateWorkStateSchema as UpdateWorkStateSchema,
  CliProcessDeferredSchema as ProcessDeferredSchema,
}
