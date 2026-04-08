/**
 * Tests for story CRUD operations: kb_create_story, kb_update_story, kb_get_story,
 * and kb_update_story_status (including artifact gate enforcement).
 *
 * These are integration tests that run against a real PostgreSQL database
 * (ADR-005). The tests require the content columns added by KFMB-1020 to
 * exist in the stories table. A pre-check at the top of the file guards
 * against running against an unmigrated schema.
 *
 * Database: postgres://localhost:5433 (configurable via DB_URL env var)
 *
 * @see KFMB-1020 for story and acceptance criteria
 * @see PIPE-0030 for artifact gate enforcement tests
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { eq, and } from 'drizzle-orm'
import { ZodError } from 'zod'
import { logger } from '@repo/logger'
import { getDbClient } from '../../db/client.js'
import { stories, planStoryLinks, storyArtifacts, storyDependencies } from '../../db/schema.js'
import {
  kb_create_story,
  kb_create_stories_batch,
  kb_get_story,
  kb_list_stories,
  kb_update_story,
  kb_update_story_status,
  kb_add_dependency,
  kb_get_story_plan_links,
  KbCreateStoryInputSchema,
  KbUpdateStoryInputSchema,
} from '../story-crud-operations.js'
import { artifact_write } from '../artifact-operations.js'

// Mock filesystem operations so artifact_write does not write real files
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('js-yaml', () => ({
  dump: (obj: unknown) => `# yaml
${JSON.stringify(obj, null, 2)}
`,
}))

// ============================================================================
// Test Setup
// ============================================================================

const db = getDbClient()
const deps = { db }

// Unique test prefix to avoid conflicts with real data
const TEST_PREFIX = `TEST-${Date.now()}`
const testStoryIds: string[] = []

function makeStoryId(suffix: string): string {
  return `${TEST_PREFIX}-${suffix}`
}

// ============================================================================
// Pre-check: Verify content columns exist
// ============================================================================

beforeAll(async () => {
  // Check that the content columns exist in the stories table
  // (KFMB-1020 adds description, acceptance_criteria, non_goals, packages)
  const result = await db.execute(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'stories'
       AND column_name IN ('description', 'acceptance_criteria', 'non_goals', 'packages')` as any,
  )
  const found = (result.rows as { column_name: string }[]).map(r => r.column_name)
  const requiredColumns = ['description', 'acceptance_criteria', 'non_goals', 'packages']
  const missingColumns = requiredColumns.filter(col => !found.includes(col))
  if (missingColumns.length > 0) {
    logger.error('Required content columns missing from stories table — migration not applied', {
      missingColumns,
    })
    throw new Error(
      `stories table is missing required content columns: ${missingColumns.join(', ')}. Run KFMB-1020 migration first.`,
    )
  }
})

afterEach(async () => {
  // Clean up all test stories created during test (plan links first due to FK)
  for (const id of testStoryIds) {
    await db.delete(storyDependencies).where(eq(storyDependencies.storyId, id))
    await db.delete(storyDependencies).where(eq(storyDependencies.dependsOnId, id))
    await db.delete(planStoryLinks).where(eq(planStoryLinks.storyId, id))
    await db.delete(stories).where(eq(stories.storyId, id))
  }
  testStoryIds.length = 0
})

afterAll(async () => {
  // Final safety cleanup
  for (const id of testStoryIds) {
    await db.delete(storyDependencies).where(eq(storyDependencies.storyId, id))
    await db.delete(storyDependencies).where(eq(storyDependencies.dependsOnId, id))
    await db.delete(planStoryLinks).where(eq(planStoryLinks.storyId, id))
    await db.delete(stories).where(eq(stories.storyId, id))
  }
})

// ============================================================================
// Happy Path Tests
// ============================================================================

describe('kb_create_story — happy path', () => {
  it('HP-1: creates a new story with required fields only', async () => {
    const storyId = makeStoryId('HP-1')
    testStoryIds.push(storyId)

    const result = await kb_create_story(deps, {
      story_id: storyId,
      title: 'HP-1 Test Story',
    })

    expect(result.created).toBe(true)
    expect(result.story.storyId).toBe(storyId)
    expect(result.story.title).toBe('HP-1 Test Story')
    expect(result.message).toContain('created')
  })

  it('HP-2: updates existing story with partial fields (upsert)', async () => {
    const storyId = makeStoryId('HP-2')
    testStoryIds.push(storyId)

    // Create first
    await kb_create_story(deps, {
      story_id: storyId,
      title: 'HP-2 Original Title',
      epic: 'platform',
    })

    // Update with different title — epic should be preserved
    const result = await kb_create_story(deps, {
      story_id: storyId,
      title: 'HP-2 Updated Title',
    })

    expect(result.created).toBe(false)
    expect(result.story.title).toBe('HP-2 Updated Title')
    // epic was NOT supplied in second call — it must survive
    expect(result.story.epic).toBe('platform')
    expect(result.message).toContain('updated')
  })

  it('HP-3: content fields round-trip through create → get', async () => {
    const storyId = makeStoryId('HP-3')
    testStoryIds.push(storyId)

    const acceptanceCriteria = [
      { id: 'AC-1', text: 'System handles create correctly' },
      { id: 'AC-2', text: 'Partial merge works' },
    ]
    const nonGoals = ['No UI changes', 'No migration required']
    const packages = ['apps/api/knowledge-base']

    await kb_create_story(deps, {
      story_id: storyId,
      title: 'HP-3 Content Round-trip',
      description: 'A test story for content field round-trip',
      acceptance_criteria: acceptanceCriteria,
      non_goals: nonGoals,
      packages,
    })

    const getResult = await kb_get_story(deps, { story_id: storyId })

    expect(getResult.story).not.toBeNull()
    const s = getResult.story!

    expect((s as any).description).toBe('A test story for content field round-trip')
    expect((s as any).acceptanceCriteria).toEqual(acceptanceCriteria)
    expect((s as any).nonGoals).toEqual(nonGoals)
    expect((s as any).packages).toEqual(packages)
  })

  it('HP-4: creates story with all workflow fields', async () => {
    const storyId = makeStoryId('HP-4')
    testStoryIds.push(storyId)

    const result = await kb_create_story(deps, {
      story_id: storyId,
      title: 'HP-4 Full Story',
      feature: 'kfmb',
      epic: 'platform',
      story_type: 'feature',
      points: 3,
      priority: 'medium',
      state: 'backlog',
      phase: 'setup',
      blocked: false,
      touches_backend: true,
      touches_frontend: false,
      touches_database: true,
      touches_infra: false,
    })

    expect(result.created).toBe(true)
    expect(result.story.feature).toBe('kfmb')
    expect(result.story.epic).toBe('platform')
    expect(result.story.storyType).toBe('feature')
    expect(result.story.points).toBe(3)
    expect(result.story.priority).toBe('medium')
    expect(result.story.state).toBe('backlog')
    expect(result.story.touchesBackend).toBe(true)
    expect(result.story.touchesFrontend).toBe(false)
    expect(result.story.touchesDatabase).toBe(true)
  })

  it('HP-5: null content fields are stored and retrieved correctly', async () => {
    const storyId = makeStoryId('HP-5')
    testStoryIds.push(storyId)

    await kb_create_story(deps, {
      story_id: storyId,
      title: 'HP-5 Null Content Fields',
      description: null,
      acceptance_criteria: null,
      non_goals: null,
      packages: null,
    })

    const getResult = await kb_get_story(deps, { story_id: storyId })
    const s = getResult.story!

    expect((s as any).description).toBeNull()
    expect((s as any).acceptanceCriteria).toBeNull()
    expect((s as any).nonGoals).toBeNull()
    expect((s as any).packages).toBeNull()
  })
})

// ============================================================================
// HP-6: Access Control — kb_create_story registered in ToolNameSchema
// ============================================================================

describe('kb_create_story — access control registration', () => {
  it('HP-6: kb_create_story is in ToolNameSchema and ACCESS_MATRIX', async () => {
    // Import at test time to verify the enum includes kb_create_story
    const { ToolNameSchema } = await import('../../mcp-server/access-control.js')
    const result = ToolNameSchema.safeParse('kb_create_story')
    expect(result.success).toBe(true)
  })

  it('HP-6b: kbCreateStoryToolDefinition is in getToolDefinitions()', async () => {
    const { getToolDefinitions } = await import('../../mcp-server/tool-schemas.js')
    const defs = getToolDefinitions()
    const names = defs.map(d => d.name)
    expect(names).toContain('kb_create_story')
  })

  it('HP-6c: handleKbCreateStory is exported from tool-handlers', async () => {
    const handlers = await import('../../mcp-server/tool-handlers.js')
    expect(typeof (handlers as any).handleKbCreateStory).toBe('function')
  })
})

// ============================================================================
// Error Cases
// ============================================================================

describe('kb_create_story — error cases', () => {
  it('EC-1: throws ZodError when story_id is empty', async () => {
    await expect(
      kb_create_story(deps, { story_id: '', title: 'no id' }),
    ).rejects.toThrow(ZodError)
  })

  it('EC-2: throws when creating new story without title', async () => {
    const storyId = makeStoryId('EC-2')
    testStoryIds.push(storyId)

    await expect(kb_create_story(deps, { story_id: storyId })).rejects.toThrow(
      /title is required/,
    )
  })

  it('EC-3: returns created=false for second call (update path)', async () => {
    const storyId = makeStoryId('EC-3')
    testStoryIds.push(storyId)

    await kb_create_story(deps, { story_id: storyId, title: 'EC-3 Story' })
    const result = await kb_create_story(deps, { story_id: storyId, title: 'EC-3 Updated' })

    expect(result.created).toBe(false)
  })

  it('EC-4: invalid priority enum is rejected by Zod', async () => {
    await expect(
      kb_create_story(deps, {
        story_id: makeStoryId('EC-4'),
        title: 'EC-4 Story',
        priority: 'ultra-high' as any,
      }),
    ).rejects.toThrow(ZodError)
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('kb_create_story — edge cases', () => {
  it('ED-1: partial-merge does NOT clobber existing fields', async () => {
    const storyId = makeStoryId('ED-1')
    testStoryIds.push(storyId)

    // Create with full metadata
    await kb_create_story(deps, {
      story_id: storyId,
      title: 'ED-1 Story',
      epic: 'platform',
      feature: 'kfmb',
      points: 5,
      priority: 'high',
    })

    // Update with only title — all other fields MUST survive
    await kb_create_story(deps, {
      story_id: storyId,
      title: 'ED-1 New Title',
    })

    const getResult = await kb_get_story(deps, { story_id: storyId })
    const s = getResult.story!

    // Only title should change
    expect(s.title).toBe('ED-1 New Title')
    // These must be untouched
    expect(s.epic).toBe('platform')
    expect(s.feature).toBe('kfmb')
    expect(s.points).toBe(5)
    expect(s.priority).toBe('high')
  })

  it('ED-2: explicit null clears a field on update', async () => {
    const storyId = makeStoryId('ED-2')
    testStoryIds.push(storyId)

    await kb_create_story(deps, {
      story_id: storyId,
      title: 'ED-2 Story',
      epic: 'platform',
    })

    // Explicitly null out epic
    await kb_create_story(deps, {
      story_id: storyId,
      epic: null,
    })

    const getResult = await kb_get_story(deps, { story_id: storyId })
    expect(getResult.story!.epic).toBeNull()
    // title must survive
    expect(getResult.story!.title).toBe('ED-2 Story')
  })

  it('ED-3: accepts empty string story_dir and story_file', async () => {
    const storyId = makeStoryId('ED-3')
    testStoryIds.push(storyId)

    const result = await kb_create_story(deps, {
      story_id: storyId,
      title: 'ED-3 Story',
      story_dir: '',
      story_file: '',
    })

    expect(result.story.storyDir).toBe('')
    expect(result.story.storyFile).toBe('')
  })

  it('ED-4: multiple sequential upserts are idempotent', async () => {
    const storyId = makeStoryId('ED-4')
    testStoryIds.push(storyId)

    // Bootstrap 3 times with same data
    for (let i = 0; i < 3; i++) {
      await kb_create_story(deps, {
        story_id: storyId,
        title: 'ED-4 Idempotent Story',
        epic: 'platform',
      })
    }

    const getResult = await kb_get_story(deps, { story_id: storyId })
    expect(getResult.story!.storyId).toBe(storyId)
    expect(getResult.story!.title).toBe('ED-4 Idempotent Story')
    expect(getResult.story!.epic).toBe('platform')
  })
})

// ============================================================================
// kb_update_story content fields (AC-4, AC-5)
// ============================================================================

describe('kb_update_story — content field support', () => {
  it('AC-4: KbUpdateStoryInputSchema accepts content fields', () => {
    const result = KbUpdateStoryInputSchema.safeParse({
      story_id: 'TEST-001',
      description: 'A description',
      acceptance_criteria: [{ id: 'AC-1', text: 'Works' }],
      non_goals: ['No UI changes'],
      packages: ['apps/api'],
    })
    expect(result.success).toBe(true)
  })

  it('AC-5: kb_update_story updates content fields without touching others', async () => {
    const storyId = makeStoryId('AC-5')
    testStoryIds.push(storyId)

    // Create story
    await kb_create_story(deps, {
      story_id: storyId,
      title: 'AC-5 Story',
      epic: 'platform',
      points: 3,
    })

    // Update with content fields only
    const updateResult = await kb_update_story(deps, {
      story_id: storyId,
      description: 'Updated description',
      non_goals: ['No UI'],
      packages: ['apps/api/knowledge-base'],
    })

    expect(updateResult.updated).toBe(true)
    expect((updateResult.story as any).description).toBe('Updated description')
    expect((updateResult.story as any).nonGoals).toEqual(['No UI'])
    expect((updateResult.story as any).packages).toEqual(['apps/api/knowledge-base'])

    // Epic and points must survive
    expect(updateResult.story!.epic).toBe('platform')
    expect(updateResult.story!.points).toBe(3)
  })
})

// ============================================================================
// Zod Schema Validation (AC-3)
// ============================================================================

describe('KbCreateStoryInputSchema — schema validation', () => {
  it('AC-3: schema accepts all documented fields', () => {
    const result = KbCreateStoryInputSchema.safeParse({
      story_id: 'KFMB-1020',
      title: 'kb_create_story MCP Tool',
      feature: 'kfmb',
      epic: 'platform',
      story_dir: 'plans/future/platform/kb-first-migration/in-progress/KFMB-1020',
      story_file: 'story.yaml',
      story_type: 'feature',
      points: 3,
      priority: 'medium',
      state: 'backlog',
      phase: 'setup',
      blocked: false,
      blocked_reason: null,
      blocked_by_story: null,
      touches_backend: true,
      touches_frontend: false,
      touches_database: true,
      touches_infra: false,
      description: 'Adds kb_create_story MCP tool with upsert semantics',
      acceptance_criteria: [{ id: 'AC-1', text: 'Upsert works' }],
      non_goals: ['No UI changes'],
      packages: ['apps/api/knowledge-base'],
    })

    expect(result.success).toBe(true)
  })

  it('AC-3: story_id is required', () => {
    const result = KbCreateStoryInputSchema.safeParse({ title: 'Missing ID' })
    expect(result.success).toBe(false)
  })

  it('AC-3: story_id cannot be empty string', () => {
    const result = KbCreateStoryInputSchema.safeParse({ story_id: '', title: 'Has title' })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// plan_slug — plan_story_links FK wiring
// ============================================================================

describe('kb_create_story — plan_slug wiring', () => {
  // Use a plan slug that must exist in the plans table for the FK to succeed.
  // These tests skip gracefully if no plan with that slug exists.
  const PLAN_SLUG = 'knowledge-base-operations'

  it('PSL-1: creates a plan_story_links row when plan_slug is provided', async () => {
    const storyId = makeStoryId('PSL-1')
    testStoryIds.push(storyId)

    // Check plan exists — skip if not
    const planExists = await db.execute(
      `SELECT 1 FROM plans WHERE plan_slug = '${PLAN_SLUG}' LIMIT 1` as any,
    )
    if ((planExists.rows as unknown[]).length === 0) {
      console.warn(`SKIP PSL-1: plan '${PLAN_SLUG}' not present in DB`)
      return
    }

    await kb_create_story(deps, {
      story_id: storyId,
      title: 'PSL-1 Test Story',
      plan_slug: PLAN_SLUG,
    })

    const links = await db
      .select()
      .from(planStoryLinks)
      .where(and(eq(planStoryLinks.storyId, storyId), eq(planStoryLinks.planSlug, PLAN_SLUG)))

    expect(links).toHaveLength(1)
    expect(links[0]!.linkType).toBe('spawned_from')
  })

  it('PSL-2: calling kb_create_story twice with same plan_slug is idempotent', async () => {
    const storyId = makeStoryId('PSL-2')
    testStoryIds.push(storyId)

    const planExists = await db.execute(
      `SELECT 1 FROM plans WHERE plan_slug = '${PLAN_SLUG}' LIMIT 1` as any,
    )
    if ((planExists.rows as unknown[]).length === 0) {
      console.warn(`SKIP PSL-2: plan '${PLAN_SLUG}' not present in DB`)
      return
    }

    await kb_create_story(deps, { story_id: storyId, title: 'PSL-2 Test Story', plan_slug: PLAN_SLUG })
    // Second call — should not throw a unique constraint error
    await expect(
      kb_create_story(deps, { story_id: storyId, title: 'PSL-2 Updated', plan_slug: PLAN_SLUG }),
    ).resolves.not.toThrow()

    const links = await db
      .select()
      .from(planStoryLinks)
      .where(and(eq(planStoryLinks.storyId, storyId), eq(planStoryLinks.planSlug, PLAN_SLUG)))

    expect(links).toHaveLength(1)
  })
})

describe('kb_list_stories — plan_slug filter', () => {
  const PLAN_SLUG = 'knowledge-base-operations'

  it('PSL-3: plan_slug filter returns only stories linked to that plan', async () => {
    const linkedId = makeStoryId('PSL-3A')
    const unlinkedId = makeStoryId('PSL-3B')
    testStoryIds.push(linkedId, unlinkedId)

    const planExists = await db.execute(
      `SELECT 1 FROM plans WHERE plan_slug = '${PLAN_SLUG}' LIMIT 1` as any,
    )
    if ((planExists.rows as unknown[]).length === 0) {
      console.warn(`SKIP PSL-3: plan '${PLAN_SLUG}' not present in DB`)
      return
    }

    // Create linked story (with plan_slug)
    await kb_create_story(deps, { story_id: linkedId, title: 'PSL-3A linked', plan_slug: PLAN_SLUG })
    // Create unlinked story (no plan_slug)
    await kb_create_story(deps, { story_id: unlinkedId, title: 'PSL-3B unlinked' })

    const result = await kb_list_stories(deps, { plan_slug: PLAN_SLUG, limit: 100 })

    const returnedIds = result.stories.map(s => s.storyId)
    expect(returnedIds).toContain(linkedId)
    expect(returnedIds).not.toContain(unlinkedId)
  })
})

// ============================================================================
// kb_update_story_status — Artifact Gate Enforcement (PIPE-0030)
//
// These tests verify that the ARTIFACT_GATES map in kb_update_story_status
// correctly blocks or allows state transitions based on whether the required
// artifact exists in story_artifacts.
//
// Gate map under test:
//   elab → ready              requires: elaboration
//   in_progress → needs_code_review  requires: proof
//   needs_code_review → ready_for_qa requires: review
//   in_qa → completed         requires: qa_gate
//
// Non-gated transitions (e.g., backlog → created, ready → in_progress,
// created → elab, needs_code_review → failed_code_review) always succeed.
// ============================================================================

describe('kb_update_story_status — artifact gate enforcement', () => {
  const gateTestStoryIds: string[] = []

  afterEach(async () => {
    // Delete storyArtifacts BEFORE stories (no FK cascade on story_id)
    for (const id of gateTestStoryIds) {
      await db.delete(storyArtifacts).where(eq(storyArtifacts.storyId, id))
      await db.delete(planStoryLinks).where(eq(planStoryLinks.storyId, id))
      await db.delete(stories).where(eq(stories.storyId, id))
    }
    gateTestStoryIds.length = 0
  })

  /**
   * Helper: create a story and immediately advance it to the target state
   * through ungated transitions using direct DB updates (avoids artifact
   * requirements for intermediate states).
   */
  async function bootstrapStoryAtState(suffix: string, targetState: string): Promise<string> {
    const storyId = `${TEST_PREFIX}-GATE-${suffix}`
    gateTestStoryIds.push(storyId)

    await kb_create_story(deps, {
      story_id: storyId,
      title: `Gate test story (${suffix})`,
      state: targetState as any,
    })

    return storyId
  }

  /**
   * Helper: write an artifact to story_artifacts so a gate check passes.
   * Uses kb_write_artifact with write_to_kb: true and a temp story_dir.
   */
  async function writeArtifact(storyId: string, artifactType: string): Promise<string> {
    const result = await artifact_write(
      {
        story_id: storyId,
        artifact_type: artifactType as any,
        content: { note: `gate test artifact for ${artifactType}` },
        phase: 'implementation',
        iteration: 0,
        // story_dir is required by artifact_write but fs/promises is mocked at the top of this file
        story_dir: `/tmp/gate-tests/${storyId}`,
        write_to_kb: true,
      },
      deps,
    )
    return result.kb_artifact_id!
  }

  // --------------------------------------------------------------------------
  // AC-1, AC-9, AC-10 — in_progress → needs_code_review REJECTED (no proof)
  // --------------------------------------------------------------------------
  it('EC-1: in_progress → needs_code_review rejected when no proof artifact exists', async () => {
    const storyId = await bootstrapStoryAtState('EC1', 'in_progress')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'needs_code_review',
    })

    // AC-10: updated must be false
    expect(result.updated).toBe(false)
    // AC-9: message must name the missing artifact type
    expect(result.message).toContain('proof')
    expect(result.message).toContain('not found in KB')
    // State must be unchanged
    expect(result.story?.state).toBe('in_progress')
  })

  // --------------------------------------------------------------------------
  // AC-3 — needs_code_review → ready_for_qa REJECTED (no review)
  // --------------------------------------------------------------------------
  it('EC-2: needs_code_review → ready_for_qa rejected when no review artifact exists', async () => {
    const storyId = await bootstrapStoryAtState('EC2', 'needs_code_review')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'ready_for_qa',
    })

    expect(result.updated).toBe(false)
    expect(result.message).toContain('review')
    expect(result.message).toContain('not found in KB')
    expect(result.story?.state).toBe('needs_code_review')
  })

  // --------------------------------------------------------------------------
  // AC-5 — in_qa → completed REJECTED (no qa_gate)
  // --------------------------------------------------------------------------
  it('EC-3: in_qa → completed rejected when no qa_gate artifact exists', async () => {
    const storyId = await bootstrapStoryAtState('EC3', 'in_qa')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'completed',
    })

    expect(result.updated).toBe(false)
    expect(result.message).toContain('qa_gate')
    expect(result.message).toContain('not found in KB')
    expect(result.story?.state).toBe('in_qa')
  })

  // --------------------------------------------------------------------------
  // AC-7 — elab → ready REJECTED (no elaboration)
  // --------------------------------------------------------------------------
  it('EC-4: elab → ready rejected when no elaboration artifact exists', async () => {
    const storyId = await bootstrapStoryAtState('EC4', 'elab')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'ready',
    })

    expect(result.updated).toBe(false)
    expect(result.message).toContain('elaboration')
    expect(result.message).toContain('not found in KB')
    expect(result.story?.state).toBe('elab')
  })

  // --------------------------------------------------------------------------
  // AC-2 — in_progress → needs_code_review SUCCEEDS with proof artifact
  // --------------------------------------------------------------------------
  it('HP-1: in_progress → needs_code_review succeeds when proof artifact exists', async () => {
    const storyId = await bootstrapStoryAtState('HP1', 'in_progress')
    await writeArtifact(storyId, 'proof')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'needs_code_review',
    })

    expect(result.updated).toBe(true)
    expect(result.story?.state).toBe('needs_code_review')
  })

  // --------------------------------------------------------------------------
  // AC-4 — needs_code_review → ready_for_qa SUCCEEDS with review artifact
  // --------------------------------------------------------------------------
  it('HP-2: needs_code_review → ready_for_qa succeeds when review artifact exists', async () => {
    const storyId = await bootstrapStoryAtState('HP2', 'needs_code_review')
    await writeArtifact(storyId, 'review')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'ready_for_qa',
    })

    expect(result.updated).toBe(true)
    expect(result.story?.state).toBe('ready_for_qa')
  })

  // --------------------------------------------------------------------------
  // AC-6 — in_qa → completed SUCCEEDS with qa_gate artifact
  // --------------------------------------------------------------------------
  it('HP-3: in_qa → completed succeeds when qa_gate artifact exists', async () => {
    const storyId = await bootstrapStoryAtState('HP3', 'in_qa')
    await writeArtifact(storyId, 'qa_gate')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'completed',
    })

    expect(result.updated).toBe(true)
    expect(result.story?.state).toBe('completed')
  })

  // --------------------------------------------------------------------------
  // AC-8 — elab → ready SUCCEEDS with elaboration artifact
  // --------------------------------------------------------------------------
  it('HP-4: elab → ready succeeds when elaboration artifact exists', async () => {
    const storyId = await bootstrapStoryAtState('HP4', 'elab')
    await writeArtifact(storyId, 'elaboration')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'ready',
    })

    expect(result.updated).toBe(true)
    expect(result.story?.state).toBe('ready')
  })

  // --------------------------------------------------------------------------
  // AC-11 — Ungated transitions proceed without artifact checks (ED-3, HP-5, HP-6, ED-4)
  // --------------------------------------------------------------------------
  it('HP-5: backlog → created (ungated) succeeds without any artifact', async () => {
    const storyId = await bootstrapStoryAtState('HP5', 'backlog')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'created',
    })

    expect(result.updated).toBe(true)
    expect(result.story?.state).toBe('created')
  })

  it('HP-6: ready → in_progress (ungated) succeeds without any artifact', async () => {
    const storyId = await bootstrapStoryAtState('HP6', 'ready')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'in_progress',
    })

    expect(result.updated).toBe(true)
    expect(result.story?.state).toBe('in_progress')
  })

  it('ED-3: created → elab (ungated) succeeds without any artifact', async () => {
    const storyId = await bootstrapStoryAtState('ED3', 'created')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'elab',
    })

    expect(result.updated).toBe(true)
    expect(result.story?.state).toBe('elab')
  })

  it('ED-4: needs_code_review → failed_code_review (ungated) succeeds without any artifact', async () => {
    const storyId = await bootstrapStoryAtState('ED4', 'needs_code_review')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'failed_code_review',
    })

    expect(result.updated).toBe(true)
    expect(result.story?.state).toBe('failed_code_review')
  })

  // --------------------------------------------------------------------------
  // AC-9, AC-10 — Gate rejection: state unchanged, verified via kb_get_story (ED-1, ED-2)
  // --------------------------------------------------------------------------
  it('ED-1: gate rejection leaves story state unchanged (verified via kb_get_story)', async () => {
    const storyId = await bootstrapStoryAtState('ED1', 'in_progress')

    // Attempt gated transition with no proof artifact
    await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'needs_code_review',
    })

    // Confirm state is unchanged
    const getResult = await kb_get_story(deps, { story_id: storyId })
    expect(getResult.story?.state).toBe('in_progress')
  })

  it('ED-2: rejection message includes artifact type and "not found in KB"', async () => {
    const storyId = await bootstrapStoryAtState('ED2', 'elab')

    const result = await kb_update_story_status(deps, {
      story_id: storyId,
      state: 'ready',
    })

    expect(result.updated).toBe(false)
    expect(result.message).toMatch(/elaboration/)
    expect(result.message).toMatch(/not found in KB/)
  })
})

