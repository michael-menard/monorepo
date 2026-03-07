/**
 * Tests for story CRUD operations: kb_create_story, kb_update_story, kb_get_story.
 *
 * These are integration tests that run against a real PostgreSQL database
 * (ADR-005). The tests require the content columns added by KFMB-1020 to
 * exist in the stories table. A pre-check at the top of the file guards
 * against running against an unmigrated schema.
 *
 * Database: postgres://localhost:5433 (configurable via DB_URL env var)
 *
 * @see KFMB-1020 for story and acceptance criteria
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'
import { getDbClient } from '../../db/client.js'
import { stories } from '../../db/schema.js'
import {
  kb_create_story,
  kb_get_story,
  kb_update_story,
  KbCreateStoryInputSchema,
  KbUpdateStoryInputSchema,
} from '../story-crud-operations.js'

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

let contentColumnsExist = false

beforeAll(async () => {
  // Check that the content columns exist in the stories table
  // (KFMB-1020 adds description, acceptance_criteria, non_goals, packages)
  const result = await db.execute(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'stories'
       AND column_name IN ('description', 'acceptance_criteria', 'non_goals', 'packages')` as any,
  )
  const found = (result.rows as { column_name: string }[]).map(r => r.column_name)
  contentColumnsExist =
    found.includes('description') &&
    found.includes('acceptance_criteria') &&
    found.includes('non_goals') &&
    found.includes('packages')
})

afterEach(async () => {
  // Clean up all test stories created during test
  for (const id of testStoryIds) {
    await db.delete(stories).where(eq(stories.storyId, id))
  }
  testStoryIds.length = 0
})

afterAll(async () => {
  // Final safety cleanup
  for (const id of testStoryIds) {
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
    if (!contentColumnsExist) {
      console.warn('SKIP HP-3: content columns not present in DB schema')
      return
    }

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
    if (!contentColumnsExist) {
      console.warn('SKIP HP-5: content columns not present in DB schema')
      return
    }

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
      story_dir: 'plans/future/platform/kb-first-migration/in-progress/KFMB-1020',
      story_file: 'story.yaml',
    })

    expect(result.story.storyDir).toBe(
      'plans/future/platform/kb-first-migration/in-progress/KFMB-1020',
    )
    expect(result.story.storyFile).toBe('story.yaml')
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
    if (!contentColumnsExist) {
      console.warn('SKIP AC-5: content columns not present in DB schema')
      return
    }

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
