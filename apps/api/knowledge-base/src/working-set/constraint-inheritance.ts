/**
 * Constraint Inheritance Module (KBMEM-016)
 *
 * Implements constraint inheritance from epics to stories with
 * conflict detection, resolution logging, and automatic epic lookup.
 *
 * @see plans/future/kb-memory-architecture/PLAN.md
 */

import { z } from 'zod'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, and, sql, desc } from 'drizzle-orm'
import type * as schema from '../db/schema.js'
import { knowledgeEntries } from '../db/schema.js'
import { type Constraint } from './generator.js'

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Schema for constraint inheritance input.
 */
export const KbInheritConstraintsInputSchema = z.object({
  /** Story ID to inherit constraints for */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Epic ID (optional - auto-detected from story ID if not provided) */
  epic_id: z.string().optional(),

  /** Include project-level constraints (default true) */
  include_project: z.boolean().default(true),

  /** Include epic-level constraints (default true) */
  include_epic: z.boolean().default(true),

  /** Maximum constraints per scope (default 5) */
  max_per_scope: z.number().int().positive().max(10).default(5),

  /** Whether to log conflict resolutions (default true) */
  log_conflicts: z.boolean().default(true),
})

export type KbInheritConstraintsInput = z.infer<typeof KbInheritConstraintsInputSchema>

/**
 * Conflict detection result.
 */
export const ConflictSchema = z.object({
  /** Constraint that was overridden */
  overridden: z.object({
    constraint: z.string(),
    scope: z.enum(['project', 'epic', 'story']),
    source: z.string().optional(),
  }),
  /** Constraint that took precedence */
  winner: z.object({
    constraint: z.string(),
    scope: z.enum(['project', 'epic', 'story']),
    source: z.string().optional(),
  }),
  /** Reason for conflict (keyword overlap, direct negation, etc.) */
  reason: z.string(),
})

export type Conflict = z.infer<typeof ConflictSchema>

/**
 * Result of constraint inheritance.
 */
export interface InheritConstraintsResult {
  success: boolean
  story_id: string
  epic_id?: string
  /** Merged constraints after inheritance */
  constraints: Constraint[]
  /** Detected conflicts with resolution info */
  conflicts: Conflict[]
  /** Summary of constraint sources */
  summary: {
    total: number
    from_story: number
    from_epic: number
    from_project: number
    conflicts_resolved: number
  }
  message: string
}

// ============================================================================
// Dependencies
// ============================================================================

export interface ConstraintInheritanceDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Epic ID Detection
// ============================================================================

/**
 * Extract epic ID from story ID using common naming patterns.
 *
 * Patterns supported:
 * - WISH-001 → WISH (epic prefix)
 * - KBMEM-005 → KBMEM (epic prefix)
 * - EPIC-001-STORY-003 → EPIC-001
 *
 * @param storyId - The story ID
 * @returns Detected epic ID or undefined
 */
export function detectEpicId(storyId: string): string | undefined {
  // Pattern: PREFIX-### where PREFIX is the epic
  const prefixMatch = storyId.match(/^([A-Z]+)-\d+$/)
  if (prefixMatch) {
    return prefixMatch[1]
  }

  // Pattern: EPIC-###-STORY-### where EPIC-### is the epic ID
  const epicStoryMatch = storyId.match(/^([A-Z]+-\d+)-[A-Z]+-\d+$/)
  if (epicStoryMatch) {
    return epicStoryMatch[1]
  }

  // Pattern: PREFIX-SUBPREFIX-### (e.g., KBMEM-WS-001)
  const compoundMatch = storyId.match(/^([A-Z]+-[A-Z]+)-\d+$/)
  if (compoundMatch) {
    return compoundMatch[1]
  }

  return undefined
}

// ============================================================================
// Conflict Detection
// ============================================================================

/**
 * Keywords that indicate potential conflicts when negated.
 */
const CONFLICT_INDICATORS = [
  ['must', 'must not'],
  ['always', 'never'],
  ['required', 'forbidden'],
  ['allow', 'disallow'],
  ['enable', 'disable'],
  ['use', 'avoid'],
  ['include', 'exclude'],
]

