/**
 * Integration Tests: Story Compatibility Shim Module
 * WINT-1011 AC-1 through AC-5, CDBN-3010: DB-only operations
 * Real PostgreSQL (ADR-005: no DB mocks in integration tests)
 *
 * Test scenarios:
 * - shimGetStoryStatus — DB-hit path (story in DB)
 * - shimUpdateStoryStatus — write success to real DB
 * - shimGetStoriesByStatus — DB results returned
 * - shimGetStoriesByFeature — DB results returned
 * - Return types conform to WINT-0090 output schemas
 *
 * Prerequisites:
 * - Local PostgreSQL running
 * - Test story created in beforeAll, cleaned up in afterAll
 * - Test epic='TEST', wave=99, priority='P4'
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import { db } from '@repo/db'
import { stories } from '@repo/knowledge-base/db'
import { eq } from 'drizzle-orm'
import {
  shimGetStoryStatus,
  shimUpdateStoryStatus,
  shimGetStoriesByStatus,
  shimGetStoriesByFeature,
} from '../../index.js'
import {
  StoryGetStatusOutputSchema,
  StoryUpdateStatusOutputSchema,
  StoryGetByStatusOutputSchema,
  StoryGetByFeatureOutputSchema,
} from '../../../story-management/__types__/index.js'

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe('Story Compatibility Shim — Integration Tests (real PostgreSQL, DB-only)', () => {
  let testStoryId: string
  let testStoryUuid: string

  beforeAll(async () => {
    testStoryId = 'TEST-8887'
    testStoryUuid = randomUUID()

    await db.insert(stories).values({
      id: testStoryUuid,
      storyId: testStoryId,
      title: 'Shim Integration Test Story',
      description: 'Test story for WINT-1011 shim integration tests',
      storyType: 'feature',
      epic: 'TEST',
      wave: 99,
      priority: 'P4',
      state: 'backlog',
    })
  })

  afterAll(async () => {
    await db.delete(stories).where(eq(stories.id, testStoryUuid))
  })

  // ---------------------------------------------------------------------------
  // shimGetStoryStatus
  // ---------------------------------------------------------------------------

  it('shimGetStoryStatus — DB-hit path (queried by UUID)', async () => {
    const result = await shimGetStoryStatus({ storyId: testStoryUuid })

    expect(result).not.toBeNull()
    expect(result?.storyId).toBe(testStoryId)
    expect(result?.state).toBe('backlog')
    expect(result?.epic).toBe('TEST')
    expect(result?.id).toBe(testStoryUuid)

    const parsed = StoryGetStatusOutputSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  it('shimGetStoryStatus — returns null when story not in database', async () => {
    const result = await shimGetStoryStatus({ storyId: 'GHOST-9999' })

    expect(result).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // shimUpdateStoryStatus
  // ---------------------------------------------------------------------------

  it('shimUpdateStoryStatus — DB write success (by UUID)', async () => {
    const result = await shimUpdateStoryStatus({
      storyId: testStoryUuid,
      newState: 'ready',
      reason: 'Shim integration test transition',
      triggeredBy: 'shim-integration-test',
    })

    expect(result).not.toBeNull()
    expect(result?.storyId).toBe(testStoryId)
    expect(result?.state).toBe('ready')

    const parsed = StoryUpdateStatusOutputSchema.safeParse(result)
    expect(parsed.success).toBe(true)

    const updated = await shimGetStoryStatus({ storyId: testStoryUuid })
    expect(updated?.state).toBe('ready')
  })

  it('shimUpdateStoryStatus — returns null for non-existent story', async () => {
    const result = await shimUpdateStoryStatus({
      storyId: 'NOTINDB-9999',
      newState: 'completed',
      triggeredBy: 'test',
    })

    expect(result).toBeNull()
  })

  // ---------------------------------------------------------------------------
  // shimGetStoriesByStatus
  // ---------------------------------------------------------------------------

  it('shimGetStoriesByStatus — DB results returned', async () => {
    await shimUpdateStoryStatus({
      storyId: testStoryUuid,
      newState: 'in_progress',
      triggeredBy: 'shim-integration-test',
    })

    const result = await shimGetStoriesByStatus({ state: 'in_progress', limit: 100, offset: 0 })

    expect(Array.isArray(result)).toBe(true)
    const testStory = result.find(s => s.id === testStoryUuid)
    expect(testStory).toBeDefined()
    expect(testStory?.state).toBe('in_progress')

    const parsed = StoryGetByStatusOutputSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // shimGetStoriesByFeature
  // ---------------------------------------------------------------------------

  it('shimGetStoriesByFeature — DB results returned for TEST epic', async () => {
    const result = await shimGetStoriesByFeature({ epic: 'TEST', limit: 10, offset: 0 })

    expect(Array.isArray(result)).toBe(true)
    const testStory = result.find(s => s.id === testStoryUuid)
    expect(testStory).toBeDefined()
    expect(testStory?.epic).toBe('TEST')

    const parsed = StoryGetByFeatureOutputSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Full lifecycle
  // ---------------------------------------------------------------------------

  it('shim get → update → verify lifecycle with real DB', async () => {
    const initial = await shimGetStoryStatus({ storyId: testStoryUuid })
    expect(initial).not.toBeNull()

    const updated = await shimUpdateStoryStatus({
      storyId: testStoryUuid,
      newState: 'ready_for_qa',
      reason: 'Shim lifecycle test',
      triggeredBy: 'shim-integration-test',
    })
    expect(updated?.state).toBe('ready_for_qa')

    const verified = await shimGetStoryStatus({ storyId: testStoryUuid })
    expect(verified?.state).toBe('ready_for_qa')
  })
})
