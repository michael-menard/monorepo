/**
 * Working Set Generator (KBMEM-007)
 *
 * Generates the working-set.md file for a story, pulling constraints from KB
 * with priority merging (story > epic > project).
 *
 * @see plans/future/kb-memory-architecture/PLAN.md
 */

import { z } from 'zod'

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Constraint with source and priority for merging.
 */
export const ConstraintSchema = z.object({
  constraint: z.string(),
  source: z.string().optional(),
  priority: z.number().optional(),
  scope: z.enum(['project', 'epic', 'story']).default('project'),
})

export type Constraint = z.infer<typeof ConstraintSchema>

/**
 * Action item with completion status.
 */
export const ActionItemSchema = z.object({
  action: z.string(),
  completed: z.boolean().default(false),
  timestamp: z.string().optional(),
})

export type ActionItem = z.infer<typeof ActionItemSchema>

/**
 * Blocker with optional details.
 */
export const BlockerSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  waitingOn: z.string().optional(),
})

export type Blocker = z.infer<typeof BlockerSchema>

/**
 * KB reference linking name to KB entry ID.
 */
export const KbReferenceSchema = z.object({
  name: z.string(),
  kbId: z.string().uuid(),
})

export type KbReference = z.infer<typeof KbReferenceSchema>

/**
 * Working set configuration.
 */
export const WorkingSetConfigSchema = z.object({
  storyId: z.string().min(1),
  branch: z.string().optional(),
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
  started: z.string().optional(), // ISO timestamp
  constraints: z.array(ConstraintSchema).optional().default([]),
  recentActions: z.array(ActionItemSchema).optional().default([]),
  nextSteps: z.array(z.string()).optional().default([]),
  blockers: z.array(BlockerSchema).optional().default([]),
  kbReferences: z.array(KbReferenceSchema).optional().default([]),
})

export type WorkingSetConfig = z.infer<typeof WorkingSetConfigSchema>

// ============================================================================
// Constraint Merging
// ============================================================================

/**
 * Priority weights for constraint scopes.
 * Higher number = higher priority in conflict resolution.
 */
const SCOPE_PRIORITY: Record<string, number> = {
  story: 3,
  epic: 2,
  project: 1,
}

/**
 * Merge constraints with priority: story > epic > project.
 *
 * Rules:
 * 1. Story constraints always take precedence
 * 2. Epic constraints override project constraints
 * 3. Within same scope, explicit priority is used
 * 4. Returns top N constraints (default 5)
 *
 * @param constraints - Array of constraints from different scopes
 * @param limit - Maximum number of constraints to return (default 5)
 * @returns Merged and sorted constraints
 */
export function mergeConstraints(constraints: Constraint[], limit = 5): Constraint[] {
  // Calculate effective priority: scope priority * 10 + explicit priority
  const withEffectivePriority = constraints.map(c => ({
    ...c,
    effectivePriority: (SCOPE_PRIORITY[c.scope] ?? 1) * 10 + (c.priority ?? 0),
  }))

  // Sort by effective priority (descending)
  const sorted = withEffectivePriority.sort((a, b) => b.effectivePriority - a.effectivePriority)

  // Return top N
  return sorted.slice(0, limit).map(({ effectivePriority, ...rest }) => rest)
}

// ============================================================================
// Template Generation
// ============================================================================

/**
 * Format a date for display in working set.
 */
function formatTimestamp(date?: Date | string): string {
  if (!date) {
    return new Date().toISOString()
  }
  if (typeof date === 'string') {
    return date
  }
  return date.toISOString()
}

/**
 * Generate the working-set.md file content.
 *
 * @param config - Working set configuration
 * @returns Markdown content for working-set.md
 */
export function generateWorkingSetMd(config: WorkingSetConfig): string {
  const validated = WorkingSetConfigSchema.parse(config)

  // Build context section
  const contextLines = [`- **Story**: ${validated.storyId}`]
  if (validated.branch) {
    contextLines.push(`- **Branch**: ${validated.branch}`)
  }
  if (validated.phase) {
    contextLines.push(`- **Phase**: ${validated.phase}`)
  }
  contextLines.push(`- **Started**: ${validated.started ?? formatTimestamp()}`)

  // Build constraints section (merge and limit to top 5)
  const mergedConstraints = mergeConstraints(validated.constraints, 5)
  const constraintLines =
    mergedConstraints.length > 0
      ? mergedConstraints.map((c, i) => {
          const source = c.source ? ` (${c.source})` : ''
          return `${i + 1}. ${c.constraint}${source}`
        })
      : ['_No constraints loaded_']

  // Build recent actions section
  const actionLines =
    validated.recentActions.length > 0
      ? validated.recentActions.map(a => {
          const checkbox = a.completed ? '[x]' : '[ ]'
          return `- ${checkbox} ${a.action}`
        })
      : ['_No recent actions_']

  // Build next steps section
  const nextStepLines =
    validated.nextSteps.length > 0
      ? validated.nextSteps.map((s, i) => `${i + 1}. ${s}`)
      : ['_No next steps defined_']

  // Build blockers section
  const blockerLines =
    validated.blockers.length > 0
      ? validated.blockers.map(b => {
          const waiting = b.waitingOn ? ` (waiting on: ${b.waitingOn})` : ''
          const desc = b.description ? `\n  - ${b.description}` : ''
          return `- **${b.title}**${waiting}${desc}`
        })
      : ['_None_']

  // Build KB references section
  const kbRefLines =
    validated.kbReferences.length > 0
      ? validated.kbReferences.map(r => `- ${r.name}: ${r.kbId}`)
      : ['_No KB references_']

  // Assemble the full document
  return `# Working Set

## Current Context
${contextLines.join('\n')}

## Constraints (Top 5)
${constraintLines.join('\n')}

## Recent Actions
${actionLines.join('\n')}

## Next Steps
${nextStepLines.join('\n')}

## Open Blockers
${blockerLines.join('\n')}

## KB References
${kbRefLines.join('\n')}
`
}

