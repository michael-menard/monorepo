/**
 * WINT-1120: Foundation Phase Validation — Integration Tests
 *
 * Validates the Phase 1 WINT foundation:
 * - AC-1: Four MCP CRUD tools (storyGetStatus, storyUpdateStatus, storyGetByStatus, storyGetByFeature)
 * - AC-2: shimGetStoryStatus DB-hit → returns real DB record (id matches inserted UUID)
 * - AC-3: shimGetStoryStatus DB-miss → falls back to directory scan (id is synthetic UUID)
 * - AC-4: shimUpdateStoryStatus DB-miss → returns null, no filesystem write
 * - AC-8: storyGetStatus and direct DB query return consistent fields (storyId, state, title)
 * - AC-9: Cross-system write visibility — storyUpdateStatus write visible via storyGetStatus read
 * - AC-10: worktree_register + worktree_get_by_story lifecycle
 * - AC-12: worktreeMarkComplete updates DB record to merged/abandoned
 *
 * Prerequisites:
 * - DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev
 * - wint.stories and wint.worktrees tables must exist (run migrations first)
 * - No mocks — real PostgreSQL (ADR-005)
 *
 * Known limitations:
 * - storyGetStatus/storyUpdateStatus fail for human-readable IDs due to Postgres UUID cast
 *   in OR(eq(stories.id, id), eq(stories.storyId, id)) — use UUID for these operations.
 * - worktreeRegister.storyId is a UUID FK to wint.stories.id, NOT human-readable story ID.
 *
 * Story ID pattern: TEST-8001 per StoryIdSchema /^[A-Z]{2,10}-\d{3,4}$/
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'crypto'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { eq } from 'drizzle-orm'
import { db } from '@repo/db'
import { stories, worktrees } from '@repo/database-schema'
import {
  storyGetStatus,
  storyUpdateStatus,
  storyGetByStatus,
  storyGetByFeature,
} from '../../story-management/index.js'
import {
  shimGetStoryStatus,
  shimUpdateStoryStatus,
} from '../../story-compatibility/index.js'
import {
  worktreeRegister,
  worktreeGetByStory,
  worktreeMarkComplete,
} from '../../worktree-management/index.js'

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_STORY_ID = 'TEST-8001'
const TEST_DB_MISS_ID = 'TEST-8002' // on disk only, not in DB

describe('WINT-1120 Foundation Validation — Integration Tests (real PostgreSQL)', () => {
  let testStoryUuid: string
  let shimStoriesRoot: string

  beforeAll(async () => {
    testStoryUuid = randomUUID()

    // Insert test story into wint.stories
    await db.insert(stories).values({
      id: testStoryUuid,
      storyId: TEST_STORY_ID,
      title: 'WINT-1120 Foundation Validation Test Story',
      description: 'Integration test fixture for WINT-1120 validation',
      storyType: 'feature',
      epic: 'TEST',
      wave: 99,
      priority: 'P4',
      state: 'backlog',
    })

    // Create temp directory structure for directory-fallback tests (AC-3)
    shimStoriesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wint-1120-integration-'))
    const inProgressPath = path.join(shimStoriesRoot, 'in-progress', TEST_DB_MISS_ID)
    fs.mkdirSync(inProgressPath, { recursive: true })
  })

  afterAll(async () => {
    // Cascade deletes worktrees automatically via FK
    await db.delete(stories).where(eq(stories.id, testStoryUuid))

    if (shimStoriesRoot && fs.existsSync(shimStoriesRoot)) {
      fs.rmSync(shimStoriesRoot, { recursive: true, force: true })
    }
  })

  // ---------------------------------------------------------------------------
  // AC-1: Four MCP CRUD tools work end-to-end
  // ---------------------------------------------------------------------------

  describe('AC-1: Four MCP CRUD tools (storyGetStatus, storyUpdateStatus, storyGetByStatus, storyGetByFeature)', () => {
    it('storyGetStatus retrieves story by UUID', async () => {
      const result = await storyGetStatus({ storyId: testStoryUuid })

      expect(result).not.toBeNull()
      expect(result?.id).toBe(testStoryUuid)
      expect(result?.storyId).toBe(TEST_STORY_ID)
      expect(result?.state).toBe('backlog')
      expect(result?.epic).toBe('TEST')
    })

    it('storyUpdateStatus updates story state by UUID (returns updated record)', async () => {
      // UUID path avoids Postgres UUID cast error in OR(eq(stories.id, id), eq(stories.storyId, id))
      const result = await storyUpdateStatus({
        storyId: testStoryUuid,
        newState: 'ready_to_work',
        reason: 'WINT-1120 AC-1 test transition',
        triggeredBy: 'wint-1120-integration-test',
      })

      expect(result).not.toBeNull()
      expect(result?.storyId).toBe(TEST_STORY_ID)
      expect(result?.state).toBe('ready_to_work')
      expect(result?.updatedAt).toBeInstanceOf(Date)

      // Verify persisted
      const verified = await storyGetStatus({ storyId: testStoryUuid })
      expect(verified?.state).toBe('ready_to_work')
    })

    it('storyGetByStatus returns stories in specified state (pagination)', async () => {
      const results = await storyGetByStatus({
        state: 'ready_to_work',
        limit: 100,
        offset: 0,
      })

      expect(Array.isArray(results)).toBe(true)
      const testStory = results.find(s => s.id === testStoryUuid)
      expect(testStory).toBeDefined()
      expect(testStory?.state).toBe('ready_to_work')
    })

    it('storyGetByFeature returns stories for TEST epic', async () => {
      const results = await storyGetByFeature({
        epic: 'TEST',
        limit: 100,
        offset: 0,
      })

      expect(Array.isArray(results)).toBe(true)
      const testStory = results.find(s => s.id === testStoryUuid)
      expect(testStory).toBeDefined()
      expect(testStory?.epic).toBe('TEST')
    })

    it('storyGetStatus returns null for non-existent story UUID', async () => {
      const result = await storyGetStatus({ storyId: randomUUID() })
      expect(result).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // AC-2: shimGetStoryStatus DB-hit → returns real DB record
  // ---------------------------------------------------------------------------

  describe('AC-2: shimGetStoryStatus DB-hit path', () => {
    it('returns DB record with real UUID when story exists (by UUID)', async () => {
      const result = await shimGetStoryStatus({ storyId: testStoryUuid })

      expect(result).not.toBeNull()
      // DB-hit: id matches the UUID we inserted (not a synthetic UUID)
      expect(result?.id).toBe(testStoryUuid)
      expect(result?.storyId).toBe(TEST_STORY_ID)
      expect(result?.epic).toBe('TEST')
    })

    it('DB-hit result has all required schema fields', async () => {
      const result = await shimGetStoryStatus({ storyId: testStoryUuid })

      expect(result).not.toBeNull()
      expect(result?.id).toBe(testStoryUuid)
      expect(typeof result?.storyId).toBe('string')
      expect(typeof result?.state).toBe('string')
      expect(typeof result?.title).toBe('string')
      expect(result?.createdAt).toBeInstanceOf(Date)
      expect(result?.updatedAt).toBeInstanceOf(Date)
    })
  })

  // ---------------------------------------------------------------------------
  // AC-3: shimGetStoryStatus DB-miss → directory fallback
  // ---------------------------------------------------------------------------

  describe('AC-3: shimGetStoryStatus DB-miss triggers directory fallback', () => {
    it('returns directory record (synthetic UUID) when story not in DB but on disk', async () => {
      // TEST-8002 is on disk (in-progress swimlane) but NOT in the database
      const result = await shimGetStoryStatus(
        { storyId: TEST_DB_MISS_ID },
        { storiesRoot: shimStoriesRoot },
      )

      expect(result).not.toBeNull()
      expect(result?.storyId).toBe(TEST_DB_MISS_ID)
      // DB-miss: directory fallback returns in_progress (from 'in-progress' swimlane dir)
      expect(result?.state).toBe('in_progress')
      // id is a synthetic UUID (NOT the real UUID from the DB)
      expect(result?.id).not.toBe(testStoryUuid)
    })

    it('returns null when story is in neither DB nor directory', async () => {
      const result = await shimGetStoryStatus(
        { storyId: 'TEST-8003' },
        { storiesRoot: shimStoriesRoot },
      )

      expect(result).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // AC-4: shimUpdateStoryStatus DB-miss → returns null, no filesystem write
  // ---------------------------------------------------------------------------

  describe('AC-4: shimUpdateStoryStatus DB-miss behavior', () => {
    it('returns null for non-existent story and does not write to filesystem', async () => {
      const result = await shimUpdateStoryStatus({
        storyId: 'TEST-8004',
        newState: 'done',
        reason: 'WINT-1120 AC-4 test: DB-miss update should return null',
      })

      expect(result).toBeNull()

      // No stray swimlane directories created for this story
      for (const laneDir of ['backlog', 'ready-to-work', 'in-progress', 'ready-for-qa', 'done']) {
        const strayPath = path.join(shimStoriesRoot, laneDir, 'TEST-8004')
        expect(fs.existsSync(strayPath)).toBe(false)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // AC-8: Consistent fields — storyGetStatus vs direct DB query
  // ---------------------------------------------------------------------------

  describe('AC-8: storyGetStatus and direct DB query return consistent fields', () => {
    it('storyGetStatus returns storyId, state, and title matching DB row', async () => {
      // Direct DB query for same story
      const [dbRow] = await db
        .select({
          id: stories.id,
          storyId: stories.storyId,
          state: stories.state,
          title: stories.title,
        })
        .from(stories)
        .where(eq(stories.id, testStoryUuid))
        .limit(1)

      const mcpResult = await storyGetStatus({ storyId: testStoryUuid })

      expect(mcpResult).not.toBeNull()
      // All three key fields must match
      expect(mcpResult?.storyId).toBe(dbRow.storyId)
      expect(mcpResult?.state).toBe(dbRow.state)
      expect(mcpResult?.title).toBe(dbRow.title)
      expect(mcpResult?.id).toBe(dbRow.id)
    })
  })

  // ---------------------------------------------------------------------------
  // AC-9: Cross-system write visibility
  // ---------------------------------------------------------------------------

  describe('AC-9: Cross-system write visibility', () => {
    it('storyUpdateStatus write is immediately visible via storyGetStatus read (UUID path)', async () => {
      // Write via storyUpdateStatus (UUID path)
      const writeResult = await storyUpdateStatus({
        storyId: testStoryUuid,
        newState: 'in_progress',
        reason: 'WINT-1120 AC-9 cross-system write visibility test',
        triggeredBy: 'wint-1120-integration-test',
      })

      expect(writeResult).not.toBeNull()
      expect(writeResult?.state).toBe('in_progress')

      // Read via storyGetStatus — write must be visible
      const readResult = await storyGetStatus({ storyId: testStoryUuid })

      expect(readResult).not.toBeNull()
      expect(readResult?.state).toBe('in_progress')
      expect(readResult?.storyId).toBe(TEST_STORY_ID)

      // Both updatedAt timestamps should be valid Date objects
      expect(writeResult?.updatedAt).toBeInstanceOf(Date)
      expect(readResult?.updatedAt).toBeInstanceOf(Date)
    })
  })

  // ---------------------------------------------------------------------------
  // AC-10: worktree_register + worktree_get_by_story roundtrip
  // ---------------------------------------------------------------------------

  describe('AC-10: Worktree register + get_by_story roundtrip', () => {
    it('registers a worktree by story UUID and retrieves it by UUID', async () => {
      // Note: worktreeRegister.storyId is a UUID FK to wint.stories.id
      const registered = await worktreeRegister({
        storyId: testStoryUuid,
        worktreePath: '/tmp/wint-1120-test-worktree',
        branchName: 'story/wint-1120-test',
      })

      expect(registered).not.toBeNull()
      expect(registered?.status).toBe('active')
      expect(registered?.storyId).toBeDefined()

      // Retrieve by UUID
      const foundByUuid = await worktreeGetByStory({ storyId: testStoryUuid })
      expect(foundByUuid).not.toBeNull()
      expect(foundByUuid?.id).toBe(registered?.id)
      expect(foundByUuid?.status).toBe('active')
      // storyId returned by getByStory is the human-readable ID (from the join)
      expect(foundByUuid?.storyId).toBe(TEST_STORY_ID)

      // Cleanup
      await db.delete(worktrees).where(eq(worktrees.id, registered!.id))
    })
  })

  // ---------------------------------------------------------------------------
  // AC-12: worktreeMarkComplete updates DB record
  // ---------------------------------------------------------------------------

  describe('AC-12: worktreeMarkComplete updates DB record to merged or abandoned', () => {
    it('marks worktree as merged; DB record updated and getByStory returns null', async () => {
      const registered = await worktreeRegister({
        storyId: testStoryUuid,
        worktreePath: '/tmp/wint-1120-test-mark-merged',
        branchName: 'story/wint-1120-mark-merged',
      })

      expect(registered).not.toBeNull()

      // Mark as merged
      const markResult = await worktreeMarkComplete({
        worktreeId: registered!.id,
        status: 'merged',
        metadata: { prNumber: 999, reason: 'WINT-1120 AC-12 merged test' },
      })

      expect(markResult).toEqual({ success: true })

      // getByStory returns null — only returns active worktrees
      const afterMerge = await worktreeGetByStory({ storyId: testStoryUuid })
      expect(afterMerge).toBeNull()

      // Verify DB state directly using select (db.query.worktrees requires relational schema setup)
      const [dbRow] = await db
        .select({
          status: worktrees.status,
          mergedAt: worktrees.mergedAt,
          metadata: worktrees.metadata,
        })
        .from(worktrees)
        .where(eq(worktrees.id, registered!.id))
        .limit(1)

      expect(dbRow?.status).toBe('merged')
      expect(dbRow?.mergedAt).not.toBeNull()
      expect(dbRow?.metadata).toMatchObject({
        prNumber: 999,
        reason: 'WINT-1120 AC-12 merged test',
      })

      // Cleanup
      await db.delete(worktrees).where(eq(worktrees.id, registered!.id))
    })

    it('marks worktree as abandoned; DB record updated with abandonedAt', async () => {
      const registered = await worktreeRegister({
        storyId: testStoryUuid,
        worktreePath: '/tmp/wint-1120-test-mark-abandoned',
        branchName: 'story/wint-1120-mark-abandoned',
      })

      expect(registered).not.toBeNull()

      // Mark as abandoned
      const markResult = await worktreeMarkComplete({
        worktreeId: registered!.id,
        status: 'abandoned',
        metadata: { reason: 'WINT-1120 AC-12 abandoned test' },
      })

      expect(markResult).toEqual({ success: true })

      // Verify DB state directly
      const [dbRow] = await db
        .select({
          status: worktrees.status,
          abandonedAt: worktrees.abandonedAt,
        })
        .from(worktrees)
        .where(eq(worktrees.id, registered!.id))
        .limit(1)

      expect(dbRow?.status).toBe('abandoned')
      expect(dbRow?.abandonedAt).not.toBeNull()

      // Cleanup
      await db.delete(worktrees).where(eq(worktrees.id, registered!.id))
    })
  })
})
