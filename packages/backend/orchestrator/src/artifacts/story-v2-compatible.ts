/**
 * Story Artifact Schema (Backward Compatible)
 *
 * Version: 2.0 (with v1 legacy support)
 *
 * This schema supports BOTH:
 * - New v2 format (schema: 1, state field, acs field, etc.)
 * - Legacy format (status field, acceptance_criteria field, etc.)
 *
 * Migration Strategy:
 * - Reads both old and new formats without validation errors
 * - Writes can optionally normalize to new format
 * - Deprecation warnings for legacy fields in logs
 *
 * Changes from v1:
 * - Made v1 fields optional to support legacy files
 * - Added legacy fields (status, phase, epic, etc.) as optional
 * - Added dual scope format support (in/out vs packages/surfaces)
 * - Added .passthrough() for unknown fields
 * - Added normalization helpers
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
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
 * Priority level enum - supports both new and legacy formats
 */
export const PriorityLevelSchema = z.union([
  z.enum(['critical', 'high', 'medium', 'low']), // New format
  z.enum(['P0', 'P1', 'P2', 'P3']), // Legacy format
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
 * Acceptance criterion schema - supports both acs and acceptance_criteria
 */
export const StoryAcceptanceCriterionSchema = z.object({
  id: z.string(), // AC-001, AC-002, etc.
  description: z.string(),
  testable: z.boolean().default(true).optional(),
  automated: z.boolean().default(false).optional(), // Can be tested automatically
  verification: z.string().optional(), // Legacy field for how to verify
})
export type StoryAcceptanceCriterion = z.infer<typeof StoryAcceptanceCriterionSchema>

/**
 * Risk schema for story-level risks
 */
export const StoryRiskSchema = z.object({
  id: z.string(), // RISK-001, etc.
  description: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  mitigation: z.string().nullable().optional(),
})
export type StoryRisk = z.infer<typeof StoryRiskSchema>

/**
 * New scope format - packages and surfaces
 */
export const NewStoryScopeSchema = z.object({
  packages: z.array(z.string()),
  surfaces: z.array(SurfaceTypeSchema),
})

/**
 * Legacy scope format - in and out
 */
export const LegacyStoryScopeSchema = z.object({
  in: z.array(z.string()),
  out: z.array(z.string()),
})

/**
 * Story scope - supports both formats
 */
export const StoryScopeSchema = z.union([NewStoryScopeSchema, LegacyStoryScopeSchema])
export type StoryScope = z.infer<typeof StoryScopeSchema>

// ============================================================================
// Main Story Schema (Backward Compatible)
// ============================================================================

/**
 * Story artifact schema - backward compatible with legacy format.
 *
 * Supports BOTH:
 * - New format: schema: 1, state, feature, acs, etc.
 * - Legacy format: status, epic, acceptance_criteria, etc.
 *
 * Uses .passthrough() to preserve unknown fields for forward compatibility.
 */
export const StoryArtifactSchema = z
  .object({
    // ========================================================================
    // V1 FIELDS (now optional for legacy support)
    // ========================================================================

    /** Schema version for migration support (optional for legacy files) */
    schema: z.literal(1).optional(),

    /** Story identifier (e.g., "WISH-2001") - REQUIRED in both formats */
    id: z.string().regex(/^[A-Z]+-\d+$/),

    /** Feature/epic this story belongs to (v1 name) */
    feature: z.string().optional(),

    /** Type of story (optional for legacy files) */
    type: StoryTypeSchema.optional(),

    /** Current state - single source of truth for story lifecycle (v1) */
    state: StoryStateSchema.optional(),

    /** Story title - REQUIRED in both formats */
    title: z.string().min(1),

    /** Story points (null if not estimated) */
    points: z.number().int().min(1).max(13).nullable().optional(),

    /** Priority level - supports both new and legacy formats */
    priority: PriorityLevelSchema.nullable().optional(),

    /** Story ID that blocks this one (null if not blocked) */
    blocked_by: z.string().nullable().optional(),

    /** Story IDs this depends on (soft dependencies, not blockers) */
    depends_on: z.array(z.string()).optional(),

    /** Story ID this is a follow-up from */
    follow_up_from: z.string().nullable().optional(),

    /** Scope of changes - supports both formats */
    scope: StoryScopeSchema.optional(),

    /** Story goal - what we're trying to achieve */
    goal: z.string().optional(),

    /** Non-goals - what we're explicitly not doing */
    non_goals: z.array(z.string()).optional(),

    /** Acceptance criteria (v1 name) */
    acs: z.array(StoryAcceptanceCriterionSchema).optional(),

    /** Identified risks */
    risks: z.array(StoryRiskSchema).optional(),

    /** When the story was created */
    created_at: z.string().datetime({ offset: true }).optional(),

    /** When the story was last updated */
    updated_at: z.string().datetime({ offset: true }).optional(),

    /** Story content - Markdown body after frontmatter */
    content: z.string().optional(),

    // ========================================================================
    // LEGACY FIELDS (from existing story files)
    // ========================================================================

    /** Legacy: status field (use state instead) */
    status: z.string().optional(),

    /** Legacy: phase field (workflow phase tracking) */
    phase: z.string().optional(),

    /** Legacy: epic field (use feature instead) */
    epic: z.string().optional(),

    /** Legacy: prefix field (story ID prefix like WKFL, WISH) */
    prefix: z.string().optional(),

    /** Legacy: blocks array (stories this one blocks) */
    blocks: z.array(z.string()).optional(),

    /** Legacy: dependencies array (use depends_on instead) */
    dependencies: z.array(z.string()).optional(),

    /** Legacy: owner field (who's working on it) */
    owner: z.string().nullable().optional(),

    /** Legacy: estimated_tokens field (budget estimate) */
    estimated_tokens: z.number().optional(),

    /** Legacy: tags field (categorization) */
    tags: z.array(z.string()).optional(),

    /** Legacy: summary field (brief description) */
    summary: z.string().optional(),

    /** Legacy: acceptance_criteria field (use acs instead) */
    acceptance_criteria: z.array(StoryAcceptanceCriterionSchema).optional(),

    /** Legacy: technical_notes field (implementation details) */
    technical_notes: z.string().optional(),

    /** Legacy: reuse_plan field (reuse strategy) */
    reuse_plan: z.string().optional(),

    /** Legacy: local_testing field (testing notes) */
    local_testing: z.string().optional(),

    /** Legacy: token_budget field (budget tracking) */
    token_budget: z.number().optional(),

    /** Experiment variant field (A/B testing) */
    experiment_variant: z.string().optional(),
  })
  .passthrough() // Allow any extra fields for maximum compatibility

export type StoryArtifact = z.infer<typeof StoryArtifactSchema>

/** Input type for creating a story artifact */
export type StoryArtifactInput = z.input<typeof StoryArtifactSchema>

// ============================================================================
// Normalization Helpers
// ============================================================================

/**
 * Normalize a story from legacy format to v1 format
 *
 * Handles field name mapping:
 * - status → state
 * - epic → feature
 * - acceptance_criteria → acs
 * - dependencies → depends_on
 * - scope.in/out → scope.packages/surfaces
 */
export function normalizeStoryArtifact(story: StoryArtifact): StoryArtifact {
  const normalized: StoryArtifact = { ...story }

  // Warn about deprecated fields
  const deprecatedFields: string[] = []

  // Map status → state
  if (story.status && !story.state) {
    normalized.state = story.status as StoryState
    deprecatedFields.push('status')
  }

  // Map epic → feature
  if (story.epic && !story.feature) {
    normalized.feature = story.epic
    deprecatedFields.push('epic')
  }

  // Map acceptance_criteria → acs
  if (story.acceptance_criteria && !story.acs) {
    normalized.acs = story.acceptance_criteria
    deprecatedFields.push('acceptance_criteria')
  }

  // Map dependencies → depends_on
  if (story.dependencies && !story.depends_on) {
    normalized.depends_on = story.dependencies
    deprecatedFields.push('dependencies')
  }

  // Map legacy scope format
  if (story.scope && 'in' in story.scope && !('packages' in story.scope)) {
    // Try to infer packages and surfaces from legacy in/out format
    const legacyScope = story.scope as z.infer<typeof LegacyStoryScopeSchema>
    normalized.scope = {
      packages: [], // Can't infer reliably, leave empty
      surfaces: [], // Can't infer reliably, leave empty
    }
    deprecatedFields.push('scope.in/out')
  }

  // Log deprecation warnings
  if (deprecatedFields.length > 0) {
    logger.warn('Story uses deprecated fields', {
      storyId: story.id,
      deprecatedFields,
      message: 'Consider migrating to v1 format',
    })
  }

  // Set schema version if not present
  if (!normalized.schema) {
    normalized.schema = 1
  }

  return normalized
}

/**
 * Check if a story uses legacy format
 */
export function isLegacyFormat(story: StoryArtifact): boolean {
  return !!(
    story.status ||
    story.epic ||
    story.acceptance_criteria ||
    story.dependencies ||
    (story.scope && 'in' in story.scope)
  )
}

/**
 * Get the effective state of a story (handles both state and status)
 */
export function getStoryState(story: StoryArtifact): StoryState | string | undefined {
  return story.state || story.status
}

/**
 * Get the effective feature/epic of a story
 */
export function getStoryFeature(story: StoryArtifact): string | undefined {
  return story.feature || story.epic
}

/**
 * Get the effective acceptance criteria (handles both acs and acceptance_criteria)
 */
export function getStoryAcceptanceCriteria(
  story: StoryArtifact,
): StoryAcceptanceCriterion[] | undefined {
  return story.acs || story.acceptance_criteria
}

/**
 * Get the effective dependencies (handles both depends_on and dependencies)
 */
export function getStoryDependencies(story: StoryArtifact): string[] | undefined {
  return story.depends_on || story.dependencies
}

// ============================================================================
// Helper Functions (Updated for Backward Compatibility)
// ============================================================================

/**
 * Create a new story artifact with defaults (v1 format)
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
 * Update story state with validation (handles both state and status)
 */
export function updateStoryState(story: StoryArtifact, newState: StoryState): StoryArtifact {
  const updated: StoryArtifact = {
    ...story,
    state: newState,
    updated_at: new Date().toISOString(),
  }

  // Also update status if using legacy format
  if (story.status) {
    updated.status = newState
  }

  return updated
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
 * Add acceptance criterion to story (handles both acs and acceptance_criteria)
 */
export function addAcceptanceCriterion(
  story: StoryArtifact,
  criterion: StoryAcceptanceCriterion,
): StoryArtifact {
  const updated: StoryArtifact = {
    ...story,
    updated_at: new Date().toISOString(),
  }

  // Add to acs if present
  if (story.acs) {
    updated.acs = [...story.acs, criterion]
  }

  // Also add to acceptance_criteria if using legacy format
  if (story.acceptance_criteria) {
    updated.acceptance_criteria = [...story.acceptance_criteria, criterion]
  }

  // If neither exists, use acs (new format)
  if (!story.acs && !story.acceptance_criteria) {
    updated.acs = [criterion]
  }

  return updated
}

/**
 * Add risk to story
 */
export function addStoryRisk(story: StoryArtifact, risk: StoryRisk): StoryArtifact {
  return {
    ...story,
    risks: [...(story.risks ?? []), risk],
    updated_at: new Date().toISOString(),
  }
}

/**
 * Check if story is blocked
 */
export function isStoryBlocked(story: StoryArtifact): boolean {
  return story.blocked_by !== null && story.blocked_by !== undefined
}

/**
 * Check if story is complete
 */
export function isStoryComplete(story: StoryArtifact): boolean {
  const state = getStoryState(story)
  return state === 'done' || state === 'cancelled' || state === 'uat'
}

/**
 * Check if story is workable (ready to be picked up)
 */
export function isStoryWorkable(story: StoryArtifact): boolean {
  const state = getStoryState(story)
  return state === 'ready-to-work' && !isStoryBlocked(story)
}

/**
 * Get next state for standard progression
 */
export function getStoryNextState(story: StoryArtifact): StoryState | null {
  const currentState = getStoryState(story)
  if (!currentState) return null

  const progression: Record<string, StoryState> = {
    draft: 'backlog',
    backlog: 'ready-to-work',
    'ready-to-work': 'in-progress',
    'in-progress': 'ready-for-qa',
    'ready-for-qa': 'uat',
    uat: 'done',
  }
  return (progression[currentState] as StoryState) ?? null
}