/**
 * Detect if two constraints conflict.
 *
 * @param a - First constraint
 * @param b - Second constraint
 * @returns Conflict reason if detected, undefined otherwise
 */
export function detectConflict(a: Constraint, b: Constraint): string | undefined {
  const aLower = a.constraint.toLowerCase()
  const bLower = b.constraint.toLowerCase()

  // Check for direct negation patterns
  for (const [positive, negative] of CONFLICT_INDICATORS) {
    if (
      (aLower.includes(positive) && bLower.includes(negative)) ||
      (aLower.includes(negative) && bLower.includes(positive))
    ) {
      // Check if they're about the same topic (share significant words)
      const aWords = extractKeywords(aLower)
      const bWords = extractKeywords(bLower)
      const overlap = aWords.filter(w => bWords.includes(w))

      if (overlap.length >= 2) {
        return `Conflicting keywords: "${positive}" vs "${negative}" on topic: ${overlap.join(', ')}`
      }
    }
  }

  // Check for similar constraints with different values
  // E.g., "timeout must be 30s" vs "timeout must be 60s"
  const aNumeric = extractNumericValue(aLower)
  const bNumeric = extractNumericValue(bLower)

  if (aNumeric && bNumeric && aNumeric.value !== bNumeric.value) {
    const aWords = extractKeywords(aLower)
    const bWords = extractKeywords(bLower)
    const overlap = aWords.filter(w => bWords.includes(w))

    if (overlap.length >= 2) {
      return `Different numeric values: ${aNumeric.value} vs ${bNumeric.value} for: ${overlap.join(', ')}`
    }
  }

  return undefined
}

/**
 * Extract significant keywords from a constraint.
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'as',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'between',
    'under',
    'again',
    'further',
    'then',
    'once',
    'here',
    'there',
    'when',
    'where',
    'why',
    'how',
    'all',
    'each',
    'every',
    'both',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'nor',
    'not',
    'only',
    'own',
    'same',
    'so',
    'than',
    'too',
    'very',
    's',
    't',
    'just',
    'don',
    'now',
    'and',
    'or',
    'but',
    'if',
  ])

  return text.split(/\W+/).filter(word => word.length > 2 && !stopWords.has(word))
}

/**
 * Extract numeric value from constraint text.
 */
function extractNumericValue(text: string): { value: number; unit?: string } | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(%|ms|s|m|h|d|kb|mb|gb)?/)
  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: match[2],
    }
  }
  return undefined
}

// ============================================================================
// Constraint Inheritance
// ============================================================================

/**
 * Inherit constraints from project and epic scopes to a story.
 *
 * Priority order: story > epic > project
 * Conflicts are detected and logged with resolution info.
 *
 * @param input - Inheritance parameters
 * @param deps - Database dependency
 * @returns Merged constraints with conflict info
 */