// ============================================================================
// kb_add_dependency Tests
// ============================================================================

describe('kb_add_dependency', () => {
  it('creates a dependency between two stories', async () => {
    const storyA = makeStoryId('DEP-A')
    const storyB = makeStoryId('DEP-B')
    testStoryIds.push(storyA, storyB)

    await kb_create_story(deps, { story_id: storyA, title: 'Story A' })
    await kb_create_story(deps, { story_id: storyB, title: 'Story B' })

    const result = await kb_add_dependency(deps, {
      story_id: storyB,
      depends_on_id: storyA,
      dependency_type: 'depends_on',
    })

    expect(result.created).toBe(true)
    expect(result.message).toContain('Dependency created')
  })

  it('is idempotent — duplicate insert returns created=false', async () => {
    const storyA = makeStoryId('DEP-IDEM-A')
    const storyB = makeStoryId('DEP-IDEM-B')
    testStoryIds.push(storyA, storyB)

    await kb_create_story(deps, { story_id: storyA, title: 'Story A' })
    await kb_create_story(deps, { story_id: storyB, title: 'Story B' })

    await kb_add_dependency(deps, {
      story_id: storyB,
      depends_on_id: storyA,
      dependency_type: 'depends_on',
    })

    const result = await kb_add_dependency(deps, {
      story_id: storyB,
      depends_on_id: storyA,
      dependency_type: 'depends_on',
    })

    expect(result.created).toBe(false)
    expect(result.message).toContain('already exists')
  })

  it('rejects self-referential dependency', async () => {
    const storyA = makeStoryId('DEP-SELF')
    testStoryIds.push(storyA)

    await kb_create_story(deps, { story_id: storyA, title: 'Story A' })

    const result = await kb_add_dependency(deps, {
      story_id: storyA,
      depends_on_id: storyA,
      dependency_type: 'depends_on',
    })

    expect(result.created).toBe(false)
    expect(result.message).toContain('self-referential')
  })

  it('dependency appears in kb_get_story with include_dependencies', async () => {
    const storyA = makeStoryId('DEP-VIS-A')
    const storyB = makeStoryId('DEP-VIS-B')
    testStoryIds.push(storyA, storyB)

    await kb_create_story(deps, { story_id: storyA, title: 'Story A' })
    await kb_create_story(deps, { story_id: storyB, title: 'Story B' })

    await kb_add_dependency(deps, {
      story_id: storyB,
      depends_on_id: storyA,
      dependency_type: 'follow_up_from',
    })

    const result = await kb_get_story(deps, {
      story_id: storyB,
      include_dependencies: true,
    })

    expect(result.dependencies).toBeDefined()
    expect(result.dependencies!.length).toBeGreaterThanOrEqual(1)
    const dep = result.dependencies!.find(
      d => d.storyId === storyB && d.dependsOnId === storyA,
    )
    expect(dep).toBeDefined()
    expect(dep!.dependencyType).toBe('follow_up_from')
  })

  it('rejects orphan — depends_on_id does not exist', async () => {
    const storyA = makeStoryId('DEP-ORPH-A')
    testStoryIds.push(storyA)

    await kb_create_story(deps, { story_id: storyA, title: 'Story A' })

    const result = await kb_add_dependency(deps, {
      story_id: storyA,
      depends_on_id: 'NONEXISTENT-STORY-999',
      dependency_type: 'depends_on',
    })

    expect(result.created).toBe(false)
    expect(result.message).toContain('depends_on_id not found')
  })

  it('rejects orphan — story_id does not exist', async () => {
    const storyA = makeStoryId('DEP-ORPH-B')
    testStoryIds.push(storyA)

    await kb_create_story(deps, { story_id: storyA, title: 'Story A' })

    const result = await kb_add_dependency(deps, {
      story_id: 'NONEXISTENT-STORY-999',
      depends_on_id: storyA,
      dependency_type: 'depends_on',
    })

    expect(result.created).toBe(false)
    expect(result.message).toContain('story_id not found')
  })

  it('rejects direct cycle A→B→A', async () => {
    const storyA = makeStoryId('DEP-CYC2-A')
    const storyB = makeStoryId('DEP-CYC2-B')
    testStoryIds.push(storyA, storyB)

    await kb_create_story(deps, { story_id: storyA, title: 'Story A' })
    await kb_create_story(deps, { story_id: storyB, title: 'Story B' })

    // Create A depends_on B
    const first = await kb_add_dependency(deps, {
      story_id: storyA,
      depends_on_id: storyB,
      dependency_type: 'depends_on',
    })
    expect(first.created).toBe(true)

    // Try B depends_on A — should detect cycle
    const result = await kb_add_dependency(deps, {
      story_id: storyB,
      depends_on_id: storyA,
      dependency_type: 'depends_on',
    })

    expect(result.created).toBe(false)
    expect(result.message).toContain('Cycle detected')
  })

  it('rejects transitive cycle A→B→C→A', async () => {
    const storyA = makeStoryId('DEP-CYC3-A')
    const storyB = makeStoryId('DEP-CYC3-B')
    const storyC = makeStoryId('DEP-CYC3-C')
    testStoryIds.push(storyA, storyB, storyC)

    await kb_create_story(deps, { story_id: storyA, title: 'Story A' })
    await kb_create_story(deps, { story_id: storyB, title: 'Story B' })
    await kb_create_story(deps, { story_id: storyC, title: 'Story C' })

    // Create chain: A depends_on B, B depends_on C
    await kb_add_dependency(deps, {
      story_id: storyA,
      depends_on_id: storyB,
      dependency_type: 'depends_on',
    })
    await kb_add_dependency(deps, {
      story_id: storyB,
      depends_on_id: storyC,
      dependency_type: 'depends_on',
    })

    // Try C depends_on A — should detect transitive cycle
    const result = await kb_add_dependency(deps, {
      story_id: storyC,
      depends_on_id: storyA,
      dependency_type: 'depends_on',
    })

    expect(result.created).toBe(false)
    expect(result.message).toContain('Cycle detected')
  })

  it('allows valid dependency chain without cycle', async () => {
    const storyA = makeStoryId('DEP-CHAIN-A')
    const storyB = makeStoryId('DEP-CHAIN-B')
    const storyC = makeStoryId('DEP-CHAIN-C')
    testStoryIds.push(storyA, storyB, storyC)

    await kb_create_story(deps, { story_id: storyA, title: 'Story A' })
    await kb_create_story(deps, { story_id: storyB, title: 'Story B' })
    await kb_create_story(deps, { story_id: storyC, title: 'Story C' })

    // A depends_on B, B depends_on C — no cycle
    const r1 = await kb_add_dependency(deps, {
      story_id: storyA,
      depends_on_id: storyB,
      dependency_type: 'depends_on',
    })
    expect(r1.created).toBe(true)

    const r2 = await kb_add_dependency(deps, {
      story_id: storyB,
      depends_on_id: storyC,
      dependency_type: 'depends_on',
    })
    expect(r2.created).toBe(true)
  })
})

