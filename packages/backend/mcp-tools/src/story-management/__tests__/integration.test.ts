/**
 * Integration Tests for Story Management MCP Tools
 * WINT-0090 AC-10: Full lifecycle testing with real database connections
 * APRS-1010: Artifact gate enforcement integration tests
 *
 * These tests verify the end-to-end behavior of story management tools
 * with actual database operations (not mocks).
 *
 * NOTE: These tests require a live database connection and will be skipped
 * in CI environments without one.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import { db } from '@repo/db'
import { stories, storyStateHistory, storyArtifacts } from '@repo/knowledge-base/db'
import { eq, and } from 'drizzle-orm'
import { storyGetStatus } from '../story-get-status'
import { storyUpdateStatus } from '../story-update-status'
import { storyGetByStatus } from '../story-get-by-status'
import { storyGetByFeature } from '../story-get-by-feature'

describe('Story Management Integration Tests', () => {
  let testStoryId: string

  beforeAll(async () => {
    testStoryId = 'TEST-9999'

    await db.insert(stories).values({
      storyId: testStoryId,
      feature: 'test',
      title: 'Integration Test Story',
      state: 'backlog',
    })
  })

  afterAll(async () => {
    // Cleanup test data
    await db.delete(storyArtifacts).where(eq(storyArtifacts.storyId, testStoryId))
    await db.delete(storyStateHistory).where(eq(storyStateHistory.storyId, testStoryId))
    await db.delete(stories).where(eq(stories.storyId, testStoryId))
  })

  it('should complete full lifecycle: get → update → verify', async () => {
    // 1. Get initial status
    const initialStatus = await storyGetStatus({ storyId: testStoryId })
    expect(initialStatus).not.toBeNull()
    expect(initialStatus?.state).toBe('backlog')

    // 2. Update status to ready (ungated)
    const updated1 = await storyUpdateStatus({
      storyId: testStoryId,
      newState: 'ready',
      reason: 'Integration test transition 1',
      triggeredBy: 'integration-test',
    })
    expect(updated1).not.toBeNull()
    expect(updated1?.state).toBe('ready')
    expect(updated1?.gate_blocked).toBeUndefined()

    // 3. Verify state change persisted
    const status1 = await storyGetStatus({ storyId: testStoryId })
    expect(status1?.state).toBe('ready')

    // 4. Update status to in_progress (ungated)
    const updated2 = await storyUpdateStatus({
      storyId: testStoryId,
      newState: 'in_progress',
      reason: 'Integration test transition 2',
      triggeredBy: 'integration-test',
    })
    expect(updated2?.state).toBe('in_progress')
    expect(updated2?.gate_blocked).toBeUndefined()
  })

  it('should block gated transition when artifact missing', async () => {
    // Ensure story is in in_progress
    await storyUpdateStatus({ storyId: testStoryId, newState: 'in_progress' })

    // Attempt gated transition without evidence artifact
    const result = await storyUpdateStatus({
      storyId: testStoryId,
      newState: 'needs_code_review',
      triggeredBy: 'integration-test',
    })

    expect(result).not.toBeNull()
    expect(result?.gate_blocked).toBe(true)
    expect(result?.missing_artifact).toBe('Dev proof (evidence)')
    // State should remain in_progress
    expect(result?.state).toBe('in_progress')
  })

  it('should allow gated transition when artifact present', async () => {
    // Insert required evidence artifact
    await db.insert(storyArtifacts).values({
      storyId: testStoryId,
      artifactType: 'evidence',
      phase: 'implementation',
      iteration: 1,
    })

    // Now the gated transition should succeed
    const result = await storyUpdateStatus({
      storyId: testStoryId,
      newState: 'needs_code_review',
      triggeredBy: 'integration-test',
    })

    expect(result?.gate_blocked).toBeUndefined()
    expect(result?.state).toBe('needs_code_review')
  })

  it('should track state transitions in storyStateHistory', async () => {
    // Verify that successful transitions are recorded
    const historyEntries = await db
      .select()
      .from(storyStateHistory)
      .where(eq(storyStateHistory.storyId, testStoryId))

    expect(historyEntries.length).toBeGreaterThan(0)
    const lastEntry = historyEntries[historyEntries.length - 1]
    expect(lastEntry?.toState).toBe('needs_code_review')
  })

  it('should query stories by status with pagination', async () => {
    // Reset to known state for querying
    await storyUpdateStatus({ storyId: testStoryId, newState: 'in_progress' })

    const inProgressStories = await storyGetByStatus({
      state: 'in_progress',
      limit: 10,
      offset: 0,
    })

    expect(Array.isArray(inProgressStories)).toBe(true)
    const testStory = inProgressStories.find(s => s.storyId === testStoryId)
    expect(testStory).toBeDefined()
    expect(testStory?.state).toBe('in_progress')
  })

  it('should query stories by feature', async () => {
    const testStories = await storyGetByFeature({
      feature: 'test',
      limit: 10,
      offset: 0,
    })

    expect(Array.isArray(testStories)).toBe(true)
    const testStory = testStories.find(s => s.storyId === testStoryId)
    expect(testStory).toBeDefined()
  })

  it('should handle pagination edge cases', async () => {
    const beyondOffset = await storyGetByStatus({
      state: 'backlog',
      limit: 10,
      offset: 999999,
    })
    expect(beyondOffset).toEqual([])

    const minimalPage = await storyGetByFeature({
      feature: 'test',
      limit: 1,
      offset: 0,
    })
    expect(minimalPage.length).toBeLessThanOrEqual(1)
  })

  it('should handle gate check for completed state (qa_verify required)', async () => {
    // Move to in_qa state (bypassing gates for test setup)
    await db.update(stories).set({ state: 'in_qa' }).where(eq(stories.storyId, testStoryId))

    // Attempt to complete without qa_verify artifact
    const result = await storyUpdateStatus({
      storyId: testStoryId,
      newState: 'completed',
      triggeredBy: 'integration-test',
    })

    expect(result?.gate_blocked).toBe(true)
    expect(result?.missing_artifact).toBe('QA verification')
    expect(result?.state).toBe('in_qa')
  })

  it('should complete story after inserting qa_verify artifact', async () => {
    // Ensure story is in in_qa
    await db.update(stories).set({ state: 'in_qa' }).where(eq(stories.storyId, testStoryId))

    // Insert qa_verify artifact
    await db.insert(storyArtifacts).values({
      storyId: testStoryId,
      artifactType: 'qa_verify',
      phase: 'qa',
      iteration: 1,
    })

    const result = await storyUpdateStatus({
      storyId: testStoryId,
      newState: 'completed',
      triggeredBy: 'integration-test',
    })

    expect(result?.gate_blocked).toBeUndefined()
    expect(result?.state).toBe('completed')
  })
})
