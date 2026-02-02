/**
 * Story Artifact Schema
 *
 * Defines the structure of story.yaml files stored in the feature directories.
 * Aligns with Claude workflow's story.yaml format for consistency between
 * LangGraph orchestrator and Claude agents.
 *
 * This is the persistent representation of a story, distinct from:
 * - StoryStructure (in-flight seed data during creation)
 * - StoryRequest (input to story creation)
 * - SynthesizedStory (output of synthesis)
 */

import { z } from 'zod'
import { StoryStateSchema, type StoryState } from '../state/enums/story-state.js'

// ============================================================================
// Supporting Schemas
// ============================================================================

/**
 * Story type enum
 */
export const StoryTypeSchema = z.enum([
  'feature', // New capability
  'enhancement', // Improvement to existing feature
  'bug', // Defect fix
  'tech-debt', // Technical debt reduction
  'spike', // Research/exploration
  'infrastructure', // Infrastructure work
  'documentation', // Documentation only
])
export type StoryType = z.infer<typeof StoryTypeSchema>

/**
 * Priority level enum
 */
export const PriorityLevelSchema = z.enum([
  'critical', // Must be done immediately
  'high', // Should be done soon
  'medium', // Standard priority
  'low', // Nice to have
])
export type PriorityLevel = z.infer<typeof PriorityLevelSchema>

/**
 * Surface type enum - what parts of the system the story touches
 */
export const SurfaceTypeSchema = z.enum([
  'frontend', // Web UI
  'backend', // API/Lambda
  'database', // Database schema/queries
  'infrastructure', // AWS/CDK/SST
  'packages', // Shared packages
  'testing', // Test infrastructure
  'documentation', // Docs only
])
export type SurfaceType = z.infer<typeof SurfaceTypeSchema>

/**
 * Acceptance criterion schema
 */
export const StoryAcceptanceCriterionSchema = z.object({
  id: z.string(), // AC-001, AC-002, etc.
  description: z.string(),
  testable: z.boolean().default(true),
  automated: z.boolean().default(false), // Can be tested automatically
})
export type StoryAcceptanceCriterion = z.infer<typeof StoryAcceptanceCriterionSchema>

/**
 * Risk schema for story-level risks
 */
export const StoryRiskSchema = z.object({
  id: z.string(), // RISK-001, etc.
  description: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  mitigation: z.string().nullable(),
})
export type StoryRisk = z.infer<typeof StoryRiskSchema>

/**
 * Story scope - what packages and surfaces the story touches
 */
export const StoryScopeSchema = z.object({
  packages: z.array(z.string()), // Package names affected
  surfaces: z.array(SurfaceTypeSchema), // What surfaces are touched
})
export type StoryScope = z.infer<typeof StoryScopeSchema>

// ============================================================================
// Main Story Schema
// ============================================================================

/**
 * Story artifact schema - matches Claude's story.yaml format.
 *
 * Single `state` field replaces previous stage/phase/status fields.
 * Uses `blocked_by` for blocking dependency rather than boolean flag.
 */
export const StoryArtifactSchema = z.object({
  /** Schema version for migration support */
  schema: z.literal(1),

  /** Story identifier (e.g., "WISH-2001") */
  id: z.string().regex(/^[A-Z]+-\d+$/),

  /** Feature/epic this story belongs to */
  feature: z.string(),

  /** Type of story */
  type: StoryTypeSchema,

  /** Current state - single source of truth for story lifecycle */
  state: StoryStateSchema,

  /** Story title */
  title: z.string().min(1),

  /** Story points (null if not estimated) */
  points: z.number().int().min(1).max(13).nullable(),

  /** Priority level */
  priority: PriorityLevelSchema.nullable(),

  /** Story ID that blocks this one (null if not blocked) */
  blocked_by: z.string().nullable(),

  /** Story IDs this depends on (soft dependencies, not blockers) */
  depends_on: z.array(z.string()).default([]),

  /** Story ID this is a follow-up from */
  follow_up_from: z.string().nullable(),

  /** Scope of changes */
  scope: StoryScopeSchema,

  /** Story goal - what we're trying to achieve */
  goal: z.string(),

  /** Non-goals - what we're explicitly not doing */
  non_goals: z.array(z.string()).default([]),

  /** Acceptance criteria */
  acs: z.array(StoryAcceptanceCriterionSchema),

  /** Identified risks */
  risks: z.array(StoryRiskSchema).default([]),

  /** When the story was created */
  created_at: z.string().datetime(),

  /** When the story was last updated */
  updated_at: z.string().datetime(),
})

export type StoryArtifact = z.infer<typeof StoryArtifactSchema>

/** Input type for creating a story artifact */
export type StoryArtifactInput = z.input<typeof StoryArtifactSchema>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new story artifact with defaults
 */
export function createStoryArtifact(
  id: string,
  feature: string,
  title: string,
  goal: string,
  options: Partial<Omit<StoryArtifact, 'schema' | 'id' | 'feature' | 'title' | 'goal'>> = {},
): StoryArtifact {
  const now = new Date().toISOString()

  return StoryArtifactSchema.parse({
    schema: 1,
    id,
    feature,
    title,
    goal,
    type: options.type ?? 'feature',
    state: options.state ?? 'draft',
    points: options.points ?? null,
    priority: options.priority ?? 'medium',
    blocked_by: options.blocked_by ?? null,
    depends_on: options.depends_on ?? [],
    follow_up_from: options.follow_up_from ?? null,
    scope: options.scope ?? { packages: [], surfaces: [] },
    non_goals: options.non_goals ?? [],
    acs: options.acs ?? [],
    risks: options.risks ?? [],
    created_at: options.created_at ?? now,
    updated_at: options.updated_at ?? now,
  })
}

/**
 * Update story state with validation
 */
export function updateStoryState(story: StoryArtifact, newState: StoryState): StoryArtifact {
  return {
    ...story,
    state: newState,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Set story as blocked by another story
 */
export function setStoryBlocked(story: StoryArtifact, blockedBy: string | null): StoryArtifact {
  return {
    ...story,
    blocked_by: blockedBy,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Add acceptance criterion to story
 */
export function addAcceptanceCriterion(
  story: StoryArtifact,
  criterion: StoryAcceptanceCriterion,
): StoryArtifact {
  return {
    ...story,
    acs: [...story.acs, criterion],
    updated_at: new Date().toISOString(),
  }
}

/**
 * Add risk to story
 */
export function addStoryRisk(story: StoryArtifact, risk: StoryRisk): StoryArtifact {
  return {
    ...story,
    risks: [...story.risks, risk],
    updated_at: new Date().toISOString(),
  }
}

/**
 * Check if story is blocked
 */
export function isStoryBlocked(story: StoryArtifact): boolean {
  return story.blocked_by !== null
}

/**
 * Check if story is complete
 */
export function isStoryComplete(story: StoryArtifact): boolean {
  return story.state === 'done' || story.state === 'cancelled'
}

/**
 * Check if story is workable (ready to be picked up)
 */
export function isStoryWorkable(story: StoryArtifact): boolean {
  return story.state === 'ready-to-work' && !isStoryBlocked(story)
}

/**
 * Get next state for standard progression
 */
export function getStoryNextState(story: StoryArtifact): StoryState | null {
  const progression: Partial<Record<StoryState, StoryState>> = {
    draft: 'backlog',
    backlog: 'ready-to-work',
    'ready-to-work': 'in-progress',
    'in-progress': 'ready-for-qa',
    'ready-for-qa': 'uat',
    uat: 'done',
  }
  return progression[story.state] ?? null
}
