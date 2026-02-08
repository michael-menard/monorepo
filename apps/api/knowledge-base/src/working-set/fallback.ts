/**
 * Working Set Fallback Generator (KBMEM-011)
 *
 * Generates a working-set.md file when one doesn't exist, pulling
 * data from KB work_state and constraints with priority merging.
 *
 * @see plans/future/kb-memory-architecture/PLAN.md
 */

import { z } from 'zod'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, and, sql, desc } from 'drizzle-orm'
import type * as schema from '../db/schema.js'
import { knowledgeEntries } from '../db/schema.js'
import { kb_get_work_state } from '../crud-operations/work-state-operations.js'
import { generateWorkingSetMd, type WorkingSetConfig, type Constraint } from './generator.js'

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Schema for kb_generate_working_set input.
 */
export const KbGenerateWorkingSetInputSchema = z.object({
  /** Story ID to generate working set for */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Git branch name (optional, used if not in KB) */
  branch: z.string().optional(),

  /** Current phase (optional, used if not in KB) */
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

  /** Include project-level constraints from KB (default true) */
  include_project_constraints: z.boolean().default(true),

  /** Include epic-level constraints from KB (default true) */
  include_epic_constraints: z.boolean().default(true),

  /** Epic ID for epic-level constraint lookup (optional) */
  epic_id: z.string().optional(),

  /** Maximum constraints to include (default 5) */
  max_constraints: z.number().int().positive().max(10).default(5),
})

export type KbGenerateWorkingSetInput = z.infer<typeof KbGenerateWorkingSetInputSchema>

/**
 * Result of working set generation.
 */
export interface GenerateWorkingSetResult {
  success: boolean
  story_id: string
  /** Generated markdown content */
  content: string
  /** Source of data (kb_work_state, constraints_only, minimal) */
  source: 'kb_work_state' | 'constraints_only' | 'minimal'
  /** Summary of what was included */
  summary: {
    constraints_count: number
    project_constraints: number
    epic_constraints: number
    story_constraints: number
    actions_count: number
    next_steps_count: number
    blockers_count: number
  }
  message: string
}

// ============================================================================
// Dependencies
// ============================================================================

export interface FallbackGeneratorDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Fallback Generation
// ============================================================================

/**
 * Generate a working-set.md file from KB data.
 *
 * Priority order for data:
 * 1. Existing work_state in KB (if available)
 * 2. Constraints from KB (project → epic → story)
 * 3. Minimal template with story context
 *
 * @param input - Generation parameters
 * @param deps - Database dependency
 * @returns Generated working set content
 */
export async function kb_generate_working_set(
  input: KbGenerateWorkingSetInput,
  deps: FallbackGeneratorDeps,
): Promise<GenerateWorkingSetResult> {
  const validated = KbGenerateWorkingSetInputSchema.parse(input)
  const { db } = deps

  // Try to get existing work state from KB
  const existingState = await kb_get_work_state({ story_id: validated.story_id }, { db })

  // Fetch constraints from KB
  const constraints = await fetchConstraints(
    db,
    validated.story_id,
    validated.epic_id,
    validated.include_project_constraints,
    validated.include_epic_constraints,
    validated.max_constraints,
  )

  let config: WorkingSetConfig
  let source: GenerateWorkingSetResult['source']

  if (existingState) {
    // Use existing work state, merge with fetched constraints
    source = 'kb_work_state'
    config = {
      storyId: validated.story_id,
      branch: existingState.branch ?? validated.branch,
      phase: (existingState.phase as WorkingSetConfig['phase']) ?? validated.phase,
      constraints: mergeConstraintsWithExisting(
        constraints,
        existingState.constraints.map(c => ({
          constraint: c.constraint,
          source: c.source,
          priority: c.priority,
          scope: 'story' as const,
        })),
        validated.max_constraints,
      ),
      recentActions: existingState.recent_actions.map(a => ({
        action: a.action,
        completed: a.completed,
        timestamp: a.timestamp,
      })),
      nextSteps: existingState.next_steps,
      blockers: existingState.blockers.map(b => ({
        title: b.title,
        description: b.description,
        waitingOn: b.waiting_on,
      })),
      kbReferences: Object.entries(existingState.kb_references).map(([name, kbId]) => ({
        name,
        kbId,
      })),
    }
  } else if (constraints.length > 0) {
    // No work state, but we have constraints
    source = 'constraints_only'
    config = {
      storyId: validated.story_id,
      branch: validated.branch,
      phase: validated.phase,
      constraints,
      recentActions: [],
      nextSteps: [],
      blockers: [],
      kbReferences: [],
    }
  } else {
    // Minimal template
    source = 'minimal'
    config = {
      storyId: validated.story_id,
      branch: validated.branch,
      phase: validated.phase ?? 'implementation',
      constraints: [],
      recentActions: [],
      nextSteps: [],
      blockers: [],
      kbReferences: [],
    }
  }

  const content = generateWorkingSetMd(config)

  // Count constraints by scope
  const projectCount = config.constraints.filter(c => c.scope === 'project').length
  const epicCount = config.constraints.filter(c => c.scope === 'epic').length
  const storyCount = config.constraints.filter(c => c.scope === 'story').length

  return {
    success: true,
    story_id: validated.story_id,
    content,
    source,
    summary: {
      constraints_count: config.constraints.length,
      project_constraints: projectCount,
      epic_constraints: epicCount,
      story_constraints: storyCount,
      actions_count: config.recentActions.length,
      next_steps_count: config.nextSteps.length,
      blockers_count: config.blockers.length,
    },
    message: `Working set generated from ${source} for ${validated.story_id}`,
  }
}