/**
 * Parse a working-set.md file back into a config object.
 *
 * @param content - Markdown content of working-set.md
 * @returns Parsed working set configuration
 */
export function parseWorkingSetMd(content: string): Partial<WorkingSetConfig> {
  const config: Partial<WorkingSetConfig> = {}

  // Extract story ID
  const storyMatch = content.match(/\*\*Story\*\*:\s*(\S+)/)
  if (storyMatch) {
    config.storyId = storyMatch[1]
  }

  // Extract branch
  const branchMatch = content.match(/\*\*Branch\*\*:\s*(\S+)/)
  if (branchMatch) {
    config.branch = branchMatch[1]
  }

  // Extract phase
  const phaseMatch = content.match(/\*\*Phase\*\*:\s*(\S+)/)
  if (phaseMatch) {
    config.phase = phaseMatch[1] as WorkingSetConfig['phase']
  }

  // Extract started timestamp
  const startedMatch = content.match(/\*\*Started\*\*:\s*(\S+)/)
  if (startedMatch) {
    config.started = startedMatch[1]
  }

  // Extract constraints
  const constraintsSection = content.match(/## Constraints[^\n]*\n([\s\S]*?)(?=\n## |\n$)/)
  if (constraintsSection) {
    const constraintMatches = constraintsSection[1].matchAll(/^\d+\.\s+(.+?)(?:\s+\(([^)]+)\))?$/gm)
    const constraints: Constraint[] = []
    for (const match of constraintMatches) {
      constraints.push({
        constraint: match[1].trim(),
        source: match[2]?.trim(),
        scope: 'project', // Default scope when parsing
      })
    }
    if (constraints.length > 0) {
      config.constraints = constraints
    }
  }

  // Extract recent actions
  const actionsSection = content.match(/## Recent Actions\n([\s\S]*?)(?=\n## |\n$)/)
  if (actionsSection) {
    const actionMatches = actionsSection[1].matchAll(/^- \[([ x])\]\s+(.+)$/gm)
    const actions: ActionItem[] = []
    for (const match of actionMatches) {
      actions.push({
        action: match[2].trim(),
        completed: match[1] === 'x',
      })
    }
    if (actions.length > 0) {
      config.recentActions = actions
    }
  }

  // Extract next steps
  const nextStepsSection = content.match(/## Next Steps\n([\s\S]*?)(?=\n## |\n$)/)
  if (nextStepsSection) {
    const stepMatches = nextStepsSection[1].matchAll(/^\d+\.\s+(.+)$/gm)
    const steps: string[] = []
    for (const match of stepMatches) {
      steps.push(match[1].trim())
    }
    if (steps.length > 0) {
      config.nextSteps = steps
    }
  }

  // Extract blockers
  const blockersSection = content.match(/## Open Blockers\n([\s\S]*?)(?=\n## |\n$)/)
  if (blockersSection && !blockersSection[1].includes('_None_')) {
    const blockerMatches = blockersSection[1].matchAll(
      /^- \*\*(.+?)\*\*(?:\s+\(waiting on:\s+([^)]+)\))?/gm,
    )
    const blockers: Blocker[] = []
    for (const match of blockerMatches) {
      blockers.push({
        title: match[1].trim(),
        waitingOn: match[2]?.trim(),
      })
    }
    if (blockers.length > 0) {
      config.blockers = blockers
    }
  }

  // Extract KB references
  const kbRefsSection = content.match(/## KB References\n([\s\S]*?)(?=\n## |\n$)/)
  if (kbRefsSection && !kbRefsSection[1].includes('_No KB references_')) {
    const refMatches = kbRefsSection[1].matchAll(/^- (.+?):\s+([a-f0-9-]+)$/gm)
    const refs: KbReference[] = []
    for (const match of refMatches) {
      refs.push({
        name: match[1].trim(),
        kbId: match[2].trim(),
      })
    }
    if (refs.length > 0) {
      config.kbReferences = refs
    }
  }

  return config
}
