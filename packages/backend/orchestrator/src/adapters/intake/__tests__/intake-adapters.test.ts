/**
 * Intake Adapters Tests
 *
 * Tests for IntakePlanDraftSchema validation, brainstorm adapter,
 * existing-plan adapter, and KB persistence mapper.
 *
 * @see APRS-5010 AC-1 through AC-8
 */

import { describe, it, expect } from 'vitest'
import { NormalizedPlanSchema } from '../../../state/plan-refinement-state.js'
import { IntakePlanDraftSchema, type IntakePlanDraft } from '../intake-plan-draft.js'
import { brainstormToNormalizedPlan } from '../brainstorm-adapter.js'
import { existingPlanToNormalizedPlan } from '../existing-plan-adapter.js'
import { normalizedPlanToKbInput, KbPlanInputSchema, persistDraftPlan } from '../kb-persistence.js'
import { slugify, mapPriority } from '../utils.js'

// ============================================================================
// Test Fixtures
// ============================================================================

function makeBrainstormDraft(overrides?: Partial<IntakePlanDraft>): IntakePlanDraft {
  return IntakePlanDraftSchema.parse({
    title: 'User Authentication System',
    summary: 'Add login and registration to the platform',
    problemStatement: 'Users cannot currently log in',
    proposedSolution: 'Implement JWT-based auth with email/password',
    goals: ['Secure authentication', 'Session management'],
    nonGoals: ['OAuth providers', 'SSO'],
    minimumPath: 'Email/password login and registration',
    flows: [
      {
        name: 'User Registration',
        actor: 'New user',
        trigger: 'Clicks Sign Up button',
        steps: ['Fill registration form', 'Submit form', 'Receive confirmation email'],
        successOutcome: 'User account created and confirmation email sent',
      },
      {
        name: 'User Login',
        actor: 'Registered user',
        trigger: 'Clicks Login button',
        steps: ['Enter email and password', 'Submit credentials', 'Receive JWT token'],
        successOutcome: 'User is authenticated and redirected to dashboard',
      },
    ],
    acceptanceCriteria: ['Users can register with email/password', 'Users can log in'],
    definitionOfDone: ['All flows working end-to-end'],
    constraints: ['Must use JWT', 'Passwords hashed with bcrypt'],
    dependencies: ['Database schema for users table'],
    openQuestions: ['Should we support remember me?'],
    warnings: ['Rate limiting not in scope for MVP'],
    tags: ['auth', 'security'],
    sourceSkill: 'po-brainstorm-interview' as const,
    ...overrides,
  })
}

function makeExistingPlanDraft(overrides?: Partial<IntakePlanDraft>): IntakePlanDraft {
  return IntakePlanDraftSchema.parse({
    title: 'Dashboard Redesign',
    summary: 'Redesign the main dashboard with new layout',
    problemStatement: 'Current dashboard is cluttered and slow',
    proposedSolution: 'Component-based dashboard with lazy loading',
    goals: ['Faster load time', 'Better UX'],
    nonGoals: ['Mobile app'],
    minimumPath: 'New dashboard layout with top 3 widgets',
    flows: [
      {
        name: 'View Dashboard',
        actor: 'Authenticated user',
        trigger: 'Navigates to /dashboard',
        steps: ['Load dashboard layout', 'Fetch widget data', 'Render widgets'],
        successOutcome: 'Dashboard displays with all widgets loaded',
      },
    ],
    acceptanceCriteria: ['Dashboard loads in under 2 seconds'],
    definitionOfDone: ['All widgets rendering correctly'],
    constraints: ['Must use existing API endpoints'],
    dependencies: ['Widget API must be stable'],
    openQuestions: ['Which widgets are most important?'],
    warnings: ['Legacy widget API may be deprecated'],
    tags: ['ui', 'dashboard'],
    sourceSkill: 'po-existing-plan-interview' as const,
    recommendation: 'refine-now' as const,
    ...overrides,
  })
}

// ============================================================================
// IntakePlanDraftSchema Tests (AC-7)
// ============================================================================