export async function kb_inherit_constraints(
  input: KbInheritConstraintsInput,
  deps: ConstraintInheritanceDeps,
): Promise<InheritConstraintsResult> {
  const validated = KbInheritConstraintsInputSchema.parse(input)
  const { db } = deps

  // Auto-detect epic ID if not provided
  const epicId = validated.epic_id ?? detectEpicId(validated.story_id)

  // Fetch constraints from all scopes
  const storyConstraints = await fetchScopeConstraints(
    db,
    'story',
    validated.story_id,
    validated.max_per_scope,
  )

  const epicConstraints =
    validated.include_epic && epicId
      ? await fetchScopeConstraints(db, 'epic', epicId, validated.max_per_scope)
      : []

  const projectConstraints = validated.include_project
    ? await fetchProjectConstraints(db, validated.max_per_scope)
    : []

  // Detect conflicts between scopes
  const conflicts: Conflict[] = []

  // Check story vs epic conflicts
  for (const storyConstraint of storyConstraints) {
    for (const epicConstraint of epicConstraints) {
      const reason = detectConflict(storyConstraint, epicConstraint)
      if (reason) {
        conflicts.push({
          overridden: {
            constraint: epicConstraint.constraint,
            scope: 'epic',
            source: epicConstraint.source,
          },
          winner: {
            constraint: storyConstraint.constraint,
            scope: 'story',
            source: storyConstraint.source,
          },
          reason,
        })
      }
    }
  }

  // Check story vs project conflicts
  for (const storyConstraint of storyConstraints) {
    for (const projectConstraint of projectConstraints) {
      const reason = detectConflict(storyConstraint, projectConstraint)
      if (reason) {
        conflicts.push({
          overridden: {
            constraint: projectConstraint.constraint,
            scope: 'project',
            source: projectConstraint.source,
          },
          winner: {
            constraint: storyConstraint.constraint,
            scope: 'story',
            source: storyConstraint.source,
          },
          reason,
        })
      }
    }
  }

  // Check epic vs project conflicts
  for (const epicConstraint of epicConstraints) {
    for (const projectConstraint of projectConstraints) {
      const reason = detectConflict(epicConstraint, projectConstraint)
      if (reason) {
        conflicts.push({
          overridden: {
            constraint: projectConstraint.constraint,
            scope: 'project',
            source: projectConstraint.source,
          },
          winner: {
            constraint: epicConstraint.constraint,
            scope: 'epic',
            source: epicConstraint.source,
          },
          reason,
        })
      }
    }
  }

  // Merge constraints: story > epic > project, remove overridden ones
  const overriddenConstraints = new Set(conflicts.map(c => c.overridden.constraint.toLowerCase()))

  const mergedConstraints = [
    ...storyConstraints,
    ...epicConstraints.filter(c => !overriddenConstraints.has(c.constraint.toLowerCase())),
    ...projectConstraints.filter(c => !overriddenConstraints.has(c.constraint.toLowerCase())),
  ]

  // Deduplicate by constraint text
  const seen = new Set<string>()
  const deduped = mergedConstraints.filter(c => {
    const key = c.constraint.toLowerCase()
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })

  return {
    success: true,
    story_id: validated.story_id,
    epic_id: epicId,
    constraints: deduped,
    conflicts,
    summary: {
      total: deduped.length,
      from_story: storyConstraints.length,
      from_epic: epicConstraints.length,
      from_project: projectConstraints.filter(
        c => !overriddenConstraints.has(c.constraint.toLowerCase()),
      ).length,
      conflicts_resolved: conflicts.length,
    },
    message: `Inherited ${deduped.length} constraints for ${validated.story_id}${epicId ? ` (epic: ${epicId})` : ''}, ${conflicts.length} conflicts resolved`,
  }
}

/**
 * Fetch constraints for a specific scope.
 */
async function fetchScopeConstraints(
  db: NodePgDatabase<typeof schema>,
  scope: 'story' | 'epic',
  scopeId: string,
  limit: number,
): Promise<Constraint[]> {
  const results = await db
    .select({
      id: knowledgeEntries.id,
      content: knowledgeEntries.content,
      tags: knowledgeEntries.tags,
    })
    .from(knowledgeEntries)
    .where(and(eq(knowledgeEntries.entryType, 'constraint'), eq(knowledgeEntries.storyId, scopeId)))
    .orderBy(desc(knowledgeEntries.createdAt))
    .limit(limit)

  return results.map(r => ({
    constraint: extractConstraintText(r.content),
    source: `${scope === 'story' ? 'Story' : 'Epic'} ${scopeId}`,
    scope,
    priority: scope === 'story' ? 3 : 2,
  }))
}

/**
 * Fetch project-level constraints.
 */
async function fetchProjectConstraints(
  db: NodePgDatabase<typeof schema>,
  limit: number,
): Promise<Constraint[]> {
  const results = await db
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

  return results.map(r => ({
    constraint: extractConstraintText(r.content),
    source: 'Project',
    scope: 'project' as const,
    priority: 1,
  }))
}

/**
 * Extract constraint text from KB content.
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