// ============================================================================
// kb_get_story_plan_links Tests
// ============================================================================

describe('kb_get_story_plan_links', () => {
  it('returns empty when story has no plan links', async () => {
    const storyId = makeStoryId('PLAN-NONE')
    testStoryIds.push(storyId)

    await kb_create_story(deps, { story_id: storyId, title: 'No Plan Story' })

    const result = await kb_get_story_plan_links(deps, { story_id: storyId })

    expect(result.links).toEqual([])
    expect(result.message).toContain('No plan links')
  })

  it('returns plan link when story was created with plan_slug', async () => {
    const storyId = makeStoryId('PLAN-HAS')
    testStoryIds.push(storyId)

    // Need a plan to exist first — use raw insert to avoid depending on plan-operations
    // Check if a test plan exists, create one if not
    const testPlanSlug = `test-plan-${Date.now()}`
    const { plans } = await import('../../db/schema.js')
    await db
      .insert(plans)
      .values({
        planSlug: testPlanSlug,
        title: 'Test Plan',
        type: 'feature',
        status: 'draft',
        summary: 'Test plan for plan links test',
      })
      .onConflictDoNothing()

    try {
      await kb_create_story(deps, {
        story_id: storyId,
        title: 'Plan-Linked Story',
        plan_slug: testPlanSlug,
      })

      const result = await kb_get_story_plan_links(deps, { story_id: storyId })

      expect(result.links.length).toBeGreaterThanOrEqual(1)
      const link = result.links.find(l => l.plan_slug === testPlanSlug)
      expect(link).toBeDefined()
      expect(link!.link_type).toBe('spawned_from')
    } finally {
      // Clean up test plan
      await db.delete(planStoryLinks).where(eq(planStoryLinks.planSlug, testPlanSlug))
      await db.delete(plans).where(eq(plans.planSlug, testPlanSlug))
    }
  })
})