describe('IntakePlanDraftSchema', () => {
  it('validates a complete brainstorm draft', () => {
    const draft = makeBrainstormDraft()
    expect(draft.title).toBe('User Authentication System')
    expect(draft.sourceSkill).toBe('po-brainstorm-interview')
    expect(draft.flows).toHaveLength(2)
  })

  it('validates a complete existing-plan draft', () => {
    const draft = makeExistingPlanDraft()
    expect(draft.title).toBe('Dashboard Redesign')
    expect(draft.sourceSkill).toBe('po-existing-plan-interview')
    expect(draft.recommendation).toBe('refine-now')
  })

  it('provides defaults for optional fields', () => {
    const draft = IntakePlanDraftSchema.parse({
      title: 'Minimal Plan',
      sourceSkill: 'po-brainstorm-interview',
    })
    expect(draft.summary).toBe('')
    expect(draft.flows).toEqual([])
    expect(draft.goals).toEqual([])
    expect(draft.dependencies).toEqual([])
    expect(draft.tags).toEqual([])
  })

  it('rejects draft without title', () => {
    expect(() =>
      IntakePlanDraftSchema.parse({ sourceSkill: 'po-brainstorm-interview' }),
    ).toThrow()
  })

  it('rejects draft without sourceSkill', () => {
    expect(() => IntakePlanDraftSchema.parse({ title: 'No Source' })).toThrow()
  })

  it('rejects invalid sourceSkill', () => {
    expect(() =>
      IntakePlanDraftSchema.parse({
        title: 'Bad Source',
        sourceSkill: 'invalid-skill',
      }),
    ).toThrow()
  })
})

// ============================================================================
// Brainstorm Adapter Tests (AC-1, AC-4, AC-6)
// ============================================================================

describe('brainstormToNormalizedPlan', () => {
  it('produces a valid NormalizedPlan from brainstorm draft (AC-1)', () => {
    const draft = makeBrainstormDraft()
    const result = brainstormToNormalizedPlan(draft)

    // Should not throw — validates against NormalizedPlanSchema
    const validated = NormalizedPlanSchema.parse(result)
    expect(validated.title).toBe('User Authentication System')
    expect(validated.planSlug).toBe('user-authentication-system')
    expect(validated.status).toBe('draft')
  })

  it('converts flows with correct FlowSchema fields', () => {
    const draft = makeBrainstormDraft()
    const result = brainstormToNormalizedPlan(draft)

    expect(result.flows).toHaveLength(2)
    const flow = result.flows[0]!
    expect(flow.id).toBe('flow-1')
    expect(flow.name).toBe('User Registration')
    expect(flow.actor).toBe('New user')
    expect(flow.trigger).toBe('Clicks Sign Up button')
    expect(flow.source).toBe('user')
    expect(flow.confidence).toBe(1.0)
    expect(flow.status).toBe('unconfirmed')
    expect(flow.steps).toHaveLength(3)
    expect(flow.steps[0]!.index).toBe(1)
    expect(flow.steps[0]!.description).toBe('Fill registration form')
  })

  it('populates dependencies from intake (AC-4)', () => {
    const draft = makeBrainstormDraft({
      dependencies: ['users-table-migration', 'auth-api-setup'],
    })
    const result = brainstormToNormalizedPlan(draft)
    expect(result.dependencies).toEqual(['users-table-migration', 'auth-api-setup'])
  })

  it('tags with source:brainstorm (OPP-2)', () => {
    const draft = makeBrainstormDraft({ tags: ['auth'] })
    const result = brainstormToNormalizedPlan(draft)
    expect(result.tags).toContain('source:brainstorm')
    expect(result.tags).toContain('auth')
  })

  it('uses custom planSlug when provided', () => {
    const draft = makeBrainstormDraft()
    const result = brainstormToNormalizedPlan(draft, 'custom-slug')
    expect(result.planSlug).toBe('custom-slug')
  })

  it('handles empty flows gracefully', () => {
    const draft = makeBrainstormDraft({ flows: [] })
    const result = brainstormToNormalizedPlan(draft)
    expect(result.flows).toEqual([])
    NormalizedPlanSchema.parse(result) // Should not throw
  })

  it('handles minimal draft with defaults', () => {
    const draft = makeBrainstormDraft({
      summary: '',
      problemStatement: '',
      proposedSolution: '',
      goals: [],
      nonGoals: [],
      flows: [],
      constraints: [],
      dependencies: [],
      openQuestions: [],
      warnings: [],
      tags: [],
    })
    const result = brainstormToNormalizedPlan(draft)
    NormalizedPlanSchema.parse(result) // Should not throw
    expect(result.planSlug).toBeTruthy()
  })
})

