/**
 * Integration Tests for Story Management MCP Tools
 * WINT-0090 AC-10: Full lifecycle testing with real database connections
 *
 * These tests verify the end-to-end behavior of all 4 story management tools
 * with actual database operations (not mocks).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import { db } from '@repo/db'
import { stories, storyStates, storyTransitions } from '@repo/knowledge-base/db'
import { eq } from 'drizzle-orm'
import { storyGetStatus } from '../story-get-status'
import { storyUpdateStatus } from '../story-update-status'
import { storyGetByStatus } from '../story-get-by-status'
import { storyGetByFeature } from '../story-get-by-feature'

describe('Story Management Integration Tests', () => {
  let testStoryId: string
  let testStoryUuid: string

  beforeAll(async () => {
    // Create test story for integration tests
    testStoryId = 'TEST-9999'
    testStoryUuid = randomUUID()

    await db.insert(stories).values({
      id: testStoryUuid,
      storyId: testStoryId,
      title: 'Integration Test Story',
      description: 'Test story for WINT-0090 integration tests',
      storyType: 'feature',
      epic: 'TEST',
      wave: 99,
      priority: 'P4',
      state: 'backlog',
    })
  })

  afterAll(async () => {
    // Cleanup test data (cascade deletes storyStates and storyTransitions)
    await db.delete(stories).where(eq(stories.id, testStoryUuid))
  })

  it('should complete full lifecycle: get → update → verify', async () => {
    // 1. Get initial status
    const initialStatus = await storyGetStatus({ storyId: testStoryId })
    expect(initialStatus).not.toBeNull()
    expect(initialStatus?.state).toBe('backlog')

    // 2. Update status to ready
    const updated1 = await storyUpdateStatus({
      storyId: testStoryId,
      newState: 'ready',
      reason: 'Integration test transition 1',
      triggeredBy: 'integration-test',
    })
    expect(updated1).not.toBeNull()
    expect(updated1?.state).toBe('ready')

    // 3. Verify state change persisted
    const status1 = await storyGetStatus({ storyId: testStoryId })
    expect(status1?.state).toBe('ready')

    // 4. Update status to in_progress
    const updated2 = await storyUpdateStatus({
      storyId: testStoryId,
      newState: 'in_progress',
      reason: 'Integration test transition 2',
      triggeredBy: 'integration-test',
    })
    expect(updated2?.state).toBe('in_progress')

    // 5. Verify final state
    const finalStatus = await storyGetStatus({ storyId: testStoryId })
    expect(finalStatus?.state).toBe('in_progress')
  })

  it('should track state transitions atomically', async () => {
    // Update story state
    await storyUpdateStatus({
      storyId: testStoryId,
      newState: 'ready_for_qa',
      reason: 'Testing atomicity',
      triggeredBy: 'integration-test',
    })

    // Verify storyStates has new entry
    const stateEntries = await db
      .select()
      .from(storyStates)
      .where(eq(storyStates.storyId, testStoryUuid))

    expect(stateEntries.length).toBeGreaterThan(0)
    const latestState = stateEntries.find(s => s.state === 'ready_for_qa')
    expect(latestState).toBeDefined()
    expect(latestState?.triggeredBy).toBe('integration-test')

    // Verify storyTransitions recorded transition
    const transitions = await db
      .select()
      .from(storyTransitions)
      .where(eq(storyTransitions.storyId, testStoryUuid))

    expect(transitions.length).toBeGreaterThan(0)
    const qaTransition = transitions.find(t => t.toState === 'ready_for_qa')
    expect(qaTransition).toBeDefined()
    expect(qaTransition?.reason).toBe('Testing atomicity')
  })

  it('should query stories by status with pagination', async () => {
    // Update to known state
    await storyUpdateStatus({
      storyId: testStoryId,
      newState: 'in_qa',
    })

    // Query by status
    const qaStories = await storyGetByStatus({
      state: 'in_qa',
      limit: 10,
      offset: 0,
    })

    expect(Array.isArray(qaStories)).toBe(true)
    const testStory = qaStories.find(s => s.storyId === testStoryId)
    expect(testStory).toBeDefined()
    expect(testStory?.state).toBe('in_qa')
  })

  it('should query stories by epic with pagination', async () => {
    const testStories = await storyGetByFeature({
      epic: 'TEST',
      limit: 10,
      offset: 0,
    })

    expect(Array.isArray(testStories)).toBe(true)
    const testStory = testStories.find(s => s.storyId === testStoryId)
    expect(testStory).toBeDefined()
    expect(testStory?.epic).toBe('TEST')
  })

  it('should handle pagination edge cases', async () => {
    // Offset beyond total count
    const beyondOffset = await storyGetByStatus({
      state: 'backlog',
      limit: 10,
      offset: 999999,
    })
    expect(beyondOffset).toEqual([])

    // Limit = 1 (minimal pagination)
    const minimalPage = await storyGetByFeature({
      epic: 'TEST',
      limit: 1,
      offset: 0,
    })
    expect(minimalPage.length).toBeLessThanOrEqual(1)
  })

  it('should handle dual ID support (UUID vs human-readable)', async () => {
    // Query by UUID
    const byUuid = await storyGetStatus({ storyId: testStoryUuid })
    expect(byUuid).not.toBeNull()

    // Query by human-readable ID
    const byHumanId = await storyGetStatus({ storyId: testStoryId })
    expect(byHumanId).not.toBeNull()

    // Both should return same story
    expect(byUuid?.id).toBe(byHumanId?.id)
  })
})
