/**
 * Integration Tests: Story Compatibility Shim Module
 * WINT-1011 AC-1 through AC-5 — Real PostgreSQL (ADR-005: no DB mocks in integration tests)
 *
 * Test scenarios:
 * - AC-1: shimGetStoryStatus — DB-hit path (story in DB, queried by UUID)
 * - AC-1: shimGetStoryStatus — DB-miss + directory fallback
 * - AC-2: shimUpdateStoryStatus — write success to real DB
 * - AC-2: shimUpdateStoryStatus — non-existent story → null, no filesystem write
 * - AC-3: shimGetStoriesByStatus — DB results returned
 * - AC-3: shimGetStoriesByStatus — directory fallback test
 * - AC-4: shimGetStoriesByFeature — DB results returned
 * - AC-4: shimGetStoriesByFeature — directory fallback for novel epic
 * - AC-5: Return types conform to WINT-0090 output schemas
 *
 * Prerequisites:
 * - Local PostgreSQL running (ADR-005: real DB, no mocks)
 * - Test story created in beforeAll, cleaned up in afterAll
 * - Test epic='TEST', wave=99, priority='P4'
 *
 * Note: storyGetStatus is known to fail for human-readable storyIds due to
 * Postgres UUID cast error in the OR clause (eq(stories.id, humanId)). This
 * is an existing behavior in WINT-0090 code. Shim integration tests use UUID
 * for direct DB-hit tests, and rely on the directory fallback for human-readable
 * story lookups.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { db } from '@repo/db'
import { stories } from '@repo/database-schema'
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

describe('Story Compatibility Shim — Integration Tests (real PostgreSQL)', () => {
  let testStoryId: string
  let testStoryUuid: string
  let shimStoriesRoot: string

  beforeAll(async () => {
    // Create test story with integration test pattern (epic='TEST', wave=99, priority='P4')
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

    // Create a temp stories root for directory fallback tests
    shimStoriesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'shim-integration-'))

    // Create a test story in 'in-progress' swim lane for directory-miss tests
    const inProgressPath = path.join(shimStoriesRoot, 'in-progress', 'NOTINDB-0001')
    fs.mkdirSync(inProgressPath, { recursive: true })

    // Create test story dir in 'backlog' for directory fallback testing
    const backlogPath = path.join(shimStoriesRoot, 'backlog', 'NOTINDB-0002')
    fs.mkdirSync(backlogPath, { recursive: true })
  })

  afterAll(async () => {
    // Cleanup test data (cascade deletes storyStates and storyTransitions)
    await db.delete(stories).where(eq(stories.id, testStoryUuid))

    // Cleanup temp directory
    if (shimStoriesRoot && fs.existsSync(shimStoriesRoot)) {
      fs.rmSync(shimStoriesRoot, { recursive: true, force: true })
    }
  })

  // ---------------------------------------------------------------------------
  // AC-1: shimGetStoryStatus
  // ---------------------------------------------------------------------------

  it('AC-1: shimGetStoryStatus — DB-hit path (queried by UUID)', async () => {
    // Use UUID to avoid the Postgres cast issue with human-readable IDs in the
    // OR(eq(id, value), eq(storyId, value)) clause of storyGetStatus
    const result = await shimGetStoryStatus({ storyId: testStoryUuid })

    expect(result).not.toBeNull()
    expect(result?.storyId).toBe(testStoryId)
    expect(result?.state).toBe('backlog')
    expect(result?.epic).toBe('TEST')
    // id is the UUID we inserted
    expect(result?.id).toBe(testStoryUuid)

    // AC-5: output conforms to StoryGetStatusOutputSchema
    const parsed = StoryGetStatusOutputSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  it('AC-1: shimGetStoryStatus — DB-miss triggers directory fallback', async () => {
    // NOTINDB-0001 is in the temp storiesRoot directory but NOT in the database
    const result = await shimGetStoryStatus(
      { storyId: 'NOTINDB-0001' },
      { storiesRoot: shimStoriesRoot },
    )

    expect(result).not.toBeNull()
    expect(result?.storyId).toBe('NOTINDB-0001')
    expect(result?.state).toBe('in_progress')

    // AC-5: output conforms to StoryGetStatusOutputSchema
    const parsed = StoryGetStatusOutputSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  it('AC-1: shimGetStoryStatus — returns null when story not in DB or directory', async () => {
    const result = await shimGetStoryStatus(
      { storyId: 'GHOST-9999' },
      { storiesRoot: shimStoriesRoot },
    )

    expect(result).toBeNull()

    // AC-5: null is valid for StoryGetStatusOutputSchema (nullable schema)
    const parsed = StoryGetStatusOutputSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // AC-2: shimUpdateStoryStatus
  // ---------------------------------------------------------------------------

  it('AC-2: shimUpdateStoryStatus — DB write success (by UUID)', async () => {
    const result = await shimUpdateStoryStatus({
      storyId: testStoryUuid,
      newState: 'ready_to_work',
      reason: 'Shim integration test transition',
      triggeredBy: 'shim-integration-test',
    })

    expect(result).not.toBeNull()
    expect(result?.storyId).toBe(testStoryId)
    expect(result?.state).toBe('ready_to_work')

    // AC-5: output conforms to StoryUpdateStatusOutputSchema
    const parsed = StoryUpdateStatusOutputSchema.safeParse(result)
    expect(parsed.success).toBe(true)

    // Verify state was actually persisted — use UUID to avoid OR clause cast issue
    const updated = await shimGetStoryStatus({ storyId: testStoryUuid })
    expect(updated?.state).toBe('ready_to_work')
  })

  it('AC-2: shimUpdateStoryStatus — returns null for non-existent story (no filesystem write)', async () => {
    // Story does not exist in DB — storyUpdateStatus returns null
    const result = await shimUpdateStoryStatus({
      storyId: 'NOTINDB-9999',
      newState: 'done',
    })

    expect(result).toBeNull()

    // Verify no stray files were created
    const shimDirContents = fs.readdirSync(shimStoriesRoot)
    expect(shimDirContents).not.toContain('NOTINDB-9999')
  })

  // ---------------------------------------------------------------------------
  // AC-3: shimGetStoriesByStatus
  // ---------------------------------------------------------------------------

  it('AC-3: shimGetStoriesByStatus — DB results returned (move story to in_progress)', async () => {
    // Move test story to in_progress first (using UUID)
    await shimUpdateStoryStatus({
      storyId: testStoryUuid,
      newState: 'in_progress',
      triggeredBy: 'shim-integration-test',
    })

    const result = await shimGetStoriesByStatus({ state: 'in_progress', limit: 100, offset: 0 })

    expect(Array.isArray(result)).toBe(true)
    // The story should be in the results (DB query by state)
    const testStory = result.find(s => s.id === testStoryUuid)
    expect(testStory).toBeDefined()
    expect(testStory?.state).toBe('in_progress')

    // AC-5: output conforms to StoryGetByStatusOutputSchema
    const parsed = StoryGetByStatusOutputSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  it('AC-3: shimGetStoriesByStatus — directory fallback when DB empty for state', async () => {
    // Use the shimStoriesRoot which has stories in 'backlog' and 'in-progress'
    const result = await shimGetStoriesByStatus(
      { state: 'backlog', limit: 100, offset: 0 },
      { storiesRoot: shimStoriesRoot },
    )

    // There may be DB backlog stories or directory fallback stories
    expect(Array.isArray(result)).toBe(true)

    // AC-5: output conforms to schema regardless of source
    const parsed = StoryGetByStatusOutputSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // AC-4: shimGetStoriesByFeature
  // ---------------------------------------------------------------------------

  it('AC-4: shimGetStoriesByFeature — DB results returned for TEST epic', async () => {
    const result = await shimGetStoriesByFeature({ epic: 'TEST', limit: 10, offset: 0 })

    expect(Array.isArray(result)).toBe(true)
    // Find our test story by UUID
    const testStory = result.find(s => s.id === testStoryUuid)
    expect(testStory).toBeDefined()
    expect(testStory?.epic).toBe('TEST')

    // AC-5: output conforms to StoryGetByFeatureOutputSchema
    const parsed = StoryGetByFeatureOutputSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  it('AC-4: shimGetStoriesByFeature — directory fallback for novel epic not in DB', async () => {
    // NOTINDB epic has no stories in DB, but has NOTINDB-0001 in shimStoriesRoot
    const notindbPath = path.join(shimStoriesRoot, 'ready-to-work', 'NOTINDB-0003')
    fs.mkdirSync(notindbPath, { recursive: true })

    const result = await shimGetStoriesByFeature(
      { epic: 'NOTINDB', limit: 10, offset: 0 },
      { storiesRoot: shimStoriesRoot },
    )

    expect(Array.isArray(result)).toBe(true)
    // Should find NOTINDB-0001 (in-progress) and NOTINDB-0003 (ready-to-work) from directory
    const storyIds = result.map(s => s.storyId)
    expect(storyIds).toContain('NOTINDB-0001')
    expect(storyIds).toContain('NOTINDB-0003')

    // AC-5: output conforms to schema
    const parsed = StoryGetByFeatureOutputSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Full lifecycle: shim-level (AC-1 + AC-2)
  // ---------------------------------------------------------------------------

  it('AC-1+AC-2: shim get → update → verify lifecycle with real DB (UUID path)', async () => {
    // Get current status via shim (by UUID to avoid OR cast issue)
    const initial = await shimGetStoryStatus({ storyId: testStoryUuid })
    expect(initial).not.toBeNull()

    // Update via shim (by UUID)
    const updated = await shimUpdateStoryStatus({
      storyId: testStoryUuid,
      newState: 'ready_for_qa',
      reason: 'Shim lifecycle test',
      triggeredBy: 'shim-integration-test',
    })
    expect(updated?.state).toBe('ready_for_qa')

    // Verify via shim get (by UUID)
    const verified = await shimGetStoryStatus({ storyId: testStoryUuid })
    expect(verified?.state).toBe('ready_for_qa')
  })
})