// ============================================================================
// Existing-Plan Adapter Tests (AC-2, AC-4, AC-6)
// ============================================================================

describe('existingPlanToNormalizedPlan', () => {
  it('produces a valid NormalizedPlan from existing-plan draft (AC-2)', () => {
    const draft = makeExistingPlanDraft()
    const result = existingPlanToNormalizedPlan(draft)

    const validated = NormalizedPlanSchema.parse(result)
    expect(validated.title).toBe('Dashboard Redesign')
    expect(validated.planSlug).toBe('dashboard-redesign')
    expect(validated.status).toBe('draft')
  })

  it('converts flows with correct FlowSchema fields', () => {
    const draft = makeExistingPlanDraft()
    const result = existingPlanToNormalizedPlan(draft)

    expect(result.flows).toHaveLength(1)
    const flow = result.flows[0]!
    expect(flow.source).toBe('user')
    expect(flow.confidence).toBe(1.0)
    expect(flow.status).toBe('unconfirmed')
  })

  it('populates dependencies from intake (AC-4)', () => {
    const draft = makeExistingPlanDraft({
      dependencies: ['widget-api-stable', 'design-system-v2'],
    })
    const result = existingPlanToNormalizedPlan(draft)
    expect(result.dependencies).toEqual(['widget-api-stable', 'design-system-v2'])
  })

  it('tags with source:existing-plan (OPP-2)', () => {
    const draft = makeExistingPlanDraft({ tags: ['ui'] })
    const result = existingPlanToNormalizedPlan(draft)
    expect(result.tags).toContain('source:existing-plan')
    expect(result.tags).toContain('ui')
  })

  it('adds warning for non-refine-now recommendation', () => {
    const draft = makeExistingPlanDraft({ recommendation: 'revise-first' })
    const result = existingPlanToNormalizedPlan(draft)
    expect(result.warnings).toContainEqual(
      expect.stringContaining('revise-first'),
    )
  })

  it('does not add warning for refine-now recommendation', () => {
    const draft = makeExistingPlanDraft({ recommendation: 'refine-now' })
    const result = existingPlanToNormalizedPlan(draft)
    expect(result.warnings.filter(w => w.includes('recommendation'))).toHaveLength(0)
  })

  it('handles blocked recommendation', () => {
    const draft = makeExistingPlanDraft({ recommendation: 'blocked' })
    const result = existingPlanToNormalizedPlan(draft)
    expect(result.warnings).toContainEqual(expect.stringContaining('blocked'))
  })
})

// ============================================================================
// KB Persistence Tests (AC-3, AC-5, AC-6, AC-8)
// ============================================================================