// ============================================================================
// kb_create_stories_batch Tests
// ============================================================================

describe('kb_create_stories_batch', () => {
  it('BATCH-1: creates multiple stories atomically', async () => {
    const idA = makeStoryId('BATCH-1-A')
    const idB = makeStoryId('BATCH-1-B')
    const idC = makeStoryId('BATCH-1-C')
    testStoryIds.push(idA, idB, idC)

    const result = await kb_create_stories_batch(deps, {
      stories: [
        { story_id: idA, title: 'Batch Story A' },
        { story_id: idB, title: 'Batch Story B' },
        { story_id: idC, title: 'Batch Story C' },
      ],
    })

    expect(result.created_count).toBe(3)
    expect(result.updated_count).toBe(0)
    expect(result.results).toHaveLength(3)

    // Verify all stories exist
    for (const id of [idA, idB, idC]) {
      const get = await kb_get_story(deps, { story_id: id })
      expect(get.story).not.toBeNull()
    }
  })

  it('BATCH-2: stories with blockedByStory references within the same batch succeed regardless of order', async () => {
    const idA = makeStoryId('BATCH-2-A')
    const idB = makeStoryId('BATCH-2-B')
    testStoryIds.push(idA, idB)

    // Insert B first (which references A via blocked_by_story), then A.
    // With deferred constraints, this should succeed even though A does not
    // exist yet when B is inserted.
    const result = await kb_create_stories_batch(deps, {
      stories: [
        { story_id: idB, title: 'Batch Story B (blocked by A)', blocked_by_story: idA },
        { story_id: idA, title: 'Batch Story A' },
      ],
    })

    expect(result.created_count).toBe(2)
    expect(result.results[0]!.story_id).toBe(idB)
    expect(result.results[1]!.story_id).toBe(idA)

    // Verify B has correct blocked_by_story
    const getB = await kb_get_story(deps, { story_id: idB })
    expect(getB.story).not.toBeNull()
    expect(getB.story!.blockedByStory).toBe(idA)
  })

  it('BATCH-3: invalid story causes entire batch to roll back', async () => {
    const idGood = makeStoryId('BATCH-3-GOOD')
    const idBad = makeStoryId('BATCH-3-BAD')
    testStoryIds.push(idGood, idBad)

    // Second story has no title and is new — should fail title validation
    await expect(
      kb_create_stories_batch(deps, {
        stories: [
          { story_id: idGood, title: 'Good Story' },
          { story_id: idBad },
        ],
      }),
    ).rejects.toThrow(/Batch story creation failed at story index 1/)

    // Verify first story was NOT created (rollback)
    const getGood = await kb_get_story(deps, { story_id: idGood })
    expect(getGood.story).toBeNull()
  })

  it('BATCH-4: batch with plan_slug creates plan_story_links for all stories', async () => {
    const idA = makeStoryId('BATCH-4-A')
    const idB = makeStoryId('BATCH-4-B')
    testStoryIds.push(idA, idB)

    const testPlanSlug = `test-batch-plan-${Date.now()}`
    const { plans } = await import('../../db/schema.js')
    await db
      .insert(plans)
      .values({
        planSlug: testPlanSlug,
        title: 'Test Batch Plan',
        type: 'feature',
        status: 'draft',
        summary: 'Test plan for batch links test',
      })
      .onConflictDoNothing()

    try {
      await kb_create_stories_batch(deps, {
        stories: [
          { story_id: idA, title: 'Batch Plan Story A', plan_slug: testPlanSlug },
          { story_id: idB, title: 'Batch Plan Story B', plan_slug: testPlanSlug },
        ],
      })

      // Verify plan links exist for both stories
      const linksA = await kb_get_story_plan_links(deps, { story_id: idA })
      const linksB = await kb_get_story_plan_links(deps, { story_id: idB })

      expect(linksA.links.find(l => l.plan_slug === testPlanSlug)).toBeDefined()
      expect(linksB.links.find(l => l.plan_slug === testPlanSlug)).toBeDefined()
    } finally {
      await db.delete(planStoryLinks).where(eq(planStoryLinks.planSlug, testPlanSlug))
      await db.delete(plans).where(eq(plans.planSlug, testPlanSlug))
    }
  })

  it('BATCH-5: empty stories array is rejected by Zod validation', async () => {
    await expect(
      kb_create_stories_batch(deps, { stories: [] }),
    ).rejects.toThrow()
  })

  it('BATCH-6: upsert semantics — existing stories are updated, new ones created', async () => {
    const idExisting = makeStoryId('BATCH-6-EXIST')
    const idNew = makeStoryId('BATCH-6-NEW')
    testStoryIds.push(idExisting, idNew)

    // Pre-create one story
    await kb_create_story(deps, {
      story_id: idExisting,
      title: 'Original Title',
    })

    const result = await kb_create_stories_batch(deps, {
      stories: [
        { story_id: idExisting, title: 'Updated Title' },
        { story_id: idNew, title: 'New Story' },
      ],
    })

    expect(result.created_count).toBe(1)
    expect(result.updated_count).toBe(1)
    expect(result.results.find(r => r.story_id === idExisting)!.created).toBe(false)
    expect(result.results.find(r => r.story_id === idNew)!.created).toBe(true)

    // Verify update applied
    const getExisting = await kb_get_story(deps, { story_id: idExisting })
    expect(getExisting.story!.title).toBe('Updated Title')
  })
})