/**
 * Fetch constraints from KB with scope filtering.
 */
async function fetchConstraints(
  db: NodePgDatabase<typeof schema>,
  storyId: string,
  epicId: string | undefined,
  includeProject: boolean,
  includeEpic: boolean,
  limit: number,
): Promise<Constraint[]> {
  const constraints: Constraint[] = []

  // Fetch story-level constraints
  const storyConstraints = await db
    .select({
      id: knowledgeEntries.id,
      content: knowledgeEntries.content,
      tags: knowledgeEntries.tags,
    })
    .from(knowledgeEntries)
    .where(and(eq(knowledgeEntries.entryType, 'constraint'), eq(knowledgeEntries.storyId, storyId)))
    .orderBy(desc(knowledgeEntries.createdAt))
    .limit(limit)

  for (const c of storyConstraints) {
    constraints.push({
      constraint: extractConstraintText(c.content),
      source: `Story ${storyId}`,
      scope: 'story',
      priority: 3, // Highest priority
    })
  }

  // Fetch epic-level constraints if requested and epic ID provided
  if (includeEpic && epicId) {
    const epicConstraints = await db
      .select({
        id: knowledgeEntries.id,
        content: knowledgeEntries.content,
        tags: knowledgeEntries.tags,
      })
      .from(knowledgeEntries)
      .where(
        and(eq(knowledgeEntries.entryType, 'constraint'), eq(knowledgeEntries.storyId, epicId)),
      )
      .orderBy(desc(knowledgeEntries.createdAt))
      .limit(limit)

    for (const c of epicConstraints) {
      constraints.push({
        constraint: extractConstraintText(c.content),
        source: `Epic ${epicId}`,
        scope: 'epic',
        priority: 2,
      })
    }
  }

  // Fetch project-level constraints if requested
  if (includeProject) {
    // Project constraints have scope='project' tag or no story_id
    const projectConstraints = await db
      .select({
        id: knowledgeEntries.id,
        content: knowledgeEntries.content,
        tags: knowledgeEntries.tags,
      })
      .from(knowledgeEntries)
      .where(
        and(
          eq(knowledgeEntries.entryType, 'constraint'),
          sql`(${knowledgeEntries.storyId} IS NULL OR ${knowledgeEntries.tags} && ARRAY['project', 'project-wide']::text[])`,
        ),
      )
      .orderBy(desc(knowledgeEntries.createdAt))
      .limit(limit)

    for (const c of projectConstraints) {
      constraints.push({
        constraint: extractConstraintText(c.content),
        source: 'Project',
        scope: 'project',
        priority: 1, // Lowest priority
      })
    }
  }

  return constraints
}

/**
 * Extract constraint text from KB content (which may be formatted).
 */
function extractConstraintText(content: string): string {
  // Check if content has "# Constraint:" header
  const constraintMatch = content.match(/^#\s*Constraint:\s*(.+?)(?:\n|$)/m)
  if (constraintMatch) {
    return constraintMatch[1].trim()
  }

  // Check for "## Constraint" section
  const sectionMatch = content.match(/^##\s*Constraint\s*\n(.+?)(?:\n##|\n$|$)/m)
  if (sectionMatch) {
    return sectionMatch[1].trim()
  }

  // Just return first line if no special format
  const firstLine = content.split('\n')[0].trim()
  return firstLine.replace(/^#\s*/, '')
}

/**
 * Merge fetched constraints with existing work state constraints.
 */
function mergeConstraintsWithExisting(
  fetched: Constraint[],
  existing: Constraint[],
  limit: number,
): Constraint[] {
  // Combine all constraints
  const all = [...existing, ...fetched]

  // Deduplicate by constraint text (case-insensitive)
  const seen = new Set<string>()
  const deduped = all.filter(c => {
    const key = c.constraint.toLowerCase()
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })

  // Sort by scope priority (story > epic > project) then by explicit priority
  const scopeWeight: Record<string, number> = { story: 30, epic: 20, project: 10 }
  const sorted = deduped.sort((a, b) => {
    const aWeight = (scopeWeight[a.scope] ?? 10) + (a.priority ?? 0)
    const bWeight = (scopeWeight[b.scope] ?? 10) + (b.priority ?? 0)
    return bWeight - aWeight
  })

  return sorted.slice(0, limit)
}