describe('normalizedPlanToKbInput', () => {
  it('produces valid KbPlanInput with status=draft (AC-3, AC-8)', () => {
    const draft = makeBrainstormDraft()
    const normalized = brainstormToNormalizedPlan(draft)
    const kbInput = normalizedPlanToKbInput(normalized)

    const validated = KbPlanInputSchema.parse(kbInput)
    expect(validated.status).toBe('draft')
    expect(validated.plan_slug).toBe('user-authentication-system')
    expect(validated.title).toBe('User Authentication System')
  })

  it('maps priority to P1-P5 format', () => {
    const draft = makeBrainstormDraft()
    const normalized = brainstormToNormalizedPlan(draft)
    const kbInput = normalizedPlanToKbInput(normalized)

    expect(kbInput.priority).toBe('P3') // 'medium' -> P3
  })

  it('generates non-empty raw_content markdown', () => {
    const draft = makeBrainstormDraft()
    const normalized = brainstormToNormalizedPlan(draft)
    const kbInput = normalizedPlanToKbInput(normalized)

    expect(kbInput.raw_content).toBeTruthy()
    expect(kbInput.raw_content).toContain('# User Authentication System')
    expect(kbInput.raw_content).toContain('## Problem Statement')
    expect(kbInput.raw_content).toContain('## User Flows')
  })

  it('includes tags and dependencies', () => {
    const draft = makeBrainstormDraft({
      tags: ['auth'],
      dependencies: ['users-table'],
    })
    const normalized = brainstormToNormalizedPlan(draft)
    const kbInput = normalizedPlanToKbInput(normalized)

    expect(kbInput.tags).toContain('auth')
    expect(kbInput.tags).toContain('source:brainstorm')
    expect(kbInput.dependencies).toContain('users-table')
  })

  it('resulting plan has valid planSlug for KB lookup (AC-5)', () => {
    const draft = makeBrainstormDraft()
    const normalized = brainstormToNormalizedPlan(draft)
    const kbInput = normalizedPlanToKbInput(normalized)

    expect(kbInput.plan_slug).toBeTruthy()
    expect(kbInput.plan_slug).toBe('user-authentication-system')
    expect(kbInput.plan_slug).not.toContain(' ')
  })

  it('validates output against both NormalizedPlanSchema and KbPlanInputSchema (AC-6)', () => {
    const draft = makeBrainstormDraft()
    const normalized = brainstormToNormalizedPlan(draft)
    const kbInput = normalizedPlanToKbInput(normalized)

    // Both validations should pass
    expect(() => NormalizedPlanSchema.parse(normalized)).not.toThrow()
    expect(() => KbPlanInputSchema.parse(kbInput)).not.toThrow()
  })

  it('accepts optional overrides (storyPrefix, planType)', () => {
    const draft = makeBrainstormDraft()
    const normalized = brainstormToNormalizedPlan(draft)
    const kbInput = normalizedPlanToKbInput(normalized, {
      storyPrefix: 'AUTH',
      planType: 'feature:auth',
      sourceFile: '/plans/auth.md',
    })

    expect(kbInput.story_prefix).toBe('AUTH')
    expect(kbInput.plan_type).toBe('feature:auth')
    expect(kbInput.source_file).toBe('/plans/auth.md')
  })
})

describe('persistDraftPlan', () => {
  it('calls kbUpsertPlan with correct input and returns slug', async () => {
    const draft = makeBrainstormDraft()
    const normalized = brainstormToNormalizedPlan(draft)

    const mockUpsert = async (input: { plan_slug: string }) => ({
      plan_slug: input.plan_slug,
    })

    const result = await persistDraftPlan(normalized, mockUpsert)
    expect(result).toBe('user-authentication-system')
  })

  it('returns null when kbUpsertPlan returns null', async () => {
    const draft = makeBrainstormDraft()
    const normalized = brainstormToNormalizedPlan(draft)

    const mockUpsert = async () => null

    const result = await persistDraftPlan(normalized, mockUpsert)
    expect(result).toBeNull()
  })
})

// ============================================================================
// Utility Tests
// ============================================================================

describe('slugify', () => {
  it('converts title to lowercase kebab-case', () => {
    expect(slugify('My Cool Plan')).toBe('my-cool-plan')
  })

  it('removes special characters', () => {
    expect(slugify('Hello World!!! 123')).toBe('hello-world-123')
  })

  it('collapses multiple hyphens', () => {
    expect(slugify('foo---bar')).toBe('foo-bar')
  })

  it('trims leading/trailing hyphens', () => {
    expect(slugify('-foo-bar-')).toBe('foo-bar')
  })
})

describe('mapPriority', () => {
  it('maps standard priorities', () => {
    expect(mapPriority('critical')).toBe('P1')
    expect(mapPriority('high')).toBe('P2')
    expect(mapPriority('medium')).toBe('P3')
    expect(mapPriority('low')).toBe('P4')
    expect(mapPriority('lowest')).toBe('P5')
  })

  it('defaults unknown priorities to P3', () => {
    expect(mapPriority('unknown')).toBe('P3')
    expect(mapPriority('')).toBe('P3')
  })
})
